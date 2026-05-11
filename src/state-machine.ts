/**
 * 5 状态机引擎 + 多级恢复策略
 *
 * Healthy → Suspect → Down → Rebooting → Recovering → Healthy
 *                                    ↘ Down (recover timeout)
 *
 * 多级恢复:
 *   reboot_then_hard: reboot → hard_reboot → on
 *   hard_only:        hard_reboot (重复)
 *
 * 从 Python 版 server_monitor.py 移植，适配新表结构
 */

import { ServerState, STATE_TRANSITIONS, RECOVERY_ACTIONS } from './types';
import type {
  Provider,
  Monitor,
  MonitorState,
  GlobalSettings,
  RecoveryStrategy,
} from './types';
import * as zjmf from './zjmf';
import * as db from './db';

// ==================== 通知服务 ====================

interface NotifyPayload {
  monitorId: number;
  title: string;
  message: string;
  level: 'info' | 'warning' | 'critical';
}

function buildNotifyPayload(
  monitor: Monitor,
  oldState: ServerState,
  newState: ServerState,
  label: string,
  rt: MonitorState,
  downtimeStr?: string
): NotifyPayload | null {
  return buildNotifyPayloadWithRebootCount(monitor, oldState, newState, label, rt, rt.reboot_count_today, downtimeStr);
}

/**
 * 构建通知 payload，可覆盖 reboot_count_today 的显示值
 * B21: REBOOTING 通知需要在实际递增前显示"即将执行后的计数"
 */
function buildNotifyPayloadWithRebootCount(
  monitor: Monitor,
  oldState: ServerState,
  newState: ServerState,
  label: string,
  rt: MonitorState,
  displayRebootCount: number,
  downtimeStr?: string
): NotifyPayload | null {
  const notifyMap: Record<string, { old: ServerState; new: ServerState }[]> = {
    critical: [
      { old: ServerState.SUSPECT, new: ServerState.DOWN },
      { old: ServerState.DOWN, new: ServerState.REBOOTING },
    ],
    warning: [
      { old: ServerState.REBOOTING, new: ServerState.RECOVERING },
      { old: ServerState.RECOVERING, new: ServerState.DOWN },
      { old: ServerState.REBOOTING, new: ServerState.DOWN },
    ],
    info: [
      { old: ServerState.RECOVERING, new: ServerState.HEALTHY },
    ],
  };

  let level: 'info' | 'warning' | 'critical' | null = null;
  for (const [lvl, pairs] of Object.entries(notifyMap)) {
    if (pairs.some(p => p.old === oldState && p.new === newState)) {
      level = lvl as 'info' | 'warning' | 'critical';
      break;
    }
  }
  if (!level) return null;

  const messages: Record<string, string> = {
    [ServerState.DOWN]: `服务器确认宕机\n最后状态值: ${rt.last_status_value}\n连续异常: ${rt.consecutive_failures}次`,
    [ServerState.REBOOTING]: `正在执行自动重启\n今日已重启: ${displayRebootCount}次`,
    [ServerState.RECOVERING]: '重启指令已发送，等待恢复...',
    [ServerState.HEALTHY]: `服务器恢复正常\n宕机时长: ${downtimeStr || downtimeDuration(rt)}`,
  };

  return {
    monitorId: monitor.id,
    title: `[${monitor.name}] ${label || newState}`,
    message: messages[newState] || label,
    level,
  };
}

function downtimeDuration(rt: MonitorState): string {
  if (!rt.first_failure_at) return '未知';
  const start = new Date(rt.first_failure_at).getTime();
  const now = Date.now();
  const duration = Math.floor((now - start) / 1000);

  if (duration < 60) return `${duration}秒`;
  if (duration < 3600) return `${Math.floor(duration / 60)}分钟`;
  const hours = Math.floor(duration / 3600);
  const mins = Math.floor((duration % 3600) / 60);
  return `${hours}小时${mins}分钟`;
}

async function sendNotifications(
  DB: D1Database,
  payload: NotifyPayload
): Promise<boolean> {
  const channels = await db.listNotificationChannels(DB);
  if (channels.length === 0) return false;

  let anySuccess = false;

  for (const ch of channels) {
    if (!ch.enabled) continue;

    let config: Record<string, unknown> = {};
    try { config = JSON.parse(ch.config); } catch { /* ignore */ }

    const body = buildWebhookPayload(ch.type, payload, config);

    try {
      const resp = await fetch(String(config.url || config.webhook_url || ''), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });

      const success = resp.ok;
      anySuccess = anySuccess || success;

      await db.insertNotificationLog(DB, {
        monitor_id: payload.monitorId,
        title: payload.title,
        message: payload.message,
        level: payload.level,
        channel_id: ch.id,
        channel_type: ch.type,
        success: success ? 1 : 0,
        error_msg: success ? '' : `HTTP ${resp.status}`,
      });
    } catch (err) {
      await db.insertNotificationLog(DB, {
        monitor_id: payload.monitorId,
        title: payload.title,
        message: payload.message,
        level: payload.level,
        channel_id: ch.id,
        channel_type: ch.type,
        success: 0,
        error_msg: String(err),
      });
    }
  }

  return anySuccess;
}

export function buildWebhookPayload(type: string, p: NotifyPayload, config?: Record<string, unknown>): Record<string, unknown> {
  const emoji = { info: '✅', warning: '⚠️', critical: '🚨' }[p.level] || 'ℹ️';
  const ts = new Date().toISOString();

  switch (type) {
    case 'dingtalk':
      return {
        msgtype: 'markdown',
        markdown: {
          title: `${emoji} ${p.title}`,
          text: `### ${emoji} ${p.title}\n\n${p.message}\n\n> ${ts}`,
        },
      };
    case 'wecom':
      return {
        msgtype: 'markdown',
        markdown: {
          content: `${emoji} **${p.title}**\n${p.message}\n> ${ts}`,
        },
      };
    case 'telegram':
      return {
        chat_id: config?.chat_id || '',
        text: `${emoji} *${p.title}*\n${p.message}`,
        parse_mode: 'Markdown',
      };
    default:
      return {
        title: p.title,
        message: p.message,
        level: p.level,
        timestamp: ts,
      };
  }
}

// ==================== 主检测逻辑 ====================

/**
 * 检测服务器健康状态
 * 返回: true=健康, false=异常, null=检测失败
 */
async function checkHealth(
  monitor: Monitor,
  provider: Provider,
  KV: KVNamespace,
  apiTimeout: number
): Promise<{ health: boolean | null; statusValue: string | null }> {
  // Workers 不支持 ping，只支持 API 检测
  const status = await zjmf.getStatus(provider, KV, monitor.host_id, apiTimeout);

  if (status === null) {
    return { health: null, statusValue: null }; // API 调用失败
  }

  const lower = status.toLowerCase();
  return {
    health: lower === 'on',
    statusValue: status,
  };
}

// ==================== 限制检查 ====================

function checkDailyLimit(rt: MonitorState, monitor: Monitor): boolean {
  const today = new Date().toISOString().slice(0, 10);

  if (rt.reboot_date !== today) {
    rt.reboot_date = today;
    rt.reboot_count_today = 0;
  }

  const limit = monitor.daily_reboot_limit;
  if (limit <= 0) return true; // 0 = 不限制
  if (rt.reboot_count_today >= limit) {
    console.warn(`[${monitor.name}] 已达每日重启上限 (${rt.reboot_count_today}/${limit})`);
    return false;
  }
  return true;
}

function checkRebootCooldown(rt: MonitorState, monitor: Monitor): boolean {
  if (!rt.last_reboot_time) return true;
  const elapsed = (Date.now() - new Date(rt.last_reboot_time).getTime()) / 1000;
  if (elapsed < monitor.reboot_cooldown) {
    console.debug(`[冷却中] 剩余 ${Math.floor(monitor.reboot_cooldown - elapsed)}s`);
    return false;
  }
  return true;
}

// ==================== 状态转换 ====================

function transitionState(
  rt: MonitorState,
  newState: ServerState
): { from: ServerState; to: ServerState; label: string } {
  const old = rt.state as ServerState;
  if (old === newState) return { from: old, to: newState, label: '' };

  rt.state = newState;
  rt.state_changed_at = new Date().toISOString();

  const key = `${old}_${newState}`;
  const label = STATE_TRANSITIONS[key] || '';

  return { from: old, to: newState, label };
}

function advanceState(
  rt: MonitorState,
  health: boolean | null,
  monitor: Monitor,
  settings: GlobalSettings
): { from: ServerState; to: ServerState; label: string } {
  rt.last_check_time = new Date().toISOString();

  if (health === true) {
    // 正常
    rt.consecutive_failures = 0;
    rt.consecutive_successes++;

    switch (rt.state as ServerState) {
      case ServerState.HEALTHY:
        return { from: rt.state as ServerState, to: rt.state as ServerState, label: '' };

      case ServerState.SUSPECT:
        rt.first_failure_at = null; // 恢复正常，清除故障起始时间
        // 清除手动关机标记：服务器已自然恢复，旧的手动关机不应影响后续自动恢复
        if (rt.last_operation === 'off' || rt.last_operation === 'hard_off') {
          rt.last_operation = null;
          rt.last_operation_time = null;
        }
        return transitionState(rt, ServerState.HEALTHY);

      case ServerState.RECOVERING:
      case ServerState.REBOOTING:
        rt.first_failure_at = null;
        rt.recovery_attempt = 0; // 恢复成功，重置恢复计数
        // 清除手动关机标记：服务器已自然恢复，旧的手动关机不应影响后续自动恢复
        if (rt.last_operation === 'off' || rt.last_operation === 'hard_off') {
          rt.last_operation = null;
          rt.last_operation_time = null;
        }
        return transitionState(rt, ServerState.HEALTHY);

      case ServerState.DOWN:
        rt.consecutive_successes = 1;
        // 注意: DOWN→SUSPECT 时不清除 first_failure_at，等 SUSPECT→HEALTHY 再清除
        return transitionState(rt, ServerState.SUSPECT);
    }
  } else if (health === false) {
    // 异常
    rt.consecutive_failures++;
    rt.consecutive_successes = 0;

    if (!rt.first_failure_at) {
      rt.first_failure_at = new Date().toISOString();
    }

    const threshold = monitor.suspect_threshold || settings.suspect_threshold;

    switch (rt.state as ServerState) {
      case ServerState.HEALTHY:
        return transitionState(rt, ServerState.SUSPECT);

      case ServerState.SUSPECT:
        if (rt.consecutive_failures >= threshold) {
          rt.recovery_attempt = 0; // 新的宕机周期，重置恢复计数
          return transitionState(rt, ServerState.DOWN);
        }
        break;

      case ServerState.RECOVERING: {
        const timeout = monitor.recover_timeout || settings.recover_timeout;
        const elapsed = (Date.now() - new Date(rt.state_changed_at).getTime()) / 1000;
        if (elapsed > timeout) {
          console.warn(`[恢复超时] ${Math.floor(elapsed)}s > ${timeout}s`);
          return transitionState(rt, ServerState.DOWN);
        }
        break;
      }

      case ServerState.REBOOTING:
      case ServerState.DOWN:
        break; // 保持
    }
  }

  // health === null => 检测失败，保持当前状态
  return { from: rt.state as ServerState, to: rt.state as ServerState, label: '' };
}

// ==================== 多级恢复策略 ====================

/**
 * 根据恢复策略和已尝试次数，决定下一步恢复操作
 */
function getRecoveryAction(
  strategy: RecoveryStrategy,
  attemptCount: number
): string | null {
  const actions = RECOVERY_ACTIONS[strategy];
  // 防御性校验：无效策略返回 null 而非崩溃
  if (!actions) {
    console.error('[状态机] 无效恢复策略: ' + String(strategy) + '，跳过自动恢复');
    return null;
  }
  if (actions.length === 0) return null;
  if (attemptCount < actions.length) {
    return actions[attemptCount];
  }
  // hard_only 策略只有单一动作，应重复执行（由 daily_reboot_limit 控制上限）
  if (actions.length === 1) {
    return actions[0];
  }
  // reboot_then_hard 策略：所有动作都已尝试，停止恢复
  return null;
}

/**
 * 执行恢复操作
 */
async function executeRecoveryAction(
  provider: Provider,
  KV: KVNamespace,
  hostId: string,
  action: string,
  apiTimeout: number
): Promise<{ success: boolean; msg: string }> {
  switch (action) {
    case 'reboot':
      return zjmf.reboot(provider, KV, hostId, apiTimeout);
    case 'hard_reboot':
      return zjmf.hardReboot(provider, KV, hostId, apiTimeout);
    case 'on':
      return zjmf.on(provider, KV, hostId, apiTimeout);
    default:
      return { success: false, msg: `未知恢复操作: ${action}` };
  }
}

// ==================== 主检查循环 ====================

interface CheckResult {
  monitorId: number;
  health: boolean | null;
  fromState: ServerState;
  toState: ServerState;
  transition: string;
  statusValue: string;
  durationMs: number;
  errorMsg: string;
  notified: boolean;
  recoveryAction: string;
  recoverySuccess: boolean;
}

/**
 * 对单个服务器执行一轮完整的检查
 */
export async function checkSingleMonitor(
  monitor: Monitor,
  provider: Provider,
  rt: MonitorState,
  settings: GlobalSettings,
  DB: D1Database,
  KV: KVNamespace
): Promise<CheckResult> {
  const startTime = Date.now();
  const result: CheckResult = {
    monitorId: monitor.id,
    health: null,
    fromState: rt.state as ServerState,
    toState: rt.state as ServerState,
    transition: '',
    statusValue: rt.last_status_value,
    durationMs: 0,
    errorMsg: '',
    notified: false,
    recoveryAction: '',
    recoverySuccess: false,
  };

  try {
    // 1. 检测健康
    const apiTimeout = settings.api_timeout || 60;
    const { health, statusValue } = await checkHealth(monitor, provider, KV, apiTimeout);

    if (statusValue !== null) {
      rt.last_status_value = statusValue;
    }

    result.health = health;
    result.statusValue = rt.last_status_value;

    // 2. 推进状态机（注意: advanceState 会修改 rt，清除 first_failure_at 等）
    // 先保存宕机时长，避免 RECOVERING→HEALTHY 时 first_failure_at 已被清除导致显示"未知"
    const downtimeStr = rt.first_failure_at ? downtimeDuration(rt) : undefined;
    const { from, to, label } = advanceState(rt, health, monitor, settings);
    result.fromState = from;
    result.toState = to;
    result.transition = label;

    // 3. 通知（传入预计算的宕机时长）
    const notifyPayload = buildNotifyPayload(monitor, from, to, label, rt, downtimeStr);
    if (notifyPayload) {
      const success = await sendNotifications(DB, notifyPayload);
      result.notified = success;
    }

    // 4. 自动恢复（仅 DOWN 状态且自动恢复开启）
    // 跳过手动关机后的自动恢复：用户主动关机不应被自动拉起
    const manualOff = rt.last_operation === 'off' || rt.last_operation === 'hard_off';
    if (rt.state === ServerState.DOWN && monitor.auto_recovery && !manualOff) {
      const withinLimit = checkDailyLimit(rt, monitor);
      const withinCooldown = checkRebootCooldown(rt, monitor);

      if (!withinLimit) {
        // 每日重启次数已达上限 — 仅在 last_operation 不是 blocked 时记录（避免重复）
        if (rt.last_operation !== 'auto_recovery_blocked') {
          rt.last_operation = 'auto_recovery_blocked';
          rt.last_operation_time = new Date().toISOString();
          await db.insertOperationLog(DB, {
            monitor_id: monitor.id,
            log_type: 'operation',
            action: 'auto_recovery_blocked',
            result: 'blocked',
            state_before: from,
            state_after: rt.state,
            status_value: rt.last_status_value,
            health: '',
            duration_ms: 0,
            error_msg: '',
            detail: '每日重启上限已达 (' + rt.reboot_count_today + '/' + monitor.daily_reboot_limit + ')，自动恢复暂停',
          });
        }
      } else if (!withinCooldown) {
        // 冷却中，静默跳过
      } else {
        const strategy = (monitor.recovery_strategy as RecoveryStrategy) || settings.default_recovery_strategy;
        const attemptCount = rt.recovery_attempt || 0;
        const action = getRecoveryAction(strategy, attemptCount);

        if (action) {
          // 进入 REBOOTING
          const stateBeforeRecovery = rt.state as ServerState;
          transitionState(rt, ServerState.REBOOTING);
          rt.last_operation = action;
          rt.last_operation_time = new Date().toISOString();
          rt.recovery_attempt = (rt.recovery_attempt || 0) + 1;
          rt.last_reboot_attempt = action;

          // 通知: DOWN→REBOOTING（自动恢复已启动）
          // 通知中显示的 reboot_count_today 是"本次即将执行后的计数"
          // 实际 reboot_count_today 仅在恢复成功后才递增（B21: 避免失败耗尽限额）
          const displayRebootCount = rt.reboot_count_today + 1;
          const rebootNotify = buildNotifyPayloadWithRebootCount(monitor, stateBeforeRecovery, ServerState.REBOOTING, '触发重启', rt, displayRebootCount);
          if (rebootNotify) {
            const nSuccess = await sendNotifications(DB, rebootNotify);
            result.notified = result.notified || nSuccess;
          }

          const actionResult = await executeRecoveryAction(provider, KV, monitor.host_id, action, apiTimeout);
          result.recoveryAction = action;
          result.recoverySuccess = actionResult.success;

          if (actionResult.success) {
            rt.last_reboot_time = new Date().toISOString();
            rt.reboot_initiated_at = new Date().toISOString();
            // 仅恢复成功时递增 reboot_count_today（失败不耗尽 daily_reboot_limit）
            rt.reboot_count_today++;
            transitionState(rt, ServerState.RECOVERING);

            // 通知: REBOOTING→RECOVERING（重启指令已发送）
            const recoverNotify = buildNotifyPayload(monitor, ServerState.REBOOTING, ServerState.RECOVERING, '重启指令已发送', rt);
            if (recoverNotify) {
              const nSuccess = await sendNotifications(DB, recoverNotify);
              result.notified = result.notified || nSuccess;
            }

            // 记录操作日志
            await db.insertOperationLog(DB, {
              monitor_id: monitor.id,
              log_type: 'operation',
              action,
              result: 'success',
              state_before: from,
              state_after: 'recovering',
              status_value: rt.last_status_value,
              health: '',
              duration_ms: Date.now() - startTime,
              error_msg: '',
              detail: `自动恢复: ${action}`,
            });
          } else {
            // 恢复操作失败：recovery_attempt 已递增，但 reboot_count_today 不递增（避免耗尽限额）
            rt.last_reboot_attempt = `${action}_failed`;
            transitionState(rt, ServerState.DOWN);

            // 通知: REBOOTING→DOWN（恢复操作失败）
            const failNotify = buildNotifyPayload(monitor, ServerState.REBOOTING, ServerState.DOWN, '恢复操作失败', rt);
            if (failNotify) {
              const nSuccess = await sendNotifications(DB, failNotify);
              result.notified = result.notified || nSuccess;
            }

            await db.insertOperationLog(DB, {
              monitor_id: monitor.id,
              log_type: 'operation',
              action,
              result: 'failed',
              state_before: 'rebooting',
              state_after: 'down',
              status_value: rt.last_status_value,
              health: '',
              duration_ms: Date.now() - startTime,
              error_msg: actionResult.msg,
              detail: `自动恢复失败: ${action}`,
            });
          }
        } else {
          // 超出恢复策略范围，通知用户自动恢复已放弃
          console.warn('[' + monitor.name + '] 恢复策略已用尽 (策略: ' + strategy + ', 尝试: ' + attemptCount + ')');
          const exhaustNotify = buildNotifyPayload(
            monitor, ServerState.DOWN, ServerState.DOWN,
            '自动恢复已放弃', rt
          );
          // 覆盖为 critical 级别（buildNotifyPayload 对 DOWN→DOWN 返回 null，需手动构建）
          if (!exhaustNotify) {
            const manualNotify: NotifyPayload = {
              monitorId: monitor.id,
              title: '[' + monitor.name + '] 自动恢复已放弃',
              message: '恢复策略 ' + strategy + ' 所有动作已尝试完毕 (' + attemptCount + '次)，服务器仍处于宕机状态\n最后状态值: ' + rt.last_status_value + '\n今日已重启: ' + rt.reboot_count_today + '次',
              level: 'critical',
            };
            const nSuccess = await sendNotifications(DB, manualNotify);
            result.notified = result.notified || nSuccess;
          } else {
            const nSuccess = await sendNotifications(DB, exhaustNotify);
            result.notified = result.notified || nSuccess;
          }
        }
      }
    }
  } catch (err) {
    result.errorMsg = String(err);
    console.error(`[${monitor.name}] Check error:`, err);
  }

  result.durationMs = Date.now() - startTime;

  // 5. 持久化状态
  await db.upsertMonitorState(DB, rt);

  // 6. 写检查日志（仅非恢复操作的日志；恢复操作已在上面单独记录）
  if (!result.recoveryAction) {
    await db.insertOperationLog(DB, {
      monitor_id: monitor.id,
      log_type: 'check',
      action: 'status',
      result: result.health === null ? 'timeout' : 'success',
      state_before: result.fromState,
      state_after: result.toState,
      status_value: result.statusValue,
      health: result.health === true ? 'true' : result.health === false ? 'false' : 'null',
      duration_ms: result.durationMs,
      error_msg: result.errorMsg,
      detail: result.transition,
    });
  }

  return result;
}

/**
 * 运行一轮完整的监控检查
 */
export async function runMonitorCycle(
  DB: D1Database,
  KV: KVNamespace,
  settings: GlobalSettings
): Promise<CheckResult[]> {
  const monitors = await db.listMonitors(DB, true);
  const providers = await db.listProviders(DB);
  const providerMap = new Map(providers.map(p => [p.id, p]));
  const states = await db.getAllMonitorStates(DB);
  const stateMap = new Map(states.map(s => [s.monitor_id, s] as [number, MonitorState]));
  const results: CheckResult[] = [];

  for (const monitor of monitors) {
    const provider = providerMap.get(monitor.provider_id);
    if (!provider) {
      console.warn(`[${monitor.name}] 服务商 ID=${monitor.provider_id} 未配置，跳过`);
      continue;
    }
    if (!provider.enabled) {
      continue;
    }

    let rt = stateMap.get(monitor.id);
    if (!rt) {
      // 初始化运行状态
      rt = {
        monitor_id: monitor.id,
        state: ServerState.HEALTHY,
        last_status_value: '',
        consecutive_failures: 0,
        consecutive_successes: 0,
        last_check_time: null,
        last_reboot_time: null,
        reboot_count_today: 0,
        reboot_date: null,
        first_failure_at: null,
        state_changed_at: new Date().toISOString(),
        reboot_initiated_at: null,
        last_reboot_attempt: null,
        last_operation: null,
        last_operation_time: null,
        recovery_attempt: 0,
      };
      stateMap.set(monitor.id, rt);
    }

    // 根据状态选择检查间隔：RECOVERING/REBOOTING 使用更短的 recover_check_interval
    const interval = (rt.state === ServerState.RECOVERING || rt.state === ServerState.REBOOTING)
      ? (settings.recover_check_interval || 60)
      : (monitor.check_interval || settings.check_interval);
    if (rt.last_check_time) {
      const elapsed = (Date.now() - new Date(rt.last_check_time).getTime()) / 1000;
      if (elapsed < interval) {
        continue; // 未到检查时间，跳过
      }
    }

    const result = await checkSingleMonitor(monitor, provider, rt!, settings, DB, KV);
    results.push(result);

    // 更新内存状态
    stateMap.set(monitor.id, rt);
  }

  return results;
}

/**
 * 手动执行电源操作
 */
export async function executePowerAction(
  monitor: Monitor,
  provider: Provider,
  action: string,
  DB: D1Database,
  KV: KVNamespace,
  apiTimeout?: number
): Promise<{ success: boolean; msg: string }> {
  const rt = await db.getMonitorState(DB, monitor.id) || {
    monitor_id: monitor.id,
    state: ServerState.HEALTHY,
    last_status_value: '',
    consecutive_failures: 0,
    consecutive_successes: 0,
    last_check_time: null,
    last_reboot_time: null,
    reboot_count_today: 0,
    reboot_date: null,
    first_failure_at: null,
    state_changed_at: new Date().toISOString(),
    reboot_initiated_at: null,
    last_reboot_attempt: null,
    last_operation: null,
    last_operation_time: null,
    recovery_attempt: 0,
  };

  const startTime = Date.now();
  const stateBefore = rt.state;

  let actionResult: { success: boolean; msg: string };

  const timeout = apiTimeout || 60;

  switch (action) {
    case 'on':
      actionResult = await zjmf.on(provider, KV, monitor.host_id, timeout);
      break;
    case 'off':
      actionResult = await zjmf.off(provider, KV, monitor.host_id, timeout);
      break;
    case 'reboot':
      actionResult = await zjmf.reboot(provider, KV, monitor.host_id, timeout);
      break;
    case 'hard_reboot':
      actionResult = await zjmf.hardReboot(provider, KV, monitor.host_id, timeout);
      break;
    case 'hard_off':
      actionResult = await zjmf.hardOff(provider, KV, monitor.host_id, timeout);
      break;
    default:
      return { success: false, msg: `未知操作: ${action}` };
  }

  // 更新运行状态 + 推进状态机
  if (actionResult.success) {
    rt.last_operation = action;
    rt.last_operation_time = new Date().toISOString();

    if (action === 'reboot' || action === 'hard_reboot') {
      rt.last_reboot_time = new Date().toISOString();
      rt.reboot_initiated_at = new Date().toISOString();
      // 手动重启不计入 daily_reboot_limit，避免耗尽限额阻止自动恢复
      rt.last_reboot_attempt = 'manual';
      // 手动重启 → 进入 RECOVERING 等待恢复确认（包括 HEALTHY 状态，因为重启后服务器会暂时离线）
      if (rt.state === ServerState.HEALTHY) {
        // 健康服务器手动重启，需要重置失败计数以避免误判
        rt.consecutive_failures = 0;
        rt.consecutive_successes = 0;
      }
      transitionState(rt, ServerState.RECOVERING);
    } else if (action === 'on') {
      // 手动开机 → 进入 SUSPECT 等待健康确认
      if (rt.state === ServerState.DOWN || rt.state === ServerState.REBOOTING || rt.state === ServerState.RECOVERING) {
        transitionState(rt, ServerState.SUSPECT);
        rt.consecutive_failures = 0;
        rt.consecutive_successes = 0;
        // B24: 清除旧的故障起始时间，避免 SUSPECT→DOWN 时宕机时长计算错误
        rt.first_failure_at = null;
      }
      // 无论之前什么状态，开机后都重置 recovery_attempt 以允许后续自动恢复
      rt.recovery_attempt = 0;
      // 清除手动关机标记：用户主动开机意味着不再阻止自动恢复
      if (rt.last_operation === 'off' || rt.last_operation === 'hard_off') {
        rt.last_operation = null;
        rt.last_operation_time = null;
      }
    } else if (action === 'off' || action === 'hard_off') {
      // 手动关机 → 标记为 DOWN
      if (rt.state !== ServerState.DOWN) {
        transitionState(rt, ServerState.DOWN);
        if (!rt.first_failure_at) rt.first_failure_at = new Date().toISOString();
      }
    }
  }

  await db.upsertMonitorState(DB, rt);

  // 记录操作日志
  await db.insertOperationLog(DB, {
    monitor_id: monitor.id,
    log_type: 'operation',
    action,
    result: actionResult.success ? 'success' : 'failed',
    state_before: stateBefore,
    state_after: rt.state,
    status_value: rt.last_status_value,
    health: '',
    duration_ms: Date.now() - startTime,
    error_msg: actionResult.success ? '' : actionResult.msg,
    detail: `手动操作: ${action}`,
  });

  return actionResult;
}

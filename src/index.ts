/**
 * Cloud Monitor - Cloudflare 免费资源监控平台
 * 魔方财务（ZJMF）服务器监控 + 自动恢复
 *
 * 架构: Hono.js + D1 + KV + Cron Triggers
 */

import { Hono } from 'hono';
import type { Env, ApiResponse, GlobalSettings } from './types';
import { ServerState } from './types';
import * as db from './db';
import * as zjmf from './zjmf';
import { runMonitorCycle, executePowerAction, checkSingleMonitor, buildWebhookPayload } from './state-machine';
import { handleCron } from './cron';
import { signJWT, hashPassword, verifyPassword, authMiddleware, getCurrentUser } from './auth';
import { getFrontendHTML } from './frontend';

// ==================== 创建应用 ====================

const app = new Hono<{ Bindings: Env }>();

// CORS — 同源 SPA 不需要跨域，仅保留安全头
app.use('/api/*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
});

// ==================== 辅助函数 ====================

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, timestamp: new Date().toISOString() };
}

function err(msg: string): ApiResponse {
  return { success: false, error: msg, timestamp: new Date().toISOString() };
}

function getId(c: any): number {
  const n = parseInt(c.req.param('id') || '0');
  if (isNaN(n)) return 0;
  return n;
}

// ==================== 认证 API ====================

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<{ username: string; password: string }>();
  if (!body.username || !body.password) {
    return c.json(err('请提供用户名和密码'), 400);
  }

  const user = await db.getUserByUsername(c.env.DB, body.username);
  if (!user) {
    return c.json(err('用户名或密码错误'), 401);
  }

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) {
    return c.json(err('用户名或密码错误'), 401);
  }

  // 自动升级旧密码为加盐格式
  if (!user.password_hash.includes('$')) {
    const newHash = await hashPassword(body.password);
    await db.updateUser(c.env.DB, user.id, { password_hash: newHash });
  }

  const token = await signJWT({
    sub: user.id,
    username: user.username,
    role: user.role,
  }, c.env.JWT_SECRET);

  await db.updateUserLastLogin(c.env.DB, user.id);

  return c.json(ok({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name,
    },
  }));
});

app.get('/api/auth/me', authMiddleware, async (c) => {
  const currentUser = getCurrentUser(c)!;
  const user = await db.getUserById(c.env.DB, currentUser.sub);
  if (!user) return c.json(err('用户不存在'), 404);

  return c.json(ok({
    id: user.id,
    username: user.username,
    role: user.role,
    display_name: user.display_name,
    last_login: user.last_login,
  }));
});

// ==================== 服务商管理 ====================

app.get('/api/providers', authMiddleware, async (c) => {
  const type = c.req.query('type');
  let providers = await db.listProviders(c.env.DB);
  if (type) providers = providers.filter(p => p.type === type);
  // 过滤敏感字段，不返回 api_password
  const safe = providers.map(p => ({
    id: p.id, type: p.type, name: p.name, display_name: p.display_name,
    api_base_url: p.api_base_url, api_account: p.api_account,
    enabled: p.enabled, created_at: p.created_at, updated_at: p.updated_at,
  }));
  return c.json(ok(safe));
});

app.post('/api/providers', authMiddleware, async (c) => {
  const body = await c.req.json<{
    type?: string;
    name: string;
    display_name?: string;
    api_base_url: string;
    api_account: string;
    api_password: string;
    enabled?: number;
  }>();

  if (!body.name || !body.api_base_url || !body.api_account || !body.api_password) {
    return c.json(err('缺少必填字段: name, api_base_url, api_account, api_password'), 400);
  }

  const existing = await db.getProviderByName(c.env.DB, body.name);
  if (existing) {
    return c.json(err(`服务商 ${body.name} 已存在`), 409);
  }

  const id = await db.createProvider(c.env.DB, {
    type: body.type || 'zjmf',
    name: body.name,
    display_name: body.display_name || body.name,
    api_base_url: body.api_base_url,
    api_account: body.api_account,
    api_password: body.api_password,
    enabled: body.enabled ?? 1,
  });

  return c.json(ok({ id }), 201);
});

app.get('/api/providers/:id', authMiddleware, async (c) => {
  const id = getId(c);
  const provider = await db.getProvider(c.env.DB, id);
  if (!provider) return c.json(err('服务商不存在'), 404);
  // 过滤敏感字段
  const { api_password, ...safe } = provider;
  return c.json(ok(safe));
});

app.put('/api/providers/:id', authMiddleware, async (c) => {
  const id = getId(c);
  const existing = await db.getProvider(c.env.DB, id);
  if (!existing) return c.json(err('服务商不存在'), 404);

  const body = await c.req.json<Record<string, unknown>>();
  // 字段白名单：只允许更新服务商的可修改字段
  const allowedFields = new Set(['type', 'name', 'display_name', 'api_base_url', 'api_account', 'api_password', 'enabled']);
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (allowedFields.has(key)) filtered[key] = value;
  }
  if (Object.keys(filtered).length === 0) return c.json(err('没有有效的更新字段'), 400);

  await db.updateProvider(c.env.DB, id, filtered as any);
  return c.json(ok({ id }));
});

app.delete('/api/providers/:id', authMiddleware, async (c) => {
  const id = getId(c);
  const existing = await db.getProvider(c.env.DB, id);
  if (!existing) return c.json(err('服务商不存在'), 404);
  const result = await db.deleteProvider(c.env.DB, id);
  return c.json(ok({ id, cascaded_monitors: result.monitorCount }));
});

app.post('/api/providers/:id/test', authMiddleware, async (c) => {
  const id = getId(c);
  const provider = await db.getProvider(c.env.DB, id);
  if (!provider) return c.json(err('服务商不存在'), 404);

  const settings = await db.getSettings(c.env.DB);
  const result = await zjmf.testConnection(provider, c.env.KV, settings.api_timeout);
  if (!result.success) return c.json(err(result.msg), 400);
  return c.json(ok(result));
});

app.get('/api/providers/:id/hosts', authMiddleware, async (c) => {
  const id = getId(c);
  const provider = await db.getProvider(c.env.DB, id);
  if (!provider) return c.json(err('服务商不存在'), 404);

  const settings = await db.getSettings(c.env.DB);
  const hosts = await zjmf.getHosts(provider, c.env.KV, 1, 100, settings.api_timeout);
  if (!hosts) return c.json(err('获取产品列表失败'), 500);

  // 过滤敏感字段，不向前端泄露主机密码
  const safeHosts = hosts.hosts.map(function(h: Record<string, unknown>) {
    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(h)) {
      if (key !== 'password' && key !== 'password_enc') safe[key] = value;
    }
    return safe;
  });

  return c.json(ok({ total: hosts.total, hosts: safeHosts, domainstatus: hosts.domainstatus }));
});

// ==================== 服务器监控 ====================

app.get('/api/monitors', authMiddleware, async (c) => {
  const enabledOnly = c.req.query('enabled') === 'true';
  const monitors = await db.listMonitors(c.env.DB, enabledOnly);

  // 附带运行时状态
  const states = await db.getAllMonitorStates(c.env.DB);
  const stateMap = new Map(states.map(s => [s.monitor_id, s]));

  const enriched = monitors.map(m => {
    const { password_enc, ...safe } = m;
    return { ...safe, runtime: stateMap.get(m.id) || null };
  });

  return c.json(ok(enriched));
});

app.post('/api/monitors', authMiddleware, async (c) => {
  const body = await c.req.json<{
    name: string;
    provider_id: number;
    host_id: string;
    check_method?: string;
    check_interval?: number;
    timeout?: number;
    suspect_threshold?: number;
    reboot_cooldown?: number;
    recover_timeout?: number;
    daily_reboot_limit?: number;
    auto_recovery?: number;
    recovery_strategy?: string;
    enabled?: number;
    notes?: string;
  }>();

  if (!body.name || !body.provider_id || !body.host_id) {
    return c.json(err('缺少必填字段: name, provider_id, host_id'), 400);
  }
  if (typeof body.provider_id !== 'number' || body.provider_id <= 0) {
    return c.json(err('provider_id 必须是正整数'), 400);
  }
  if (!String(body.host_id).trim()) {
    return c.json(err('host_id 不能为空'), 400);
  }
  // B16: recovery_strategy 枚举校验
  if (body.recovery_strategy !== undefined) {
    const validStrategies = ['reboot_then_hard', 'hard_only'];
    if (!validStrategies.includes(body.recovery_strategy)) {
      return c.json(err('recovery_strategy 值无效，允许: reboot_then_hard, hard_only'), 400);
    }
  }

  // B20: 数值字段范围校验
  const monitorNumericFields: Record<string, { min: number; max: number }> = {
    check_interval: { min: 10, max: 3600 },
    timeout: { min: 5, max: 300 },
    suspect_threshold: { min: 1, max: 100 },
    reboot_cooldown: { min: 30, max: 86400 },
    recover_timeout: { min: 60, max: 86400 },
    daily_reboot_limit: { min: 0, max: 100 },
  };
  for (const [field, range] of Object.entries(monitorNumericFields)) {
    const val = (body as Record<string, unknown>)[field];
    if (val !== undefined) {
      const num = Number(val);
      if (isNaN(num) || num < range.min || num > range.max) {
        return c.json(err(field + ' 必须在 ' + range.min + '-' + range.max + ' 之间'), 400);
      }
    }
  }

  const provider = await db.getProvider(c.env.DB, body.provider_id);
  if (!provider) return c.json(err('服务商不存在'), 404);

  // 检查重复：同一服务商下相同 host_id 不允许重复监控（精确查询，避免全表扫描）
  const duplicate = await db.getMonitorByProviderHost(c.env.DB, body.provider_id, body.host_id);
  if (duplicate) {
    return c.json(err('该服务器已在监控列表中（监控项 #' + duplicate.id + '）'), 409);
  }

  const id = await db.createMonitor(c.env.DB, body);

  // 创建后自动同步服务器信息（IP、产品名等），失败不阻塞创建
  try {
    const settings = await db.getSettings(c.env.DB);
    const hostInfo = await zjmf.getHostDetail(provider, c.env.KV, body.host_id, settings.api_timeout);
    if (hostInfo) {
      await db.syncMonitorInfo(c.env.DB, id, {
        host_type: String(hostInfo.type || ''),
        dedicatedip: String(hostInfo.dedicatedip || ''),
        assignedips: JSON.stringify(hostInfo.assignedips || []),
        os_name: String(hostInfo.os || ''),
        domainstatus: String(hostInfo.domainstatus || ''),
        product_name: String(hostInfo.product_name || ''),
        username: String(hostInfo.username || ''),
        password_enc: String(hostInfo.password || ''),
        port: Number(hostInfo.port) || 0,
        nextduedate: Number(hostInfo.nextduedate) || 0,
        amount: String(hostInfo.amount || ''),
        billingcycle: String(hostInfo.billingcycle || ''),
        bwusage: Number(hostInfo.bwusage) || 0,
        bwlimit: Number(hostInfo.bwlimit) || 0,
      });
      console.log(`[Monitor:${id}] Auto-sync completed after creation`);
    }
  } catch (syncErr) {
    console.warn(`[Monitor:${id}] Auto-sync failed after creation:`, syncErr);
  }

  return c.json(ok({ id }), 201);
});

app.get('/api/monitors/:id', authMiddleware, async (c) => {
  const id = getId(c);
  const monitor = await db.getMonitor(c.env.DB, id);
  if (!monitor) return c.json(err('监控项不存在'), 404);

  const state = await db.getMonitorState(c.env.DB, id);
  const { password_enc, ...safeMonitor } = monitor;
  return c.json(ok({ ...safeMonitor, runtime: state || null }));
});

app.put('/api/monitors/:id', authMiddleware, async (c) => {
  const id = getId(c);
  const existing = await db.getMonitor(c.env.DB, id);
  if (!existing) return c.json(err('监控项不存在'), 404);

  const body = await c.req.json<Record<string, unknown>>();
  // 字段白名单：只允许更新以下字段，防止越权修改 provider_id 等
  const allowedFields = new Set([
    'name', 'host_id', 'check_method', 'check_interval', 'timeout',
    'suspect_threshold', 'reboot_cooldown', 'recover_timeout',
    'daily_reboot_limit', 'auto_recovery', 'recovery_strategy',
    'enabled', 'notes',
    'host_type', 'dedicatedip', 'assignedips', 'os_name', 'domainstatus',
    'product_name', 'username', 'password_enc', 'port', 'nextduedate',
    'amount', 'billingcycle', 'bwusage', 'bwlimit', 'last_synced',
  ]);
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (allowedFields.has(key)) filtered[key] = value;
  }
  if (Object.keys(filtered).length === 0) return c.json(err('没有有效的更新字段'), 400);

  // B16: recovery_strategy 枚举校验
  if (filtered.recovery_strategy !== undefined) {
    const validStrategies = ['reboot_then_hard', 'hard_only'];
    if (!validStrategies.includes(String(filtered.recovery_strategy))) {
      return c.json(err('recovery_strategy 值无效，允许: reboot_then_hard, hard_only'), 400);
    }
  }

  // B20: 数值字段范围校验
  const monitorNumericFields: Record<string, { min: number; max: number }> = {
    check_interval: { min: 10, max: 3600 },
    timeout: { min: 5, max: 300 },
    suspect_threshold: { min: 1, max: 100 },
    reboot_cooldown: { min: 30, max: 86400 },
    recover_timeout: { min: 60, max: 86400 },
    daily_reboot_limit: { min: 0, max: 100 },
  };
  for (const [field, range] of Object.entries(monitorNumericFields)) {
    if (filtered[field] !== undefined) {
      const num = Number(filtered[field]);
      if (isNaN(num) || num < range.min || num > range.max) {
        return c.json(err(field + ' 必须在 ' + range.min + '-' + range.max + ' 之间'), 400);
      }
    }
  }

  // 如果修改了 host_id，需检查唯一约束：同一服务商下不允许重复 host_id
  if (filtered.host_id !== undefined && String(filtered.host_id) !== String(existing.host_id)) {
    const duplicate = await db.getMonitorByProviderHost(c.env.DB, existing.provider_id, String(filtered.host_id));
    if (duplicate && duplicate.id !== id) {
      return c.json(err('该服务商下已存在 host_id 为 ' + filtered.host_id + ' 的监控项（#' + duplicate.id + '）'), 409);
    }
  }

  await db.updateMonitor(c.env.DB, id, filtered as any);
  return c.json(ok({ id }));
});

app.delete('/api/monitors/:id', authMiddleware, async (c) => {
  const id = getId(c);
  const existing = await db.getMonitor(c.env.DB, id);
  if (!existing) return c.json(err('监控项不存在'), 404);
  await db.deleteMonitor(c.env.DB, id);
  return c.json(ok({ id }));
});

app.post('/api/monitors/:id/toggle', authMiddleware, async (c) => {
  const id = getId(c);
  const monitor = await db.getMonitor(c.env.DB, id);
  if (!monitor) return c.json(err('监控项不存在'), 404);

  const newEnabled = monitor.enabled ? 0 : 1;
  await db.toggleMonitor(c.env.DB, id, newEnabled);
  return c.json(ok({ id, enabled: newEnabled }));
});

app.post('/api/monitors/:id/sync', authMiddleware, async (c) => {
  const id = getId(c);
  const monitor = await db.getMonitor(c.env.DB, id);
  if (!monitor) return c.json(err('监控项不存在'), 404);

  const provider = await db.getProvider(c.env.DB, monitor.provider_id);
  if (!provider) return c.json(err('服务商不存在'), 404);

  const settings = await db.getSettings(c.env.DB);
  const hostInfo = await zjmf.getHostDetail(provider, c.env.KV, monitor.host_id, settings.api_timeout);
  if (!hostInfo) return c.json(err('获取产品详情失败'), 500);

  await db.syncMonitorInfo(c.env.DB, id, {
    host_type: String(hostInfo.type || ''),
    dedicatedip: String(hostInfo.dedicatedip || ''),
    assignedips: JSON.stringify(hostInfo.assignedips || []),
    os_name: String(hostInfo.os || ''),
    domainstatus: String(hostInfo.domainstatus || ''),
    product_name: String(hostInfo.product_name || ''),
    username: String(hostInfo.username || ''),
    password_enc: String(hostInfo.password || ''),
    port: Number(hostInfo.port) || 0,
    nextduedate: Number(hostInfo.nextduedate) || 0,
    amount: String(hostInfo.amount || ''),
    billingcycle: String(hostInfo.billingcycle || ''),
    bwusage: Number(hostInfo.bwusage) || 0,
    bwlimit: Number(hostInfo.bwlimit) || 0,
  });

  const updated = await db.getMonitor(c.env.DB, id);
  const { password_enc, ...safeUpdated } = updated!;
  return c.json(ok(safeUpdated));
});

// ==================== 服务器操作 ====================

app.get('/api/monitors/:id/status', authMiddleware, async (c) => {
  const id = getId(c);
  const monitor = await db.getMonitor(c.env.DB, id);
  if (!monitor) return c.json(err('监控项不存在'), 404);

  const provider = await db.getProvider(c.env.DB, monitor.provider_id);
  if (!provider) return c.json(err('服务商不存在'), 404);

  const settings = await db.getSettings(c.env.DB);
  const status = await zjmf.getStatus(provider, c.env.KV, monitor.host_id, settings.api_timeout);
  if (status === null) return c.json(err('获取状态失败'), 500);

  return c.json(ok({ status }));
});

// 电源操作路由
const POWER_ACTIONS = ['on', 'off', 'reboot', 'hard_reboot', 'hard_off'] as const;

for (const action of POWER_ACTIONS) {
  app.post(`/api/monitors/:id/${action}`, authMiddleware, async (c) => {
    const id = getId(c);
    const monitor = await db.getMonitor(c.env.DB, id);
    if (!monitor) return c.json(err('监控项不存在'), 404);

    const provider = await db.getProvider(c.env.DB, monitor.provider_id);
    if (!provider) return c.json(err('服务商不存在'), 404);

    const settings = await db.getSettings(c.env.DB);
    const result = await executePowerAction(monitor, provider, action, c.env.DB, c.env.KV, settings.api_timeout);
    if (!result.success) return c.json(err(result.msg), 500);
    return c.json(ok({ id, action, message: result.msg }));
  });
}

// ==================== 监控执行 ====================

app.post('/api/monitor/run', authMiddleware, async (c) => {
  const settings = await db.getSettings(c.env.DB);
  const results = await runMonitorCycle(c.env.DB, c.env.KV, settings);
  return c.json(ok({
    servers_checked: results.length,
    results: results.map(r => ({
      monitor_id: r.monitorId,
      health: r.health,
      from_state: r.fromState,
      to_state: r.toState,
      transition: r.transition,
      duration_ms: r.durationMs,
      notified: r.notified,
      recovery_action: r.recoveryAction,
      recovery_success: r.recoverySuccess,
    })),
  }));
});

app.post('/api/monitor/run/:id', authMiddleware, async (c) => {
  const id = getId(c);
  const monitor = await db.getMonitor(c.env.DB, id);
  if (!monitor) return c.json(err('监控项不存在'), 404);

  const provider = await db.getProvider(c.env.DB, monitor.provider_id);
  if (!provider) return c.json(err('服务商不存在'), 404);

  const settings = await db.getSettings(c.env.DB);
  let rt = await db.getMonitorState(c.env.DB, id);
  if (!rt) {
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
  }

  const result = await checkSingleMonitor(monitor, provider, rt, settings, c.env.DB, c.env.KV);
  return c.json(ok(result));
});

app.get('/api/monitor/dashboard', authMiddleware, async (c) => {
  const data = await db.getDashboardData(c.env.DB);
  // 过滤敏感字段 password_enc
  const safeServers = data.servers.map(s => {
    const { password_enc, ...safe } = s;
    return { ...safe };
  });
  return c.json(ok({ stats: data.stats, servers: safeServers, recentLogs: data.recentLogs }));
});

// ==================== 日志 ====================

app.get('/api/logs', authMiddleware, async (c) => {
  const monitorId = c.req.query('monitor_id') ? parseInt(c.req.query('monitor_id')!) : undefined;
  const logType = c.req.query('type') || undefined;
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');

  const result = await db.getOperationLogs(c.env.DB, {
    monitorId,
    logType,
    limit: Math.min(limit, 200),
    offset,
  });
  return c.json(ok(result));
});

app.get('/api/logs/recent', authMiddleware, async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const logs = await db.getRecentLogs(c.env.DB, Math.min(limit, 200));
  return c.json(ok(logs));
});

// ==================== 通知 ====================

app.get('/api/notifications', authMiddleware, async (c) => {
  const channels = await db.listNotificationChannels(c.env.DB);
  return c.json(ok(channels));
});

app.post('/api/notifications', authMiddleware, async (c) => {
  const body = await c.req.json<{ name: string; type: string; config: string; enabled?: number }>();
  if (!body.name || !body.type) {
    return c.json(err('缺少必填字段: name, type'), 400);
  }
  // 验证 config 是合法 JSON
  if (body.config !== undefined) {
    try { JSON.parse(body.config); } catch { return c.json(err('config 必须是合法的 JSON 字符串'), 400); }
  }
  const id = await db.createNotificationChannel(c.env.DB, body);
  return c.json(ok({ id }), 201);
});

app.put('/api/notifications/:id', authMiddleware, async (c) => {
  const id = getId(c);
  const existing = await db.getNotificationChannel(c.env.DB, id);
  if (!existing) return c.json(err('通知渠道不存在'), 404);

  const body = await c.req.json<Record<string, unknown>>();
  // 字段白名单：只允许更新通知渠道的可修改字段
  const allowedFields = new Set(['name', 'type', 'config', 'enabled']);
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (allowedFields.has(key)) filtered[key] = value;
  }
  if (Object.keys(filtered).length === 0) return c.json(err('没有有效的更新字段'), 400);
  // 验证 config 是合法 JSON
  if (filtered.config !== undefined) {
    try { JSON.parse(String(filtered.config)); } catch { return c.json(err('config 必须是合法的 JSON 字符串'), 400); }
  }

  await db.updateNotificationChannel(c.env.DB, id, filtered as any);
  return c.json(ok({ id }));
});

app.delete('/api/notifications/:id', authMiddleware, async (c) => {
  const id = getId(c);
  const existing = await db.getNotificationChannel(c.env.DB, id);
  if (!existing) return c.json(err('通知渠道不存在'), 404);
  await db.deleteNotificationChannel(c.env.DB, id);
  return c.json(ok({ id }));
});

app.post('/api/notifications/:id/test', authMiddleware, async (c) => {
  const id = getId(c);
  const channel = await db.getNotificationChannel(c.env.DB, id);
  if (!channel) return c.json(err('通知渠道不存在'), 404);

  let config: Record<string, unknown> = {};
  try { config = JSON.parse(channel.config); } catch { /* ignore */ }

  // 使用与实际通知相同的格式构建请求体
  const testPayload = {
    monitorId: 0,
    title: '测试通知 - Cloud Monitor',
    message: `来自 Cloud Monitor 的测试通知\n时间: ${new Date().toISOString()}`,
    level: 'info' as const,
  };
  const body = buildWebhookPayload(channel.type, testPayload, config);

  try {
    const url = String(config.url || config.webhook_url || '');
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (resp.ok) return c.json(ok({ sent: true }));
    return c.json(err(`发送失败: HTTP ${resp.status}`), 500);
  } catch (e) {
    return c.json(err(`发送失败: ${String(e)}`), 500);
  }
});

// ==================== 系统 ====================

app.get('/api/settings', authMiddleware, async (c) => {
  const settings = await db.getSettings(c.env.DB);
  return c.json(ok(settings));
});

app.put('/api/settings', authMiddleware, async (c) => {
  const body = await c.req.json<Partial<GlobalSettings>>();
  // 字段白名单：只允许更新以下设置字段，防止注入未知 key
  const allowedFields = new Set([
    'check_interval', 'suspect_threshold', 'reboot_cooldown',
    'recover_timeout', 'recover_check_interval', 'api_timeout',
    'default_recovery_strategy',
  ]);
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (allowedFields.has(key) && value !== undefined) filtered[key] = value;
  }
  if (Object.keys(filtered).length === 0) return c.json(err('没有有效的更新字段'), 400);

  // 数字字段范围校验
  const numericFields: Record<string, { min: number; max: number }> = {
    check_interval: { min: 10, max: 3600 },
    suspect_threshold: { min: 1, max: 100 },
    reboot_cooldown: { min: 30, max: 86400 },
    recover_timeout: { min: 60, max: 86400 },
    recover_check_interval: { min: 10, max: 3600 },
    api_timeout: { min: 5, max: 300 },
  };
  for (const [field, range] of Object.entries(numericFields)) {
    if (filtered[field] !== undefined) {
      const val = Number(filtered[field]);
      if (isNaN(val) || val < range.min || val > range.max) {
        return c.json(err(field + ' 必须在 ' + range.min + '-' + range.max + ' 之间'), 400);
      }
    }
  }
  // 恢复策略枚举校验
  if (filtered.default_recovery_strategy !== undefined) {
    const validStrategies = ['reboot_then_hard', 'hard_only'];
    if (!validStrategies.includes(String(filtered.default_recovery_strategy))) {
      return c.json(err('default_recovery_strategy 值无效'), 400);
    }
  }

  await db.updateSettings(c.env.DB, filtered as Partial<GlobalSettings>);
  const updated = await db.getSettings(c.env.DB);
  return c.json(ok(updated));
});

app.get('/api/stats', authMiddleware, async (c) => {
  const stats = await db.getMonitorStats(c.env.DB);
  return c.json(ok(stats));
});

// ==================== 用户管理 ====================

app.get('/api/users', authMiddleware, async (c) => {
  const users = await db.listUsers(c.env.DB);
  const safe = users.map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    display_name: u.display_name,
    created_at: u.created_at,
    last_login: u.last_login,
  }));
  return c.json(ok(safe));
});

app.post('/api/users', authMiddleware, async (c) => {
  const body = await c.req.json<{ username: string; password: string; role?: string; display_name?: string }>();
  if (!body.username || !body.password) {
    return c.json(err('缺少必填字段: username, password'), 400);
  }

  const existing = await db.getUserByUsername(c.env.DB, body.username);
  if (existing) return c.json(err('用户名已存在'), 409);

  const hash = await hashPassword(body.password);
  const id = await db.createUser(c.env.DB, body.username, hash, body.role || 'admin', body.display_name || '');
  return c.json(ok({ id }), 201);
});

app.put('/api/users/:id', authMiddleware, async (c) => {
  const id = getId(c);
  const target = await db.getUserById(c.env.DB, id);
  if (!target) return c.json(err('用户不存在'), 404);

  const body = await c.req.json<Record<string, unknown>>();
  // 字段白名单：禁止直接修改 password_hash（应使用 /users/:id/password 接口）
  const allowedFields = new Set(['display_name', 'role']);
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (allowedFields.has(key)) filtered[key] = value;
  }
  if (Object.keys(filtered).length === 0) return c.json(err('没有有效的更新字段'), 400);

  await db.updateUser(c.env.DB, id, filtered as any);
  return c.json(ok({ id }));
});

app.delete('/api/users/:id', authMiddleware, async (c) => {
  const id = getId(c);
  const currentUser = getCurrentUser(c)!;
  if (id === currentUser.sub) {
    return c.json(err('不能删除自己的账号'), 403);
  }

  // 阻止删除最后一个管理员
  const target = await db.getUserById(c.env.DB, id);
  if (!target) return c.json(err('用户不存在'), 404);
  if (target.role === 'admin') {
    const allUsers = await db.listUsers(c.env.DB);
    const adminCount = allUsers.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      return c.json(err('不能删除最后一个管理员账号'), 403);
    }
  }

  await db.deleteUser(c.env.DB, id);
  return c.json(ok({ id }));
});

app.put('/api/users/:id/password', authMiddleware, async (c) => {
  const id = getId(c);
  const currentUser = getCurrentUser(c)!;
  const target = await db.getUserById(c.env.DB, id);
  if (!target) return c.json(err('用户不存在'), 404);

  const body = await c.req.json<{ password: string; old_password?: string }>();
  if (!body.password) return c.json(err('请提供新密码'), 400);

  // 权限控制：管理员可改任何人，非管理员只能改自己且需验证旧密码
  if (currentUser.role !== 'admin') {
    if (currentUser.sub !== id) {
      return c.json(err('只能修改自己的密码'), 403);
    }
    if (!body.old_password) {
      return c.json(err('请提供当前密码'), 400);
    }
    const oldValid = await verifyPassword(body.old_password, target.password_hash);
    if (!oldValid) {
      return c.json(err('当前密码错误'), 401);
    }
  }

  const hash = await hashPassword(body.password);
  await db.updateUser(c.env.DB, id, { password_hash: hash });
  return c.json(ok({ id }));
});

// ==================== 前端 SPA ====================

const HTML = getFrontendHTML();

app.get('/', (c) => c.html(HTML));
app.get('/index.html', (c) => c.html(HTML));
// SPA fallback: 所有非 API 路径返回前端
app.get('*', async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (path.startsWith('/api/')) {
    await next();
  } else {
    return c.html(HTML);
  }
});

// ==================== 入口 ====================

export default {
  fetch: app.fetch,
  scheduled: handleCron,
};

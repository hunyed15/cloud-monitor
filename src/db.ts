/**
 * 数据库操作层
 * 适配 8 张新表：users, providers, monitors, monitor_states,
 *            operation_logs, notification_channels, notification_logs, settings
 */

import type {
  User,
  Provider,
  Monitor,
  MonitorState,
  OperationLog,
  NotificationChannel,
  NotificationLog,
  GlobalSettings,
  MonitorStats,
  RecoveryStrategy,
} from './types';

// ==================== 用户 CRUD ====================

export async function getUserById(db: D1Database, id: number): Promise<User | null> {
  return await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
}

export async function getUserByUsername(db: D1Database, username: string): Promise<User | null> {
  return await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<User>();
}

export async function listUsers(db: D1Database): Promise<User[]> {
  const { results } = await db.prepare('SELECT * FROM users ORDER BY id').all<User>();
  return results;
}

export async function createUser(db: D1Database, username: string, passwordHash: string, role = 'admin', displayName = ''): Promise<number> {
  const result = await db.prepare(
    'INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)'
  ).bind(username, passwordHash, role, displayName).run();
  return result.meta.last_row_id as number;
}

export async function updateUser(db: D1Database, id: number, data: { display_name?: string; role?: string; password_hash?: string }): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (data.display_name !== undefined) { sets.push('display_name = ?'); values.push(data.display_name); }
  if (data.role !== undefined) { sets.push('role = ?'); values.push(data.role); }
  if (data.password_hash !== undefined) { sets.push('password_hash = ?'); values.push(data.password_hash); }
  if (sets.length === 0) return;
  values.push(id);
  await db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
}

export async function updateUserLastLogin(db: D1Database, id: number): Promise<void> {
  await db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").bind(id).run();
}

export async function deleteUser(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
}

// ==================== 服务商 CRUD ====================

export async function listProviders(db: D1Database, enabledOnly = false): Promise<Provider[]> {
  let sql = 'SELECT * FROM providers';
  if (enabledOnly) sql += ' WHERE enabled = 1';
  sql += ' ORDER BY name';
  const { results } = await db.prepare(sql).all<Provider>();
  return results;
}

export async function getProvider(db: D1Database, id: number): Promise<Provider | null> {
  return await db.prepare('SELECT * FROM providers WHERE id = ?').bind(id).first<Provider>();
}

export async function getProviderByName(db: D1Database, name: string): Promise<Provider | null> {
  return await db.prepare('SELECT * FROM providers WHERE name = ?').bind(name).first<Provider>();
}

export async function createProvider(db: D1Database, data: Omit<Provider, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const result = await db.prepare(
    `INSERT INTO providers (type, name, display_name, api_base_url, api_account, api_password, enabled)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(data.type || 'zjmf', data.name, data.display_name || data.name,
    data.api_base_url, data.api_account, data.api_password, data.enabled ?? 1
  ).run();
  return result.meta.last_row_id as number;
}

export async function updateProvider(db: D1Database, id: number, data: Partial<Provider>): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  const fields = ['type', 'name', 'display_name', 'api_base_url', 'api_account', 'api_password', 'enabled'] as const;
  for (const f of fields) {
    if (data[f] !== undefined) { sets.push(`${f} = ?`); values.push(data[f]); }
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  values.push(id);
  await db.prepare(`UPDATE providers SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
}

export async function deleteProvider(db: D1Database, id: number): Promise<{ monitorCount: number }> {
  // 级联删除: notification_logs → operation_logs → monitor_states → monitors → providers
  const monitors = await db.prepare('SELECT id FROM monitors WHERE provider_id = ?').bind(id).all<{ id: number }>();
  const stmts: D1PreparedStatement[] = [];
  for (const m of monitors.results) {
    stmts.push(db.prepare('DELETE FROM notification_logs WHERE monitor_id = ?').bind(m.id));
    stmts.push(db.prepare('DELETE FROM operation_logs WHERE monitor_id = ?').bind(m.id));
    stmts.push(db.prepare('DELETE FROM monitor_states WHERE monitor_id = ?').bind(m.id));
  }
  stmts.push(db.prepare('DELETE FROM monitors WHERE provider_id = ?').bind(id));
  stmts.push(db.prepare('DELETE FROM providers WHERE id = ?').bind(id));
  if (stmts.length > 0) await db.batch(stmts);
  return { monitorCount: monitors.results.length };
}

// ==================== 监控服务器 CRUD ====================

export async function getMonitorByProviderHost(db: D1Database, providerId: number, hostId: string): Promise<Monitor | null> {
  return await db.prepare('SELECT * FROM monitors WHERE provider_id = ? AND host_id = ?').bind(providerId, hostId).first<Monitor>();
}

export async function listMonitors(db: D1Database, enabledOnly = false): Promise<Monitor[]> {
  let sql = 'SELECT * FROM monitors';
  if (enabledOnly) sql += ' WHERE enabled = 1';
  sql += ' ORDER BY name';
  const { results } = await db.prepare(sql).all<Monitor>();
  return results;
}

export async function getMonitor(db: D1Database, id: number): Promise<Monitor | null> {
  return await db.prepare('SELECT * FROM monitors WHERE id = ?').bind(id).first<Monitor>();
}

export async function createMonitor(db: D1Database, data: {
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
}): Promise<number> {
  const result = await db.prepare(
    `INSERT INTO monitors (
      name, provider_id, host_id,
      check_method, check_interval, timeout,
      suspect_threshold, reboot_cooldown, recover_timeout,
      daily_reboot_limit, auto_recovery, recovery_strategy,
      enabled, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.name, data.provider_id, data.host_id,
    data.check_method || 'api_only', data.check_interval || 60, data.timeout || 30,
    data.suspect_threshold || 2, data.reboot_cooldown || 300, data.recover_timeout || 600,
    data.daily_reboot_limit ?? 3, data.auto_recovery ?? 1, data.recovery_strategy || 'reboot_then_hard',
    data.enabled ?? 1, data.notes || ''
  ).run();
  return result.meta.last_row_id as number;
}

export async function updateMonitor(db: D1Database, id: number, data: Partial<Monitor>): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  const fields = [
    'name', 'host_id', 'check_method', 'check_interval', 'timeout',
    'suspect_threshold', 'reboot_cooldown', 'recover_timeout',
    'daily_reboot_limit', 'auto_recovery', 'recovery_strategy',
    'enabled', 'notes',
    // 同步字段
    'host_type', 'dedicatedip', 'assignedips', 'os_name', 'domainstatus',
    'product_name', 'username', 'password_enc', 'port', 'nextduedate',
    'amount', 'billingcycle', 'bwusage', 'bwlimit', 'last_synced',
  ] as const;
  for (const f of fields) {
    if ((data as Record<string, unknown>)[f] !== undefined) {
      sets.push(`${f} = ?`);
      values.push((data as Record<string, unknown>)[f]);
    }
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  values.push(id);
  await db.prepare(`UPDATE monitors SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
}

export async function deleteMonitor(db: D1Database, id: number): Promise<void> {
  // 级联删除: notification_logs → operation_logs → monitor_states → monitors（使用 batch 保证原子性）
  await db.batch([
    db.prepare('DELETE FROM notification_logs WHERE monitor_id = ?').bind(id),
    db.prepare('DELETE FROM operation_logs WHERE monitor_id = ?').bind(id),
    db.prepare('DELETE FROM monitor_states WHERE monitor_id = ?').bind(id),
    db.prepare('DELETE FROM monitors WHERE id = ?').bind(id),
  ]);
}

export async function toggleMonitor(db: D1Database, id: number, enabled: number): Promise<void> {
  await db.prepare("UPDATE monitors SET enabled = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(enabled, id).run();
}

/** 同步产品信息到 monitors 表 */
export async function syncMonitorInfo(db: D1Database, id: number, info: {
  host_type?: string;
  dedicatedip?: string;
  assignedips?: string;
  os_name?: string;
  domainstatus?: string;
  product_name?: string;
  username?: string;
  password_enc?: string;
  port?: number;
  nextduedate?: number;
  amount?: string;
  billingcycle?: string;
  bwusage?: number;
  bwlimit?: number;
}): Promise<void> {
  await updateMonitor(db, id, {
    ...info,
    last_synced: new Date().toISOString(),
  } as Partial<Monitor>);
}

// ==================== 运行时状态 ====================

export async function getMonitorState(db: D1Database, monitorId: number): Promise<MonitorState | null> {
  return await db.prepare('SELECT * FROM monitor_states WHERE monitor_id = ?').bind(monitorId).first<MonitorState>();
}

export async function getAllMonitorStates(db: D1Database): Promise<MonitorState[]> {
  const { results } = await db.prepare('SELECT * FROM monitor_states').all<MonitorState>();
  return results;
}

export async function upsertMonitorState(db: D1Database, st: MonitorState): Promise<void> {
  await db.prepare(
    `INSERT INTO monitor_states (
      monitor_id, state, last_status_value, consecutive_failures, consecutive_successes,
      last_check_time, last_reboot_time, reboot_count_today, reboot_date,
      first_failure_at, state_changed_at, reboot_initiated_at, last_reboot_attempt,
      last_operation, last_operation_time, recovery_attempt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(monitor_id) DO UPDATE SET
      state=excluded.state, last_status_value=excluded.last_status_value,
      consecutive_failures=excluded.consecutive_failures,
      consecutive_successes=excluded.consecutive_successes,
      last_check_time=excluded.last_check_time, last_reboot_time=excluded.last_reboot_time,
      reboot_count_today=excluded.reboot_count_today, reboot_date=excluded.reboot_date,
      first_failure_at=excluded.first_failure_at, state_changed_at=excluded.state_changed_at,
      reboot_initiated_at=excluded.reboot_initiated_at,
      last_reboot_attempt=excluded.last_reboot_attempt,
      last_operation=excluded.last_operation,
      last_operation_time=excluded.last_operation_time,
      recovery_attempt=excluded.recovery_attempt`
  ).bind(
    st.monitor_id, st.state, st.last_status_value, st.consecutive_failures,
    st.consecutive_successes, st.last_check_time, st.last_reboot_time,
    st.reboot_count_today, st.reboot_date, st.first_failure_at,
    st.state_changed_at, st.reboot_initiated_at, st.last_reboot_attempt,
    st.last_operation, st.last_operation_time, st.recovery_attempt || 0
  ).run();
}

// ==================== 操作日志 ====================

export async function insertOperationLog(db: D1Database, log: Omit<OperationLog, 'id' | 'created_at'>): Promise<void> {
  await db.prepare(
    `INSERT INTO operation_logs (
      monitor_id, log_type, action, result, state_before, state_after,
      status_value, health, duration_ms, error_msg, detail
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    log.monitor_id, log.log_type, log.action, log.result,
    log.state_before, log.state_after, log.status_value, log.health,
    log.duration_ms, log.error_msg, log.detail
  ).run();
}

export async function getOperationLogs(
  db: D1Database, options: {
    monitorId?: number;
    logType?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ logs: OperationLog[]; total: number }> {
  const { monitorId, logType, limit = 50, offset = 0 } = options;

  let where = '';
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (monitorId) {
    conditions.push('monitor_id = ?');
    params.push(monitorId);
  }
  if (logType) {
    conditions.push('log_type = ?');
    params.push(logType);
  }
  if (conditions.length > 0) {
    where = 'WHERE ' + conditions.join(' AND ');
  }

  const countResult = await db.prepare(
    `SELECT COUNT(*) as c FROM operation_logs ${where}`
  ).bind(...params).first<{ c: number }>();

  const { results } = await db.prepare(
    `SELECT * FROM operation_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all<OperationLog>();

  return { logs: results, total: countResult?.c || 0 };
}

export async function getRecentLogs(db: D1Database, limit = 50): Promise<OperationLog[]> {
  const { results } = await db.prepare(
    'SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT ?'
  ).bind(limit).all<OperationLog>();
  return results;
}

// ==================== 通知渠道 ====================

export async function listNotificationChannels(db: D1Database): Promise<NotificationChannel[]> {
  const { results } = await db.prepare('SELECT * FROM notification_channels ORDER BY name').all<NotificationChannel>();
  return results;
}

export async function getNotificationChannel(db: D1Database, id: number): Promise<NotificationChannel | null> {
  return await db.prepare('SELECT * FROM notification_channels WHERE id = ?').bind(id).first<NotificationChannel>();
}

export async function createNotificationChannel(db: D1Database, data: {
  name: string;
  type: string;
  config: string;
  enabled?: number;
}): Promise<number> {
  const result = await db.prepare(
    'INSERT INTO notification_channels (name, type, config, enabled) VALUES (?, ?, ?, ?)'
  ).bind(data.name, data.type, data.config, data.enabled ?? 1).run();
  return result.meta.last_row_id as number;
}

export async function updateNotificationChannel(db: D1Database, id: number, data: Partial<NotificationChannel>): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  const fields = ['name', 'type', 'config', 'enabled'] as const;
  for (const f of fields) {
    if (data[f] !== undefined) { sets.push(`${f} = ?`); values.push(data[f]); }
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  values.push(id);
  await db.prepare(`UPDATE notification_channels SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
}

export async function deleteNotificationChannel(db: D1Database, id: number): Promise<void> {
  // 级联删除: notification_logs → notification_channels（使用 batch 保证原子性）
  await db.batch([
    db.prepare('DELETE FROM notification_logs WHERE channel_id = ?').bind(id),
    db.prepare('DELETE FROM notification_channels WHERE id = ?').bind(id),
  ]);
}

// ==================== 通知日志 ====================

export async function insertNotificationLog(db: D1Database, log: Omit<NotificationLog, 'id' | 'sent_at'>): Promise<void> {
  await db.prepare(
    `INSERT INTO notification_logs (monitor_id, title, message, level, channel_id, channel_type, success, error_msg)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    log.monitor_id, log.title, log.message, log.level,
    log.channel_id, log.channel_type, log.success, log.error_msg
  ).run();
}

export async function getNotificationLogs(db: D1Database, limit = 50): Promise<NotificationLog[]> {
  const { results } = await db.prepare(
    'SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT ?'
  ).bind(limit).all<NotificationLog>();
  return results;
}

// ==================== 全局设置 ====================

export async function getSettings(db: D1Database): Promise<GlobalSettings> {
  const { results } = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  const raw: Record<string, string> = {};
  for (const r of results) raw[r.key] = r.value;

  return {
    check_interval: parseInt(raw.check_interval || '60', 10),
    suspect_threshold: parseInt(raw.suspect_threshold || '2', 10),
    reboot_cooldown: parseInt(raw.reboot_cooldown || '300', 10),
    recover_timeout: parseInt(raw.recover_timeout || '600', 10),
    recover_check_interval: parseInt(raw.recover_check_interval || '60', 10),
    api_timeout: parseInt(raw.api_timeout || '60', 10),
    default_recovery_strategy: (raw.default_recovery_strategy as RecoveryStrategy) || 'reboot_then_hard',
  };
}

export async function updateSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`
  ).bind(key, value).run();
}

export async function updateSettings(db: D1Database, settings: Partial<GlobalSettings>): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    if (value !== undefined) {
      await updateSetting(db, key, String(value));
    }
  }
}

// ==================== 仪表盘统计 ====================

export async function getMonitorStats(db: D1Database): Promise<MonitorStats> {
  const serverCount = await db.prepare('SELECT COUNT(*) as c FROM monitors WHERE enabled = 1').first<{ c: number }>();
  // B18: 只统计启用监控的状态，JOIN monitors 过滤 enabled=1
  const stateCounts = await db.prepare(
    'SELECT ms.state, COUNT(*) as c FROM monitor_states ms INNER JOIN monitors m ON ms.monitor_id = m.id WHERE m.enabled = 1 GROUP BY ms.state'
  ).all<{ state: string; c: number }>();

  const today = new Date().toISOString().slice(0, 10);

  const checksToday = await db.prepare(
    "SELECT COUNT(*) as c FROM operation_logs WHERE log_type = 'check' AND created_at >= ?"
  ).bind(today).first<{ c: number }>();

  const rebootsToday = await db.prepare(
    "SELECT COALESCE(SUM(ms.reboot_count_today), 0) as c FROM monitor_states ms INNER JOIN monitors m ON ms.monitor_id = m.id WHERE m.enabled = 1 AND ms.reboot_date = ?"
  ).bind(today).first<{ c: number }>();

  const notificationsToday = await db.prepare(
    "SELECT COUNT(*) as c FROM notification_logs WHERE sent_at >= ?"
  ).bind(today).first<{ c: number }>();

  const stateMap: Record<string, number> = {};
  for (const r of stateCounts.results) stateMap[r.state] = r.c;

  return {
    total_servers: serverCount?.c || 0,
    healthy: stateMap['healthy'] || 0,
    suspect: stateMap['suspect'] || 0,
    down: stateMap['down'] || 0,
    rebooting: stateMap['rebooting'] || 0,
    recovering: stateMap['recovering'] || 0,
    checks_today: checksToday?.c || 0,
    reboots_today: rebootsToday?.c || 0,
    notifications_today: notificationsToday?.c || 0,
  };
}

/** 仪表盘聚合数据 */
export async function getDashboardData(db: D1Database): Promise<{
  stats: MonitorStats;
  servers: Array<Monitor & { runtime: MonitorState | null }>;
  recentLogs: OperationLog[];
}> {
  const [stats, monitors, states, recentLogs] = await Promise.all([
    getMonitorStats(db),
    listMonitors(db, true),
    getAllMonitorStates(db),
    getRecentLogs(db, 20),
  ]);

  const stateMap = new Map(states.map(s => [s.monitor_id, s]));

  return {
    stats,
    servers: monitors.map(m => ({
      ...m,
      runtime: stateMap.get(m.id) || null,
    })),
    recentLogs,
  };
}

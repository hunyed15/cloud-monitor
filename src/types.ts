// ==================== 5 状态机定义 ====================
export enum ServerState {
  HEALTHY = 'healthy',
  SUSPECT = 'suspect',
  DOWN = 'down',
  REBOOTING = 'rebooting',
  RECOVERING = 'recovering',
}

export const STATE_TRANSITIONS: Record<string, string> = {
  'healthy_suspect': '检测异常',
  'healthy_recovering': '手动重启',
  'suspect_down': '确认宕机',
  'suspect_healthy': '虚惊一场',
  'down_suspect': '疑似恢复',
  'down_rebooting': '触发重启',
  'rebooting_recovering': '重启指令已发送',
  'rebooting_down': '恢复操作失败',
  'recovering_healthy': '恢复成功',
  'recovering_down': '恢复超时',
};

/** 恢复策略 */
export type RecoveryStrategy = 'reboot_then_hard' | 'hard_only';

/** 恢复策略对应的操作序列 */
export const RECOVERY_ACTIONS: Record<RecoveryStrategy, string[]> = {
  reboot_then_hard: ['reboot', 'hard_reboot', 'on'],
  hard_only: ['hard_reboot'],
};

// ==================== 用户 ====================
export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: string;
  display_name: string;
  created_at: string;
  last_login: string | null;
}

// ==================== 服务商配置 ====================
export interface Provider {
  id: number;
  type: string;            // 'zjmf' | 'whmcs' | 'newapi'
  name: string;
  display_name: string;
  api_base_url: string;
  api_account: string;
  api_password: string;
  enabled: number;         // 0/1
  created_at: string;
  updated_at: string;
}

// ==================== 监控服务器 ====================
export interface Monitor {
  id: number;
  name: string;
  provider_id: number;
  host_id: string;           // 魔方财务产品ID

  // 从 API 同步的产品信息（缓存）
  host_type: string;
  dedicatedip: string;
  assignedips: string;       // JSON array string
  os_name: string;
  domainstatus: string;
  product_name: string;
  username: string;
  password_enc: string;
  port: number;
  nextduedate: number;
  amount: string;
  billingcycle: string;
  bwusage: number;
  bwlimit: number;
  last_synced: string;

  // 监控参数
  check_method: string;      // 'api_only'
  check_interval: number;
  timeout: number;

  // 状态机参数
  suspect_threshold: number;
  reboot_cooldown: number;
  recover_timeout: number;
  daily_reboot_limit: number;
  auto_recovery: number;     // 0/1
  recovery_strategy: RecoveryStrategy;

  // 状态
  enabled: number;           // 0/1
  notes: string;
  created_at: string;
  updated_at: string;
}

// ==================== 监控运行时状态 ====================
export interface MonitorState {
  monitor_id: number;
  state: ServerState;
  last_status_value: string;
  consecutive_failures: number;
  consecutive_successes: number;
  last_check_time: string | null;
  last_reboot_time: string | null;
  reboot_count_today: number;
  reboot_date: string | null;
  first_failure_at: string | null;
  state_changed_at: string;
  reboot_initiated_at: string | null;
  last_reboot_attempt: string | null;
  last_operation: string | null;
  last_operation_time: string | null;
  recovery_attempt: number;  // 当前恢复周期内的尝试次数，恢复成功后重置
}

// ==================== 操作日志 ====================
export interface OperationLog {
  id: number;
  monitor_id: number;
  log_type: string;          // check/operation/notification
  action: string;            // status/on/off/reboot/hard_reboot/hard_off
  result: string;            // success/failed/timeout
  state_before: string;
  state_after: string;
  status_value: string;
  health: string;            // 'true'/'false'/'null'
  duration_ms: number;
  error_msg: string;
  detail: string;
  created_at: string;
}

// ==================== 通知渠道 ====================
export interface NotificationChannel {
  id: number;
  name: string;
  type: string;              // webhook/dingtalk/wecom/telegram
  config: string;            // JSON string
  enabled: number;
  created_at: string;
  updated_at: string;
}

// ==================== 通知日志 ====================
export interface NotificationLog {
  id: number;
  monitor_id: number | null;
  title: string;
  message: string;
  level: string;             // info/warning/critical
  channel_id: number | null;
  channel_type: string;
  success: number;
  error_msg: string;
  sent_at: string;
}

// ==================== 全局设置 ====================
export interface GlobalSettings {
  check_interval: number;
  suspect_threshold: number;
  reboot_cooldown: number;
  recover_timeout: number;
  recover_check_interval: number;
  api_timeout: number;
  default_recovery_strategy: RecoveryStrategy;
}

export const DEFAULT_SETTINGS: GlobalSettings = {
  check_interval: 60,
  suspect_threshold: 2,
  reboot_cooldown: 300,
  recover_timeout: 600,
  recover_check_interval: 60,
  api_timeout: 60,
  default_recovery_strategy: 'reboot_then_hard',
};

// ==================== API 响应格式 ====================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ==================== 仪表盘统计 ====================
export interface MonitorStats {
  total_servers: number;
  healthy: number;
  suspect: number;
  down: number;
  rebooting: number;
  recovering: number;
  checks_today: number;
  reboots_today: number;
  notifications_today: number;
}

// ==================== Cloudflare Env ====================
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET: string;  // Cloudflare Worker secret or var
}

-- Cloud Monitor D1 数据库初始化
-- 魔方财务 (ZJMF) 服务器监控平台
-- 8 张表：users, providers, monitors, monitor_states, operation_logs,
--         notification_channels, notification_logs, settings

-- ========== 1. 用户表 ==========
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'admin',
  display_name  TEXT    NOT NULL DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login    TEXT
);

-- ========== 2. 服务商表 ==========
CREATE TABLE IF NOT EXISTS providers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT    NOT NULL DEFAULT 'zjmf',
  name          TEXT    NOT NULL UNIQUE,
  display_name  TEXT    NOT NULL DEFAULT '',
  api_base_url  TEXT    NOT NULL,
  api_account   TEXT    NOT NULL DEFAULT '',
  api_password  TEXT    NOT NULL DEFAULT '',
  enabled       INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ========== 3. 监控服务器表 ==========
CREATE TABLE IF NOT EXISTS monitors (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  provider_id   INTEGER NOT NULL,
  host_id       TEXT    NOT NULL,                   -- 魔方财务产品ID

  -- 从 API 同步的产品信息（缓存）
  host_type     TEXT    NOT NULL DEFAULT '',
  dedicatedip   TEXT    NOT NULL DEFAULT '',
  assignedips   TEXT    NOT NULL DEFAULT '[]',
  os_name       TEXT    NOT NULL DEFAULT '',
  domainstatus  TEXT    NOT NULL DEFAULT '',
  product_name  TEXT    NOT NULL DEFAULT '',
  username      TEXT    NOT NULL DEFAULT '',
  password_enc  TEXT    NOT NULL DEFAULT '',
  port          INTEGER DEFAULT 0,
  nextduedate   INTEGER DEFAULT 0,
  amount        TEXT    NOT NULL DEFAULT '',
  billingcycle  TEXT    NOT NULL DEFAULT '',
  bwusage       REAL    DEFAULT 0,
  bwlimit       INTEGER DEFAULT 0,
  last_synced   TEXT    NOT NULL DEFAULT '',

  -- 监控参数
  check_method     TEXT    NOT NULL DEFAULT 'api_only',
  check_interval   INTEGER NOT NULL DEFAULT 60,
  timeout          INTEGER NOT NULL DEFAULT 30,

  -- 状态机参数
  suspect_threshold  INTEGER NOT NULL DEFAULT 2,
  reboot_cooldown    INTEGER NOT NULL DEFAULT 300,
  recover_timeout    INTEGER NOT NULL DEFAULT 600,
  daily_reboot_limit INTEGER NOT NULL DEFAULT 3,
  auto_recovery      INTEGER NOT NULL DEFAULT 1,
  recovery_strategy  TEXT    NOT NULL DEFAULT 'reboot_then_hard',

  -- 状态
  enabled       INTEGER NOT NULL DEFAULT 1,
  notes         TEXT    NOT NULL DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

-- ========== 4. 监控运行状态表 ==========
CREATE TABLE IF NOT EXISTS monitor_states (
  monitor_id            INTEGER PRIMARY KEY,
  state                 TEXT    NOT NULL DEFAULT 'healthy',
  last_status_value     TEXT    NOT NULL DEFAULT '',
  consecutive_failures  INTEGER NOT NULL DEFAULT 0,
  consecutive_successes INTEGER NOT NULL DEFAULT 0,
  last_check_time       TEXT,
  last_reboot_time      TEXT,
  reboot_count_today    INTEGER NOT NULL DEFAULT 0,
  reboot_date           TEXT,
  first_failure_at      TEXT,
  state_changed_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  reboot_initiated_at   TEXT,
  last_reboot_attempt   TEXT,
  last_operation        TEXT,
  last_operation_time   TEXT,

  FOREIGN KEY (monitor_id) REFERENCES monitors(id)
);

-- ========== 5. 操作日志表 ==========
CREATE TABLE IF NOT EXISTS operation_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id    INTEGER NOT NULL,
  log_type      TEXT    NOT NULL DEFAULT 'check',    -- check/operation/notification
  action        TEXT    NOT NULL DEFAULT '',          -- status/on/off/reboot/hard_reboot/hard_off
  result        TEXT    NOT NULL DEFAULT '',          -- success/failed/timeout
  state_before  TEXT    NOT NULL DEFAULT '',
  state_after   TEXT    NOT NULL DEFAULT '',
  status_value  TEXT    NOT NULL DEFAULT '',
  health        TEXT    NOT NULL DEFAULT '',          -- true/false/null
  duration_ms   INTEGER DEFAULT 0,
  error_msg     TEXT    NOT NULL DEFAULT '',
  detail        TEXT    NOT NULL DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (monitor_id) REFERENCES monitors(id)
);

-- ========== 6. 通知渠道表 ==========
CREATE TABLE IF NOT EXISTS notification_channels (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  type          TEXT    NOT NULL DEFAULT 'webhook',   -- webhook/dingtalk/wecom/telegram
  config        TEXT    NOT NULL DEFAULT '{}',
  enabled       INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ========== 7. 通知日志表 ==========
CREATE TABLE IF NOT EXISTS notification_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id    INTEGER,
  title         TEXT    NOT NULL DEFAULT '',
  message       TEXT    NOT NULL DEFAULT '',
  level         TEXT    NOT NULL DEFAULT 'info',      -- info/warning/critical
  channel_id    INTEGER,
  channel_type  TEXT    NOT NULL DEFAULT '',
  success       INTEGER NOT NULL DEFAULT 0,
  error_msg     TEXT    NOT NULL DEFAULT '',
  sent_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ========== 8. 全局设置表 ==========
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT    NOT NULL DEFAULT '',
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 默认全局设置
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('check_interval', '60'),
  ('suspect_threshold', '2'),
  ('reboot_cooldown', '300'),
  ('recover_timeout', '600'),
  ('recover_check_interval', '60'),
  ('api_timeout', '60'),
  ('default_recovery_strategy', 'reboot_then_hard');

-- 默认管理员（密码: admin，部署后务必修改）
-- password_hash = SHA-256('admin')
INSERT OR IGNORE INTO users (username, password_hash, role, display_name) VALUES
  ('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'admin', '管理员');

-- ========== 索引 ==========
CREATE INDEX IF NOT EXISTS idx_monitors_provider   ON monitors(provider_id);
CREATE INDEX IF NOT EXISTS idx_monitors_host_id    ON monitors(host_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_monitors_provider_host ON monitors(provider_id, host_id);
CREATE INDEX IF NOT EXISTS idx_oplogs_monitor_time ON operation_logs(monitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oplogs_time         ON operation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oplogs_type         ON operation_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_notiflogs_time      ON notification_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifchannels_type  ON notification_channels(type);

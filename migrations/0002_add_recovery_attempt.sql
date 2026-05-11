-- 添加 recovery_attempt 字段到 monitor_states 表
-- 用于独立跟踪当前恢复周期内的尝试次数（与 reboot_count_today 分离）
ALTER TABLE monitor_states ADD COLUMN recovery_attempt INTEGER NOT NULL DEFAULT 0;

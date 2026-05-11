/**
 * Cron 触发器处理
 * 每分钟触发一次监控检查
 */

import type { Env } from './types';
import { getSettings } from './db';
import { runMonitorCycle } from './state-machine';

export async function handleCron(
  controller: ScheduledController,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  console.log('[Cron] 开始监控检查...');
  const startTime = Date.now();

  try {
    const settings = await getSettings(env.DB);
    const results = await runMonitorCycle(env.DB, env.KV, settings);

    const elapsed = Date.now() - startTime;
    const totalServers = results.length;
    const healthy = results.filter(r => r.health === true).length;
    const failing = results.filter(r => r.health === false).length;
    const errors = results.filter(r => r.health === null).length;
    const recovered = results.filter(r => r.recoveryAction && r.recoverySuccess).length;

    console.log(
      `[Cron] 完成 - ${totalServers}台服务器, ` +
      `正常=${healthy}, 异常=${failing}, 检测失败=${errors}, ` +
      `恢复成功=${recovered}, 耗时=${elapsed}ms`
    );
  } catch (err) {
    console.error('[Cron] 监控检查异常:', err);
  }
}

/**
 * 魔方财务 (ZJMF) API 客户端
 * 严格按 sdoclub.com 接口文档实现
 *
 * 9 个 API:
 *   1. POST /v1/login_api                     → 登录获取 JWT
 *   2. GET  /v1/hosts                          → 产品列表
 *   3. GET  /v1/hosts/:id                      → 产品详情
 *   4. GET  /v1/hosts/:id/module/status        → 电源状态
 *   5. PUT  /v1/hosts/:id/module/on            → 开机
 *   6. PUT  /v1/hosts/:id/module/off           → 关机
 *   7. PUT  /v1/hosts/:id/module/reboot        → 软重启
 *   8. PUT  /v1/hosts/:id/module/hard_off      → 硬关机
 *   9. PUT  /v1/hosts/:id/module/hard_reboot   → 硬重启
 */

import type { Provider } from './types';

// ==================== JWT 缓存 ====================

interface ZJMFClientState {
  jwtToken: string;
  jwtExpireTime: number; // unix timestamp (seconds)
}

// JWT 有效期：2 小时，提前 10 分钟刷新
const JWT_LIFETIME = 7000; // seconds (~2h - 10min)
const DEFAULT_TIMEOUT_SEC = 30; // 默认超时（秒），实际由 api_timeout 设置覆盖

async function getClientState(KV: KVNamespace, providerId: number): Promise<ZJMFClientState> {
  const cached = await KV.get(`jwt:zjmf:${providerId}`, 'text');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  return { jwtToken: '', jwtExpireTime: 0 };
}

async function saveClientState(KV: KVNamespace, providerId: number, state: ZJMFClientState): Promise<void> {
  await KV.put(`jwt:zjmf:${providerId}`, JSON.stringify(state), {
    expirationTtl: JWT_LIFETIME + 600,
  });
}

// ==================== 认证 ====================

/**
 * 登录获取 JWT
 * POST /v1/login_api?account=xx&password=xx
 */
async function login(
  provider: Provider,
  KV: KVNamespace,
  force = false,
  timeout?: number
): Promise<string | null> {
  const state = await getClientState(KV, provider.id);

  if (!force && state.jwtToken && Date.now() / 1000 < state.jwtExpireTime) {
    return state.jwtToken;
  }

  const url = `${provider.api_base_url}/login_api`;
  // ZJMF API 要求凭据通过 query params 传递（API 文档: POST /v1/login_api?account=xx&password=xx）
  // 注意: 凭据在 URL 中存在服务端日志泄露风险，但 ZJMF API 不支持 body 传参
  const params = new URLSearchParams({
    account: provider.api_account,
    password: provider.api_password,
  });

  try {
    const resp = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout((timeout || DEFAULT_TIMEOUT_SEC) * 1000),
    });

    if (resp.ok) {
      const data = await resp.json() as Record<string, unknown>;
      // 返回格式: { status: 200, msg: "success", jwt: "xxx" }
      const jwt = (data.jwt as string) || ((data.data as Record<string, unknown>)?.jwt as string);

      if (jwt) {
        const newState: ZJMFClientState = {
          jwtToken: jwt,
          jwtExpireTime: Math.floor(Date.now() / 1000) + JWT_LIFETIME,
        };
        await saveClientState(KV, provider.id, newState);
        return jwt;
      }
    }
    console.error(`[ZJMF:${provider.name}] Login failed: HTTP ${resp.status}`);
    return null;
  } catch (err) {
    console.error(`[ZJMF:${provider.name}] Login error:`, err);
    return null;
  }
}

/**
 * 带认证重试的请求
 */
async function authedRequest(
  provider: Provider,
  KV: KVNamespace,
  method: string,
  path: string,
  params?: Record<string, string>,
  body?: string,
  timeout?: number
): Promise<Response | null> {
  let token = await login(provider, KV, false, timeout);
  if (!token) return null;

  const baseUrl = provider.api_base_url.replace(/\/+$/, '');
  let url = `${baseUrl}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    Authorization: `JWT ${token}`,
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  };

  try {
    let resp = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout((timeout || DEFAULT_TIMEOUT_SEC) * 1000),
    });

    // JWT 过期，重新登录重试一次
    if (resp.status === 401 || resp.status === 403) {
      console.warn(`[ZJMF:${provider.name}] JWT expired, re-login...`);
      token = await login(provider, KV, true, timeout);
      if (token) {
        headers.Authorization = `JWT ${token}`;
        resp = await fetch(url, {
          method,
          headers,
          body,
          signal: AbortSignal.timeout((timeout || DEFAULT_TIMEOUT_SEC) * 1000),
        });
      }
    }

    return resp;
  } catch (err) {
    console.error(`[ZJMF:${provider.name}] Request error [${method} ${path}]:`, err);
    return null;
  }
}

// ==================== API: 产品列表 ====================

/**
 * 获取产品列表
 * GET /v1/hosts?page=1&limit=100
 *
 * 返回格式:
 * {
 *   "total": 1,
 *   "_host": [{ id, type, domain, domainstatus, dedicatedip, product_name, ... }],
 *   "domainstatus": { "Active": { "name": "已激活", "color": "#3fbf70" }, ... }
 * }
 */
export async function getHosts(
  provider: Provider,
  KV: KVNamespace,
  page = 1,
  limit = 100,
  timeout?: number
): Promise<{ total: number; hosts: Record<string, unknown>[]; domainstatus: Record<string, unknown> } | null> {
  const resp = await authedRequest(provider, KV, 'GET', '/hosts', {
    page: String(page),
    limit: String(limit),
  }, undefined, timeout);
  if (!resp) return null;

  if (!resp.ok) {
    console.error(`[ZJMF:${provider.name}] getHosts failed: HTTP ${resp.status}`);
    return null;
  }

  const data = await resp.json() as Record<string, unknown>;
  const total = (data.total as number) || 0;
  const domainstatus = (data.domainstatus as Record<string, unknown>) || {};

  // _host 是数组
  let hosts: Record<string, unknown>[] = [];
  if (Array.isArray(data._host)) {
    hosts = data._host as Record<string, unknown>[];
  } else if (data.data && typeof data.data === 'object') {
    const rawData = data.data as Record<string, unknown>;
    if (Array.isArray(rawData._host)) {
      hosts = rawData._host as Record<string, unknown>[];
    } else if (Array.isArray(rawData.host)) {
      hosts = rawData.host as Record<string, unknown>[];
    } else if (Array.isArray(rawData.list)) {
      hosts = rawData.list as Record<string, unknown>[];
    }
  }

  return { total, hosts: hosts.filter(h => h && typeof h === 'object'), domainstatus };
}

// ==================== API: 产品详情 ====================

/**
 * 获取产品详情
 * GET /v1/hosts/:id
 *
 * 已知返回格式（不同 ZJMF 版本）:
 * 格式A: { "_host": {...}, "_config_option": [...], "_custom_field": [...] }
 * 格式B: { "status": 200, "data": { "host": {...}, "config_option": [...], "custom_field": [...] } }
 * 格式C: { "status": 200, "data": { "_host": {...} } }
 */
export async function getHostDetail(
  provider: Provider,
  KV: KVNamespace,
  hostId: string,
  timeout?: number
): Promise<Record<string, unknown> | null> {
  const resp = await authedRequest(provider, KV, 'GET', `/hosts/${hostId}`, undefined, undefined, timeout);
  if (!resp) return null;

  if (!resp.ok) {
    console.error(`[ZJMF:${provider.name}] getHostDetail [${hostId}] failed: HTTP ${resp.status}`);
    return null;
  }

  const data = await resp.json() as Record<string, unknown>;

  // 格式A: 顶层 _host (旧版 ZJMF)
  if (data._host && typeof data._host === 'object') {
    return data._host as Record<string, unknown>;
  }

  // 格式B/C: 嵌套在 data 字段中
  if (data.data && typeof data.data === 'object') {
    const inner = data.data as Record<string, unknown>;
    // 格式B: data.host (核云/heyunidc 实际格式)
    if (inner.host && typeof inner.host === 'object') {
      return inner.host as Record<string, unknown>;
    }
    // 格式C: data._host
    if (inner._host && typeof inner._host === 'object') {
      return inner._host as Record<string, unknown>;
    }
  }

  // 格式D: 顶层 host (兜底)
  if (data.host && typeof data.host === 'object') {
    return data.host as Record<string, unknown>;
  }

  console.error(`[ZJMF:${provider.name}] getHostDetail [${hostId}] unexpected response format, keys:`, Object.keys(data));
  return null;
}

// ==================== API: 电源状态 ====================

/**
 * 获取电源状态
 * GET /v1/hosts/:id/module/status?type=host
 * 返回 "on"=运行中, "off"=已关机, "unknown"/其他=未知
 */
export async function getStatus(
  provider: Provider,
  KV: KVNamespace,
  hostId: string,
  timeout?: number
): Promise<string | null> {
  const resp = await authedRequest(
    provider, KV, 'GET', `/hosts/${hostId}/module/status`, { type: 'host' }, undefined, timeout
  );
  if (!resp) return null;

  if (!resp.ok) {
    console.error(`[ZJMF:${provider.name}] getStatus [${hostId}] failed: HTTP ${resp.status}`);
    return null;
  }

  try {
    const text = await resp.text();
    // 可能直接返回纯文本 "on" 或 "off"
    const trimmed = text.trim().toLowerCase();
    if (trimmed === 'on' || trimmed === 'off') return trimmed;

    // 也可能是 JSON: { "status": "on" } 或 { "data": { "status": "on" } }
    const data = JSON.parse(text) as Record<string, unknown>;
    if (typeof data.status === 'string') return data.status;
    if (data.data && typeof data.data === 'object') {
      const inner = data.data as Record<string, unknown>;
      if (typeof inner.status === 'string') return inner.status;
      if (typeof inner.state === 'string') return inner.state;
    }
    return null;
  } catch {
    return null;
  }
}

// ==================== API: 电源控制 ====================

/** 通用电源操作 */
async function powerAction(
  provider: Provider,
  KV: KVNamespace,
  hostId: string,
  action: string,
  timeout?: number
): Promise<{ success: boolean; msg: string }> {
  const resp = await authedRequest(provider, KV, 'PUT', `/hosts/${hostId}/module/${action}`, undefined, undefined, timeout);
  if (!resp) return { success: false, msg: 'API 请求失败' };

  if (resp.ok) {
    return { success: true, msg: `${action} 指令已发送` };
  }

  const text = await resp.text().catch(() => '');
  return { success: false, msg: `HTTP ${resp.status}: ${text.slice(0, 200)}` };
}

/**
 * 开机
 * PUT /v1/hosts/:id/module/on
 */
export async function on(
  provider: Provider,
  KV: KVNamespace,
  hostId: string,
  timeout?: number
): Promise<{ success: boolean; msg: string }> {
  return powerAction(provider, KV, hostId, 'on', timeout);
}

/**
 * 关机
 * PUT /v1/hosts/:id/module/off
 */
export async function off(
  provider: Provider,
  KV: KVNamespace,
  hostId: string,
  timeout?: number
): Promise<{ success: boolean; msg: string }> {
  return powerAction(provider, KV, hostId, 'off', timeout);
}

/**
 * 软重启
 * PUT /v1/hosts/:id/module/reboot
 */
export async function reboot(
  provider: Provider,
  KV: KVNamespace,
  hostId: string,
  timeout?: number
): Promise<{ success: boolean; msg: string }> {
  return powerAction(provider, KV, hostId, 'reboot', timeout);
}

/**
 * 硬关机
 * PUT /v1/hosts/:id/module/hard_off
 */
export async function hardOff(
  provider: Provider,
  KV: KVNamespace,
  hostId: string,
  timeout?: number
): Promise<{ success: boolean; msg: string }> {
  return powerAction(provider, KV, hostId, 'hard_off', timeout);
}

/**
 * 硬重启
 * PUT /v1/hosts/:id/module/hard_reboot
 */
export async function hardReboot(
  provider: Provider,
  KV: KVNamespace,
  hostId: string,
  timeout?: number
): Promise<{ success: boolean; msg: string }> {
  return powerAction(provider, KV, hostId, 'hard_reboot', timeout);
}

// ==================== API: 图表 ====================


// ==================== 自动发现 ====================

export interface DiscoveredHost {
  id: string;
  name: string;
  ip: string;
  domainstatus: string;
  product_name: string;
  type: string;
}

/**
 * 自动发现服务器（从 API 拉取产品列表）
 */
export async function autoDiscover(
  provider: Provider,
  KV: KVNamespace,
  timeout?: number
): Promise<DiscoveredHost[]> {
  const result = await getHosts(provider, KV, 1, 100, timeout);
  if (!result) return [];

  const discovered: DiscoveredHost[] = [];

  for (const host of result.hosts) {
    const hostId = String(host.id ?? host.host_id ?? '');
    if (!hostId) continue;

    discovered.push({
      id: hostId,
      name: String(host.product_name ?? host.name ?? host.domain ?? `Server-${hostId}`),
      ip: String(host.dedicatedip ?? host.ip ?? host.host_ip ?? ''),
      domainstatus: String(host.domainstatus ?? ''),
      product_name: String(host.product_name ?? ''),
      type: String(host.type ?? ''),
    });
  }

  return discovered;
}

/**
 * 测试连接（登录 + 拉取产品列表）
 */
export async function testConnection(
  provider: Provider,
  KV: KVNamespace,
  timeout?: number
): Promise<{ success: boolean; msg: string; hostCount?: number }> {
  const token = await login(provider, KV, true, timeout);
  if (!token) {
    return { success: false, msg: '登录失败，请检查 API 地址、账号和密码' };
  }

  const hosts = await getHosts(provider, KV, 1, 100, timeout);
  if (!hosts) {
    return { success: false, msg: '登录成功但获取产品列表失败' };
  }

  return {
    success: true,
    msg: `连接成功，发现 ${hosts.total} 台产品`,
    hostCount: hosts.total,
  };
}

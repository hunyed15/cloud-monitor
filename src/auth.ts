/**
 * JWT 认证模块
 * - 签发/验证 JWT（使用 Web Crypto API，Workers 原生支持）
 * - Hono 中间件：authMiddleware
 * - 登录接口处理
 */

import type { Context, Next } from 'hono';
import type { Env } from './types';

// ==================== JWT 工具 ====================

interface JWTPayload {
  sub: number;      // user.id
  username: string;
  role: string;
  iat: number;      // issued at (seconds)
  exp: number;      // expiration (seconds)
}

const JWT_EXPIRY = 86400; // 24 小时

/** 将 ArrayBuffer 转为 Base64URL 字符串 */
function toBase64URL(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 将字符串转为 Uint8Array */
function toUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** 从密码推导 HMAC 密钥 */
async function getSecretKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    toUint8Array(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/** 签发 JWT */
export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRY,
  };

  const header = toBase64URL(toUint8Array(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = toBase64URL(toUint8Array(JSON.stringify(fullPayload)));
  const signingInput = `${header}.${body}`;

  const key = await getSecretKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, toUint8Array(signingInput));
  const sig = toBase64URL(signature);

  return `${signingInput}.${sig}`;
}

/** 验证 JWT，返回 payload 或 null */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, sig] = parts;
  const signingInput = `${header}.${body}`;

  try {
    const key = await getSecretKey(secret);

    // 将 Base64URL 转回 ArrayBuffer
    const sigStr = atob(sig.replace(/-/g, '+').replace(/_/g, '/'));
    const sigBytes = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) sigBytes[i] = sigStr.charCodeAt(i);

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, toUint8Array(signingInput));
    if (!valid) return null;

    const payload: JWTPayload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));

    // 检查过期
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ==================== 密码工具 ====================

/** 生成随机 salt (16字节 hex) */
function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 哈希 (内部) */
async function sha256(input: string): Promise<string> {
  const data = toUint8Array(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** 加盐哈希密码 — 格式: salt$hash */
export async function hashPassword(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await sha256(salt + password);
  return salt + '$' + hash;
}

/** 验证密码 — 兼容旧的无盐格式 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.includes('$')) {
    // 新格式: salt$hash
    const [salt, hash] = stored.split('$', 2);
    const computed = await sha256(salt + password);
    return computed === hash;
  } else {
    // 旧格式: 纯 SHA-256 (向后兼容)
    const computed = await sha256(password);
    return computed === stored;
  }
}

// ==================== Hono 中间件 ====================

declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

/**
 * JWT 认证中间件
 * 从 Authorization: Bearer <token> 提取并验证 JWT
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: '未提供认证令牌', timestamp: new Date().toISOString() }, 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ success: false, error: '认证令牌无效或已过期', timestamp: new Date().toISOString() }, 401);
  }

  c.set('user', payload);
  await next();
}


/** 从上下文获取当前用户信息 */
export function getCurrentUser(c: Context<{ Bindings: Env }>): JWTPayload | null {
  return c.get('user') || null;
}

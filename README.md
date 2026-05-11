# Cloud Monitor

基于 Cloudflare Workers 的免费服务器监控与自动恢复平台。

检测服务器异常 → 自动重启恢复 → 通知告警，全部运行在 Cloudflare 免费套餐上，零服务器成本。

## 功能特性

- **5 状态机引擎** — healthy → suspect → down → rebooting → recovering，精准跟踪服务器生命周期
- **自动恢复** — 检测宕机后自动执行重启，支持多级策略（软重启 → 硬重启 → 开机）
- **魔方财务 (ZJMF) 集成** — 直接对接魔方云面板 API，获取服务器状态、执行电源操作
- **Cron 定时检测** — 每分钟自动巡检，无需额外调度服务
- **多渠道通知** — Webhook / 钉钉 / 企业微信 / Telegram
- **深色/浅色主题** — Mission Control 风格 UI，一键切换
- **零成本部署** — Workers + D1 + KV 全部在 Cloudflare 免费额度内

## 技术栈

| 组件 | 技术 | Cloudflare 产品 |
|------|------|----------------|
| 运行时 | Hono.js | Workers |
| 数据库 | SQLite | D1 |
| 缓存 | JWT 会话 | KV |
| 定时任务 | Cron | Cron Triggers |

## 架构

```
┌─────────────────────────────────────────────┐
│              Cloudflare Workers              │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ API 路由  │  │ SPA 前端  │  │ Cron 检测  │ │
│  │ (Hono.js) │  │ (内嵌HTML)│  │ (每分钟)   │ │
│  └─────┬────┘  └──────────┘  └─────┬─────┘ │
│        │                            │        │
│  ┌─────▼────────────────────────────▼─────┐ │
│  │             状态机引擎                    │ │
│  │  healthy → suspect → down → rebooting   │ │
│  │                → recovering             │ │
│  └─────┬────────────────────────┬─────────┘ │
│        │                        │            │
│  ┌─────▼──────┐          ┌─────▼──────────┐ │
│  │  D1 数据库  │          │ ZJMF API 客户端 │ │
│  │  (SQLite)  │          │ (服务器操作)     │ │
│  └────────────┘          └────────────────┘ │
│                                              │
│  ┌────────────┐  ┌────────────────────────┐ │
│  │  KV 缓存    │  │     通知系统            │ │
│  │ (JWT 会话)  │  │ Webhook/钉钉/企微/TG   │ │
│  └────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## 前置要求

- [Node.js](https://nodejs.org/) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)（通过 npm 安装）
- Cloudflare 账号（免费即可）

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/cloud-monitor.git
cd cloud-monitor
npm install
```

### 2. 创建 Cloudflare 资源

```bash
# 创建 D1 数据库
npx wrangler d1 create cloud-monitor-db

# 创建 KV 命名空间
npx wrangler kv namespace create cloud-monitor-kv
```

执行后 Cloudflare 会输出 `database_id` 和 KV `id`，记下来。

### 3. 配置 wrangler.toml

```bash
# 复制模板
cp wrangler.example.toml wrangler.toml
```

编辑 `wrangler.toml`，填入上一步获得的 ID：

```toml
[[d1_databases]]
database_id = "你的-database-id"

[[kv_namespaces]]
id = "你的-kv-namespace-id"
```

### 4. 初始化数据库

```bash
npx wrangler d1 migrations apply cloud-monitor-db
```

### 5. 设置 JWT 密钥

```bash
# 生产环境：通过 secret 设置（推荐）
npx wrangler secret put JWT_SECRET

# 本地开发：在项目根目录创建 .dev.vars 文件
echo 'JWT_SECRET="your-random-secret"' > .dev.vars
```

### 6. 部署

```bash
npx wrangler deploy
```

部署成功后访问输出的 URL，使用默认账号登录：

- 用户名：`admin`
- 密码：`admin`

**⚠️ 登录后请立即修改默认密码！**

### 7. 本地开发

```bash
npx wrangler dev
```

## 使用指南

### 添加服务商

1. 进入「系统设置」→「服务商」
2. 填写魔方财务面板的 API 地址、登录账号和密码
3. 测试连接

### 添加监控

1. 进入「监控管理」→ 点击「添加监控」
2. 选择服务商，从产品列表中选取服务器
3. 配置监控参数（检测间隔、失败阈值、恢复策略等）

### 恢复策略

| 策略 | 说明 |
|------|------|
| `reboot_then_hard` | 先软重启，失败后硬重启，仍失败则开机（默认） |
| `hard_only` | 直接硬重启，跳过软重启 |

### 状态流转

```
healthy ──(连续失败达阈值)──→ suspect ──(继续失败)──→ down
   ▲                                                    │
   │                                              reboot/hard_reboot
   │                                                    │
   │                                                    ▼
   └────────(检测成功)────────── recovering ←─── rebooting
```

## 项目结构

```
cloud-monitor/
├── src/
│   ├── index.ts          # API 路由入口
│   ├── frontend.ts       # 前端 SPA (CSS + JS + HTML)
│   ├── auth.ts           # JWT 认证模块
│   ├── db.ts             # 数据库操作层
│   ├── zjmf.ts           # 魔方财务 API 客户端
│   ├── state-machine.ts  # 5 状态机引擎
│   ├── types.ts          # 类型定义
│   └── cron.ts           # Cron 定时检查
├── migrations/
│   ├── 0001_init.sql     # 数据库初始化（8 表）
│   └── 0002_add_recovery_attempt.sql
├── wrangler.example.toml # 配置模板
├── wrangler.toml         # 本地配置（不提交）
└── package.json
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| GET | `/api/dashboard` | 仪表盘数据 |
| GET/POST | `/api/monitors` | 监控列表 / 创建 |
| GET/PUT/DELETE | `/api/monitors/:id` | 监控详情 / 更新 / 删除 |
| POST | `/api/monitors/:id/sync` | 同步服务器信息 |
| POST | `/api/monitors/:id/check` | 手动检测 |
| POST | `/api/monitors/:id/power` | 电源操作 |
| GET/POST | `/api/providers` | 服务商列表 / 创建 |
| GET | `/api/logs` | 操作日志 |
| GET/POST | `/api/notifications` | 通知渠道 |
| GET/PUT | `/api/settings` | 全局设置 |

## 鸣谢

本项目在开发过程中得到了以下项目和服务的大力支持：

- [**WorkBuddy**](https://www.codebuddy.cn/work/) — 腾讯出品的 AI 桌面智能体工作台，本项目的绝大部分代码由 WorkBuddy 驱动的 GLM-5.1 生成
- [**GLM-5.1**](https://github.com/zai-org/GLM-5) — 智谱 AI 开源旗舰模型，提供了强大的代码生成与工程推理能力
- [**Cloudflare Workers**](https://workers.cloudflare.com/) — 提供免费的 Serverless 计算资源，使本项目零成本运行
- [**智简魔方 (ZJMF)**](https://www.idcsmart.com/) — 魔方财务系统提供了服务器管理的 API 接口，是监控与自动恢复能力的基石

## 许可证

MIT License

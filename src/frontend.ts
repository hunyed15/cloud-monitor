/**
 * Cloud Monitor - Phase 2 前端
 * 自包含 SPA，由 Worker 直接返回 HTML
 *
 * 设计风格: "Mission Control" 深空监控站
 * - 深色工业风 + 电光青色主调
 * - 脉冲状态指示器、玻璃质感卡片
 * - Space Grotesk 标题 + JetBrains Mono 数据字体
 */

// ==================== 导出 HTML ====================
// CSS 和 JS 代码分别定义，最后拼接成完整 HTML
// 避免在 TS 模板字符串中嵌套 JS 反引号模板字符串

export function getFrontendHTML(): string {
  return '<!DOCTYPE html>\n' +
    '<html lang="zh-CN">\n' +
    '<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>Cloud Monitor - 服务器监控平台</title>\n' +
    '<link rel="icon" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>📡</text></svg>">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">\n' +
    '<style>\n' + CSS_CODE + '\n</style>\n' +
    '</head>\n' +
    '<body>\n' +
    '<div id="app"></div>\n' +
    '<div class="toast-container" id="toasts"></div>\n' +
    '<script>\n' + JS_CODE + '\n</script>\n' +
    '</body>\n' +
    '</html>';
}

// ==================== CSS 样式 ====================
const CSS_CODE = `
/* 字体通过 <link> 异步加载，避免 @import 渲染阻塞 */

:root {
  --bg-deep: #060a13; --bg: #0a0e17; --surface: #111827;
  --surface-hover: #1a2332; --card: #151d2c;
  --card-border: rgba(56, 189, 248, 0.08); --card-border-hover: rgba(56, 189, 248, 0.2);
  --primary: #38bdf8; --primary-dim: rgba(56, 189, 248, 0.15); --primary-glow: rgba(56, 189, 248, 0.3);
  --success: #34d399; --success-dim: rgba(52, 211, 153, 0.15);
  --warning: #fbbf24; --warning-dim: rgba(251, 191, 36, 0.15);
  --danger: #f87171; --danger-dim: rgba(248, 113, 113, 0.15);
  --info: #818cf8; --info-dim: rgba(129, 140, 248, 0.15);
  --text: #e2e8f0; --text-secondary: #94a3b8; --muted: #64748b;
  --border: #1e293b;
  --font-display: 'Space Grotesk', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-body: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  --radius: 10px; --radius-sm: 6px; --radius-lg: 16px;
  --shadow: 0 4px 24px rgba(0,0,0,0.4); --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  --grid-line: rgba(56,189,248,0.03);
  --td-border: rgba(30,41,59,0.5);
  --modal-shadow: 0 20px 60px rgba(0,0,0,0.5);
  --overlay-bg: rgba(0,0,0,0.6);
  --login-card-shadow: 0 20px 60px rgba(0,0,0,0.4);
  --toast-success-bg: #065f46; --toast-success-text: #6ee7b7;
  --toast-error-bg: #7f1d1d; --toast-error-text: #fca5a5;
  --toast-warning-bg: #78350f; --toast-warning-text: #fde68a;
  --toast-info-bg: #312e81; --toast-info-text: #c4b5fd;
}
/* ====== 浅色主题 ====== */
[data-theme="light"] {
  --bg-deep: #f0f4f8; --bg: #f8fafc; --surface: #e2e8f0;
  --surface-hover: #cbd5e1; --card: #ffffff;
  --card-border: rgba(15, 23, 42, 0.08); --card-border-hover: rgba(56, 189, 248, 0.25);
  --primary: #0284c7; --primary-dim: rgba(2, 132, 199, 0.1); --primary-glow: rgba(2, 132, 199, 0.2);
  --success: #059669; --success-dim: rgba(5, 150, 105, 0.1);
  --warning: #d97706; --warning-dim: rgba(217, 119, 6, 0.1);
  --danger: #dc2626; --danger-dim: rgba(220, 38, 38, 0.1);
  --info: #6366f1; --info-dim: rgba(99, 102, 241, 0.1);
  --text: #0f172a; --text-secondary: #475569; --muted: #94a3b8;
  --border: #cbd5e1;
  --shadow: 0 4px 24px rgba(0,0,0,0.08);
  --grid-line: rgba(15, 23, 42, 0.03);
  --td-border: rgba(203,213,225,0.6);
  --modal-shadow: 0 20px 60px rgba(0,0,0,0.15);
  --overlay-bg: rgba(0,0,0,0.3);
  --login-card-shadow: 0 20px 60px rgba(0,0,0,0.1);
  --toast-success-bg: #ecfdf5; --toast-success-text: #065f46;
  --toast-error-bg: #fef2f2; --toast-error-text: #991b1b;
  --toast-warning-bg: #fffbeb; --toast-warning-text: #92400e;
  --toast-info-bg: #eef2ff; --toast-info-text: #3730a3;
}
[data-theme="light"] body::before {
  background-image: linear-gradient(rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.03) 1px, transparent 1px);
}
.theme-toggle {
  background: none; border: none; color: var(--muted); cursor: pointer;
  font-size: 14px; padding: 4px 6px; transition: color var(--transition); border-radius: var(--radius-sm);
  line-height: 1;
}
.theme-toggle:hover { color: var(--primary); background: var(--primary-dim); }
* { margin: 0; padding: 0; box-sizing: border-box; }
html { font-size: 14px; }
body { font-family: var(--font-body); background: var(--bg); color: var(--text); min-height: 100vh; overflow-x: hidden; }
body::before {
  content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background-image: linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 40px 40px; pointer-events: none; z-index: 0;
}
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg-deep); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted); }

.app-layout { display: flex; min-height: 100vh; position: relative; z-index: 1; }
.sidebar {
  width: 220px; background: var(--bg-deep); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100;
  transition: transform var(--transition);
}
.sidebar-brand { padding: 20px 18px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
.sidebar-brand .logo {
  width: 32px; height: 32px; background: linear-gradient(135deg, var(--primary), #818cf8);
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: var(--bg-deep);
}
.sidebar-brand h1 {
  font-family: var(--font-display); font-size: 15px; font-weight: 700;
  background: linear-gradient(135deg, var(--primary), #c4b5fd);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.sidebar-brand .version { font-size: 10px; color: var(--muted); font-family: var(--font-mono); }
.sidebar-nav { flex: 1; padding: 12px 10px; }
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: var(--radius-sm);
  color: var(--text-secondary); cursor: pointer; transition: all var(--transition);
  font-size: 13px; font-weight: 500; margin-bottom: 2px; text-decoration: none;
}
.nav-item:hover { background: var(--surface); color: var(--text); }
.nav-item.active { background: var(--primary-dim); color: var(--primary); box-shadow: inset 3px 0 0 var(--primary); }
.nav-item .icon { font-size: 16px; width: 20px; text-align: center; }
.nav-item .badge { margin-left: auto; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-family: var(--font-mono); font-weight: 600; }
.nav-item .badge.danger { background: var(--danger-dim); color: var(--danger); }
.sidebar-footer { padding: 14px 16px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
.sidebar-footer .avatar {
  width: 32px; height: 32px; border-radius: 50%; background: var(--primary-dim);
  display: flex; align-items: center; justify-content: center; color: var(--primary); font-weight: 600; font-size: 13px;
}
.sidebar-footer .user-info { flex: 1; }
.sidebar-footer .user-name { font-size: 12px; font-weight: 600; }
.sidebar-footer .user-role { font-size: 10px; color: var(--muted); }
.sidebar-footer .logout-btn { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 16px; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color var(--transition); }
.sidebar-footer .logout-btn:hover { color: var(--danger); }
.main-content { flex: 1; margin-left: 220px; min-height: 100vh; }
.page-header { padding: 24px 32px 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-header h2 { font-family: var(--font-display); font-size: 22px; font-weight: 700; }
.page-header .subtitle { font-size: 12px; color: var(--muted); margin-top: 2px; }
.page-body { padding: 20px 32px 32px; }

.btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
  border: none; border-radius: var(--radius-sm); font-family: var(--font-body);
  font-size: 12px; font-weight: 600; cursor: pointer; transition: all var(--transition);
  text-decoration: none; white-space: nowrap;
}
.btn-primary { background: var(--primary); color: var(--bg-deep); }
.btn-primary:hover { background: #7dd3fc; box-shadow: 0 0 16px var(--primary-glow); }
.btn-success { background: var(--success); color: var(--bg-deep); }
.btn-success:hover { background: #6ee7b7; }
.btn-warning { background: var(--warning); color: var(--bg-deep); }
.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover { background: #fca5a5; }
.btn-ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
.btn-ghost:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-dim); }
.btn-sm { padding: 5px 10px; font-size: 11px; }
.btn-xs { padding: 3px 8px; font-size: 10px; border-radius: 4px; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.card { background: var(--card); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 20px; transition: all var(--transition); }
.card:hover { border-color: var(--card-border-hover); }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.card-title { font-weight: 600; font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 14px; margin-bottom: 24px; }
.stat-card {
  background: var(--card); border: 1px solid var(--card-border); border-radius: var(--radius);
  padding: 18px; position: relative; overflow: hidden; transition: all var(--transition);
}
.stat-card:hover { border-color: var(--card-border-hover); transform: translateY(-1px); }
.stat-card .stat-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; margin-bottom: 12px; }
.stat-card .stat-value { font-family: var(--font-mono); font-size: 26px; font-weight: 700; line-height: 1; }
.stat-card .stat-label { font-size: 11px; color: var(--muted); margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-card.primary .stat-icon { background: var(--primary-dim); color: var(--primary); }
.stat-card.primary .stat-value { color: var(--primary); }
.stat-card.success .stat-icon { background: var(--success-dim); color: var(--success); }
.stat-card.success .stat-value { color: var(--success); }
.stat-card.warning .stat-icon { background: var(--warning-dim); color: var(--warning); }
.stat-card.warning .stat-value { color: var(--warning); }
.stat-card.danger .stat-icon { background: var(--danger-dim); color: var(--danger); }
.stat-card.danger .stat-value { color: var(--danger); }
.stat-card.info .stat-icon { background: var(--info-dim); color: var(--info); }
.stat-card.info .stat-value { color: var(--info); }

.pulse { width: 10px; height: 10px; border-radius: 50%; display: inline-block; position: relative; flex-shrink: 0; }
.pulse::after { content: ''; position: absolute; top: 50%; left: 50%; width: 10px; height: 10px; border-radius: 50%; animation: pulse-ring 2s ease-out infinite; }
.pulse.healthy { background: var(--success); }
.pulse.healthy::after { border: 2px solid var(--success); }
.pulse.suspect { background: var(--warning); }
.pulse.suspect::after { border: 2px solid var(--warning); }
.pulse.down { background: var(--danger); animation: pulse-blink 1s ease-in-out infinite; }
.pulse.down::after { border: 2px solid var(--danger); }
.pulse.rebooting { background: var(--info); animation: pulse-blink 0.6s ease-in-out infinite; }
.pulse.rebooting::after { border: 2px solid var(--info); }
.pulse.recovering { background: var(--primary); animation: pulse-blink 0.8s ease-in-out infinite; }
.pulse.recovering::after { border: 2px solid var(--primary); }
@keyframes pulse-ring { 0% { transform: translate(-50%, -50%) scale(0.8); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
@keyframes pulse-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

.state-tag {
  display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
}
.state-tag.healthy { background: var(--success-dim); color: var(--success); }
.state-tag.suspect { background: var(--warning-dim); color: var(--warning); }
.state-tag.down { background: var(--danger-dim); color: var(--danger); }
.state-tag.rebooting { background: var(--info-dim); color: var(--info); }
.state-tag.recovering { background: var(--primary-dim); color: var(--primary); }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 10px 14px; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); font-weight: 600; }
td { padding: 12px 14px; border-bottom: 1px solid var(--td-border); font-size: 13px; }
tr:hover td { background: var(--surface); }

.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 500; }
.form-input, .form-select {
  width: 100%; padding: 9px 14px; background: var(--bg-deep); border: 1px solid var(--border);
  border-radius: var(--radius-sm); color: var(--text); font-family: var(--font-body);
  font-size: 13px; transition: border-color var(--transition); outline: none;
}
.form-input:focus, .form-select:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-dim); }
.form-input::placeholder { color: var(--muted); }
.form-select {
  cursor: pointer; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
}
.form-hint { font-size: 11px; color: var(--muted); margin-top: 4px; }
.form-row { display: flex; gap: 12px; }
.form-row > * { flex: 1; }

.server-cards { display: grid; gap: 14px; }
.server-card {
  background: var(--card); border: 1px solid var(--card-border); border-radius: var(--radius);
  padding: 18px 20px; display: flex; align-items: center; gap: 16px; transition: all var(--transition); cursor: pointer;
}
.server-card:hover { border-color: var(--card-border-hover); background: var(--surface-hover); }
.server-card .sc-indicator { flex-shrink: 0; }
.server-card .sc-info { flex: 1; min-width: 0; }
.server-card .sc-name { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; }
.server-card .sc-ip { font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.server-card .sc-meta { display: flex; gap: 16px; margin-top: 6px; font-size: 11px; color: var(--muted); }
.server-card .sc-meta span { display: flex; align-items: center; gap: 4px; }
.server-card .sc-actions { display: flex; gap: 6px; flex-shrink: 0; }

.toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; }
.toast { padding: 12px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; min-width: 260px; animation: toast-in 0.3s ease-out; box-shadow: var(--shadow); transition: opacity 0.3s ease-out; }
.toast.success { background: var(--toast-success-bg); color: var(--toast-success-text); border-left: 3px solid var(--success); }
.toast.error { background: var(--toast-error-bg); color: var(--toast-error-text); border-left: 3px solid var(--danger); }
.toast.warning { background: var(--toast-warning-bg); color: var(--toast-warning-text); border-left: 3px solid var(--warning); }
.toast.info { background: var(--toast-info-bg); color: var(--toast-info-text); border-left: 3px solid var(--info); }
@keyframes toast-in { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }

.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: var(--overlay-bg); backdrop-filter: blur(4px);
  z-index: 1000; display: flex; align-items: center; justify-content: center; animation: fade-in 0.2s ease-out;
}
.modal {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 28px; width: 90%; max-width: 520px; max-height: 80vh; overflow-y: auto;
  box-shadow: var(--modal-shadow); animation: modal-in 0.25s ease-out;
}
.modal h3 { font-family: var(--font-display); font-size: 18px; font-weight: 700; margin-bottom: 16px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes modal-in { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }

.empty-state { text-align: center; padding: 60px 20px; color: var(--muted); }
.empty-state .icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
.empty-state h3 { font-size: 16px; color: var(--text-secondary); margin-bottom: 8px; }
.empty-state p { font-size: 13px; max-width: 360px; margin: 0 auto 20px; }

.spinner { width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-center { display: flex; align-items: center; justify-content: center; padding: 60px; }

.wizard-steps { display: flex; gap: 0; margin-bottom: 28px; border-bottom: 1px solid var(--border); padding-bottom: 0; }
.wizard-step { flex: 1; padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--muted); text-align: center; position: relative; text-transform: uppercase; letter-spacing: 0.5px; }
.wizard-step.active { color: var(--primary); }
.wizard-step.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: var(--primary); }
.wizard-step.done { color: var(--success); }

.detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.detail-item { padding: 10px 0; }
.detail-item .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.detail-item .value { font-size: 14px; font-weight: 500; }
.detail-item .value.mono { font-family: var(--font-mono); font-size: 13px; }

.power-panel { display: flex; gap: 10px; flex-wrap: wrap; }
.power-btn {
  padding: 10px 18px; border-radius: var(--radius-sm); font-family: var(--font-body);
  font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid var(--border);
  background: var(--surface); color: var(--text-secondary); transition: all var(--transition);
  display: flex; align-items: center; gap: 6px;
}
.power-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-dim); }
.power-btn.danger-action:hover { border-color: var(--danger); color: var(--danger); background: var(--danger-dim); }
.power-btn:disabled { opacity: 0.3; cursor: not-allowed; }


.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.login-page::before {
  content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
  background: radial-gradient(ellipse at 30% 50%, rgba(56,189,248,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(129,140,248,0.06) 0%, transparent 50%);
  animation: login-bg-pulse 8s ease-in-out infinite alternate;
}
[data-theme="light"] .login-page::before {
  background: radial-gradient(ellipse at 30% 50%, rgba(2,132,199,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(99,102,241,0.04) 0%, transparent 50%);
}
@keyframes login-bg-pulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.05); opacity: 1; } }
.login-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 44px 36px; width: 380px; position: relative; z-index: 1; box-shadow: var(--login-card-shadow);
}
.login-card .logo-area { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
.login-card .logo-icon {
  width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--primary), #818cf8);
  display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: var(--bg-deep);
}
.login-card .logo-text h1 { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--text); }
.login-card .logo-text p { font-size: 11px; color: var(--muted); margin-top: 2px; }
.login-card .form-group { margin-bottom: 18px; }
.login-card .form-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 7px; font-weight: 500; }
.login-card .form-input {
  padding: 11px 14px; font-size: 14px; background: var(--bg-deep); border: 1px solid var(--border);
  border-radius: var(--radius-sm); color: var(--text); width: 100%; outline: none; transition: border-color var(--transition);
}
.login-card .form-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }
.login-card .login-btn {
  width: 100%; padding: 13px; border: none; border-radius: var(--radius-sm);
  background: linear-gradient(135deg, var(--primary), #818cf8);
  color: var(--bg-deep); font-size: 14px; font-weight: 700; cursor: pointer;
  transition: all var(--transition); font-family: var(--font-body); margin-top: 8px;
}
.login-card .login-btn:hover { box-shadow: 0 0 24px var(--primary-glow); transform: translateY(-1px); }
.login-card .login-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.login-card .error-msg { color: var(--danger); font-size: 12px; margin-top: 14px; text-align: center; min-height: 18px; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 20px; }
.pagination .page-btn { padding: 6px 12px; border-radius: var(--radius-sm); background: var(--surface); border: 1px solid var(--border); color: var(--text-secondary); font-size: 12px; cursor: pointer; transition: all var(--transition); }
.pagination .page-btn:hover { border-color: var(--primary); color: var(--primary); }
.pagination .page-size-select { padding: 4px 8px; border-radius: var(--radius-sm); background: var(--surface); border: 1px solid var(--border); color: var(--text-secondary); font-size: 12px; cursor: pointer; outline: none; }
.pagination .page-size-select:focus { border-color: var(--primary); }
.pagination .page-info { font-size: 12px; color: var(--muted); }

.settings-tabs { display: flex; gap: 6px; margin-bottom: 24px; }
.settings-tab { padding: 8px 18px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; background: var(--surface); border: 1px solid var(--border); color: var(--muted); transition: all var(--transition); }
.settings-tab.active { background: var(--primary-dim); border-color: var(--primary); color: var(--primary); }

@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.open { transform: translateX(0); }
  .main-content { margin-left: 0; }
  .page-header, .page-body { padding-left: 16px; padding-right: 16px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .server-card { flex-direction: column; align-items: flex-start; }
  .server-card .sc-actions { width: 100%; flex-wrap: wrap; }
  .mobile-toggle { display: flex !important; }
}
.mobile-toggle { display: none; position: fixed; top: 12px; left: 12px; z-index: 101; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; color: var(--text); cursor: pointer; font-size: 18px; }
.sidebar-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--overlay-bg); z-index: 99; }
.sidebar-overlay.show { display: block; }
.auto-refresh-bar { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--muted); font-family: var(--font-mono); }
.auto-refresh-bar .refresh-spinner { width: 12px; height: 12px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
`;

// ==================== JavaScript 代码 ====================
// 注意: 此字符串内不使用反引号模板字符串，全部用普通字符串拼接
const JS_CODE = `
// ==================== 全局 App 对象 ====================
var App = {
  token: localStorage.getItem('token') || null,
  user: null,
  state: { monitors: [], providers: [], stats: null, settings: null, logs: [], notifications: [], users: [] },

  api: function(path, opts) {
    opts = opts || {};
    var headers = Object.assign({}, opts.headers || {});
    if (opts.body) headers['Content-Type'] = 'application/json';
    if (App.token) headers['Authorization'] = 'Bearer ' + App.token;
    return fetch('/api' + path, Object.assign({}, opts, { headers: headers }))
      .then(function(r) {
        // 登录接口的 401 表示凭据错误，不走自动登出逻辑，走正常错误解析
        if (r.status === 401 && path !== '/auth/login') { App.logout(); throw new Error('认证已过期'); }
        if (!r.ok) {
          // 尝试解析 JSON 错误消息，非 JSON 响应给友好提示
          var ct = r.headers.get('content-type') || '';
          if (ct.indexOf('json') >= 0) {
            return r.json().then(function(d) { throw new Error(d.error || ('请求失败 (' + r.status + ')')); });
          }
          throw new Error('服务器错误 (' + r.status + ')');
        }
        return r.json();
      })
      .then(function(d) {
        if (!d.success) throw new Error(d.error || '请求失败');
        return d.data;
      });
  },

  toast: function(msg, type, duration) {
    type = type || 'info'; duration = duration || 3000;
    var container = document.getElementById('toasts');
    // 最多同时显示 5 条 toast，超出移除最早的
    while (container.children.length >= 5) { container.removeChild(container.firstChild); }
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(function() { el.style.opacity = '0'; setTimeout(function() { el.remove(); }, 300); }, duration);
  },

  modal: function(title, content, actions) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = '<div class="modal"><h3>' + App.esc(title) + '</h3><div>' + content + '</div>' +
      (actions ? '<div class="modal-actions">' + actions + '</div>' : '') + '</div>';
    document.body.appendChild(overlay);
    return overlay;
  },

  closeModal: function() {
    var m = document.querySelector('.modal-overlay');
    if (m) m.remove();
  },

  confirm: function(msg, onConfirm) {
    var overlay = App.modal('确认操作', '<p style="color:var(--text-secondary)">' + App.esc(msg) + '</p>',
      '<button class="btn btn-ghost" onclick="App.closeModal()">取消</button>' +
      '<button class="btn btn-danger" id="confirm-btn">确认</button>');
    overlay.querySelector('#confirm-btn').onclick = function() { overlay.remove(); onConfirm(); };
  },

  logout: function() {
    App.token = null; App.user = null;
    localStorage.removeItem('token');
    location.hash = '#/login';
  },

  timeAgo: function(str) {
    if (!str) return '-';
    var d = new Date(str); var diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return diff + '秒前';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    return Math.floor(diff / 86400) + '天前';
  },

  formatTime: function(str) {
    if (!str) return '-';
    var d = new Date(str);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  },

  formatDate: function(ts) {
    if (!ts) return '-';
    return new Date(ts * 1000).toLocaleDateString('zh-CN');
  },

  stateLabel: function(s) {
    var m = { healthy: '正常', suspect: '疑似异常', down: '宕机', rebooting: '重启中', recovering: '恢复中' };
    return m[s] || s;
  },

  statusLabel: function(s) {
    var m = { on: '运行中', off: '已关机', unknown: '未知' };
    return m[s] || s;
  },

  actionLabel: function(a) {
    var m = { on: '开机', off: '关机', reboot: '重启', hard_reboot: '硬重启', hard_off: '硬关机', status: '状态查询' };
    return m[a] || a;
  },

  logTypeLabel: function(t) {
    var m = { check: '检测', operation: '操作', notification: '通知' };
    return m[t] || t;
  },

  resultTag: function(r) {
    if (r === 'success') return '<span style="color:var(--success)">✓ 成功</span>';
    if (r === 'failed') return '<span style="color:var(--danger)">✗ 失败</span>';
    if (r === 'timeout') return '<span style="color:var(--warning)">⏱ 超时</span>';
    if (r === 'blocked') return '<span style="color:var(--warning)">⏸ 已阻止</span>';
    return '<span style="color:var(--muted)">' + App.esc(r) + '</span>';
  },

  esc: function(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};

// ==================== Hash 路由 ====================
var Router = {
  routes: {},
  _gen: 0,   // 路由代数计数器，防止异步回调覆盖已导航离开的页面
  register: function(path, handler) { this.routes[path] = handler; },
  resolve: function() {
    var hash = location.hash.slice(1) || '/login';
    var parts = hash.split('?');
    var path = parts[0];
    var queryStr = parts[1] || '';
    var params = {};
    if (queryStr) queryStr.split('&').forEach(function(p) { var kv = p.split('='); params[kv[0]] = decodeURIComponent(kv[1] || ''); });

    // 清除自动刷新定时器
    if (window._autoRefreshTimer) { clearInterval(window._autoRefreshTimer); window._autoRefreshTimer = null; }

    // 递增代数，异步回调可通过 gen 检查页面是否已切换
    Router._gen++;
    var gen = Router._gen;

    for (var pattern in this.routes) {
      var patternParts = pattern.split('/');
      var pathParts = path.split('/');
      if (patternParts.length !== pathParts.length) continue;
      var routeParams = {};
      var match = true;
      for (var i = 0; i < patternParts.length; i++) {
        if (patternParts[i].charAt(0) === ':') {
          routeParams[patternParts[i].slice(1)] = pathParts[i];
        } else if (patternParts[i] !== pathParts[i]) {
          match = false; break;
        }
      }
      if (match) {
        if (!App.token && pattern !== '/login') { location.hash = '#/login'; return; }
        this.routes[pattern]({ params: Object.assign({}, routeParams, params), gen: gen });
        return;
      }
    }
    document.getElementById('app').innerHTML = '<div class="empty-state"><div class="icon">🔍</div><h3>页面未找到</h3><p>请检查URL是否正确</p><button class="btn btn-primary" onclick="location.hash=\\'#/dashboard\\'">返回仪表盘</button></div>';
  }
};

// 辅助函数：检查当前路由代数是否与传入的一致，不一致说明用户已导航离开
function routeAlive(gen) { return Router._gen === gen; }

window.addEventListener('hashchange', function() { Router.resolve(); });

// ==================== 侧边栏控制 ====================
window.toggleSidebar = function() {
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
};
window.closeSidebar = function() {
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
};

// ==================== 主题切换 ====================
window.toggleTheme = function() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  var next = current === 'light' ? 'dark' : 'light';
  if (next === 'dark') {
    html.removeAttribute('data-theme');
  } else {
    html.setAttribute('data-theme', 'light');
  }
  localStorage.setItem('theme', next);
  // 更新所有主题切换按钮的图标
  document.querySelectorAll('.theme-toggle').forEach(function(btn) {
    btn.textContent = next === 'light' ? '🌙' : '☀️';
  });
};
// 初始化主题（页面加载时）
(function() {
  var saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

// ==================== 布局 ====================
function renderLayout(activeNav, content) {
  var downCount = App.state.stats ? App.state.stats.down : 0;
  var userInitial = (App.user && App.user.username ? App.user.username : 'A')[0].toUpperCase();
  var userName = App.esc(App.user && (App.user.display_name || App.user.username) || '-');
  var userRole = App.esc(App.user && App.user.role || '');

  document.getElementById('app').innerHTML =
    '<div class="app-layout">' +
    '<button class="mobile-toggle" onclick="toggleSidebar()">☰</button>' +
    '<div class="sidebar-overlay" id="sidebar-overlay" onclick="document.querySelector(\\'.sidebar\\').classList.remove(\\'open\\');document.getElementById(\\'sidebar-overlay\\').classList.remove(\\'show\\')"></div>' +
    '<aside class="sidebar">' +
      '<div class="sidebar-brand"><div class="logo">C</div><div><h1>Cloud Monitor</h1><div class="version">v1.0</div></div></div>' +
      '<nav class="sidebar-nav">' +
        '<a class="nav-item ' + (activeNav === 'dashboard' ? 'active' : '') + '" href="#/dashboard" onclick="closeSidebar()"><span class="icon">📊</span> 仪表盘</a>' +
        '<a class="nav-item ' + (activeNav === 'monitors' ? 'active' : '') + '" href="#/monitors" onclick="closeSidebar()"><span class="icon">🖥️</span> 监控管理' +
          (downCount ? '<span class="badge danger">' + downCount + '</span>' : '') + '</a>' +
        '<a class="nav-item ' + (activeNav === 'logs' ? 'active' : '') + '" href="#/logs" onclick="closeSidebar()"><span class="icon">📋</span> 操作日志</a>' +
        '<a class="nav-item ' + (activeNav === 'settings' ? 'active' : '') + '" href="#/settings" onclick="closeSidebar()"><span class="icon">⚙️</span> 系统设置</a>' +
      '</nav>' +
      '<div class="sidebar-footer">' +
        '<div class="avatar">' + userInitial + '</div>' +
        '<div class="user-info"><div class="user-name">' + userName + '</div><div class="user-role">' + userRole + '</div></div>' +
        '<button class="theme-toggle" onclick="toggleTheme()" title="切换主题">' + (document.documentElement.getAttribute('data-theme') === 'light' ? '🌙' : '☀️') + '</button>' +
        '<button class="logout-btn" onclick="App.logout()" title="退出登录"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></button>' +
      '</div>' +
    '</aside>' +
    '<main class="main-content">' + content + '</main>' +
    '</div>';
}

// ==================== 页面：登录 ====================
Router.register('/login', function() {
  if (App.token) {
    App.api('/auth/me').then(function(u) {
      App.user = u; location.hash = '#/dashboard';
    }).catch(function() { App.token = null; localStorage.removeItem('token'); renderLogin(); });
    return;
  }
  renderLogin();

  function renderLogin() {
    document.getElementById('app').innerHTML =
      '<div class="login-page"><div class="login-card">' +
        '<div style="position:absolute;top:16px;right:16px"><button class="theme-toggle" onclick="toggleTheme()" title="切换主题">' + (document.documentElement.getAttribute('data-theme') === 'light' ? '🌙' : '☀️') + '</button></div>' +
        '<div class="logo-area"><div class="logo-icon">C</div><div class="logo-text"><h1>Cloud Monitor</h1><p>服务器监控平台</p></div></div>' +
        '<div class="form-group"><label class="form-label">用户名</label><input type="text" class="form-input" id="login-user" autocomplete="username"></div>' +
        '<div class="form-group"><label class="form-label">密码</label><input type="password" class="form-input" id="login-pass" autocomplete="current-password"></div>' +
        '<button class="login-btn" id="login-btn" onclick="doLogin()">登 录</button>' +
        '<div class="error-msg" id="login-err"></div>' +
      '</div></div>';
    document.getElementById('login-pass').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
    document.getElementById('login-user').addEventListener('keydown', function(e) { if (e.key === 'Enter') document.getElementById('login-pass').focus(); });
  }

  window.doLogin = async function() {
    var username = document.getElementById('login-user').value.trim();
    var password = document.getElementById('login-pass').value;
    var btn = document.getElementById('login-btn');
    var err = document.getElementById('login-err');
    if (!username || !password) { err.textContent = '请输入用户名和密码'; return; }
    btn.disabled = true; btn.textContent = '登录中...'; err.textContent = '';
    try {
      var data = await App.api('/auth/login', { method: 'POST', body: JSON.stringify({ username: username, password: password }) });
      App.token = data.token; App.user = data.user;
      localStorage.setItem('token', data.token);
      location.hash = '#/dashboard';
    } catch (e) {
      err.textContent = e.message;
      btn.disabled = false; btn.textContent = '登 录';
    }
  };
});

// ==================== 页面：仪表盘 ====================
Router.register('/dashboard', async function(ctx) {
  var gen = ctx.gen;
  renderLayout('dashboard', '<div class="loading-center"><div class="spinner"></div></div>');
  try {
    var dashboardData = await App.api('/monitor/dashboard');
    if (!routeAlive(gen)) return;  // 用户已导航离开，放弃渲染
    var stats = dashboardData.stats;
    var monitors = dashboardData.servers;
    App.state.stats = stats; App.state.monitors = monitors;

    var statCards = [
      { icon: '🖥️', value: stats.total_servers, label: '服务器总数', cls: 'primary' },
      { icon: '✅', value: stats.healthy, label: '正常运行', cls: 'success' },
      { icon: '⚠️', value: stats.suspect, label: '疑似异常', cls: 'warning' },
      { icon: '🔴', value: stats.down, label: '已宕机', cls: 'danger' },
      { icon: '🔄', value: stats.rebooting + stats.recovering, label: '恢复中', cls: 'info' },
      { icon: '🔍', value: stats.checks_today, label: '今日检测', cls: 'primary' },
    ];

    var serverCardsHtml = '';
    if (monitors.length === 0) {
      serverCardsHtml = '<div class="empty-state"><div class="icon">📡</div><h3>暂无监控服务器</h3><p>添加第一台服务器开始监控</p><a class="btn btn-primary" href="#/monitors/new">添加服务器</a></div>';
    } else {
      serverCardsHtml = '<div class="server-cards">';
      monitors.forEach(function(m) {
        var rt = m.runtime || {};
        var state = rt.state || 'healthy';
        serverCardsHtml +=
          '<div class="server-card" onclick="location.hash=\\'#/monitors/' + m.id + '\\'">' +
            '<div class="sc-indicator"><span class="pulse ' + state + '"></span></div>' +
            '<div class="sc-info">' +
              '<div class="sc-name"><span class="state-tag ' + state + '">' + App.stateLabel(state) + '</span>' + App.esc(m.name) + '</div>' +
              '<div class="sc-ip">' + App.esc(m.dedicatedip || m.host_id) + '</div>' +
              '<div class="sc-meta">' +
                '<span>📦 ' + App.esc(m.product_name || '-') + '</span>' +
                '<span>🕐 ' + App.timeAgo(rt.last_check_time) + '</span>' +
                (rt.consecutive_failures > 0 ? '<span style="color:var(--danger)">✗ ' + rt.consecutive_failures + '次</span>' : '') +
                (rt.consecutive_successes > 0 ? '<span style="color:var(--success)">✓ ' + rt.consecutive_successes + '次</span>' : '') +
              '</div>' +
            '</div>' +
            '<div class="sc-actions" onclick="if(event)event.stopPropagation()">' +
              (state !== 'healthy' ? '<button class="btn btn-xs btn-success" data-mid="' + m.id + '" onclick="powerAction(' + m.id + ',\\'on\\')">开机</button>' : '') +
              '<button class="btn btn-xs btn-ghost" data-mid="' + m.id + '" onclick="powerAction(' + m.id + ',\\'reboot\\')">重启</button>' +
              '<button class="btn btn-xs btn-ghost" onclick="location.hash=\\'#/monitors/' + m.id + '\\'">详情</button>' +
            '</div>' +
          '</div>';
      });
      serverCardsHtml += '</div>';
    }

    var statsHtml = '';
    statCards.forEach(function(c) {
      statsHtml += '<div class="stat-card ' + c.cls + '"><div class="stat-icon">' + c.icon + '</div><div class="stat-value">' + c.value + '</div><div class="stat-label">' + c.label + '</div></div>';
    });

    renderLayout('dashboard',
      '<div class="page-header"><div><h2>仪表盘</h2><div class="subtitle">服务器监控概览</div></div>' +
        '<div style="display:flex;gap:8px;align-items:center"><div class="auto-refresh-bar" id="refresh-timer"><span class="refresh-spinner"></span> <span id="refresh-countdown">30s</span></div>' +
        '<button class="btn btn-ghost" onclick="runAllChecks()">🔄 全部检测</button><a class="btn btn-primary" href="#/monitors/new">＋ 添加服务器</a></div></div>' +
      '<div class="page-body">' +
        '<div class="stats-grid">' + statsHtml + '</div>' +
        '<div class="card"><div class="card-header"><span class="card-title">服务器状态</span><a class="btn btn-xs btn-ghost" href="#/monitors">查看全部 →</a></div>' + serverCardsHtml + '</div>' +
      '</div>'
    );

    // 自动刷新：每 30 秒重新加载仪表盘数据
    var refreshSec = 30;
    if (window._autoRefreshTimer) clearInterval(window._autoRefreshTimer);
    window._autoRefreshTimer = setInterval(function() {
      refreshSec--;
      var el = document.getElementById('refresh-countdown');
      if (el) el.textContent = refreshSec + 's';
      if (refreshSec <= 0) { refreshSec = 30; Router.resolve(); }
    }, 1000);
  } catch (e) { App.toast('加载仪表盘失败: ' + e.message, 'error'); }
});

window.runAllChecks = async function() {
  try {
    App.toast('正在执行全部检测...', 'info');
    var result = await App.api('/monitor/run', { method: 'POST' });
    App.toast('检测完成: ' + result.servers_checked + ' 台服务器', 'success');
    Router.resolve();
  } catch (e) { App.toast('检测失败: ' + e.message, 'error'); }
};

window.powerAction = async function(id, action) {
  // 防抖：通过全局标记防止重复点击
  var lockKey = 'powerAction_' + id + '_' + action;
  if (window._powerLocks && window._powerLocks[lockKey]) return;
  if (!window._powerLocks) window._powerLocks = {};
  window._powerLocks[lockKey] = true;
  var dangerActions = ['off', 'hard_off', 'hard_reboot'];
  var doIt = async function() {
    // 禁用同 id 的电源按钮（用 data-mid 精确匹配，避免 id=1 匹配到 id=10）
    var btns = document.querySelectorAll('button[data-mid="' + id + '"]');
    var origTexts = [];
    btns.forEach(function(b, i) { origTexts.push(b.textContent); b.disabled = true; b.style.opacity = '0.5'; });
    try {
      var result = await App.api('/monitors/' + id + '/' + action, { method: 'POST' });
      App.toast(result.message || (App.actionLabel(action) + ' 指令已发送'), 'success');
      setTimeout(function() { Router.resolve(); }, 1500);
    } catch (e) { App.toast(e.message, 'error'); btns.forEach(function(b, i) { b.disabled = false; b.style.opacity = ''; b.textContent = origTexts[i] || b.textContent; }); }
    finally { delete window._powerLocks[lockKey]; }
  };
  if (dangerActions.indexOf(action) >= 0) {
    var warnMsg = action === 'hard_off' ? '硬关机可能导致数据丢失，确定要继续吗？' : action === 'off' ? '确定要关机吗？' : '确定要硬重启吗？';
    App.confirm(warnMsg, doIt);
  } else { doIt(); }
};

// ==================== 页面：监控管理 ====================
Router.register('/monitors', async function(ctx) {
  var gen = ctx.gen;
  renderLayout('monitors', '<div class="loading-center"><div class="spinner"></div></div>');
  try {
    var monitors = await App.api('/monitors');
    if (!routeAlive(gen)) return;
    App.state.monitors = monitors;
    var filterState = ctx.params.state || '';
    var filtered = monitors;
    if (filterState) filtered = monitors.filter(function(m) { return (m.runtime ? m.runtime.state : 'healthy') === filterState; });

    var stateCounts = {};
    monitors.forEach(function(m) { var s = m.runtime ? m.runtime.state : 'healthy'; stateCounts[s] = (stateCounts[s] || 0) + 1; });

    var filterHtml = '<a class="chart-tab ' + (!filterState ? 'active' : '') + '" href="#/monitors">全部 (' + monitors.length + ')</a>';
    Object.keys(stateCounts).forEach(function(s) {
      filterHtml += '<a class="chart-tab ' + (filterState === s ? 'active' : '') + '" href="#/monitors?state=' + s + '">' + App.stateLabel(s) + ' (' + stateCounts[s] + ')</a>';
    });

    var rowsHtml = '';
    if (filtered.length === 0) {
      rowsHtml = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:40px">暂无数据</td></tr>';
    } else {
      filtered.forEach(function(m) {
        var rt = m.runtime || {};
        var state = rt.state || 'healthy';
        var statusVal = rt.last_status_value || '';
        var statusClass = statusVal === 'on' ? 'healthy' : statusVal === 'off' ? 'down' : '';
        rowsHtml += '<tr>' +
          '<td><a href="#/monitors/' + m.id + '" style="color:var(--primary);text-decoration:none;font-weight:600">' + App.esc(m.name) + '</a></td>' +
          '<td><span style="font-family:var(--font-mono);font-size:12px">' + App.esc(m.dedicatedip || '-') + '</span></td>' +
          '<td style="font-size:12px;color:var(--text-secondary)">' + App.esc(m.product_name || '-') + '</td>' +
          '<td><span class="state-tag ' + statusClass + '">' + (App.statusLabel(statusVal) || '-') + '</span></td>' +
          '<td><span class="state-tag ' + state + '"><span class="pulse ' + state + '" style="width:6px;height:6px"></span> ' + App.stateLabel(state) + '</span></td>' +
          '<td style="font-size:12px;color:var(--muted)">' + App.timeAgo(rt.last_check_time) + '</td>' +
          '<td style="white-space:nowrap">' +
            '<button class="btn btn-xs btn-ghost" data-mid="' + m.id + '" onclick="powerAction(' + m.id + ',\\'on\\')">开机</button>' +
            '<button class="btn btn-xs btn-ghost" data-mid="' + m.id + '" onclick="powerAction(' + m.id + ',\\'reboot\\')">重启</button>' +
            '<button class="btn btn-xs btn-ghost" onclick="location.hash=\\'#/monitors/' + m.id + '\\'"">详情</button>' +
          '</td></tr>';
      });
    }

    renderLayout('monitors',
      '<div class="page-header"><div><h2>监控管理</h2><div class="subtitle">共 ' + monitors.length + ' 台服务器</div></div>' +
        '<a class="btn btn-primary" href="#/monitors/new">＋ 添加服务器</a></div>' +
      '<div class="page-body">' +
        '<div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">' + filterHtml + '</div>' +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>服务器</th><th>IP 地址</th><th>产品</th><th>电源</th><th>监控状态</th><th>上次检测</th><th>操作</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div></div>' +
      '</div>'
    );
  } catch (e) { App.toast('加载监控列表失败: ' + e.message, 'error'); }
});

// ==================== 页面：添加服务器向导 ====================
Router.register('/monitors/new', async function(ctx) {
  var gen = ctx.gen;
  renderLayout('monitors', '<div class="loading-center"><div class="spinner"></div></div>');
  try {
    App.state.providers = await App.api('/providers');
    if (!routeAlive(gen)) return;
    // 加载全局设置作为向导初始配置
    if (!App.state.settings) { App.state.settings = await App.api('/settings'); if (!routeAlive(gen)) return; }
  } catch (e) {}

  var wizardStep = 1;
  var selectedProvider = null;
  var selectedHosts = [];
  var hostsList = [];
  // 保存 step 3 的配置值，避免 DOM 销毁后丢失；初始值从全局设置读取
  var ds = App.state.settings || {};
  var wizardConfig = {
    check_method: 'api_only',
    check_interval: ds.check_interval || 60,
    suspect_threshold: ds.suspect_threshold || 2,
    daily_reboot_limit: 3,
    reboot_cooldown: ds.reboot_cooldown || 300,
    recover_timeout: ds.recover_timeout || 600,
    auto_recovery: 1,
    recovery_strategy: ds.default_recovery_strategy || 'reboot_then_hard',
  };

  function renderWizard() {
    var stepsHtml = '';
    for (var i = 1; i <= 4; i++) {
      stepsHtml += '<div class="wizard-step ' + (wizardStep === i ? 'active' : wizardStep > i ? 'done' : '') + '">' + i + '. ' + ['', '选择服务商', '选择服务器', '监控配置', '确认保存'][i] + '</div>';
    }
    renderLayout('monitors',
      '<div class="page-header"><div><h2>添加服务器</h2><div class="subtitle">添加新的监控服务器</div></div></div>' +
      '<div class="page-body"><div class="card" style="max-width:680px"><div class="wizard-steps">' + stepsHtml + '</div><div id="wizard-content"></div></div></div>'
    );
    renderStepContent();
  }

  function renderStepContent() {
    var el = document.getElementById('wizard-content');
    if (!el) return;

    if (wizardStep === 1) {
      var providerOpts = '<option value="">-- 请选择 --</option>';
      (App.state.providers || []).forEach(function(p) {
        providerOpts += '<option value="' + p.id + '">' + App.esc(p.display_name || p.name) + ' (' + (p.type === 'whmcs' ? 'WHMCS' : 'ZJMF') + ')</option>';
      });
      el.innerHTML =
        '<div class="form-group"><label class="form-label">选择已有服务商</label><select class="form-select" id="wiz-provider-id">' + providerOpts + '</select></div>' +
        '<div style="text-align:center;color:var(--muted);margin:16px 0;font-size:12px">— 或者 —</div>' +
        '<div class="form-group"><label class="form-label">新建服务商</label>' +
          '<div style="margin-bottom:8px"><select class="form-select" id="wiz-p-type"><option value="zjmf">魔方财务 (ZJMF)</option><option value="whmcs">WHMCS</option></select></div>' +
          '<div style="display:flex;gap:8px;margin-bottom:8px"><input class="form-input" id="wiz-p-name" placeholder="标识名 (如 heyunidc)" style="flex:1"><input class="form-input" id="wiz-p-display" placeholder="显示名 (如 核云)" style="flex:1"></div>' +
          '<input class="form-input" id="wiz-p-url" placeholder="API 地址 (如 https://www.heyunidc.cn/v1)" style="width:100%;margin-bottom:8px">' +
          '<div style="display:flex;gap:8px"><input class="form-input" id="wiz-p-account" placeholder="登录账号" style="flex:1"><input class="form-input" id="wiz-p-password" type="password" placeholder="API 密码" style="flex:1"></div>' +
          '<div style="margin-top:12px"><button class="btn btn-ghost" onclick="wizTestNewProvider()">测试连接</button></div>' +
        '</div>' +
        '<div class="modal-actions"><a class="btn btn-ghost" href="#/monitors">取消</a><button class="btn btn-primary" onclick="wizNext()">下一步 →</button></div>';

    } else if (wizardStep === 2) {
      if (hostsList.length === 0) {
        el.innerHTML = '<div class="loading-center" style="padding:30px"><div class="spinner"></div><p style="margin-top:12px">正在获取服务器列表...</p></div>';
        loadHosts();
        return;
      }
      var hostsHtml = '';
      hostsList.forEach(function(h) {
        hostsHtml += '<label style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer">' +
          '<input type="checkbox" value="' + h.id + '" class="wiz-host-cb">' +
          '<div style="flex:1"><div style="font-weight:600;font-size:13px">' + App.esc(h.product_name || h.domain || 'Server #' + h.id) + '</div>' +
          '<div style="font-size:12px;color:var(--muted);font-family:var(--font-mono)">' + App.esc(h.dedicatedip || '-') + ' · ' + (h.domainstatus || '-') + '</div></div></label>';
      });
      el.innerHTML =
        '<p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">选择要监控的服务器（可多选）</p>' +
        '<div style="max-height:320px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm)">' + hostsHtml + '</div>' +
        '<div class="modal-actions"><button class="btn btn-ghost" onclick="wizPrev()">← 上一步</button><button class="btn btn-primary" onclick="wizNext()">下一步 →</button></div>';

    } else if (wizardStep === 3) {
      // 使用 wizardConfig（用户已保存的值），而非全局设置默认值
      el.innerHTML =
        '<p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">为选中的 ' + selectedHosts.length + ' 台服务器配置监控参数</p>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">检测方式</label><select class="form-select" id="wiz-check-method"><option value="api_only" selected>API 状态检测</option></select></div>' +
          '<div class="form-group"><label class="form-label">检查间隔 (秒)</label><input class="form-input" id="wiz-interval" type="number" value="' + wizardConfig.check_interval + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">异常阈值 (次)</label><input class="form-input" id="wiz-threshold" type="number" value="' + wizardConfig.suspect_threshold + '"><div class="form-hint">连续失败多少次确认为宕机</div></div>' +
          '<div class="form-group"><label class="form-label">每日重启上限</label><input class="form-input" id="wiz-daily-limit" type="number" value="' + wizardConfig.daily_reboot_limit + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">重启冷却 (秒)</label><input class="form-input" id="wiz-cooldown" type="number" value="' + wizardConfig.reboot_cooldown + '"></div>' +
          '<div class="form-group"><label class="form-label">恢复超时 (秒)</label><input class="form-input" id="wiz-timeout" type="number" value="' + wizardConfig.recover_timeout + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">自动恢复</label><select class="form-select" id="wiz-auto-recovery"><option value="1"' + (wizardConfig.auto_recovery === 1 ? ' selected' : '') + '>开启</option><option value="0"' + (wizardConfig.auto_recovery === 0 ? ' selected' : '') + '>关闭</option></select></div>' +
          '<div class="form-group"><label class="form-label">恢复策略</label><select class="form-select" id="wiz-strategy"><option value="reboot_then_hard"' + (wizardConfig.recovery_strategy === 'reboot_then_hard' ? ' selected' : '') + '>软重启 → 硬重启 → 开机</option><option value="hard_only"' + (wizardConfig.recovery_strategy === 'hard_only' ? ' selected' : '') + '>仅硬重启</option></select></div></div>' +
        '<div class="modal-actions"><button class="btn btn-ghost" onclick="wizPrev()">← 上一步</button><button class="btn btn-primary" onclick="wizNext()">下一步 →</button></div>';

    } else if (wizardStep === 4) {
      var strategyVal = wizardConfig.recovery_strategy;
      var autoVal = String(wizardConfig.auto_recovery);
      var intervalVal = wizardConfig.check_interval;

      var summaryHtml = '';
      hostsList.filter(function(h) { return selectedHosts.indexOf(String(h.id)) >= 0; }).forEach(function(h) {
        summaryHtml += '<div style="padding:8px 14px;border-bottom:1px solid var(--border);font-size:13px"><span style="font-weight:600">' + App.esc(h.product_name || h.domain) + '</span><span style="color:var(--muted);font-family:var(--font-mono);margin-left:8px">' + App.esc(h.dedicatedip || '-') + '</span></div>';
      });

      el.innerHTML =
        '<p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">确认以下配置并保存</p>' +
        '<div class="detail-grid" style="margin-bottom:20px">' +
          '<div class="detail-item"><div class="label">服务商</div><div class="value">' + App.esc(selectedProvider ? (selectedProvider.display_name || selectedProvider.name) : '-') + '</div></div>' +
          '<div class="detail-item"><div class="label">服务器数量</div><div class="value">' + selectedHosts.length + ' 台</div></div>' +
          '<div class="detail-item"><div class="label">检测方式</div><div class="value">API 状态</div></div>' +
          '<div class="detail-item"><div class="label">检查间隔</div><div class="value mono">' + intervalVal + 's</div></div>' +
          '<div class="detail-item"><div class="label">自动恢复</div><div class="value">' + (autoVal === '1' ? '✅ 开启' : '❌ 关闭') + '</div></div>' +
          '<div class="detail-item"><div class="label">恢复策略</div><div class="value">' + (strategyVal === 'reboot_then_hard' ? '软重启→硬重启→开机' : '仅硬重启') + '</div></div>' +
        '</div>' +
        '<div style="border:1px solid var(--border);border-radius:var(--radius-sm);max-height:200px;overflow-y:auto">' + summaryHtml + '</div>' +
        '<div class="modal-actions"><button class="btn btn-ghost" onclick="wizPrev()">← 上一步</button><button class="btn btn-primary" id="wiz-save-btn" onclick="wizSave()">确认保存</button></div>';
    }
  }

  function loadHosts() {
    App.api('/providers/' + selectedProvider.id + '/hosts').then(function(data) {
      hostsList = (data && data.hosts) ? data.hosts : (data || []);
      if (hostsList.length === 0) {
        var el = document.getElementById('wizard-content');
        if (el) el.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">📭</div><h3>未发现服务器</h3><p>该服务商下没有可监控的服务器</p></div><div class="modal-actions"><button class="btn btn-ghost" onclick="wizPrev()">← 上一步</button></div>';
        return;
      }
      renderStepContent();
    }).catch(function(e) {
      App.toast('获取服务器列表失败: ' + e.message, 'error');
      var el = document.getElementById('wizard-content');
      if (el) el.innerHTML = '<div class="empty-state" style="padding:30px"><div class="icon">❌</div><h3>获取失败</h3><p>' + App.esc(e.message) + '</p></div><div class="modal-actions"><button class="btn btn-ghost" onclick="wizPrev()">← 上一步</button></div>';
    });
  }

  window.wizTestNewProvider = async function() {
    var url = document.getElementById('wiz-p-url').value.trim();
    var account = document.getElementById('wiz-p-account').value.trim();
    var password = document.getElementById('wiz-p-password').value.trim();
    if (!url || !account || !password) { App.toast('请填写完整的 API 信息', 'warning'); return; }
    try {
      var name = document.getElementById('wiz-p-name').value.trim() || ('provider_' + Date.now());
      var displayName = document.getElementById('wiz-p-display').value.trim() || name;
      // 先创建服务商
      var wizType = document.getElementById('wiz-p-type') ? document.getElementById('wiz-p-type').value : 'zjmf';
      var result = await App.api('/providers', { method: 'POST', body: JSON.stringify({ type: wizType, name: name, display_name: displayName, api_base_url: url, api_account: account, api_password: password }) });
      // 再测试连接
      try {
        await App.api('/providers/' + result.id + '/test', { method: 'POST' });
        App.toast('连接成功', 'success');
        selectedProvider = await App.api('/providers/' + result.id);
        App.state.providers = await App.api('/providers');
        document.getElementById('wiz-provider-id').value = result.id;
      } catch (testErr) {
        // 测试失败，删除刚创建的服务商，避免残留
        try { await App.api('/providers/' + result.id, { method: 'DELETE' }); } catch (delErr) { /* 删除失败静默处理 */ }
        App.toast('连接失败: ' + testErr.message, 'error');
      }
    } catch (e) { App.toast('创建服务商失败: ' + e.message, 'error'); }
  };

  window.wizNext = async function() {
    if (wizardStep === 1) {
      var providerId = document.getElementById('wiz-provider-id') ? document.getElementById('wiz-provider-id').value : '';
      if (providerId) {
        try { selectedProvider = await App.api('/providers/' + providerId); }
        catch (e) { App.toast('获取服务商信息失败', 'error'); return; }
      } else if (!selectedProvider) {
        App.toast('请选择或创建服务商', 'warning'); return;
      }
      if (!selectedProvider) { App.toast('请选择或创建服务商', 'warning'); return; }
      // 切换服务商后必须重新加载主机列表
      hostsList = [];
      wizardStep = 2;
    } else if (wizardStep === 2) {
      var cbs = document.querySelectorAll('.wiz-host-cb:checked');
      selectedHosts = []; cbs.forEach(function(cb) { selectedHosts.push(cb.value); });
      if (selectedHosts.length === 0) { App.toast('请至少选择一台服务器', 'warning'); return; }
      wizardStep = 3;
    } else if (wizardStep === 3) {
      // 在 DOM 销毁前保存 step 3 的配置值
      wizardConfig.check_interval = parseInt((document.getElementById('wiz-interval') || {}).value || '60');
      wizardConfig.suspect_threshold = parseInt((document.getElementById('wiz-threshold') || {}).value || '2');
      wizardConfig.daily_reboot_limit = parseInt((document.getElementById('wiz-daily-limit') || {}).value || '3');
      wizardConfig.reboot_cooldown = parseInt((document.getElementById('wiz-cooldown') || {}).value || '300');
      wizardConfig.recover_timeout = parseInt((document.getElementById('wiz-timeout') || {}).value || '600');
      wizardConfig.auto_recovery = parseInt((document.getElementById('wiz-auto-recovery') || {}).value || '1');
      wizardConfig.recovery_strategy = (document.getElementById('wiz-strategy') || {}).value || 'reboot_then_hard';
      wizardStep = 4;
    }
    renderWizard();
  };

  window.wizPrev = function() { if (wizardStep > 1) { wizardStep--; renderWizard(); } };

  window.wizSave = async function() {
    var btn = document.getElementById('wiz-save-btn');
    btn.disabled = true; btn.textContent = '保存中...';
    // 使用保存的配置值，而非从 DOM 读取（DOM 可能已被销毁）
    var interval = wizardConfig.check_interval;
    var threshold = wizardConfig.suspect_threshold;
    var dailyLimit = wizardConfig.daily_reboot_limit;
    var cooldown = wizardConfig.reboot_cooldown;
    var recoverTimeout = wizardConfig.recover_timeout;
    var autoRecovery = wizardConfig.auto_recovery;
    var strategy = wizardConfig.recovery_strategy;

    var created = 0, failed = 0;
    for (var i = 0; i < selectedHosts.length; i++) {
      var hostId = selectedHosts[i];
      var host = hostsList.find(function(h) { return String(h.id) === String(hostId); });
      try {
        await App.api('/monitors', {
          method: 'POST',
          body: JSON.stringify({
            name: (host && (host.product_name || host.domain)) || ('Server #' + hostId),
            provider_id: selectedProvider.id, host_id: String(hostId),
            check_method: 'api_only', check_interval: interval, suspect_threshold: threshold,
            daily_reboot_limit: dailyLimit, reboot_cooldown: cooldown, recover_timeout: recoverTimeout,
            auto_recovery: autoRecovery, recovery_strategy: strategy,
          }),
        });
        created++;
      } catch (e) { failed++; App.toast('创建失败 #' + hostId + ': ' + e.message, 'error'); }
    }
    App.toast('创建完成: ' + created + ' 台成功' + (failed ? ', ' + failed + ' 台失败' : ''), created > 0 ? 'success' : 'error');
    location.hash = '#/monitors';
  };

  renderWizard();
});

// ==================== 页面：服务器详情 ====================
Router.register('/monitors/:id', async function(ctx) {
  var id = ctx.params.id;
  var gen = ctx.gen;
  renderLayout('monitors', '<div class="loading-center"><div class="spinner"></div></div>');
  try {
    var monitor = await App.api('/monitors/' + id);
    if (!routeAlive(gen)) return;
    var rt = monitor.runtime || {};
    var state = rt.state || 'healthy';

    renderLayout('monitors',
      '<div class="page-header"><div style="display:flex;align-items:center;gap:12px">' +
        '<a href="#/monitors" style="color:var(--muted);text-decoration:none;font-size:18px">←</a>' +
        '<div><h2 style="display:flex;align-items:center;gap:10px"><span class="pulse ' + state + '"></span>' + App.esc(monitor.name) + '<span class="state-tag ' + state + '">' + App.stateLabel(state) + '</span></h2>' +
        '<div class="subtitle">' + App.esc(monitor.dedicatedip || monitor.host_id) + ' · ' + App.esc(monitor.product_name || '-') + '</div></div></div>' +
        '<div style="display:flex;gap:8px"><button class="btn btn-ghost btn-sm" onclick="syncMonitor(' + id + ')">🔄 同步信息</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="checkSingle(' + id + ')">🔍 立即检测</button>' +
        '<button class="btn btn-danger btn-sm" onclick="deleteMonitor(' + id + ')">删除</button></div></div>' +

      '<div class="page-body">' +
        '<div class="card" style="margin-bottom:16px"><div class="card-header"><span class="card-title">基本信息</span></div><div class="detail-grid">' +
          '<div class="detail-item"><div class="label">服务器名称</div><div class="value">' + App.esc(monitor.name) + '</div></div>' +
          '<div class="detail-item"><div class="label">IP 地址</div><div class="value mono">' + App.esc(monitor.dedicatedip || '-') + '</div></div>' +
          '<div class="detail-item"><div class="label">产品类型</div><div class="value">' + App.esc(monitor.host_type || '-') + ' / ' + App.esc(monitor.product_name || '-') + '</div></div>' +
          '<div class="detail-item"><div class="label">操作系统</div><div class="value">' + App.esc(monitor.os_name || '-') + '</div></div>' +
          '<div class="detail-item"><div class="label">端口</div><div class="value mono">' + (monitor.port || '-') + '</div></div>' +
          '<div class="detail-item"><div class="label">到期时间</div><div class="value">' + App.formatDate(monitor.nextduedate) + '</div></div>' +
          '<div class="detail-item"><div class="label">金额</div><div class="value">' + App.esc(monitor.amount || '-') + ' / ' + App.esc(monitor.billingcycle || '-') + '</div></div>' +
          '<div class="detail-item"><div class="label">流量</div><div class="value">' + (monitor.bwlimit ? (monitor.bwusage ? monitor.bwusage.toFixed(1) : '0') + ' / ' + monitor.bwlimit : '不限') + '</div></div>' +
          '<div class="detail-item"><div class="label">自动恢复</div><div class="value">' + (monitor.auto_recovery ? '✅ 开启' : '❌ 关闭') + '</div></div>' +
          '<div class="detail-item"><div class="label">恢复策略</div><div class="value">' + (monitor.recovery_strategy === 'reboot_then_hard' ? '软重启→硬重启→开机' : '仅硬重启') + '</div></div>' +
        '</div></div>' +

        '<div class="card" style="margin-bottom:16px"><div class="card-header"><span class="card-title">电源控制</span><span style="font-size:12px;color:var(--muted)">当前: ' + (App.statusLabel(rt.last_status_value) || '未知') + '</span></div>' +
          '<div class="power-panel">' +
            '<button class="power-btn" data-mid="' + id + '" onclick="powerAction(' + id + ',\\'on\\')">⚡ 开机</button>' +
            '<button class="power-btn" data-mid="' + id + '" onclick="powerAction(' + id + ',\\'reboot\\')">🔄 重启</button>' +
            '<button class="power-btn" data-mid="' + id + '" onclick="powerAction(' + id + ',\\'hard_reboot\\')">🔄 硬重启</button>' +
            '<button class="power-btn danger-action" data-mid="' + id + '" onclick="powerAction(' + id + ',\\'off\\')">⏹ 关机</button>' +
            '<button class="power-btn danger-action" data-mid="' + id + '" onclick="powerAction(' + id + ',\\'hard_off\\')">⛔ 硬关机</button>' +
          '</div></div>' +

        '<div class="card"><div class="card-header"><span class="card-title">操作日志</span></div><div id="detail-logs"><div class="loading-center" style="padding:20px"><div class="spinner"></div></div></div></div>' +
      '</div>'
    );

    _detailLogPage = 1; _detailLogSize = 10;
    loadDetailLogs(id);
  } catch (e) { App.toast('加载详情失败: ' + e.message, 'error'); }
});

var _detailLogPage = 1;
var _detailLogSize = 10;

async function loadDetailLogs(id, page, size) {
  if (page !== undefined) _detailLogPage = page;
  if (size !== undefined) { _detailLogSize = size; _detailLogPage = 1; }
  var el = document.getElementById('detail-logs');
  if (!el) return;
  var offset = (_detailLogPage - 1) * _detailLogSize;
  try {
    var result = await App.api('/logs?monitor_id=' + id + '&limit=' + _detailLogSize + '&offset=' + offset);
    var logs = result.logs || [];
    var total = result.total || 0;
    if (logs.length === 0 && total === 0) {
      el.innerHTML = '<div style="padding:20px;color:var(--muted);text-align:center">暂无操作日志</div>';
      return;
    }
    var rowsHtml = '';
    logs.forEach(function(l) {
      rowsHtml += '<tr>' +
        '<td style="font-size:12px;color:var(--muted)">' + App.formatTime(l.created_at) + '</td>' +
        '<td>' + App.logTypeLabel(l.log_type) + '</td>' +
        '<td>' + App.actionLabel(l.action) + '</td>' +
        '<td>' + App.resultTag(l.result) + '</td>' +
        '<td style="font-family:var(--font-mono);font-size:12px">' + (l.duration_ms ? l.duration_ms + 'ms' : '-') + '</td>' +
        '<td style="font-size:12px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + App.esc(l.error_msg || l.detail) + '">' + App.esc(l.error_msg || l.detail || '-') + '</td>' +
      '</tr>';
    });
    var paginationHtml = '';
    if (total > _detailLogSize) {
      var totalPages = Math.ceil(total / _detailLogSize);
      var prevDisabled = _detailLogPage <= 1 ? 'disabled' : '';
      var nextDisabled = _detailLogPage >= totalPages ? 'disabled' : '';
      var sizeOptions = [10, 15, 50].map(function(s) {
        return '<option value="' + s + '"' + (s === _detailLogSize ? ' selected' : '') + '>' + s + '条/页</option>';
      }).join('');
      paginationHtml = '<div class="pagination" style="justify-content:space-between">' +
        '<span class="page-info">共 ' + total + ' 条</span>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<button class="page-btn" ' + prevDisabled + ' onclick="loadDetailLogs(' + id + ',' + (_detailLogPage - 1) + ')">← 上一页</button>' +
          '<span class="page-info">第 ' + _detailLogPage + ' / ' + totalPages + ' 页</span>' +
          '<button class="page-btn" ' + nextDisabled + ' onclick="loadDetailLogs(' + id + ',' + (_detailLogPage + 1) + ')">下一页 →</button>' +
        '</div>' +
        '<select class="page-size-select" onchange="loadDetailLogs(' + id + ',1,parseInt(this.value))">' + sizeOptions + '</select>' +
      '</div>';
    } else if (total > 0) {
      var sizeOptions2 = [10, 15, 50].map(function(s) {
        return '<option value="' + s + '"' + (s === _detailLogSize ? ' selected' : '') + '>' + s + '条/页</option>';
      }).join('');
      paginationHtml = '<div class="pagination" style="justify-content:space-between">' +
        '<span class="page-info">共 ' + total + ' 条</span>' +
        '<div></div>' +
        '<select class="page-size-select" onchange="loadDetailLogs(' + id + ',1,parseInt(this.value))">' + sizeOptions2 + '</select>' +
      '</div>';
    }
    el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>时间</th><th>类型</th><th>操作</th><th>结果</th><th>耗时</th><th>详情</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' + paginationHtml;
  } catch (e) { el.innerHTML = '<div style="padding:20px;color:var(--danger)">加载日志失败</div>'; }
}

window.loadDetailLogs = loadDetailLogs;

window.syncMonitor = async function(id) {
  try { App.toast('正在同步信息...', 'info'); await App.api('/monitors/' + id + '/sync', { method: 'POST' }); App.toast('同步成功', 'success'); Router.resolve(); }
  catch (e) { App.toast('同步失败: ' + e.message, 'error'); }
};

window.checkSingle = async function(id) {
  try {
    App.toast('正在检测...', 'info');
    var r = await App.api('/monitor/run/' + id, { method: 'POST' });
    var msg = r.health === true ? '正常' : r.health === false ? '异常' : '检测失败（API 不可达）';
    var type = r.health === true ? 'success' : r.health === false ? 'warning' : 'error';
    App.toast('检测完成: ' + msg, type);
    Router.resolve();
  } catch (e) { App.toast('检测失败: ' + e.message, 'error'); }
};

window.deleteMonitor = function(id) {
  App.confirm('确定要删除此监控项吗？删除后不可恢复。', async function() {
    try { await App.api('/monitors/' + id, { method: 'DELETE' }); App.toast('已删除', 'success'); location.hash = '#/monitors'; }
    catch (e) { App.toast('删除失败: ' + e.message, 'error'); }
  });
};

// ==================== 页面：日志管理 ====================
Router.register('/logs', async function(ctx) {
  var gen = ctx.gen;
  renderLayout('logs', '<div class="loading-center"><div class="spinner"></div></div>');
  var page = parseInt(ctx.params.page || '1');
  var logType = ctx.params.type || '';
  var limit = 30, offset = (page - 1) * limit;

  try {
    var url = '/logs?limit=' + limit + '&offset=' + offset;
    if (logType) url += '&type=' + logType;
    var result = await App.api(url);
    if (!routeAlive(gen)) return;
    var logs = result.logs || result || [];
    var total = result.total || logs.length;

    var typeTabs = [
      { key: '', label: '全部' },
      { key: 'check', label: '检测' },
      { key: 'operation', label: '操作' },
      { key: 'notification', label: '通知' },
    ];
    var tabsHtml = '';
    typeTabs.forEach(function(t) {
      tabsHtml += '<a class="chart-tab ' + (logType === t.key ? 'active' : '') + '" href="#/logs' + (t.key ? '?type=' + t.key : '') + '">' + t.label + '</a>';
    });

    var rowsHtml = '';
    if (logs.length === 0) {
      rowsHtml = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:40px">暂无日志</td></tr>';
    } else {
      logs.forEach(function(l) {
        rowsHtml += '<tr>' +
          '<td style="font-size:12px;color:var(--muted);white-space:nowrap">' + App.formatTime(l.created_at) + '</td>' +
          '<td><a href="#/monitors/' + l.monitor_id + '" style="color:var(--primary);text-decoration:none">#' + l.monitor_id + '</a></td>' +
          '<td>' + App.logTypeLabel(l.log_type) + '</td>' +
          '<td>' + App.actionLabel(l.action) + '</td>' +
          '<td>' + App.resultTag(l.result) + '</td>' +
          '<td style="font-family:var(--font-mono);font-size:12px">' + (l.duration_ms ? l.duration_ms + 'ms' : '-') + '</td>' +
          '<td style="font-size:12px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + App.esc(l.error_msg || l.detail) + '">' + App.esc(l.error_msg || l.detail || '-') + '</td>' +
        '</tr>';
      });
    }

    var paginationHtml = '';
    if (total > limit) {
      var prevDisabled = page <= 1 ? 'disabled' : '';
      var nextDisabled = offset + limit >= total ? 'disabled' : '';
      var qStr = logType ? 'type=' + logType + '&' : '';
      paginationHtml = '<div class="pagination">' +
        '<button class="page-btn" ' + prevDisabled + ' onclick="location.hash=\\'#/logs?' + qStr + 'page=' + (page - 1) + '\\'"">← 上一页</button>' +
        '<span class="page-info">第 ' + page + ' 页</span>' +
        '<button class="page-btn" ' + nextDisabled + ' onclick="location.hash=\\'#/logs?' + qStr + 'page=' + (page + 1) + '\\'"">下一页 →</button></div>';
    }

    renderLayout('logs',
      '<div class="page-header"><div><h2>操作日志</h2><div class="subtitle">共 ' + total + ' 条记录</div></div></div>' +
      '<div class="page-body">' +
        '<div style="display:flex;gap:8px;margin-bottom:20px">' + tabsHtml + '</div>' +
        '<div class="card"><div class="table-wrap"><table><thead><tr><th>时间</th><th>服务器</th><th>类型</th><th>操作</th><th>结果</th><th>耗时</th><th>详情</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' + paginationHtml + '</div>' +
      '</div>'
    );
  } catch (e) { App.toast('加载日志失败: ' + e.message, 'error'); }
});

// ==================== 页面：系统设置 ====================
Router.register('/settings', async function(ctx) {
  var gen = ctx.gen;
  renderLayout('settings', '<div class="loading-center"><div class="spinner"></div></div>');
  try {
    var results = await Promise.all([App.api('/settings'), App.api('/providers'), App.api('/notifications'), App.api('/users')]);
    if (!routeAlive(gen)) return;
    App.state.settings = results[0]; App.state.providers = results[1];
    App.state.notifications = results[2]; App.state.users = results[3];

    var activeTab = 'general';

    function renderSettings() {
      var tabsHtml = '';
      ['general', 'appearance', 'providers', 'notifications', 'users'].forEach(function(t) {
        var labels = { general: '全局参数', appearance: '外观', providers: '服务商', notifications: '通知渠道', users: '用户管理' };
        tabsHtml += '<div class="settings-tab ' + (activeTab === t ? 'active' : '') + '" onclick="switchSettingsTab(\\'' + t + '\\',this)">' + labels[t] + '</div>';
      });
      renderLayout('settings',
        '<div class="page-header"><div><h2>系统设置</h2><div class="subtitle">平台配置与管理</div></div></div>' +
        '<div class="page-body"><div class="settings-tabs">' + tabsHtml + '</div><div id="settings-content"></div></div>'
      );
      renderSettingsContent();
    }

    function renderSettingsContent() {
      var el = document.getElementById('settings-content');
      if (!el) return;
      if (activeTab === 'general') { renderGeneralSettings(el); }
      else if (activeTab === 'appearance') { renderAppearanceSettings(el); }
      else if (activeTab === 'providers') { renderProviderSettings(el); }
      else if (activeTab === 'notifications') { renderNotificationSettings(el); }
      else if (activeTab === 'users') { renderUserSettings(el); }
    }

    function renderGeneralSettings(el) {
      var s = App.state.settings;
      el.innerHTML =
        '<div class="card"><div class="card-header"><span class="card-title">全局监控参数</span></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">默认检查间隔 (秒)</label><input class="form-input" id="set-interval" type="number" value="' + (s.check_interval || 60) + '"></div>' +
          '<div class="form-group"><label class="form-label">异常阈值 (次)</label><input class="form-input" id="set-threshold" type="number" value="' + (s.suspect_threshold || 2) + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">重启冷却 (秒)</label><input class="form-input" id="set-cooldown" type="number" value="' + (s.reboot_cooldown || 300) + '"></div>' +
          '<div class="form-group"><label class="form-label">恢复超时 (秒)</label><input class="form-input" id="set-timeout" type="number" value="' + (s.recover_timeout || 600) + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">API 超时 (秒)</label><input class="form-input" id="set-api-timeout" type="number" value="' + (s.api_timeout || 60) + '"></div>' +
          '<div class="form-group"><label class="form-label">恢复检查间隔 (秒)</label><input class="form-input" id="set-recover-interval" type="number" value="' + (s.recover_check_interval || 60) + '"><div class="form-hint">RECOVERING 状态下检查频率</div></div></div>' +
        '<div class="form-row"><div class="form-group"><label class="form-label">默认恢复策略</label><select class="form-select" id="set-strategy"><option value="reboot_then_hard"' + (s.default_recovery_strategy === 'reboot_then_hard' ? ' selected' : '') + '>软重启→硬重启→开机</option><option value="hard_only"' + (s.default_recovery_strategy === 'hard_only' ? ' selected' : '') + '>仅硬重启</option></select></div></div>' +
        '<div style="margin-top:20px"><button class="btn btn-primary" onclick="saveSettings()">保存设置</button></div></div>';
    }

    function renderAppearanceSettings(el) {
      var currentTheme = localStorage.getItem('theme') || 'dark';
      var isLight = currentTheme === 'light';
      el.innerHTML =
        '<div class="card"><div class="card-header"><span class="card-title">主题设置</span></div>' +
        '<div class="form-group"><label class="form-label">界面主题</label>' +
          '<div style="display:flex;gap:12px;margin-top:8px">' +
            '<label style="display:flex;align-items:center;gap:10px;padding:14px 18px;border:1px solid ' + (!isLight ? 'var(--primary)' : 'var(--border)') + ';border-radius:var(--radius);cursor:pointer;background:' + (!isLight ? 'var(--primary-dim)' : 'var(--surface)') + ';flex:1;transition:all var(--transition))" onclick="setTheme(\\'dark\\')">' +
              '<div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#0a0e17,#151d2c);border:1px solid #1e293b;display:flex;align-items:center;justify-content:center;font-size:16px">🌙</div>' +
              '<div><div style="font-weight:600;font-size:13px">深色模式</div><div style="font-size:11px;color:var(--muted)">Mission Control 深空监控站</div></div>' +
            '</label>' +
            '<label style="display:flex;align-items:center;gap:10px;padding:14px 18px;border:1px solid ' + (isLight ? 'var(--primary)' : 'var(--border)') + ';border-radius:var(--radius);cursor:pointer;background:' + (isLight ? 'var(--primary-dim)' : 'var(--surface)') + ';flex:1;transition:all var(--transition))" onclick="setTheme(\\'light\\')">' +
              '<div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#f8fafc,#ffffff);border:1px solid #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:16px">☀️</div>' +
              '<div><div style="font-weight:600;font-size:13px">浅色模式</div><div style="font-size:11px;color:var(--muted)">清爽明亮的控制面板</div></div>' +
            '</label>' +
          '</div>' +
        '</div></div>';
    }

    function renderProviderSettings(el) {
      var provs = App.state.providers || [];
      var rowsHtml = '';
      if (provs.length === 0) {
        rowsHtml = '<div class="empty-state" style="padding:30px"><p>暂无服务商</p></div>';
      } else {
        rowsHtml = '<div class="table-wrap"><table><thead><tr><th>名称</th><th>类型</th><th>API 地址</th><th>状态</th><th>操作</th></tr></thead><tbody>';
        provs.forEach(function(p) {
          rowsHtml += '<tr><td style="font-weight:600">' + App.esc(p.display_name || p.name) + '</td>' +
            '<td><span class="state-tag" style="background:var(--primary-dim);color:var(--primary)">' + (p.type === 'whmcs' ? 'WHMCS' : 'ZJMF') + '</span></td>' +
            '<td style="font-size:12px;color:var(--text-secondary)">' + App.esc(p.api_base_url) + '</td>' +
            '<td>' + (p.enabled ? '<span style="color:var(--success)">✓ 启用</span>' : '<span style="color:var(--muted)">✗ 禁用</span>') + '</td>' +
            '<td><button class="btn btn-xs btn-ghost" onclick="testProvider(' + p.id + ')">测试</button>' +
            '<button class="btn btn-xs btn-ghost" onclick="editProvider(' + p.id + ')">编辑</button>' +
            '<button class="btn btn-xs btn-danger" onclick="deleteProvider(' + p.id + ')">删除</button></td></tr>';
        });
        rowsHtml += '</tbody></table></div>';
      }
      el.innerHTML = '<div class="card"><div class="card-header"><span class="card-title">服务商管理</span><button class="btn btn-sm btn-primary" onclick="showAddProvider()">＋ 添加服务商</button></div>' + rowsHtml + '</div>';
    }

    function renderNotificationSettings(el) {
      var chs = App.state.notifications || [];
      var rowsHtml = '';
      if (chs.length === 0) {
        rowsHtml = '<div class="empty-state" style="padding:30px"><p>暂无通知渠道</p></div>';
      } else {
        rowsHtml = '<div class="table-wrap"><table><thead><tr><th>名称</th><th>类型</th><th>状态</th><th>操作</th></tr></thead><tbody>';
        chs.forEach(function(ch) {
          rowsHtml += '<tr><td style="font-weight:600">' + App.esc(ch.name) + '</td>' +
            '<td><span style="font-family:var(--font-mono);font-size:12px">' + ch.type + '</span></td>' +
            '<td>' + (ch.enabled ? '<span style="color:var(--success)">✓ 启用</span>' : '<span style="color:var(--muted)">✗ 禁用</span>') + '</td>' +
            '<td><button class="btn btn-xs btn-ghost" onclick="testNotification(' + ch.id + ')">测试</button>' +
            '<button class="btn btn-xs btn-ghost" onclick="editNotification(' + ch.id + ')">编辑</button>' +
            '<button class="btn btn-xs btn-danger" onclick="deleteNotification(' + ch.id + ')">删除</button></td></tr>';
        });
        rowsHtml += '</tbody></table></div>';
      }
      el.innerHTML = '<div class="card"><div class="card-header"><span class="card-title">通知渠道</span><button class="btn btn-sm btn-primary" onclick="showAddNotification()">＋ 添加渠道</button></div>' + rowsHtml + '</div>';
    }

    function renderUserSettings(el) {
      var us = App.state.users || [];
      var rowsHtml = '<div class="table-wrap"><table><thead><tr><th>用户名</th><th>角色</th><th>显示名</th><th>上次登录</th><th>操作</th></tr></thead><tbody>';
      us.forEach(function(u) {
        rowsHtml += '<tr><td style="font-weight:600">' + App.esc(u.username) + '</td>' +
          '<td>' + App.esc(u.role) + '</td><td>' + App.esc(u.display_name || '-') + '</td>' +
          '<td style="font-size:12px;color:var(--muted)">' + App.formatTime(u.last_login) + '</td>' +
          '<td><button class="btn btn-xs btn-ghost" onclick="changePassword(' + u.id + ')">改密</button>' +
          (u.id !== (App.user && App.user.id) ? '<button class="btn btn-xs btn-danger" onclick="deleteUser(' + u.id + ')">删除</button>' : '') + '</td></tr>';
      });
      rowsHtml += '</tbody></table></div>';
      el.innerHTML = '<div class="card"><div class="card-header"><span class="card-title">用户管理</span><button class="btn btn-sm btn-primary" onclick="showAddUser()">＋ 添加用户</button></div>' + rowsHtml + '</div>';
    }

    window.switchSettingsTab = function(tab, el) {
      activeTab = tab;
      document.querySelectorAll('.settings-tab').forEach(function(t) { t.classList.remove('active'); });
      if (el) el.classList.add('active');
      renderSettingsContent();
    };

    window.setTheme = function(theme) {
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      localStorage.setItem('theme', theme);
      // 更新所有主题按钮图标
      document.querySelectorAll('.theme-toggle').forEach(function(btn) {
        btn.textContent = theme === 'light' ? '🌙' : '☀️';
      });
      // 重新渲染外观设置以更新选中状态
      renderAppearanceSettings(document.getElementById('settings-content'));
      App.toast(theme === 'light' ? '已切换到浅色模式' : '已切换到深色模式', 'success');
    };

    window.saveSettings = async function() {
      try {
        var interval = parseInt(document.getElementById('set-interval').value);
        var threshold = parseInt(document.getElementById('set-threshold').value);
        var cooldown = parseInt(document.getElementById('set-cooldown').value);
        var timeout = parseInt(document.getElementById('set-timeout').value);
        var apiTimeout = parseInt(document.getElementById('set-api-timeout').value);
        // 前端基础校验
        if (isNaN(interval) || interval < 10) { App.toast('检查间隔不能小于 10 秒', 'warning'); return; }
        if (isNaN(threshold) || threshold < 1) { App.toast('异常阈值不能小于 1', 'warning'); return; }
        if (isNaN(cooldown) || cooldown < 30) { App.toast('重启冷却不能小于 30 秒', 'warning'); return; }
        if (isNaN(timeout) || timeout < 60) { App.toast('恢复超时不能小于 60 秒', 'warning'); return; }
        if (isNaN(apiTimeout) || apiTimeout < 5) { App.toast('API 超时不能小于 5 秒', 'warning'); return; }
        var recoverInterval = parseInt(document.getElementById('set-recover-interval').value);
        if (isNaN(recoverInterval) || recoverInterval < 10) { App.toast('恢复检查间隔不能小于 10 秒', 'warning'); return; }
        var data = {
          check_interval: interval,
          suspect_threshold: threshold,
          reboot_cooldown: cooldown,
          recover_timeout: timeout,
          api_timeout: apiTimeout,
          recover_check_interval: recoverInterval,
          default_recovery_strategy: document.getElementById('set-strategy').value,
        };
        await App.api('/settings', { method: 'PUT', body: JSON.stringify(data) });
        // 从 API 获取完整 settings（包含 recover_check_interval 等前端未提交的字段）
        App.state.settings = await App.api('/settings');
        App.toast('设置已保存', 'success');
      } catch (e) { App.toast('保存失败: ' + e.message, 'error'); }
    };

    window.showAddProvider = function() {
      App.modal('添加服务商',
        '<div class="form-group"><label class="form-label">平台类型</label><select class="form-select" id="ap-type"><option value="zjmf">魔方财务 (ZJMF)</option><option value="whmcs">WHMCS</option></select></div>' +
        '<div class="form-group"><label class="form-label">标识名</label><input class="form-input" id="ap-name" placeholder="如 heyunidc"></div>' +
        '<div class="form-group"><label class="form-label">显示名称</label><input class="form-input" id="ap-display" placeholder="如 核云"></div>' +
        '<div class="form-group"><label class="form-label">API 地址</label><input class="form-input" id="ap-url" placeholder="https://www.heyunidc.cn/v1"></div>' +
        '<div class="form-group"><label class="form-label">登录账号</label><input class="form-input" id="ap-account"></div>' +
        '<div class="form-group"><label class="form-label">API 密码</label><input class="form-input" id="ap-password" type="password"></div>',
        '<button class="btn btn-ghost" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="doAddProvider()">添加</button>');
    };

    window.doAddProvider = async function() {
      try {
        await App.api('/providers', { method: 'POST', body: JSON.stringify({
          type: document.getElementById('ap-type').value, name: document.getElementById('ap-name').value.trim(),
          display_name: document.getElementById('ap-display').value.trim(),
          api_base_url: document.getElementById('ap-url').value.trim(),
          api_account: document.getElementById('ap-account').value.trim(),
          api_password: document.getElementById('ap-password').value.trim(),
        })});
        App.closeModal(); App.toast('服务商已添加', 'success');
        App.state.providers = await App.api('/providers'); renderSettingsContent();
      } catch (e) { App.toast('添加失败: ' + e.message, 'error'); }
    };

    window.testProvider = async function(id) {
      try { App.toast('测试连接中...', 'info'); await App.api('/providers/' + id + '/test', { method: 'POST' }); App.toast('连接成功', 'success'); }
      catch (e) { App.toast('连接失败: ' + e.message, 'error'); }
    };

    window.editProvider = async function(id) {
      try {
        var p = await App.api('/providers/' + id);
        App.modal('编辑服务商',
          '<div class="form-group"><label class="form-label">平台类型</label><select class="form-select" id="ep-type"><option value="zjmf"' + (p.type === 'zjmf' ? ' selected' : '') + '>魔方财务 (ZJMF)</option><option value="whmcs"' + (p.type === 'whmcs' ? ' selected' : '') + '>WHMCS</option></select></div>' +
          '<div class="form-group"><label class="form-label">显示名称</label><input class="form-input" id="ep-display" value="' + App.esc(p.display_name) + '"></div>' +
          '<div class="form-group"><label class="form-label">API 地址</label><input class="form-input" id="ep-url" value="' + App.esc(p.api_base_url) + '"></div>' +
          '<div class="form-group"><label class="form-label">登录账号</label><input class="form-input" id="ep-account" value="' + App.esc(p.api_account) + '"></div>' +
          '<div class="form-group"><label class="form-label">API 密码</label><input class="form-input" id="ep-password" type="password" placeholder="留空不修改"></div>' +
          '<div class="form-group"><label class="form-label">状态</label><select class="form-select" id="ep-enabled"><option value="1"' + (p.enabled ? ' selected' : '') + '>启用</option><option value="0"' + (!p.enabled ? ' selected' : '') + '>禁用</option></select></div>',
          '<button class="btn btn-ghost" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="doEditProvider(' + id + ')">保存</button>');
      } catch (e) { App.toast('获取信息失败', 'error'); }
    };

    window.doEditProvider = async function(id) {
      try {
        var data = { type: document.getElementById('ep-type').value, display_name: document.getElementById('ep-display').value.trim(), api_base_url: document.getElementById('ep-url').value.trim(), api_account: document.getElementById('ep-account').value.trim(), enabled: parseInt(document.getElementById('ep-enabled').value) };
        var pwd = document.getElementById('ep-password').value; if (pwd) data.api_password = pwd;
        await App.api('/providers/' + id, { method: 'PUT', body: JSON.stringify(data) });
        App.closeModal(); App.toast('已更新', 'success');
        App.state.providers = await App.api('/providers'); renderSettingsContent();
      } catch (e) { App.toast('更新失败: ' + e.message, 'error'); }
    };

    window.deleteProvider = function(id) {
      App.confirm('删除服务商将同时删除其下所有监控项，确定吗？', async function() {
        try { await App.api('/providers/' + id, { method: 'DELETE' }); App.toast('已删除', 'success'); App.state.providers = await App.api('/providers'); renderSettingsContent(); }
        catch (e) { App.toast('删除失败: ' + e.message, 'error'); }
      });
    };

    window.showAddNotification = function() {
      App.modal('添加通知渠道',
        '<div class="form-group"><label class="form-label">名称</label><input class="form-input" id="an-name"></div>' +
        '<div class="form-group"><label class="form-label">类型</label><select class="form-select" id="an-type" onchange="window._anTypeChange()"><option value="webhook">Webhook</option><option value="dingtalk">钉钉</option><option value="wecom">企业微信</option><option value="telegram">Telegram</option></select></div>' +
        '<div id="an-fields"><div class="form-group"><label class="form-label">Webhook URL</label><input class="form-input" id="an-url" placeholder="https://..."></div></div>',
        '<button class="btn btn-ghost" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="doAddNotification()">添加</button>');
    };

    window._anTypeChange = function() {
      var t = document.getElementById('an-type').value;
      var f = document.getElementById('an-fields');
      if (t === 'telegram') {
        f.innerHTML = '<div class="form-group"><label class="form-label">Bot Token</label><input class="form-input" id="an-token" placeholder="123456:ABC-DEF..."></div>' +
          '<div class="form-group"><label class="form-label">Chat ID</label><input class="form-input" id="an-chatid" placeholder="-1001234567890"></div>';
      } else if (t === 'dingtalk') {
        f.innerHTML = '<div class="form-group"><label class="form-label">Webhook URL</label><input class="form-input" id="an-url" placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."></div>';
      } else if (t === 'wecom') {
        f.innerHTML = '<div class="form-group"><label class="form-label">Webhook URL</label><input class="form-input" id="an-url" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."></div>';
      } else {
        f.innerHTML = '<div class="form-group"><label class="form-label">Webhook URL</label><input class="form-input" id="an-url" placeholder="https://..."></div>';
      }
    };

    window.doAddNotification = async function() {
      try {
        var t = document.getElementById('an-type').value;
        var cfgObj = {};
        if (t === 'telegram') {
          var token = (document.getElementById('an-token') || {}).value || '';
          var chatid = (document.getElementById('an-chatid') || {}).value || '';
          if (!token || !chatid) { App.toast('请填写 Bot Token 和 Chat ID', 'warning'); return; }
          cfgObj = { url: 'https://api.telegram.org/bot' + token.trim() + '/sendMessage', chat_id: chatid.trim() };
        } else {
          var url = (document.getElementById('an-url') || {}).value || '';
          if (!url.trim()) { App.toast('请填写 Webhook URL', 'warning'); return; }
          cfgObj = { url: url.trim() };
        }
        await App.api('/notifications', { method: 'POST', body: JSON.stringify({
          name: document.getElementById('an-name').value.trim(), type: t,
          config: JSON.stringify(cfgObj),
        })});
        App.closeModal(); App.toast('渠道已添加', 'success');
        App.state.notifications = await App.api('/notifications'); renderSettingsContent();
      } catch (e) { App.toast('添加失败: ' + e.message, 'error'); }
    };

    window.testNotification = async function(id) {
      try { App.toast('发送测试通知...', 'info'); await App.api('/notifications/' + id + '/test', { method: 'POST' }); App.toast('测试通知已发送', 'success'); }
      catch (e) { App.toast('发送失败: ' + e.message, 'error'); }
    };

    window.editNotification = async function(id) {
      var ch = App.state.notifications.find(function(c) { return c.id === id; });
      if (!ch) return;
      var cfg = {}; try { cfg = JSON.parse(ch.config); } catch(e) {}
      var typeFields = '';
      if (ch.type === 'telegram') {
        typeFields = '<div class="form-group"><label class="form-label">Bot Token</label><input class="form-input" id="en-token" placeholder="123456:ABC-DEF..."></div>' +
          '<div class="form-group"><label class="form-label">Chat ID</label><input class="form-input" id="en-chatid" value="' + App.esc(cfg.chat_id || '') + '"></div>';
      } else {
        typeFields = '<div class="form-group"><label class="form-label">Webhook URL</label><input class="form-input" id="en-url" value="' + App.esc(cfg.url || cfg.webhook_url || '') + '"></div>';
      }
      App.modal('编辑通知渠道',
        '<div class="form-group"><label class="form-label">名称</label><input class="form-input" id="en-name" value="' + App.esc(ch.name) + '"></div>' +
        typeFields +
        '<div class="form-group"><label class="form-label">状态</label><select class="form-select" id="en-enabled"><option value="1"' + (ch.enabled ? ' selected' : '') + '>启用</option><option value="0"' + (!ch.enabled ? ' selected' : '') + '>禁用</option></select></div>',
        '<button class="btn btn-ghost" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="doEditNotification(' + id + ')">保存</button>');
      // Telegram: 从 url 中反推 token 填入
      if (ch.type === 'telegram' && cfg.url) {
        var m = String(cfg.url).match(/\\/bot([^/]+)\\/sendMessage/);
        if (m) document.getElementById('en-token').value = m[1];
      }
    };

    window.doEditNotification = async function(id) {
      try {
        var ch = App.state.notifications.find(function(c) { return c.id === id; });
        if (!ch) return;
        var cfgObj = {};
        if (ch.type === 'telegram') {
          var token = (document.getElementById('en-token') || {}).value || '';
          var chatid = (document.getElementById('en-chatid') || {}).value || '';
          cfgObj = { url: 'https://api.telegram.org/bot' + token.trim() + '/sendMessage', chat_id: chatid.trim() };
        } else {
          cfgObj = { url: (document.getElementById('en-url') || {}).value.trim() };
        }
        await App.api('/notifications/' + id, { method: 'PUT', body: JSON.stringify({
          name: document.getElementById('en-name').value.trim(),
          config: JSON.stringify(cfgObj),
          enabled: parseInt(document.getElementById('en-enabled').value),
        })});
        App.closeModal(); App.toast('已更新', 'success');
        App.state.notifications = await App.api('/notifications'); renderSettingsContent();
      } catch (e) { App.toast('更新失败: ' + e.message, 'error'); }
    };

    window.deleteNotification = function(id) {
      App.confirm('确定要删除此通知渠道吗？', async function() {
        try { await App.api('/notifications/' + id, { method: 'DELETE' }); App.toast('已删除', 'success'); App.state.notifications = await App.api('/notifications'); renderSettingsContent(); }
        catch (e) { App.toast('删除失败: ' + e.message, 'error'); }
      });
    };

    window.showAddUser = function() {
      App.modal('添加用户',
        '<div class="form-group"><label class="form-label">用户名</label><input class="form-input" id="au-username"></div>' +
        '<div class="form-group"><label class="form-label">密码</label><input class="form-input" id="au-password" type="password"></div>' +
        '<div class="form-group"><label class="form-label">显示名</label><input class="form-input" id="au-display"></div>',
        '<button class="btn btn-ghost" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="doAddUser()">添加</button>');
    };

    window.doAddUser = async function() {
      try {
        await App.api('/users', { method: 'POST', body: JSON.stringify({
          username: document.getElementById('au-username').value.trim(),
          password: document.getElementById('au-password').value,
          display_name: document.getElementById('au-display').value.trim(),
        })});
        App.closeModal(); App.toast('用户已添加', 'success');
        App.state.users = await App.api('/users'); renderSettingsContent();
      } catch (e) { App.toast('添加失败: ' + e.message, 'error'); }
    };

    window.changePassword = function(id) {
      var isAdmin = App.user && App.user.role === 'admin';
      var oldPwdField = isAdmin ? '' : '<div class="form-group"><label class="form-label">当前密码</label><input class="form-input" id="cp-old-password" type="password"></div>';
      App.modal('修改密码',
        oldPwdField +
        '<div class="form-group"><label class="form-label">新密码</label><input class="form-input" id="cp-password" type="password"></div>' +
        '<div class="form-group"><label class="form-label">确认密码</label><input class="form-input" id="cp-confirm" type="password"></div>',
        '<button class="btn btn-ghost" onclick="App.closeModal()">取消</button><button class="btn btn-primary" onclick="doChangePassword(' + id + ')">保存</button>');
    };

    window.doChangePassword = async function(id) {
      var pwd = document.getElementById('cp-password').value;
      var confirmPwd = document.getElementById('cp-confirm').value;
      if (!pwd) { App.toast('请输入新密码', 'warning'); return; }
      if (pwd !== confirmPwd) { App.toast('两次密码不一致', 'warning'); return; }
      var payload = { password: pwd };
      var oldEl = document.getElementById('cp-old-password');
      if (oldEl) { payload.old_password = oldEl.value; }
      try {
        await App.api('/users/' + id + '/password', { method: 'PUT', body: JSON.stringify(payload) });
        App.closeModal(); App.toast('密码已更新', 'success');
      } catch (e) { App.toast('更新失败: ' + e.message, 'error'); }
    };

    window.deleteUser = function(id) {
      App.confirm('确定要删除此用户吗？', async function() {
        try { await App.api('/users/' + id, { method: 'DELETE' }); App.toast('已删除', 'success'); App.state.users = await App.api('/users'); renderSettingsContent(); }
        catch (e) { App.toast('删除失败: ' + e.message, 'error'); }
      });
    };

    renderSettings();
  } catch (e) { App.toast('加载设置失败: ' + e.message, 'error'); }
});

// ==================== 启动 ====================
(function init() {
  if (App.token) {
    App.api('/auth/me').then(function(u) {
      App.user = u;
      if (location.hash === '' || location.hash === '#/' || location.hash === '#/login') location.hash = '#/dashboard';
      Router.resolve();
    }).catch(function() {
      App.token = null; localStorage.removeItem('token');
      location.hash = '#/login'; Router.resolve();
    });
  } else {
    if (location.hash !== '#/login') location.hash = '#/login';
    Router.resolve();
  }
})();
`;

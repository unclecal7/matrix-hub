import { useState, useRef, useCallback, useMemo, useEffect } from "react";

// --- Mock Data Generation ---
const VIDEOHUB_INPUTS = [
  { id: 0, label: "CAM 1", group: "Cameras", color: "#3b82f6" },
  { id: 1, label: "CAM 2", group: "Cameras", color: "#3b82f6" },
  { id: 2, label: "CAM 3", group: "Cameras", color: "#3b82f6" },
  { id: 3, label: "CAM 4", group: "Cameras", color: "#3b82f6" },
  { id: 4, label: "CAM 5 (Jib)", group: "Cameras", color: "#3b82f6" },
  { id: 5, label: "CAM 6 (Robo)", group: "Cameras", color: "#3b82f6" },
  { id: 6, label: "GFX 1", group: "Graphics", color: "#a855f7" },
  { id: 7, label: "GFX 2", group: "Graphics", color: "#a855f7" },
  { id: 8, label: "GFX 3 (Lower)", group: "Graphics", color: "#a855f7" },
  { id: 9, label: "REPLAY 1", group: "Replay", color: "#f59e0b" },
  { id: 10, label: "REPLAY 2", group: "Replay", color: "#f59e0b" },
  { id: 11, label: "REPLAY 3", group: "Replay", color: "#f59e0b" },
  { id: 12, label: "ME 1 PGM", group: "Switcher", color: "#ef4444" },
  { id: 13, label: "ME 1 PVW", group: "Switcher", color: "#ef4444" },
  { id: 14, label: "ME 2 PGM", group: "Switcher", color: "#ef4444" },
  { id: 15, label: "ME 2 PVW", group: "Switcher", color: "#ef4444" },
  { id: 16, label: "AUX 1", group: "Auxiliaries", color: "#14b8a6" },
  { id: 17, label: "AUX 2", group: "Auxiliaries", color: "#14b8a6" },
  { id: 18, label: "AUX 3", group: "Auxiliaries", color: "#14b8a6" },
  { id: 19, label: "MEDIA PLR 1", group: "Media", color: "#ec4899" },
  { id: 20, label: "MEDIA PLR 2", group: "Media", color: "#ec4899" },
  { id: 21, label: "SS 1", group: "SuperSource", color: "#f97316" },
  { id: 22, label: "SS 2", group: "SuperSource", color: "#f97316" },
  { id: 23, label: "BLACK", group: "Utility", color: "#64748b" },
];

const VIDEOHUB_OUTPUTS = [
  { id: 0, label: "MON 1 (Director)", group: "Confidence Monitors", color: "#22c55e", locked: false },
  { id: 1, label: "MON 2 (Producer)", group: "Confidence Monitors", color: "#22c55e", locked: false },
  { id: 2, label: "MON 3 (Audio)", group: "Confidence Monitors", color: "#22c55e", locked: false },
  { id: 3, label: "MON 4 (Graphics)", group: "Confidence Monitors", color: "#22c55e", locked: false },
  { id: 4, label: "MON 5 (Talent)", group: "Confidence Monitors", color: "#22c55e", locked: true },
  { id: 5, label: "RECORD 1", group: "Record / Stream", color: "#ef4444", locked: true },
  { id: 6, label: "RECORD 2", group: "Record / Stream", color: "#ef4444", locked: true },
  { id: 7, label: "STREAM 1", group: "Record / Stream", color: "#ef4444", locked: true },
  { id: 8, label: "TX 1 (Fiber)", group: "Distribution", color: "#f59e0b", locked: false },
  { id: 9, label: "TX 2 (Fiber)", group: "Distribution", color: "#f59e0b", locked: false },
  { id: 10, label: "TX 3 (IPTV)", group: "Distribution", color: "#f59e0b", locked: false },
  { id: 11, label: "ME 1 Input 1", group: "Switcher Returns", color: "#8b5cf6", locked: false },
  { id: 12, label: "ME 1 Input 2", group: "Switcher Returns", color: "#8b5cf6", locked: false },
  { id: 13, label: "ME 2 Input 1", group: "Switcher Returns", color: "#8b5cf6", locked: false },
  { id: 14, label: "ME 2 Input 2", group: "Switcher Returns", color: "#8b5cf6", locked: false },
  { id: 15, label: "REPLAY IN 1", group: "Replay Inputs", color: "#06b6d4", locked: false },
  { id: 16, label: "REPLAY IN 2", group: "Replay Inputs", color: "#06b6d4", locked: false },
  { id: 17, label: "REPLAY IN 3", group: "Replay Inputs", color: "#06b6d4", locked: false },
  { id: 18, label: "REPLAY IN 4", group: "Replay Inputs", color: "#06b6d4", locked: false },
  { id: 19, label: "SCOPE 1", group: "Scopes", color: "#64748b", locked: false },
  { id: 20, label: "SCOPE 2", group: "Scopes", color: "#64748b", locked: false },
];

const generateRouting = () => {
  const routing = {};
  VIDEOHUB_OUTPUTS.forEach((out) => {
    routing[out.id] = Math.floor(Math.random() * VIDEOHUB_INPUTS.length);
  });
  return routing;
};

// --- Utility ---
const groupBy = (arr, key) => {
  const map = new Map();
  arr.forEach((item) => {
    const group = item[key];
    if (!map.has(group)) map.set(group, []);
    map.get(group).push(item);
  });
  return map;
};

// --- CSS ---
const injectStyles = () => {
  if (document.getElementById("mh-styles")) return;
  const style = document.createElement("style");
  style.id = "mh-styles";
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    :root {
      --mh-bg: #0a0c10;
      --mh-surface: #11141a;
      --mh-surface2: #181c25;
      --mh-surface3: #1e2330;
      --mh-border: #252a36;
      --mh-border-bright: #353b4a;
      --mh-text: #e2e8f0;
      --mh-text-dim: #64748b;
      --mh-text-muted: #475569;
      --mh-accent: #00e5a0;
      --mh-accent-dim: rgba(0, 229, 160, 0.08);
      --mh-accent-mid: rgba(0, 229, 160, 0.15);
      --mh-accent-bright: rgba(0, 229, 160, 0.25);
      --mh-danger: #f43f5e;
      --mh-warn: #f59e0b;
      --mh-cell: 36px;
      --mh-header-w: 200px;
      --mh-col-header-h: 160px;
      --mh-font: 'Plus Jakarta Sans', system-ui, sans-serif;
      --mh-mono: 'JetBrains Mono', monospace;
    }

    .mh-root * { box-sizing: border-box; margin: 0; padding: 0; }
    .mh-root {
      font-family: var(--mh-font);
      background: var(--mh-bg);
      color: var(--mh-text);
      height: 100vh;
      width: 100vw;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }

    /* Title Bar */
    .mh-titlebar {
      height: 48px;
      background: var(--mh-surface);
      border-bottom: 1px solid var(--mh-border);
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 16px;
      flex-shrink: 0;
      z-index: 100;
    }
    .mh-logo {
      font-family: var(--mh-mono);
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.08em;
      color: var(--mh-accent);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .mh-logo svg { width: 18px; height: 18px; }
    .mh-logo-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--mh-accent);
      box-shadow: 0 0 8px var(--mh-accent);
      animation: mh-pulse 2s ease-in-out infinite;
    }
    @keyframes mh-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .mh-tabs {
      display: flex;
      gap: 2px;
      background: var(--mh-bg);
      border-radius: 8px;
      padding: 2px;
    }
    .mh-tab {
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
      cursor: pointer;
      color: var(--mh-text-dim);
      transition: all 0.15s ease;
      border: none;
      background: transparent;
    }
    .mh-tab:hover { color: var(--mh-text); }
    .mh-tab.active {
      background: var(--mh-surface3);
      color: var(--mh-accent);
    }

    .mh-device-badge {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 11px;
      color: var(--mh-text-dim);
    }
    .mh-status-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--mh-accent);
      box-shadow: 0 0 6px rgba(0, 229, 160, 0.4);
    }
    .mh-status-dot.offline {
      background: var(--mh-danger);
      box-shadow: 0 0 6px rgba(244, 63, 94, 0.4);
    }

    /* Toolbar */
    .mh-toolbar {
      height: 44px;
      background: var(--mh-surface);
      border-bottom: 1px solid var(--mh-border);
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 12px;
      flex-shrink: 0;
    }
    .mh-search {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--mh-bg);
      border: 1px solid var(--mh-border);
      border-radius: 6px;
      padding: 0 10px;
      height: 30px;
      width: 240px;
      transition: border-color 0.15s;
    }
    .mh-search:focus-within {
      border-color: var(--mh-accent);
      box-shadow: 0 0 0 2px var(--mh-accent-dim);
    }
    .mh-search svg { width: 14px; height: 14px; color: var(--mh-text-dim); flex-shrink: 0; }
    .mh-search input {
      background: transparent;
      border: none;
      outline: none;
      color: var(--mh-text);
      font-size: 12px;
      font-family: var(--mh-font);
      width: 100%;
    }
    .mh-search input::placeholder { color: var(--mh-text-muted); }

    .mh-toolbar-divider {
      width: 1px;
      height: 20px;
      background: var(--mh-border);
    }

    .mh-toolbar-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      font-family: var(--mh-font);
      cursor: pointer;
      border: 1px solid var(--mh-border);
      background: var(--mh-surface2);
      color: var(--mh-text-dim);
      transition: all 0.15s;
    }
    .mh-toolbar-btn:hover {
      border-color: var(--mh-border-bright);
      color: var(--mh-text);
    }
    .mh-toolbar-btn.active {
      border-color: var(--mh-accent);
      color: var(--mh-accent);
      background: var(--mh-accent-dim);
    }
    .mh-toolbar-btn svg { width: 13px; height: 13px; }

    .mh-salvo-btn {
      margin-left: auto;
      background: linear-gradient(135deg, rgba(0,229,160,0.12), rgba(0,229,160,0.04));
      border-color: rgba(0,229,160,0.25);
      color: var(--mh-accent);
    }
    .mh-salvo-btn:hover {
      background: linear-gradient(135deg, rgba(0,229,160,0.2), rgba(0,229,160,0.08));
      border-color: var(--mh-accent);
    }

    /* Grid Area */
    .mh-grid-area {
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
    }

    /* Sidebar for groups */
    .mh-sidebar {
      width: 180px;
      background: var(--mh-surface);
      border-right: 1px solid var(--mh-border);
      overflow-y: auto;
      flex-shrink: 0;
      padding: 8px 0;
    }
    .mh-sidebar-title {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--mh-text-muted);
      padding: 8px 12px 6px;
    }
    .mh-group-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      font-size: 11px;
      color: var(--mh-text-dim);
      cursor: pointer;
      transition: all 0.1s;
    }
    .mh-group-item:hover { background: var(--mh-surface2); color: var(--mh-text); }
    .mh-group-item.active { color: var(--mh-text); }
    .mh-group-dot {
      width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0;
    }
    .mh-group-chevron {
      margin-left: auto;
      width: 12px; height: 12px;
      transition: transform 0.15s;
      color: var(--mh-text-muted);
    }
    .mh-group-chevron.collapsed { transform: rotate(-90deg); }
    .mh-group-count {
      font-family: var(--mh-mono);
      font-size: 9px;
      color: var(--mh-text-muted);
      background: var(--mh-bg);
      padding: 1px 5px;
      border-radius: 3px;
      margin-left: auto;
    }

    /* Main Grid */
    .mh-grid-container {
      flex: 1;
      overflow: auto;
      position: relative;
    }
    .mh-grid-wrapper {
      position: relative;
      min-width: fit-content;
    }

    /* Column Headers */
    .mh-col-headers {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      padding-left: var(--mh-header-w);
      background: var(--mh-surface);
      border-bottom: 1px solid var(--mh-border);
    }
    .mh-col-header {
      width: var(--mh-cell);
      height: var(--mh-col-header-h);
      display: flex;
      align-items: flex-end;
      justify-content: flex-start;
      padding: 8px 0;
      position: relative;
    }
    .mh-col-header-text {
      transform: rotate(-55deg);
      transform-origin: left bottom;
      white-space: nowrap;
      font-size: 10px;
      font-weight: 500;
      color: var(--mh-text-dim);
      transition: color 0.1s;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mh-col-header.hovered .mh-col-header-text { color: var(--mh-accent); }
    .mh-col-group-bar {
      position: absolute;
      top: 4px;
      left: 50%;
      transform: translateX(-50%);
      width: 3px;
      height: 14px;
      border-radius: 1.5px;
    }

    /* Row */
    .mh-row {
      display: flex;
      height: var(--mh-cell);
      border-bottom: 1px solid rgba(37, 42, 54, 0.5);
    }
    .mh-row.group-header {
      background: var(--mh-surface2);
      border-bottom: 1px solid var(--mh-border);
      height: 28px;
    }
    .mh-row:hover { background: rgba(0, 229, 160, 0.02); }

    .mh-row-header {
      width: var(--mh-header-w);
      position: sticky;
      left: 0;
      z-index: 10;
      background: var(--mh-surface);
      display: flex;
      align-items: center;
      padding: 0 8px 0 12px;
      gap: 6px;
      border-right: 1px solid var(--mh-border);
      font-size: 11px;
      flex-shrink: 0;
    }
    .mh-row-header.hovered { background: var(--mh-surface2); }
    .mh-row-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--mh-text-dim);
      font-weight: 500;
    }
    .mh-row-header.hovered .mh-row-label { color: var(--mh-text); }
    .mh-row-color {
      width: 3px;
      height: 16px;
      border-radius: 1.5px;
      flex-shrink: 0;
    }
    .mh-row-lock {
      margin-left: auto;
      width: 12px; height: 12px;
      flex-shrink: 0;
    }

    /* Group Row */
    .mh-group-row-header {
      width: 100%;
      display: flex;
      align-items: center;
      padding: 0 12px;
      gap: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--mh-text-muted);
      cursor: pointer;
    }
    .mh-group-row-header:hover { color: var(--mh-text-dim); }

    /* Cells */
    .mh-cell {
      width: var(--mh-cell);
      height: var(--mh-cell);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-right: 1px solid rgba(37, 42, 54, 0.3);
      position: relative;
      cursor: pointer;
      transition: background 0.08s;
    }
    .mh-cell:hover { background: var(--mh-accent-mid); }
    .mh-cell.active {
      background: var(--mh-accent-dim);
    }
    .mh-cell.active .mh-checkmark {
      opacity: 1;
    }
    .mh-cell.locked {
      cursor: not-allowed;
    }
    .mh-cell.locked::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 3px,
        rgba(244, 63, 94, 0.04) 3px,
        rgba(244, 63, 94, 0.04) 6px
      );
    }

    .mh-checkmark {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      background: var(--mh-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 8px rgba(0, 229, 160, 0.3);
      opacity: 0;
      transition: opacity 0.1s, transform 0.1s;
    }
    .mh-checkmark svg { width: 10px; height: 10px; color: var(--mh-bg); }

    /* Crosshair overlays */
    .mh-crosshair-row, .mh-crosshair-col {
      position: absolute;
      pointer-events: none;
      z-index: 5;
      transition: opacity 0.08s;
    }
    .mh-crosshair-row {
      left: var(--mh-header-w);
      right: 0;
      height: var(--mh-cell);
      background: linear-gradient(90deg, var(--mh-accent-dim), rgba(0,229,160,0.03));
      border-top: 1px solid rgba(0, 229, 160, 0.1);
      border-bottom: 1px solid rgba(0, 229, 160, 0.1);
    }
    .mh-crosshair-col {
      top: var(--mh-col-header-h);
      bottom: 0;
      width: var(--mh-cell);
      background: linear-gradient(180deg, var(--mh-accent-dim), rgba(0,229,160,0.03));
      border-left: 1px solid rgba(0, 229, 160, 0.1);
      border-right: 1px solid rgba(0, 229, 160, 0.1);
    }

    /* Flash animation for route changes */
    @keyframes mh-flash {
      0% { background: rgba(0, 229, 160, 0.4); transform: scale(1.1); }
      100% { background: transparent; transform: scale(1); }
    }
    .mh-cell.flash { animation: mh-flash 0.4s ease-out; }

    /* Offline overlay */
    .mh-offline-overlay {
      position: absolute;
      inset: 0;
      background: rgba(10, 12, 16, 0.85);
      backdrop-filter: blur(4px);
      z-index: 50;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .mh-offline-text {
      font-family: var(--mh-mono);
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0.2em;
      color: var(--mh-danger);
      text-shadow: 0 0 20px rgba(244, 63, 94, 0.3);
    }
    .mh-offline-sub {
      font-size: 12px;
      color: var(--mh-text-muted);
    }

    /* Scrollbar */
    .mh-grid-container::-webkit-scrollbar { width: 8px; height: 8px; }
    .mh-grid-container::-webkit-scrollbar-track { background: var(--mh-bg); }
    .mh-grid-container::-webkit-scrollbar-thumb {
      background: var(--mh-surface3);
      border-radius: 4px;
    }
    .mh-grid-container::-webkit-scrollbar-thumb:hover { background: var(--mh-border-bright); }
    .mh-grid-container::-webkit-scrollbar-corner { background: var(--mh-bg); }

    /* Bottom Status Bar */
    .mh-statusbar {
      height: 28px;
      background: var(--mh-surface);
      border-top: 1px solid var(--mh-border);
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 16px;
      font-size: 10px;
      color: var(--mh-text-muted);
      flex-shrink: 0;
    }
    .mh-statusbar-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .mh-statusbar-accent { color: var(--mh-accent); font-weight: 600; }

    /* Tooltip */
    .mh-tooltip {
      position: fixed;
      background: var(--mh-surface3);
      border: 1px solid var(--mh-border-bright);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 11px;
      color: var(--mh-text);
      pointer-events: none;
      z-index: 200;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      white-space: nowrap;
    }
    .mh-tooltip-route {
      font-family: var(--mh-mono);
      font-size: 10px;
      color: var(--mh-accent);
      margin-top: 2px;
    }

    .mh-sidebar::-webkit-scrollbar { width: 4px; }
    .mh-sidebar::-webkit-scrollbar-track { background: transparent; }
    .mh-sidebar::-webkit-scrollbar-thumb { background: var(--mh-surface3); border-radius: 2px; }
  `;
  document.head.appendChild(style);
};

// --- Icons ---
const CheckIcon = () => (
  <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 5.5L4 7.5L8 3" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="6.5" cy="6.5" r="5" />
    <path d="M10 10L14 14" strokeLinecap="round" />
  </svg>
);
const LockIcon = ({ color = "#f43f5e" }) => (
  <svg viewBox="0 0 14 14" fill="none" className="mh-row-lock">
    <rect x="2" y="6" width="10" height="7" rx="1.5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" />
    <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke={color} strokeWidth="1" strokeLinecap="round" />
  </svg>
);
const ChevronIcon = ({ collapsed }) => (
  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={`mh-group-chevron ${collapsed ? 'collapsed' : ''}`}>
    <path d="M3 4.5L6 7.5L9 4.5" />
  </svg>
);
const GridIcon = () => (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="1" y="1" width="6" height="6" rx="1" />
    <rect x="1" y="11" width="6" height="6" rx="1" />
    <rect x="11" y="1" width="6" height="6" rx="1" />
    <rect x="11" y="11" width="6" height="6" rx="1" />
  </svg>
);
const SaveIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M3 1h6.5L12 3.5V11a2 2 0 01-2 2H4a2 2 0 01-2-2V3a2 2 0 012-2z" />
    <path d="M5 1v3h4V1" />
    <rect x="4" y="8" width="6" height="4" rx="0.5" />
  </svg>
);
const LockToggleIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="2" y="6" width="10" height="7" rx="1.5" />
    <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" strokeLinecap="round" />
  </svg>
);
const ExpandIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M1 5V1h4M9 1h4v4M1 9v4h4M9 13h4V9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function MatrixHub() {
  useEffect(() => { injectStyles(); }, []);

  const [activeTab, setActiveTab] = useState("videohub");
  const [routing, setRouting] = useState(generateRouting);
  const [search, setSearch] = useState("");
  const [hoveredCell, setHoveredCell] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [flashCell, setFlashCell] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showLocks, setShowLocks] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const gridRef = useRef(null);

  const inputGroups = useMemo(() => groupBy(VIDEOHUB_INPUTS, "group"), []);
  const outputGroups = useMemo(() => groupBy(VIDEOHUB_OUTPUTS, "group"), []);

  const filteredInputs = useMemo(() => {
    if (!search) return VIDEOHUB_INPUTS;
    const q = search.toLowerCase();
    return VIDEOHUB_INPUTS.filter(
      (i) => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q)
    );
  }, [search]);

  const filteredOutputs = useMemo(() => {
    if (!search) return VIDEOHUB_OUTPUTS;
    const q = search.toLowerCase();
    return VIDEOHUB_OUTPUTS.filter(
      (o) => o.label.toLowerCase().includes(q) || o.group.toLowerCase().includes(q)
    );
  }, [search]);

  // Build visible rows (with group headers)
  const visibleRows = useMemo(() => {
    const rows = [];
    const groups = groupBy(filteredOutputs, "group");
    for (const [groupName, items] of groups) {
      rows.push({ type: "group", name: groupName, color: items[0].color, count: items.length });
      if (!collapsedGroups.has(groupName)) {
        items.forEach((item) => rows.push({ type: "output", ...item }));
      }
    }
    return rows;
  }, [filteredOutputs, collapsedGroups]);

  const toggleGroup = useCallback((name) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const handleRoute = useCallback((outId, inId) => {
    const output = VIDEOHUB_OUTPUTS.find((o) => o.id === outId);
    if (output?.locked && showLocks) return;
    setRouting((prev) => ({ ...prev, [outId]: inId }));
    setFlashCell(`${outId}-${inId}`);
    setTimeout(() => setFlashCell(null), 400);
  }, [showLocks]);

  const handleCellHover = useCallback((outId, inId, e) => {
    setHoveredCell({ row: outId, col: inId });
    const outItem = VIDEOHUB_OUTPUTS.find((o) => o.id === outId);
    const inItem = VIDEOHUB_INPUTS.find((i) => i.id === inId);
    if (outItem && inItem) {
      setTooltip({
        x: e.clientX + 12,
        y: e.clientY - 8,
        input: inItem.label,
        output: outItem.label,
        active: routing[outId] === inId,
      });
    }
  }, [routing]);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
    setTooltip(null);
  }, []);

  const activeRoutesCount = Object.keys(routing).length;
  const lockedCount = VIDEOHUB_OUTPUTS.filter((o) => o.locked).length;

  return (
    <div className="mh-root">
      {/* Title Bar */}
      <div className="mh-titlebar">
        <div className="mh-logo">
          <GridIcon />
          MATRIX HUB
        </div>

        <div className="mh-tabs">
          <button
            className={`mh-tab ${activeTab === "videohub" ? "active" : ""}`}
            onClick={() => setActiveTab("videohub")}
          >
            Videohub Routing
          </button>
          <button
            className={`mh-tab ${activeTab === "atem" ? "active" : ""}`}
            onClick={() => setActiveTab("atem")}
          >
            ATEM Aux Bus
          </button>
        </div>

        <div className="mh-device-badge">
          <div className={`mh-status-dot ${isOffline ? "offline" : ""}`} />
          <span style={{ fontFamily: "var(--mh-mono)", fontWeight: 600 }}>
            {isOffline ? "OFFLINE" : "Smart Videohub 40×40"}
          </span>
          <span style={{ color: "var(--mh-text-muted)" }}>10.0.1.100</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mh-toolbar">
        <div className="mh-search">
          <SearchIcon />
          <input
            placeholder="Filter inputs, outputs, groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mh-toolbar-divider" />

        <button
          className={`mh-toolbar-btn ${showLocks ? "active" : ""}`}
          onClick={() => setShowLocks(!showLocks)}
        >
          <LockToggleIcon />
          Locks {showLocks ? "ON" : "OFF"}
        </button>

        <button
          className={`mh-toolbar-btn ${isOffline ? "active" : ""}`}
          onClick={() => setIsOffline(!isOffline)}
          style={isOffline ? { borderColor: "var(--mh-danger)", color: "var(--mh-danger)", background: "rgba(244,63,94,0.06)" } : {}}
        >
          {isOffline ? "⚡ Go Online" : "⚡ Simulate Offline"}
        </button>

        <button className="mh-toolbar-btn" onClick={() => setRouting(generateRouting())}>
          ↻ Randomize
        </button>

        <button className="mh-toolbar-btn mh-salvo-btn">
          <SaveIcon />
          Save Salvo
        </button>
      </div>

      {/* Main Area */}
      <div className="mh-grid-area">
        {/* Sidebar */}
        <div className="mh-sidebar">
          <div className="mh-sidebar-title">Output Groups</div>
          {Array.from(outputGroups.entries()).map(([name, items]) => (
            <div
              key={name}
              className={`mh-group-item ${!collapsedGroups.has(name) ? "active" : ""}`}
              onClick={() => toggleGroup(name)}
            >
              <div className="mh-group-dot" style={{ background: items[0].color }} />
              <span style={{ fontSize: 11 }}>{name}</span>
              <span className="mh-group-count">{items.length}</span>
              <ChevronIcon collapsed={collapsedGroups.has(name)} />
            </div>
          ))}

          <div className="mh-sidebar-title" style={{ marginTop: 16 }}>Input Groups</div>
          {Array.from(inputGroups.entries()).map(([name, items]) => (
            <div key={name} className="mh-group-item active">
              <div className="mh-group-dot" style={{ background: items[0].color }} />
              <span style={{ fontSize: 11 }}>{name}</span>
              <span className="mh-group-count">{items.length}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="mh-grid-container" ref={gridRef} onMouseLeave={handleMouseLeave}>
          <div className="mh-grid-wrapper">
            {/* Column headers */}
            <div className="mh-col-headers">
              {filteredInputs.map((input) => (
                <div
                  key={input.id}
                  className={`mh-col-header ${hoveredCell?.col === input.id ? "hovered" : ""}`}
                >
                  <div className="mh-col-group-bar" style={{ background: input.color }} />
                  <div className="mh-col-header-text">{input.label}</div>
                </div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ position: "relative" }}>
              {/* Crosshair overlays */}
              {hoveredCell && !isOffline && (
                <>
                  <div
                    className="mh-crosshair-col"
                    style={{
                      left: `calc(var(--mh-header-w) + ${filteredInputs.findIndex((i) => i.id === hoveredCell.col) * 36}px)`,
                    }}
                  />
                </>
              )}

              {visibleRows.map((row, idx) => {
                if (row.type === "group") {
                  return (
                    <div key={`g-${row.name}`} className="mh-row group-header">
                      <div className="mh-group-row-header" onClick={() => toggleGroup(row.name)}>
                        <div className="mh-group-dot" style={{ background: row.color, width: 6, height: 6, borderRadius: 2 }} />
                        {row.name}
                        <span style={{ fontFamily: "var(--mh-mono)", fontSize: 9, opacity: 0.5, fontWeight: 400 }}>
                          ({row.count})
                        </span>
                        <ChevronIcon collapsed={collapsedGroups.has(row.name)} />
                      </div>
                    </div>
                  );
                }

                const isRowHovered = hoveredCell?.row === row.id;
                return (
                  <div
                    key={`o-${row.id}`}
                    className="mh-row"
                    style={isRowHovered && !isOffline ? { background: "var(--mh-accent-dim)" } : {}}
                  >
                    <div className={`mh-row-header ${isRowHovered ? "hovered" : ""}`}>
                      <div className="mh-row-color" style={{ background: row.color }} />
                      <span className="mh-row-label">{row.label}</span>
                      {row.locked && showLocks && <LockIcon />}
                    </div>

                    {filteredInputs.map((input) => {
                      const isActive = routing[row.id] === input.id;
                      const isLocked = row.locked && showLocks;
                      const cellKey = `${row.id}-${input.id}`;
                      const isFlashing = flashCell === cellKey;

                      return (
                        <div
                          key={cellKey}
                          className={`mh-cell ${isActive ? "active" : ""} ${isLocked ? "locked" : ""} ${isFlashing ? "flash" : ""}`}
                          onClick={() => handleRoute(row.id, input.id)}
                          onMouseEnter={(e) => handleCellHover(row.id, input.id, e)}
                          onMouseMove={(e) => {
                            if (tooltip) setTooltip((t) => ({ ...t, x: e.clientX + 12, y: e.clientY - 8 }));
                          }}
                        >
                          {isActive && (
                            <div className="mh-checkmark">
                              <CheckIcon />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Offline overlay */}
          {isOffline && (
            <div className="mh-offline-overlay">
              <div className="mh-offline-text">OFFLINE</div>
              <div className="mh-offline-sub">Device connection lost — waiting for reconnect...</div>
              <div style={{
                width: 120, height: 2, background: "var(--mh-surface3)", borderRadius: 1,
                marginTop: 8, overflow: "hidden", position: "relative"
              }}>
                <div style={{
                  width: 40, height: 2, background: "var(--mh-danger)", borderRadius: 1,
                  position: "absolute",
                  animation: "mh-scan 1.5s ease-in-out infinite",
                }} />
              </div>
              <style>{`
                @keyframes mh-scan {
                  0% { left: -40px; }
                  100% { left: 120px; }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="mh-statusbar">
        <div className="mh-statusbar-item">
          <span className="mh-statusbar-accent">{filteredInputs.length}</span> Inputs
        </div>
        <div className="mh-statusbar-item">
          <span className="mh-statusbar-accent">{filteredOutputs.length}</span> Outputs
        </div>
        <div className="mh-statusbar-item">
          <span className="mh-statusbar-accent">{activeRoutesCount}</span> Active Routes
        </div>
        <div className="mh-statusbar-item">
          <LockToggleIcon />
          <span className="mh-statusbar-accent">{lockedCount}</span> Locked
        </div>
        <div style={{ marginLeft: "auto", fontFamily: "var(--mh-mono)", letterSpacing: "0.05em" }}>
          {activeTab === "videohub" ? "VIDEOHUB 40×40" : "ATEM CONSTELLATION 8K — AUX BUS"}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && !isOffline && (
        <div className="mh-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div><strong>{tooltip.output}</strong> ← {tooltip.input}</div>
          <div className="mh-tooltip-route">
            {tooltip.active ? "✓ Active route — click to clear" : "Click to route"}
          </div>
        </div>
      )}
    </div>
  );
}

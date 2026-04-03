import { useEffect, useState, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════════════ */
const API = "http://localhost:3001";

function headers() {
  return {
    Authorization: localStorage.getItem("token"),
    "Content-Type": "application/json",
  };
}

function fmt(v) {
  return Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtData(d) {
  if (!d) return "—";
  const p = d.split("-");
  if (p.length !== 3) return d;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function hoje() {
  return new Date().toISOString().split("T")[0];
}

function mesPassado() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
}

/* ═══════════════════════════════════════════════════════════
   ICONS — Lucide-style inline SVGs
   ═══════════════════════════════════════════════════════════ */
const Icons = {
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  dollarSign: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  percent: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" x2="5" y1="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
  trendingUp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  ),
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  chevronDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  chevronUp: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  ),
  check: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  emptyState: (
    <svg width="64" height="64" viewBox="0 0 120 120" fill="none">
      <rect x="10" y="24" width="100" height="76" rx="16" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="22" y="40" width="76" height="8" rx="4" fill="#e2e8f0" />
      <rect x="22" y="56" width="52" height="8" rx="4" fill="#e2e8f0" />
      <rect x="22" y="72" width="64" height="8" rx="4" fill="#e2e8f0" />
      <circle cx="96" cy="24" r="18" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2" />
      <path d="M92 24l4 4 8-8" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════
   STATUS CONFIG
   ═════════════════════════════════════════════════════════���═ */
const STATUS_CONFIG = {
  pendente: { label: "Pendente", bg: "#fff7ed", color: "#ea580c", dot: "#fb923c" },
  pago:     { label: "Pago",     bg: "#f0fdf4", color: "#16a34a", dot: "#4ade80" },
};

/* ═══════════════════════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   ═══════════════════════════════════════════════════════════ */
const S = {
  /* ── Loading ─────────────────────────────────────── */
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    minHeight: "400px",
  },
  loadingPulse: { display: "flex", gap: "8px", alignItems: "center" },
  loadingDot: (delay) => ({
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite",
    animationDelay: delay,
  }),
  loadingText: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#94a3b8",
    letterSpacing: "0.02em",
  },

  /* ── Stats Grid ──────────────────────────────────── */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  statCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "22px",
    border: "1px solid #f1f5f9",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  statTop: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  statIconBox: (accent) => ({
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: accent + "14",
    color: accent,
  }),
  statLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b",
  },
  statValue: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
  statSub: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "500",
  },

  /* ── Filter Bar ──────────────────────────────────── */
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  searchInputWrap: (focused) => ({
    flex: 1,
    minWidth: "220px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    height: "40px",
    borderRadius: "10px",
    border: `1px solid ${focused ? "#2563eb" : "#e2e8f0"}`,
    padding: "0 14px",
    background: "#fff",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
    boxShadow: focused ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
  }),
  searchIcon: (focused) => ({
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    color: focused ? "#2563eb" : "#94a3b8",
    transition: "color 0.2s ease",
  }),
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "14px",
    color: "#0f172a",
    background: "transparent",
    fontWeight: "400",
    height: "100%",
    fontFamily: "inherit",
  },
  searchClear: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "none",
    background: "#f1f5f9",
    color: "#94a3b8",
    fontSize: "10px",
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1,
    fontFamily: "inherit",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  filterLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  filterInput: {
    height: "40px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "0 14px",
    fontSize: "14px",
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },

  /* ── Buttons ─────────────────────────────────────── */
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(37,99,235,0.2)",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    height: "40px",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "0 16px",
    background: "#fff",
    color: "#475569",
    fontWeight: "500",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    height: "40px",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },

  /* ── Table ───────────────────────────────────────── */
  tableCard: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
    overflow: "hidden",
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    height: "44px",
    background: "#fafbfc",
    borderBottom: "1px solid #f1f5f9",
    gap: "12px",
  },
  thCell: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  row: (hovered) => ({
    display: "flex",
    alignItems: "center",
    padding: "14px 24px",
    borderBottom: "1px solid #f8fafc",
    gap: "12px",
    transition: "background 0.15s ease",
    cursor: "pointer",
    background: hovered ? "#fafbfc" : "transparent",
  }),
  cellTextBold: {
    fontSize: "14px",
    color: "#0f172a",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cellText: {
    fontSize: "13px",
    color: "#475569",
    fontWeight: "400",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cellSub: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "500",
  },
  tableFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    borderTop: "1px solid #f1f5f9",
    background: "#fafbfc",
  },
  footerText: {
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: "400",
  },

  /* ── Avatar ──────────────────────────────────────── */
  avatar: (color) => ({
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: color + "14",
    color: color,
    fontSize: "14px",
    fontWeight: "700",
  }),

  /* ── Badges ──────────────────────────────────────── */
  badge: (bg, color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    flexShrink: 0,
    background: bg,
    color: color,
  }),
  badgeDot: (dotColor) => ({
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    flexShrink: 0,
    background: dotColor,
  }),
  percentBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "700",
    background: "#eff6ff",
    color: "#2563eb",
  },

  /* ── Progress Bar ────────────────────────────────── */
  progressTrack: {
    flex: 1,
    height: "6px",
    borderRadius: "3px",
    background: "#f1f5f9",
    overflow: "hidden",
  },
  progressFill: (pct, color) => ({
    height: "100%",
    borderRadius: "3px",
    background: color,
    width: `${Math.min(pct, 100)}%`,
    transition: "width 0.6s ease",
  }),

  /* ── Expanded Detail ─────────────────────────────── */
  expandedRow: {
    padding: "0 24px 16px 24px",
    borderBottom: "1px solid #f1f5f9",
    background: "#fafbfc",
  },
  expandedInner: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    padding: "16px 0 0 0",
  },
  detailCard: {
    flex: "1 1 200px",
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #f1f5f9",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  detailLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  detailValue: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
  },
  detailListItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 0",
    borderBottom: "1px solid #f8fafc",
    gap: "8px",
  },

  /* ── Action Buttons (table) ──────────────────────── */
  actionBtn: (hovered, color) => ({
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: hovered ? `1px solid ${color}20` : "1px solid transparent",
    background: hovered ? `${color}08` : "transparent",
    color: hovered ? color : "#64748b",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
    padding: 0,
    flexShrink: 0,
  }),

  /* ── Modal ───────────────────────────────────────── */
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    background: "#fff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "480px",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow:
      "0 20px 50px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    borderBottom: "1px solid #f1f5f9",
  },
  modalTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
    color: "#0f172a",
  },
  modalCloseBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
  },
  modalBody: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  modalFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "16px 24px",
    borderTop: "1px solid #f1f5f9",
  },

  /* ── Form ────────────────────────────────────────── */
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  formLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
  },
  formInput: {
    height: "40px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "0 14px",
    fontSize: "14px",
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  formSelect: {
    height: "40px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "0 14px",
    fontSize: "14px",
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    boxSizing: "border-box",
    cursor: "pointer",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  formHint: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "400",
  },

  /* ── Empty State ─────────────────────────────────── */
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "64px 20px",
  },
  emptyTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
    color: "#0f172a",
  },
  emptyText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: "400",
    textAlign: "center",
    maxWidth: "360px",
    lineHeight: 1.5,
  },
};

/* ═══════════════════════════════════════════════════════════
   CORES PARA AVATARES
   ═══════════════════════════════════════════════════════════ */
const AVATAR_COLORS = [
  "#2563eb", "#8b5cf6", "#ec4899", "#16a34a",
  "#ea580c", "#0891b2", "#dc2626", "#ca8a04",
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTES INTERNOS
   ═══════════════════════════════════════════════════════════ */

function Loading({ text = "Carregando" }) {
  return (
    <div style={S.loadingWrap}>
      <div style={S.loadingPulse}>
        <div style={S.loadingDot("0s")} />
        <div style={S.loadingDot("0.2s")} />
        <div style={S.loadingDot("0.4s")} />
      </div>
      <span style={S.loadingText}>{text}</span>
      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, icon, accent, sub }) {
  return (
    <div style={S.statCard}>
      <div style={S.statTop}>
        <span style={S.statIconBox(accent)}>{icon}</span>
        <span style={S.statLabel}>{label}</span>
      </div>
      <strong style={S.statValue}>{value}</strong>
      {sub && <span style={S.statSub}>{sub}</span>}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
  return (
    <span style={S.badge(cfg.bg, cfg.color)}>
      <span style={S.badgeDot(cfg.dot)} />
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — Comissoes
   ═══════════════════════════════════════════════════════════ */
function Comissoes() {
  const [comissoes, setComissoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [dataInicio, setDataInicio] = useState(mesPassado());
  const [dataFim, setDataFim] = useState(hoje());
  const [expandedId, setExpandedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);
  const [modal, setModal] = useState(null); // "config" | null
  const [configForm, setConfigForm] = useState({
    profissional_nome: "",
    percentual: "",
    tipo: "percentual",
  });

  /* ── Fetch ───────────────────────────────────────── */
  /* ✅ CORREÇÃO 1: backend retorna { comissoes, resumo_profissionais, ... }, não array direto */
  const carregar = () => {
    setCarregando(true);
    fetch(
      `${API}/financeiro/comissoes?data_inicio=${dataInicio}&data_fim=${dataFim}`,
      { headers: headers() }
    )
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setComissoes(d);
        } else if (d && Array.isArray(d.comissoes)) {
          setComissoes(d.comissoes);
        } else {
          setComissoes([]);
        }
      })
      .catch(console.error)
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, [dataInicio, dataFim]);

  /* ── Agrupado por profissional ───────────────────── */
  const agrupado = useMemo(() => {
    const mapa = {};
    comissoes.forEach((c) => {
      const nome = c.profissional_nome || c.profissional || "Não atribuído";
      if (!mapa[nome]) {
        mapa[nome] = {
          nome,
          percentual: Number(c.percentual || 0),
          total_atendimentos: 0,
          total_faturado: 0,
          total_comissao: 0,
          comissao_paga: 0,
          comissao_pendente: 0,
          itens: [],
        };
      }
      const valor = Number(c.valor || 0);
      const comissaoValor = Number(c.comissao || c.valor_comissao || 0);
      mapa[nome].total_atendimentos += 1;
      mapa[nome].total_faturado += valor;
      mapa[nome].total_comissao += comissaoValor;
      if (c.status === "pago") mapa[nome].comissao_paga += comissaoValor;
      else mapa[nome].comissao_pendente += comissaoValor;
      mapa[nome].itens.push(c);
    });
    return Object.values(mapa).sort((a, b) => b.total_comissao - a.total_comissao);
  }, [comissoes]);

  /* ── Filtro ──────────────────────────────────────── */
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return agrupado;
    return agrupado.filter((p) => p.nome.toLowerCase().includes(t));
  }, [agrupado, busca]);

  /* ── Stats ───────────────────────────────────────── */
  const stats = useMemo(() => {
    const totalComissao = agrupado.reduce((s, p) => s + p.total_comissao, 0);
    const totalFaturado = agrupado.reduce((s, p) => s + p.total_faturado, 0);
    const totalPendente = agrupado.reduce((s, p) => s + p.comissao_pendente, 0);
    return {
      profissionais: agrupado.length,
      totalComissao,
      totalFaturado,
      totalPendente,
      mediaPercentual:
        agrupado.length > 0
          ? (
              agrupado.reduce((s, p) => s + p.percentual, 0) / agrupado.length
            ).toFixed(1)
          : "0",
    };
  }, [agrupado]);

  /* ── Handlers ────────────────────────────────────── */
  const toggleExpand = (nome) => {
    setExpandedId(expandedId === nome ? null : nome);
  };

  /* ✅ CORREÇÃO 2: rota correta é /comissoes/:id/pagar */
  const marcarComissaoPaga = async (id) => {
    try {
      await fetch(`${API}/financeiro/comissoes/${id}/pagar`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          data_pagamento: new Date().toISOString().split("T")[0],
        }),
      });
      carregar();
    } catch (e) {
      console.error(e);
    }
  };

  /* ✅ CORREÇÃO 3: rota correta é /profissionais (POST) */
  const salvarConfig = async () => {
    try {
      const payload = {
        nome: configForm.profissional_nome,
        tipo_comissao: configForm.tipo,
        percentual_comissao: configForm.tipo === "percentual" ? parseFloat(configForm.percentual) || 0 : 0,
        valor_fixo_comissao: configForm.tipo === "fixo" ? parseFloat(configForm.percentual) || 0 : 0,
      };
      await fetch(`${API}/financeiro/profissionais`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      });
      setModal(null);
      carregar();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar configuração de comissão.");
    }
  };

  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#2563eb";
    e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#e2e8f0";
    e.target.style.boxShadow = "none";
  };

  /* ── Loading ─────────────────────────────────────── */
  if (carregando) return <Loading text="Carregando comissões" />;

  /* ── Colunas ─────────────────────────────────────── */
  const COL = {
    profissional:  { flex: "1.5", minWidth: "180px" },
    atendimentos:  { width: "110px", textAlign: "center" },
    faturado:      { width: "130px", textAlign: "right" },
    percentual:    { width: "100px", textAlign: "center" },
    comissao:      { width: "130px", textAlign: "right" },
    status:        { width: "120px" },
    expandir:      { width: "50px", justifyContent: "flex-end" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ══════════════════════════════════════════════
          STATS GRID
          ══════════════════════════════════════════════ */}
      <div style={S.statsGrid}>
        <StatCard
          label="Profissionais"
          value={stats.profissionais}
          icon={Icons.users}
          accent="#8b5cf6"
          sub="com comissões"
        />
        <StatCard
          label="Total faturado"
          value={fmt(stats.totalFaturado)}
          icon={Icons.trendingUp}
          accent="#16a34a"
          sub="no período"
        />
        <StatCard
          label="Total em comissões"
          value={fmt(stats.totalComissao)}
          icon={Icons.dollarSign}
          accent="#2563eb"
          sub={`média ${stats.mediaPercentual}%`}
        />
        <StatCard
          label="Comissões pendentes"
          value={fmt(stats.totalPendente)}
          icon={Icons.percent}
          accent="#ea580c"
          sub="a pagar"
        />
      </div>

      {/* ══════════════════════════════════════════════
          FILTER BAR
          ══════════════════════════════════════════════ */}
      <div style={S.filterBar}>
        <div style={S.searchInputWrap(searchFocused)}>
          <span style={S.searchIcon(searchFocused)}>{Icons.search}</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Buscar profissional..."
            style={S.searchInput}
          />
          {busca && (
            <button style={S.searchClear} onClick={() => setBusca("")}>
              ✕
            </button>
          )}
        </div>

        {/* Datas */}
        <div style={S.filterGroup}>
          <span style={S.filterLabel}>{Icons.calendar} De</span>
          <input
            type="date"
            style={S.filterInput}
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>
        <div style={S.filterGroup}>
          <span style={S.filterLabel}>{Icons.calendar} Até</span>
          <input
            type="date"
            style={S.filterInput}
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>

        <button
          style={S.btnSecondary}
          onClick={carregar}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          {Icons.refresh}
          <span>Atualizar</span>
        </button>

        <button
          style={S.btnPrimary}
          onClick={() => {
            setConfigForm({ profissional_nome: "", percentual: "", tipo: "percentual" });
            setModal("config");
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(37,99,235,0.2)";
          }}
        >
          {Icons.settings}
          <span>Configurar</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════
          TABELA ou EMPTY STATE
          ══════════════════════════════════════════════ */}
      {filtrados.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9" }}>
          <div style={S.emptyState}>
            {Icons.emptyState}
            <h3 style={S.emptyTitle}>
              {busca
                ? "Nenhum profissional encontrado"
                : "Nenhuma comissão no período"}
            </h3>
            <p style={S.emptyText}>
              {busca
                ? "Tente ajustar o termo de busca."
                : "Ajuste o intervalo de datas ou configure comissões para os profissionais."}
            </p>
          </div>
        </div>
      ) : (
        <div style={S.tableCard}>
          {/* Header */}
          <div style={S.tableHeader}>
            <span style={{ ...S.thCell, ...COL.profissional }}>Profissional</span>
            <span style={{ ...S.thCell, ...COL.atendimentos }}>Atendimentos</span>
            <span style={{ ...S.thCell, ...COL.faturado }}>Faturado</span>
            <span style={{ ...S.thCell, ...COL.percentual }}>Percentual</span>
            <span style={{ ...S.thCell, ...COL.comissao }}>Comissão</span>
            <span style={{ ...S.thCell, ...COL.status }}>Pendente</span>
            <span style={{ ...S.thCell, ...COL.expandir }}></span>
          </div>

          {/* Rows */}
          <ul style={S.list}>
            {filtrados.map((p) => {
              const isHovered = hoveredId === p.nome;
              const isExpanded = expandedId === p.nome;
              const color = getAvatarColor(p.nome);
              const pagoPct =
                p.total_comissao > 0
                  ? (p.comissao_paga / p.total_comissao) * 100
                  : 0;

              return (
                <li key={p.nome} style={{ margin: 0 }}>
                  {/* ── Main Row ──────────────────── */}
                  <div
                    style={S.row(isHovered)}
                    onMouseEnter={() => setHoveredId(p.nome)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => toggleExpand(p.nome)}
                  >
                    {/* Profissional */}
                    <div
                      style={{
                        ...COL.profissional,
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        minWidth: 0,
                      }}
                    >
                      <div style={S.avatar(color)}>
                        {getInitials(p.nome)}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                        <span style={S.cellTextBold}>{p.nome}</span>
                        <span style={S.cellSub}>
                          {p.total_atendimentos}{" "}
                          {p.total_atendimentos === 1 ? "atendimento" : "atendimentos"}
                        </span>
                      </div>
                    </div>

                    {/* Atendimentos */}
                    <div style={{ ...COL.atendimentos, display: "flex", justifyContent: "center" }}>
                      <span style={S.cellTextBold}>{p.total_atendimentos}</span>
                    </div>

                    {/* Faturado */}
                    <div style={{ ...COL.faturado }}>
                      <span
                        style={{
                          ...S.cellTextBold,
                          color: "#16a34a",
                          width: "100%",
                          textAlign: "right",
                          display: "block",
                        }}
                      >
                        {fmt(p.total_faturado)}
                      </span>
                    </div>

                    {/* Percentual */}
                    <div style={{ ...COL.percentual, display: "flex", justifyContent: "center" }}>
                      <span style={S.percentBadge}>
                        {p.percentual}%
                      </span>
                    </div>

                    {/* Comissão */}
                    <div style={{ ...COL.comissao }}>
                      <span
                        style={{
                          ...S.cellTextBold,
                          color: "#2563eb",
                          width: "100%",
                          textAlign: "right",
                          display: "block",
                        }}
                      >
                        {fmt(p.total_comissao)}
                      </span>
                    </div>

                    {/* Pendente (progress) */}
                    <div
                      style={{
                        ...COL.status,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div style={S.progressTrack}>
                        <div style={S.progressFill(pagoPct, "#16a34a")} />
                      </div>
                      <span style={{ ...S.cellSub, minWidth: "50px", textAlign: "right" }}>
                        {fmt(p.comissao_pendente)}
                      </span>
                    </div>

                    {/* Expandir */}
                    <div
                      style={{
                        ...COL.expandir,
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ display: "flex", color: "#94a3b8" }}>
                        {isExpanded ? Icons.chevronUp : Icons.chevronDown}
                      </span>
                    </div>
                  </div>

                  {/* ── Expanded Detail ───────────── */}
                  {isExpanded && (
                    <div style={S.expandedRow}>
                      <div style={S.expandedInner}>
                        {/* Card: Resumo financeiro */}
                        <div style={S.detailCard}>
                          <span style={S.detailLabel}>Resumo financeiro</span>
                          <div style={S.detailListItem}>
                            <span style={S.cellText}>Faturado</span>
                            <span style={{ ...S.cellTextBold, color: "#16a34a" }}>
                              {fmt(p.total_faturado)}
                            </span>
                          </div>
                          <div style={S.detailListItem}>
                            <span style={S.cellText}>Comissão total</span>
                            <span style={{ ...S.cellTextBold, color: "#2563eb" }}>
                              {fmt(p.total_comissao)}
                            </span>
                          </div>
                          <div style={S.detailListItem}>
                            <span style={S.cellText}>Pago</span>
                            <span style={{ ...S.cellTextBold, color: "#16a34a" }}>
                              {fmt(p.comissao_paga)}
                            </span>
                          </div>
                          <div style={{ ...S.detailListItem, borderBottom: "none" }}>
                            <span style={S.cellText}>Pendente</span>
                            <span style={{ ...S.cellTextBold, color: "#ea580c" }}>
                              {fmt(p.comissao_pendente)}
                            </span>
                          </div>
                        </div>

                        {/* Card: Últimos atendimentos */}
                        <div style={{ ...S.detailCard, flex: "2 1 300px" }}>
                          <span style={S.detailLabel}>
                            Atendimentos ({p.itens.length})
                          </span>
                          {p.itens.slice(0, 6).map((item, idx) => {
                            const comVal = Number(
                              item.comissao || item.valor_comissao || 0
                            );
                            return (
                              <div key={item.id || idx} style={S.detailListItem}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0 }}>
                                  <span style={S.cellText}>
                                    {item.descricao || item.procedimento || "—"}
                                  </span>
                                  <span style={S.cellSub}>
                                    {fmtData(item.data || item.data_atendimento)} ·{" "}
                                    {item.paciente_nome || "—"}
                                  </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                  <span style={{ ...S.cellTextBold, color: "#2563eb" }}>
                                    {fmt(comVal)}
                                  </span>
                                  <StatusBadge status={item.status || "pendente"} />
                                  {item.status !== "pago" && (
                                    <button
                                      title="Marcar como pago"
                                      style={S.actionBtn(
                                        hoveredAction === `pay-${item.id}`,
                                        "#16a34a"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        marcarComissaoPaga(item.id);
                                      }}
                                      onMouseEnter={() =>
                                        setHoveredAction(`pay-${item.id}`)
                                      }
                                      onMouseLeave={() =>
                                        setHoveredAction(null)
                                      }
                                    >
                                      {Icons.check}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {p.itens.length > 6 && (
                            <span style={{ ...S.cellSub, textAlign: "center", paddingTop: "4px" }}>
                              + {p.itens.length - 6} atendimentos...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          <div style={S.tableFooter}>
            <span style={S.footerText}>
              {filtrados.length}{" "}
              {filtrados.length === 1 ? "profissional" : "profissionais"}
            </span>
            <span style={{ ...S.footerText, fontWeight: "600", color: "#2563eb" }}>
              Total comissões: {fmt(stats.totalComissao)}
            </span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODAL — Configurar comissão
          ══════════════════════════════════════════════ */}
      {modal === "config" && (
        <div style={S.modalOverlay} onClick={() => setModal(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={S.modalHeader}>
              <h3 style={S.modalTitle}>Configurar comissão</h3>
              <button
                style={S.modalCloseBtn}
                onClick={() => setModal(null)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f1f5f9")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {Icons.x}
              </button>
            </div>

            {/* Body */}
            <div style={S.modalBody}>
              {/* Profissional */}
              <div style={S.formGroup}>
                <label style={S.formLabel}>Profissional *</label>
                <input
                  style={S.formInput}
                  value={configForm.profissional_nome || ""}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      profissional_nome: e.target.value,
                    }))
                  }
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Nome do profissional"
                />
              </div>

              {/* Tipo + Valor */}
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Tipo</label>
                  <select
                    style={S.formSelect}
                    value={configForm.tipo || "percentual"}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        tipo: e.target.value,
                      }))
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  >
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor fixo (R$)</option>
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>
                    {configForm.tipo === "percentual"
                      ? "Percentual (%)"
                      : "Valor fixo (R$)"}
                  </label>
                  <input
                    type="number"
                    step={configForm.tipo === "percentual" ? "0.5" : "0.01"}
                    min="0"
                    max={configForm.tipo === "percentual" ? "100" : undefined}
                    style={S.formInput}
                    value={configForm.percentual || ""}
                    onChange={(e) =>
                      setConfigForm((prev) => ({
                        ...prev,
                        percentual: e.target.value,
                      }))
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder={
                      configForm.tipo === "percentual" ? "Ex: 30" : "Ex: 150,00"
                    }
                  />
                  <span style={S.formHint}>
                    {configForm.tipo === "percentual"
                      ? "Percentual sobre cada atendimento"
                      : "Valor fixo por atendimento"}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={S.modalFooter}>
              <button
                style={S.btnSecondary}
                onClick={() => setModal(null)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f8fafc")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#fff")
                }
              >
                Cancelar
              </button>
              <button
                style={S.btnPrimary}
                onClick={salvarConfig}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(37,99,235,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px rgba(37,99,235,0.2)";
                }}
              >
                Salvar configuração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Comissoes;
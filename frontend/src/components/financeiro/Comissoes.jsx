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
   ICONS
   ═══════════════════════════════════════════════════════════ */
const Icons = {
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  dollarSign: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  percent: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" x2="5" y1="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
  trendingUp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  ),
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  chevronDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  chevronUp: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  ),
  check: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
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
   ═══════════════════════════════════════════════════════════ */
const STATUS_CONFIG = {
  pendente: { label: "Pendente", bg: "#fff7ed", color: "#ea580c", dot: "#fb923c" },
  pago: { label: "Pago", bg: "#f0fdf4", color: "#16a34a", dot: "#4ade80" },
};

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const S = {
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", minHeight: "400px" },
  loadingPulse: { display: "flex", gap: "8px", alignItems: "center" },
  loadingDot: (delay) => ({ width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb", animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: delay }),
  loadingText: { fontSize: "14px", fontWeight: "500", color: "#94a3b8", letterSpacing: "0.02em" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" },
  statCard: { background: "#fff", borderRadius: "16px", padding: "22px", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: "10px" },
  statTop: { display: "flex", alignItems: "center", gap: "10px" },
  statIconBox: (accent) => ({ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: accent + "14", color: accent }),
  statLabel: { fontSize: "13px", fontWeight: "600", color: "#64748b" },
  statValue: { fontSize: "32px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1 },
  statSub: { fontSize: "12px", color: "#94a3b8", fontWeight: "500" },
  filterBar: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  searchInputWrap: (focused) => ({ flex: 1, minWidth: "220px", display: "flex", alignItems: "center", gap: "10px", height: "40px", borderRadius: "10px", border: `1px solid ${focused ? "#2563eb" : "#e2e8f0"}`, padding: "0 14px", background: "#fff", transition: "all 0.2s ease", boxShadow: focused ? "0 0 0 3px rgba(37,99,235,0.1)" : "none" }),
  searchIcon: (focused) => ({ display: "flex", alignItems: "center", flexShrink: 0, color: focused ? "#2563eb" : "#94a3b8", transition: "color 0.2s ease" }),
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: "14px", color: "#0f172a", background: "transparent", fontWeight: "400", height: "100%", fontFamily: "inherit" },
  searchClear: { display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", border: "none", background: "#f1f5f9", color: "#94a3b8", fontSize: "11px", cursor: "pointer", flexShrink: 0 },
  filterGroup: { display: "flex", alignItems: "center", gap: "6px" },
  filterLabel: { fontSize: "13px", fontWeight: "600", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" },
  filterInput: { height: "40px", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "0 14px", fontSize: "14px", color: "#0f172a", background: "#fff", outline: "none", transition: "all 0.2s ease", fontFamily: "inherit" },
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: "8px", border: "none", borderRadius: "10px", padding: "10px 20px", background: "#2563eb", color: "#fff", fontWeight: "600", fontSize: "13px", cursor: "pointer", transition: "all 0.2s ease", height: "40px", fontFamily: "inherit" },
  btnSecondary: { display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 16px", background: "#fff", color: "#475569", fontWeight: "500", fontSize: "13px", cursor: "pointer", transition: "all 0.2s ease", height: "40px", fontFamily: "inherit" },
  btnDanger: { display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #fecaca", borderRadius: "8px", padding: "6px 12px", background: "#fff", color: "#dc2626", fontWeight: "500", fontSize: "12px", cursor: "pointer", transition: "all 0.2s ease", fontFamily: "inherit" },
  tableCard: { background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9", overflow: "hidden" },
  tableHeader: { display: "flex", alignItems: "center", padding: "0 24px", height: "44px", background: "#fafbfc", borderBottom: "1px solid #f1f5f9", gap: "12px" },
  thCell: { fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  list: { listStyle: "none", padding: 0, margin: 0 },
  row: (hovered) => ({ display: "flex", alignItems: "center", padding: "14px 24px", borderBottom: "1px solid #f8fafc", gap: "12px", transition: "background 0.15s ease", cursor: "pointer", background: hovered ? "#fafbfc" : "transparent" }),
  cellTextBold: { fontSize: "14px", color: "#0f172a", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cellText: { fontSize: "13px", color: "#475569", fontWeight: "400", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cellSub: { fontSize: "12px", color: "#94a3b8", fontWeight: "500" },
  tableFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: "1px solid #f1f5f9", background: "#fafbfc" },
  footerText: { fontSize: "13px", color: "#94a3b8", fontWeight: "400" },
  avatar: (color) => ({ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: color + "14", color: color, fontSize: "13px", fontWeight: "700" }),
  badge: (bg, color) => ({ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap", flexShrink: 0, background: bg, color: color }),
  badgeDot: (dotColor) => ({ width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0, background: dotColor }),
  percentBadge: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", fontSize: "13px", fontWeight: "700", background: "#eff6ff", color: "#2563eb" },
  progressTrack: { flex: 1, height: "6px", borderRadius: "3px", background: "#f1f5f9", overflow: "hidden" },
  progressFill: (pct, color) => ({ height: "100%", borderRadius: "3px", background: color, width: `${Math.min(pct, 100)}%`, transition: "width 0.6s ease" }),
  expandedRow: { padding: "0 24px 16px 24px", borderBottom: "1px solid #f1f5f9", background: "#fafbfc" },
  expandedInner: { display: "flex", gap: "12px", flexWrap: "wrap", padding: "16px 0 0 0" },
  detailCard: { flex: "1 1 200px", background: "#fff", borderRadius: "12px", border: "1px solid #f1f5f9", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" },
  detailLabel: { fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  detailListItem: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f8fafc", gap: "8px" },
  actionBtn: (hovered, color) => ({ width: "34px", height: "34px", borderRadius: "8px", border: hovered ? `1px solid ${color}20` : "1px solid transparent", background: hovered ? `${color}08` : "transparent", color: hovered ? color : "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease", flexShrink: 0 }),
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" },
  modal: { background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05)" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" },
  modalTitle: { margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" },
  modalCloseBtn: { width: "32px", height: "32px", borderRadius: "8px", border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" },
  modalBody: { padding: "24px", display: "flex", flexDirection: "column", gap: "16px" },
  modalFooter: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid #f1f5f9" },
  formGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  formLabel: { fontSize: "13px", fontWeight: "600", color: "#334155" },
  formInput: { height: "40px", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "0 14px", fontSize: "14px", color: "#0f172a", background: "#fff", outline: "none", transition: "all 0.2s ease", fontFamily: "inherit" },
  formSelect: { height: "40px", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "0 14px", fontSize: "14px", color: "#0f172a", background: "#fff", outline: "none", transition: "all 0.2s ease", fontFamily: "inherit" },
  formRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  formHint: { fontSize: "12px", color: "#94a3b8", fontWeight: "400" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "64px 20px" },
  emptyTitle: { margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" },
  emptyText: { margin: 0, color: "#94a3b8", fontSize: "14px", fontWeight: "400", textAlign: "center", maxWidth: "360px", lineHeight: 1.5 },
  /* ── NOVOS ESTILOS: Tabs e lista de profissionais ── */
  tabBar: { display: "flex", gap: "4px", background: "#f1f5f9", borderRadius: "10px", padding: "4px" },
  tab: (active) => ({ padding: "8px 20px", borderRadius: "8px", border: "none", background: active ? "#fff" : "transparent", color: active ? "#0f172a" : "#64748b", fontWeight: active ? "600" : "500", fontSize: "13px", cursor: "pointer", transition: "all 0.2s ease", boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none", fontFamily: "inherit" }),
  profCard: (hovered) => ({ display: "flex", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #f8fafc", gap: "14px", transition: "background 0.15s ease", background: hovered ? "#fafbfc" : "transparent" }),
  profInfo: { display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0 },
  profMeta: { display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 },
  successMsg: { padding: "12px 16px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" },
};

/* ═══════════════════════════════════════════════════════════
   AVATAR HELPERS
   ═══════════════════════════════════════════════════════════ */
const AVATAR_COLORS = ["#2563eb", "#8b5cf6", "#ec4899", "#16a34a", "#ea580c", "#0891b2", "#dc2626", "#ca8a04"];

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
   SUB-COMPONENTES
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
      <style>{`@keyframes pulse-dot { 0%, 80%, 100% { transform: scale(0); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }`}</style>
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
  const [profissionais, setProfissionais] = useState([]); // ← NOVO
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [dataInicio, setDataInicio] = useState(mesPassado());
  const [dataFim, setDataFim] = useState(hoje());
  const [expandedId, setExpandedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);
  const [modal, setModal] = useState(null);
  const [tab, setTab] = useState("comissoes"); // ← NOVO: "comissoes" | "profissionais"
  const [mensagemSucesso, setMensagemSucesso] = useState(""); // ← NOVO
  const [hoveredProfId, setHoveredProfId] = useState(null); // ← NOVO
  const [salvando, setSalvando] = useState(false); // ← NOVO
  const [configForm, setConfigForm] = useState({
    nome: "",
    especialidade: "",
    percentual_comissao: "",
    valor_fixo_comissao: "",
    tipo_comissao: "percentual",
  });

  /* ── Fetch comissões ────────────────────────────── */
  const carregar = () => {
    setCarregando(true);
    const dt = new Date(dataInicio + "T00:00:00");
    const mes = dt.getMonth() + 1;
    const ano = dt.getFullYear();

    fetch(`${API}/financeiro/comissoes?mes=${mes}&ano=${ano}`, { headers: headers() })
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

  /* ── NOVO: Fetch profissionais ──────────────────── */
  const carregarProfissionais = () => {
    fetch(`${API}/financeiro/profissionais`, { headers: headers() })
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao buscar profissionais");
        return r.json();
      })
      .then((d) => {
        if (Array.isArray(d)) {
          setProfissionais(d);
        } else {
          setProfissionais([]);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    carregar();
    carregarProfissionais(); // ← NOVO: carrega profissionais ao montar
  }, [dataInicio, dataFim]);

  /* ── Agrupado por profissional ───────────────────── */
  const agrupado = useMemo(() => {
    const mapa = {};
    comissoes.forEach((c) => {
      const nome = c.profissional_nome || c.profissional || "Não atribuído";
      if (!mapa[nome]) {
        mapa[nome] = { nome, percentual: Number(c.percentual || 0), total_atendimentos: 0, total_faturado: 0, total_comissao: 0, comissao_paga: 0, comissao_pendente: 0, itens: [] };
      }
      const valor = Number(c.valor_procedimento || c.valor || 0);
      const comissaoValor = Number(c.valor_comissao || c.comissao || 0);
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

  /* ── NOVO: Filtro para aba profissionais ─────────── */
  const profissionaisFiltrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return profissionais;
    return profissionais.filter(
      (p) =>
        (p.nome || "").toLowerCase().includes(t) ||
        (p.especialidade || "").toLowerCase().includes(t)
    );
  }, [profissionais, busca]);

  /* ── Stats ───────────────────────────────────────── */
  const stats = useMemo(() => {
    const totalComissao = agrupado.reduce((s, p) => s + p.total_comissao, 0);
    const totalFaturado = agrupado.reduce((s, p) => s + p.total_faturado, 0);
    const totalPendente = agrupado.reduce((s, p) => s + p.comissao_pendente, 0);
    return {
      profissionais: profissionais.length, // ← CORRIGIDO: total real de profissionais
      totalComissao,
      totalFaturado,
      totalPendente,
      mediaPercentual: agrupado.length > 0 ? (agrupado.reduce((s, p) => s + p.percentual, 0) / agrupado.length).toFixed(1) : "0",
    };
  }, [agrupado, profissionais]);

  /* ── Handlers ────────────────────────────────────── */
  const toggleExpand = (nome) => { setExpandedId(expandedId === nome ? null : nome); };

  const marcarComissaoPaga = async (id) => {
    try {
      const resp = await fetch(`${API}/financeiro/comissoes/${id}/pagar`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ data_pagamento: new Date().toISOString().split("T")[0] }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.erro || "Erro ao marcar comissão como paga.");
        return;
      }
      carregar();
    } catch (e) { console.error(e); }
  };

  /* ── CORRIGIDO: salvarConfig com tratamento de resposta ── */
  const salvarConfig = async () => {
    // Validação no frontend
    if (!configForm.nome || !configForm.nome.trim()) {
      alert("O nome do profissional é obrigatório.");
      return;
    }

    setSalvando(true);
    try {
      const resp = await fetch(`${API}/financeiro/profissionais`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          nome: configForm.nome.trim(),
          especialidade: configForm.especialidade || null,
          tipo_comissao: configForm.tipo_comissao || "percentual",
          percentual_comissao: parseFloat(configForm.percentual_comissao) || 0,
          valor_fixo_comissao: parseFloat(configForm.valor_fixo_comissao) || 0,
        }),
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        // Mostra o erro retornado pelo backend
        alert(data.erro || `Erro ao salvar profissional (status ${resp.status}).`);
        return;
      }

      // Sucesso!
      setModal(null);
      setMensagemSucesso(`Profissional "${configForm.nome.trim()}" cadastrado com sucesso!`);
      setTimeout(() => setMensagemSucesso(""), 4000);

      // Recarrega ambas as listas
      carregar();
      carregarProfissionais();

      // Muda para a aba profissionais para o usuário ver o cadastro
      setTab("profissionais");
    } catch (e) {
      console.error(e);
      alert("Erro de rede ao salvar profissional. Verifique se o servidor está rodando.");
    } finally {
      setSalvando(false);
    }
  };

  /* ── NOVO: Excluir (desativar) profissional ──────── */
  const excluirProfissional = async (id, nome) => {
    if (!window.confirm(`Deseja desativar o profissional "${nome}"?`)) return;
    try {
      const resp = await fetch(`${API}/financeiro/profissionais/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        alert(err.erro || "Erro ao desativar profissional.");
        return;
      }
      setMensagemSucesso(`Profissional "${nome}" desativado.`);
      setTimeout(() => setMensagemSucesso(""), 4000);
      carregarProfissionais();
    } catch (e) {
      console.error(e);
      alert("Erro de rede ao desativar profissional.");
    }
  };

  const handleInputFocus = (e) => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; };
  const handleInputBlur = (e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; };

  if (carregando) return <Loading text="Carregando comissões" />;

  const COL = {
    profissional: { flex: "1.5", minWidth: "180px" },
    atendimentos: { width: "110px", textAlign: "center" },
    faturado: { width: "130px", textAlign: "right" },
    percentual: { width: "100px", textAlign: "center" },
    comissao: { width: "130px", textAlign: "right" },
    status: { width: "120px" },
    expandir: { width: "50px", justifyContent: "flex-end" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* MENSAGEM DE SUCESSO */}
      {mensagemSucesso && (
        <div style={S.successMsg}>
          {Icons.check}
          {mensagemSucesso}
        </div>
      )}

      {/* STATS */}
      <div style={S.statsGrid}>
        <StatCard label="Profissionais" value={stats.profissionais} icon={Icons.users} accent="#8b5cf6" sub="cadastrados" />
        <StatCard label="Total faturado" value={fmt(stats.totalFaturado)} icon={Icons.trendingUp} accent="#16a34a" sub="no período" />
        <StatCard label="Total em comissões" value={fmt(stats.totalComissao)} icon={Icons.dollarSign} accent="#2563eb" sub={`média ${stats.mediaPercentual}%`} />
        <StatCard label="Comissões pendentes" value={fmt(stats.totalPendente)} icon={Icons.percent} accent="#ea580c" sub="a pagar" />
      </div>

      {/* TABS */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={S.tabBar}>
          <button style={S.tab(tab === "comissoes")} onClick={() => setTab("comissoes")}>
            Comissões
          </button>
          <button style={S.tab(tab === "profissionais")} onClick={() => setTab("profissionais")}>
            Profissionais ({profissionais.length})
          </button>
        </div>
        <button
          style={S.btnPrimary}
          onClick={() => {
            setConfigForm({ nome: "", especialidade: "", percentual_comissao: "", valor_fixo_comissao: "", tipo_comissao: "percentual" });
            setModal("config");
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.3)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
        >
          {Icons.settings}<span>Novo profissional</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════
         ABA: COMISSÕES
         ═══════════════════════════════════════════════════ */}
      {tab === "comissoes" && (
        <>
          {/* FILTER BAR */}
          <div style={S.filterBar}>
            <div style={S.searchInputWrap(searchFocused)}>
              <span style={S.searchIcon(searchFocused)}>{Icons.search}</span>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="Buscar profissional..." style={S.searchInput} />
              {busca && <button style={S.searchClear} onClick={() => setBusca("")}>✕</button>}
            </div>
            <div style={S.filterGroup}>
              <span style={S.filterLabel}>{Icons.calendar} De</span>
              <input type="date" style={S.filterInput} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
            <div style={S.filterGroup}>
              <span style={S.filterLabel}>{Icons.calendar} Até</span>
              <input type="date" style={S.filterInput} value={dataFim} onChange={(e) => setDataFim(e.target.value)} onFocus={handleInputFocus} onBlur={handleInputBlur} />
            </div>
            <button style={S.btnSecondary} onClick={carregar} onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
              {Icons.refresh}<span>Atualizar</span>
            </button>
          </div>

          {/* TABELA ou EMPTY */}
          {filtrados.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9" }}>
              <div style={S.emptyState}>
                {Icons.emptyState}
                <h3 style={S.emptyTitle}>{busca ? "Nenhum profissional encontrado" : "Nenhuma comissão no período"}</h3>
                <p style={S.emptyText}>{busca ? "Tente ajustar o termo de busca." : "Ajuste o intervalo de datas ou cadastre profissionais com comissão configurada."}</p>
                {!busca && profissionais.length === 0 && (
                  <button
                    style={{ ...S.btnPrimary, marginTop: "8px" }}
                    onClick={() => {
                      setConfigForm({ nome: "", especialidade: "", percentual_comissao: "", valor_fixo_comissao: "", tipo_comissao: "percentual" });
                      setModal("config");
                    }}
                  >
                    {Icons.settings}<span>Cadastrar profissional</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={S.tableCard}>
              <div style={S.tableHeader}>
                <span style={{ ...S.thCell, ...COL.profissional }}>Profissional</span>
                <span style={{ ...S.thCell, ...COL.atendimentos }}>Atendimentos</span>
                <span style={{ ...S.thCell, ...COL.faturado }}>Faturado</span>
                <span style={{ ...S.thCell, ...COL.percentual }}>Percentual</span>
                <span style={{ ...S.thCell, ...COL.comissao }}>Comissão</span>
                <span style={{ ...S.thCell, ...COL.status }}>Pendente</span>
                <span style={{ ...S.thCell, ...COL.expandir }}></span>
              </div>
              <ul style={S.list}>
                {filtrados.map((p) => {
                  const isHovered = hoveredId === p.nome;
                  const isExpanded = expandedId === p.nome;
                  const color = getAvatarColor(p.nome);
                  const pagoPct = p.total_comissao > 0 ? (p.comissao_paga / p.total_comissao) * 100 : 0;
                  return (
                    <li key={p.nome} style={{ margin: 0 }}>
                      <div style={S.row(isHovered)} onMouseEnter={() => setHoveredId(p.nome)} onMouseLeave={() => setHoveredId(null)} onClick={() => toggleExpand(p.nome)}>
                        <div style={{ ...COL.profissional, display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                          <div style={S.avatar(color)}>{getInitials(p.nome)}</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                            <span style={S.cellTextBold}>{p.nome}</span>
                            <span style={S.cellSub}>{p.total_atendimentos} {p.total_atendimentos === 1 ? "atendimento" : "atendimentos"}</span>
                          </div>
                        </div>
                        <div style={{ ...COL.atendimentos, display: "flex", justifyContent: "center" }}><span style={S.cellTextBold}>{p.total_atendimentos}</span></div>
                        <div style={{ ...COL.faturado }}><span style={{ ...S.cellTextBold, color: "#16a34a", width: "100%", textAlign: "right", display: "block" }}>{fmt(p.total_faturado)}</span></div>
                        <div style={{ ...COL.percentual, display: "flex", justifyContent: "center" }}><span style={S.percentBadge}>{p.percentual}%</span></div>
                        <div style={{ ...COL.comissao }}><span style={{ ...S.cellTextBold, color: "#2563eb", width: "100%", textAlign: "right", display: "block" }}>{fmt(p.total_comissao)}</span></div>
                        <div style={{ ...COL.status, display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={S.progressTrack}><div style={S.progressFill(pagoPct, "#16a34a")} /></div>
                          <span style={{ ...S.cellSub, minWidth: "50px", textAlign: "right" }}>{fmt(p.comissao_pendente)}</span>
                        </div>
                        <div style={{ ...COL.expandir, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                          <span style={{ display: "flex", color: "#94a3b8" }}>{isExpanded ? Icons.chevronUp : Icons.chevronDown}</span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={S.expandedRow}>
                          <div style={S.expandedInner}>
                            <div style={S.detailCard}>
                              <span style={S.detailLabel}>Resumo financeiro</span>
                              <div style={S.detailListItem}><span style={S.cellText}>Faturado</span><span style={{ ...S.cellTextBold, color: "#16a34a" }}>{fmt(p.total_faturado)}</span></div>
                              <div style={S.detailListItem}><span style={S.cellText}>Comissão total</span><span style={{ ...S.cellTextBold, color: "#2563eb" }}>{fmt(p.total_comissao)}</span></div>
                              <div style={S.detailListItem}><span style={S.cellText}>Pago</span><span style={{ ...S.cellTextBold, color: "#16a34a" }}>{fmt(p.comissao_paga)}</span></div>
                              <div style={{ ...S.detailListItem, borderBottom: "none" }}><span style={S.cellText}>Pendente</span><span style={{ ...S.cellTextBold, color: "#ea580c" }}>{fmt(p.comissao_pendente)}</span></div>
                            </div>
                            <div style={{ ...S.detailCard, flex: "2 1 300px" }}>
                              <span style={S.detailLabel}>Atendimentos ({p.itens.length})</span>
                              {p.itens.slice(0, 6).map((item, idx) => {
                                const comVal = Number(item.valor_comissao || item.comissao || 0);
                                return (
                                  <div key={item.id || idx} style={S.detailListItem}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, minWidth: 0 }}>
                                      <span style={S.cellText}>{item.procedimento || item.descricao || "—"}</span>
                                      <span style={S.cellSub}>{fmtData(item.data_referencia || item.data)} · {item.paciente_nome || "—"}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                      <span style={{ ...S.cellTextBold, color: "#2563eb" }}>{fmt(comVal)}</span>
                                      <StatusBadge status={item.status || "pendente"} />
                                      {item.status !== "pago" && (
                                        <button title="Marcar como pago" style={S.actionBtn(hoveredAction === `pay-${item.id}`, "#16a34a")} onClick={(e) => { e.stopPropagation(); marcarComissaoPaga(item.id); }} onMouseEnter={() => setHoveredAction(`pay-${item.id}`)} onMouseLeave={() => setHoveredAction(null)}>
                                          {Icons.check}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {p.itens.length > 6 && <span style={{ ...S.cellSub, textAlign: "center", paddingTop: "4px" }}>+ {p.itens.length - 6} atendimentos...</span>}
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div style={S.tableFooter}>
                <span style={S.footerText}>{filtrados.length} {filtrados.length === 1 ? "profissional" : "profissionais"}</span>
                <span style={{ ...S.footerText, fontWeight: "600", color: "#2563eb" }}>Total comissões: {fmt(stats.totalComissao)}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════
         ABA: PROFISSIONAIS (NOVO)
         ═══════════════════════════════════════════════════ */}
      {tab === "profissionais" && (
        <>
          {/* BUSCA */}
          <div style={S.filterBar}>
            <div style={S.searchInputWrap(searchFocused)}>
              <span style={S.searchIcon(searchFocused)}>{Icons.search}</span>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} placeholder="Buscar profissional por nome ou especialidade..." style={S.searchInput} />
              {busca && <button style={S.searchClear} onClick={() => setBusca("")}>✕</button>}
            </div>
            <button style={S.btnSecondary} onClick={carregarProfissionais} onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
              {Icons.refresh}<span>Atualizar</span>
            </button>
          </div>

          {/* LISTA DE PROFISSIONAIS */}
          {profissionaisFiltrados.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9" }}>
              <div style={S.emptyState}>
                {Icons.emptyState}
                <h3 style={S.emptyTitle}>{busca ? "Nenhum profissional encontrado" : "Nenhum profissional cadastrado"}</h3>
                <p style={S.emptyText}>{busca ? "Tente ajustar o termo de busca." : "Cadastre um profissional clicando no botão acima."}</p>
              </div>
            </div>
          ) : (
            <div style={S.tableCard}>
              <div style={S.tableHeader}>
                <span style={{ ...S.thCell, flex: "1.5", minWidth: "180px" }}>Profissional</span>
                <span style={{ ...S.thCell, width: "150px" }}>Especialidade</span>
                <span style={{ ...S.thCell, width: "130px", textAlign: "center" }}>Tipo Comissão</span>
                <span style={{ ...S.thCell, width: "120px", textAlign: "right" }}>Valor/Percentual</span>
                <span style={{ ...S.thCell, width: "80px", textAlign: "center" }}>Ações</span>
              </div>
              <ul style={S.list}>
                {profissionaisFiltrados.map((prof) => {
                  const color = getAvatarColor(prof.nome);
                  const isHovered = hoveredProfId === prof.id;
                  return (
                    <li key={prof.id} style={{ margin: 0 }}>
                      <div
                        style={S.profCard(isHovered)}
                        onMouseEnter={() => setHoveredProfId(prof.id)}
                        onMouseLeave={() => setHoveredProfId(null)}
                      >
                        <div style={S.avatar(color)}>{getInitials(prof.nome)}</div>
                        <div style={{ ...S.profInfo, flex: "1.5", minWidth: "180px" }}>
                          <span style={S.cellTextBold}>{prof.nome}</span>
                          {prof.cro && <span style={S.cellSub}>CRO: {prof.cro}</span>}
                        </div>
                        <div style={{ width: "150px" }}>
                          <span style={S.cellText}>{prof.especialidade || "—"}</span>
                        </div>
                        <div style={{ width: "130px", textAlign: "center" }}>
                          <span style={S.badge(
                            prof.tipo_comissao === "percentual" ? "#eff6ff" : "#f0fdf4",
                            prof.tipo_comissao === "percentual" ? "#2563eb" : "#16a34a"
                          )}>
                            {prof.tipo_comissao === "percentual" ? "Percentual" : "Valor fixo"}
                          </span>
                        </div>
                        <div style={{ width: "120px", textAlign: "right" }}>
                          <span style={{ ...S.cellTextBold, color: "#2563eb" }}>
                            {prof.tipo_comissao === "percentual"
                              ? `${Number(prof.percentual_comissao || 0)}%`
                              : fmt(prof.valor_fixo_comissao || 0)}
                          </span>
                        </div>
                        <div style={{ width: "80px", display: "flex", justifyContent: "center" }}>
                          <button
                            title="Desativar profissional"
                            style={S.btnDanger}
                            onClick={() => excluirProfissional(prof.id, prof.nome)}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                          >
                            {Icons.trash}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div style={S.tableFooter}>
                <span style={S.footerText}>{profissionaisFiltrados.length} {profissionaisFiltrados.length === 1 ? "profissional" : "profissionais"} cadastrado{profissionaisFiltrados.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          )}
        </>
      )}

            {/* MODAL — Cadastrar profissional */}
      {modal === "config" && (
        <div style={S.modalOverlay} onClick={() => setModal(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={S.modalTitle}>Cadastrar profissional</h3>
              <button style={S.modalCloseBtn} onClick={() => setModal(null)} onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                {Icons.x}
              </button>
            </div>
            <div style={S.modalBody}>
              <div style={S.formGroup}>
                <label style={S.formLabel}>Nome do profissional *</label>
                <input
                  style={S.formInput}
                  value={configForm.nome || ""}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, nome: e.target.value }))}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Ex: Dr. João Silva"
                />
              </div>
              <div style={S.formGroup}>
                <label style={S.formLabel}>Especialidade</label>
                <input
                  style={S.formInput}
                  value={configForm.especialidade || ""}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, especialidade: e.target.value }))}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Ex: Ortodontia"
                />
              </div>
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Tipo de comissão</label>
                  <select
                    style={S.formSelect}
                    value={configForm.tipo_comissao || "percentual"}
                    onChange={(e) => setConfigForm((prev) => ({ ...prev, tipo_comissao: e.target.value }))}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  >
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor fixo (R$)</option>
                  </select>
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>
                    {configForm.tipo_comissao === "percentual" ? "Percentual (%)" : "Valor fixo (R$)"}
                  </label>
                  <input
                    type="number"
                    step={configForm.tipo_comissao === "percentual" ? "0.5" : "0.01"}
                    min="0"
                    max={configForm.tipo_comissao === "percentual" ? "100" : undefined}
                    style={S.formInput}
                    value={
                      configForm.tipo_comissao === "percentual"
                        ? configForm.percentual_comissao || ""
                        : configForm.valor_fixo_comissao || ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (configForm.tipo_comissao === "percentual") {
                        setConfigForm((prev) => ({ ...prev, percentual_comissao: val }));
                      } else {
                        setConfigForm((prev) => ({ ...prev, valor_fixo_comissao: val }));
                      }
                    }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder={configForm.tipo_comissao === "percentual" ? "Ex: 30" : "Ex: 150.00"}
                  />
                  <span style={S.formHint}>
                    {configForm.tipo_comissao === "percentual"
                      ? "Percentual sobre cada atendimento"
                      : "Valor fixo por atendimento"}
                  </span>
                </div>
              </div>
            </div>
            <div style={S.modalFooter}>
              <button
                style={S.btnSecondary}
                onClick={() => setModal(null)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                Cancelar
              </button>
              <button
                style={{
                  ...S.btnPrimary,
                  opacity: salvando ? 0.7 : 1,
                  pointerEvents: salvando ? "none" : "auto",
                }}
                onClick={salvarConfig}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {salvando ? "Salvando..." : "Salvar profissional"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Comissoes;
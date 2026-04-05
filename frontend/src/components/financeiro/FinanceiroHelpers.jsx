/* ═══════════════════════════════════════════════════════════
   FINANCEIRO — Design Tokens & Helpers Compartilhados
   Padrão: Ultra Premium Minimal SaaS (igual Dashboard/Pacientes)
   ═══════════════════════════════════════════════════════════ */

import API_URL from "../../api";
export const API = API_URL;

export function headers() {
  return { Authorization: localStorage.getItem("token"), "Content-Type": "application/json" };
}

export function fmt(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtData(d) {
  if (!d) return "—";
  const p = d.split("-");
  if (p.length !== 3) return d;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

export function fmtDataCurta(d) {
  if (!d) return "—";
  const p = d.split("-");
  if (p.length !== 3) return d;
  const meses = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${p[2]} ${meses[Number(p[1]) - 1]}`;
}

/* ── SVG Icons (Lucide-style, inline) ────────────────────── */
export const Icons = {
  dollarSign: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  trendingUp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  trendingDown: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  ),
  arrowUpDown: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 16-4 4-4-4" /><path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" /><path d="M7 4v16" />
    </svg>
  ),
  alertTriangle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" /><path d="M5 12h14" />
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
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  check: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  ),
  arrowRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  whatsapp: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  ),
  barChart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  ),
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  emptyState: (
    <svg width="64" height="64" viewBox="0 0 120 120" fill="none">
      <rect x="10" y="24" width="100" height="76" rx="16" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="22" y="40" width="76" height="8" rx="4" fill="#e2e8f0" />
      <rect x="22" y="56" width="52" height="8" rx="4" fill="#e2e8f0" />
      <rect x="22" y="72" width="64" height="8" rx="4" fill="#e2e8f0" />
      <circle cx="96" cy="24" r="18" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2" />
      <path d="M96 16v16M88 24h16" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
};

/* ── Status Config (padrão Dashboard) ────────────────────── */
export const STATUS_PAGAR = {
  pendente:  { label: "Pendente",  bg: "#fff7ed", color: "#ea580c", dot: "#fb923c" },
  pago:      { label: "Pago",      bg: "#f0fdf4", color: "#16a34a", dot: "#4ade80" },
  atrasado:  { label: "Atrasado",  bg: "#fef2f2", color: "#dc2626", dot: "#f87171" },
  cancelado: { label: "Cancelado", bg: "#f8fafc", color: "#94a3b8", dot: "#cbd5e1" },
};

export const STATUS_RECEBER = {
  pendente:  { label: "Pendente",  bg: "#eff6ff", color: "#2563eb", dot: "#60a5fa" },
  recebido:  { label: "Recebido",  bg: "#f0fdf4", color: "#16a34a", dot: "#4ade80" },
  atrasado:  { label: "Atrasado",  bg: "#fef2f2", color: "#dc2626", dot: "#f87171" },
  cancelado: { label: "Cancelado", bg: "#f8fafc", color: "#94a3b8", dot: "#cbd5e1" },
};

/* ── StatusBadge (padrão Dashboard) ──────────────────────── */
export function StatusBadge({ status, config }) {
  const cfg = config[status] || config.pendente || Object.values(config)[0];
  return (
    <span style={{ ...S.badge, background: cfg.bg, color: cfg.color }}>
      <span style={{ ...S.badgeDot, background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

/* ── Loading (padrão Dashboard) ──────────────────────────── */
export function Loading({ text = "Carregando" }) {
  return (
    <div style={S.loadingWrap}>
      <div style={S.loadingPulse}>
        <div style={S.loadingDot1} />
        <div style={S.loadingDot2} />
        <div style={S.loadingDot3} />
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

/* ── EmptyState (padrão Pacientes) ──────────────────────── */
export function EmptyState({ title, text, action, onAction }) {
  return (
    <div style={S.emptyState}>
      {Icons.emptyState}
      <h3 style={S.emptyTitle}>{title}</h3>
      <p style={S.emptyText}>{text}</p>
      {action && (
        <button style={{ ...S.btnPrimary, marginTop: "4px" }} onClick={onAction}>
          {Icons.plus}
          <span>{action}</span>
        </button>
      )}
    </div>
  );
}

/* ── StatCard (padrão Dashboard) ─────────────────────────── */
export function StatCard({ label, value, icon, accent, sub }) {
  return (
    <div style={S.statCard}>
      <div style={S.statTop}>
        <span style={{ ...S.statIconBox, background: accent + "12", color: accent }}>
          {icon}
        </span>
        <span style={S.statLabel}>{label}</span>
      </div>
      <strong style={S.statValue}>{value}</strong>
      {sub && <span style={S.statSub}>{sub}</span>}
    </div>
  );
}

/* ── SectionCard (padrão Dashboard) ──────────────────────── */
export function SectionCard({ title, icon, action, onAction, children, empty }) {
  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={S.cardTitleRow}>
          {icon && <span style={S.cardIcon}>{icon}</span>}
          <h2 style={S.cardTitle}>{title}</h2>
        </div>
        {action && (
          <button
            style={S.sectionAction}
            onClick={onAction}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span>{action}</span>
            {Icons.arrowRight}
          </button>
        )}
      </div>
      {empty ? (
        <div style={S.emptyStateInline}>
          {Icons.emptyState}
          <p style={S.emptyTitle}>{empty}</p>
          <p style={S.emptyText}>Os dados aparecerão aqui quando disponíveis.</p>
        </div>
      ) : children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   (Token exatos do Dashboard + Pacientes + Prontuário)
   ════════════════════════════════════════════════════════��══ */
export const S = {
  /* ── Page ─────────────────────────────────────────── */
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  /* ── Header (padrão Pacientes) ────────────────────── */
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.025em",
    lineHeight: 1.2,
  },
  headerCount: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f1f5f9",
    color: "#475569",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    padding: "4px 10px",
    lineHeight: 1,
  },
  headerSub: {
    margin: 0,
    fontSize: "14px",
    color: "#94a3b8",
    fontWeight: "400",
  },

  /* ── Loading (padrão Dashboard) ───────────────────── */
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    minHeight: "400px",
  },
  loadingPulse: { display: "flex", gap: "8px", alignItems: "center" },
  loadingDot1: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0s",
  },
  loadingDot2: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.2s",
  },
  loadingDot3: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.4s",
  },
  loadingText: {
    fontSize: "14px", fontWeight: "500", color: "#94a3b8", letterSpacing: "0.02em",
  },

  /* ── Buttons (padrão Pacientes) ───────────────────── */
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
  btnDanger: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    background: "#dc2626",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(220,38,38,0.2)",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    height: "40px",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  btnSuccess: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    background: "#16a34a",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(22,163,74,0.2)",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    height: "40px",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },

  /* ── Stats (padrão Dashboard) ─────────────────────── */
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
  statIconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
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

  /* ── Card (padrão Dashboard/Prontuário) ──────────── */
  card: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
    padding: "24px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "18px",
    gap: "12px",
  },
  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  cardIcon: {
    display: "flex",
    color: "#94a3b8",
  },
  cardTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a",
    letterSpacing: "-0.01em",
  },
  sectionAction: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "transparent",
    border: "none",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "6px 10px",
    borderRadius: "8px",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },

  /* ── Search Bar (padrão Pacientes) ────────────────── */
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  searchInputWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    height: "40px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "0 14px",
    background: "#fff",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
  },
  searchIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    transition: "color 0.2s ease",
  },
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
  },

  /* ── Table (padrão Pacientes) ─────────────────────── */
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
  row: {
    display: "flex",
    alignItems: "center",
    padding: "12px 24px",
    borderBottom: "1px solid #f8fafc",
    gap: "12px",
    transition: "background 0.15s ease",
    cursor: "default",
  },
  rowCell: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  cellText: {
    fontSize: "13px",
    color: "#475569",
    fontWeight: "400",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cellTextBold: {
    fontSize: "14px",
    color: "#0f172a",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cellEmpty: {
    fontSize: "13px",
    color: "#d1d5db",
    fontWeight: "400",
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

  /* ── Action Buttons (padrão Pacientes) ───────────── */
  actionBtn: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: "1px solid transparent",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    transition: "all 0.15s ease",
    padding: 0,
    flexShrink: 0,
  },

  /* ── Badge (padrão Dashboard) ─────────────────────── */
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  badgeDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    flexShrink: 0,
  },

  /* ── Empty State (padrão Pacientes) ──────────────── */
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "64px 20px",
  },
  emptyStateInline: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    padding: "32px 0",
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

  /* ── Grid (padrão Prontuário) ─────────────────────── */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "20px",
  },

  /* ── Modal ────────────────────────────────────────── */
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
    maxWidth: "520px",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05)",
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

  /* ── Form (padrão consistente) ─────��─────────────── */
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

  /* ── Tabs (padrão Prontuário) ─────────────────────── */
  tabsBar: {
    display: "flex",
    gap: "0",
    borderTop: "1px solid #f1f5f9",
    padding: "0 28px",
    overflowX: "auto",
    background: "#fff",
    borderRadius: "0 0 16px 16px",
  },
  tabsBarStandalone: {
    display: "flex",
    gap: "0",
    padding: "0",
    overflowX: "auto",
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
  },
  tab: {
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "14px 16px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },

  /* ── Bar Chart (CSS puro, padrão consistente) ────── */
  chartContainer: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    height: "180px",
    padding: "0 4px",
  },
  chartBarWrap: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    height: "100%",
    justifyContent: "flex-end",
  },
  chartBar: {
    width: "100%",
    maxWidth: "40px",
    borderRadius: "6px 6px 0 0",
    transition: "height 0.6s ease",
    minHeight: "4px",
  },
  chartLabel: {
    fontSize: "10px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  chartValue: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#0f172a",
  },
};

export default S;
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

function diasAtraso(dataVenc) {
  if (!dataVenc) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(dataVenc + "T00:00:00");
  const diff = Math.floor((hoje - venc) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function faixaAtraso(dias) {
  if (dias <= 0) return null;
  if (dias <= 15) return { label: "1–15 dias", bg: "#fff7ed", color: "#ea580c", severity: 1 };
  if (dias <= 30) return { label: "16–30 dias", bg: "#fef2f2", color: "#dc2626", severity: 2 };
  if (dias <= 60) return { label: "31–60 dias", bg: "#fef2f2", color: "#be123c", severity: 3 };
  return { label: "60+ dias", bg: "#450a0a", color: "#fecaca", severity: 4 };
}

/* ═══════════���═══════════════════════════════════════════════
   ICONS — Lucide-style inline SVGs
   ═══════════════════════════════════════════════════════════ */
const Icons = {
  alertTriangle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
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
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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
  whatsapp: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  ),
  mail: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  phone: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
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
  emptyState: (
    <svg width="64" height="64" viewBox="0 0 120 120" fill="none">
      <rect x="10" y="24" width="100" height="76" rx="16" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="22" y="40" width="76" height="8" rx="4" fill="#e2e8f0" />
      <rect x="22" y="56" width="52" height="8" rx="4" fill="#e2e8f0" />
      <rect x="22" y="72" width="64" height="8" rx="4" fill="#e2e8f0" />
      <circle cx="96" cy="24" r="18" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="2" />
      <polyline points="88 24 94 30 104 20" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
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

  /* ── Search Bar ──────────────────────────────────── */
  searchBar: {
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
  filterChip: (active) => ({
    display: "inline-flex",
    alignItems: "center",
    height: "34px",
    padding: "0 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    border: "none",
    transition: "all 0.15s ease",
    fontFamily: "inherit",
    background: active ? "#dc2626" : "#f1f5f9",
    color: active ? "#fff" : "#64748b",
  }),

  /* ── Buttons ─────────────────────────────────────── */
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
  diasBadge: (faixa) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "700",
    whiteSpace: "nowrap",
    flexShrink: 0,
    background: faixa ? faixa.bg : "#f1f5f9",
    color: faixa ? faixa.color : "#64748b",
  }),

  /* ── Expanded Detail Row ─────────────────────────── */
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
  actionBtnsRow: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },
  actionBtnSmall: (bg, color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "none",
    borderRadius: "8px",
    padding: "8px 14px",
    background: bg,
    color: color,
    fontWeight: "600",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  }),

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

  /* ── Severity Progress Bar ───────────────────────── */
  severityBar: {
    display: "flex",
    gap: "3px",
    alignItems: "center",
  },
  severityDot: (filled) => ({
    width: "8px",
    height: "8px",
    borderRadius: "2px",
    background: filled ? "#dc2626" : "#e2e8f0",
    transition: "background 0.3s ease",
  }),

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

function SeverityIndicator({ level }) {
  return (
    <div style={S.severityBar} title={`Severidade: ${level}/4`}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={S.severityDot(i <= level)} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — Inadimplencia
   ═══════════════════════════════════════════════════════════ */
function Inadimplencia() {
  const [contas, setContas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [filtroFaixa, setFiltroFaixa] = useState("todos");
  const [expandedId, setExpandedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);

  /* ── Fetch ───────────────────────────────────────── */
  const carregar = () => {
    setCarregando(true);
    fetch(`${API}/financeiro/contas-receber`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => {
        const lista = Array.isArray(d) ? d : [];
        // Filtra apenas atrasadas
        const atrasadas = lista.filter(
          (c) => c.status === "atrasado" || (c.status === "pendente" && diasAtraso(c.data_vencimento) > 0)
        );
        setContas(atrasadas);
      })
      .catch(console.error)
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  /* ── Filtro ──────────────────────────────────────── */
  const filtradas = useMemo(() => {
    let resultado = contas;

    // Filtro de busca
    const t = busca.trim().toLowerCase();
    if (t) {
      resultado = resultado.filter(
        (c) =>
          (c.descricao || "").toLowerCase().includes(t) ||
          (c.paciente_nome || "").toLowerCase().includes(t)
      );
    }

    // Filtro por faixa de atraso
    if (filtroFaixa !== "todos") {
      resultado = resultado.filter((c) => {
        const dias = diasAtraso(c.data_vencimento);
        const faixa = faixaAtraso(dias);
        if (!faixa) return false;
        switch (filtroFaixa) {
          case "1-15": return faixa.severity === 1;
          case "16-30": return faixa.severity === 2;
          case "31-60": return faixa.severity === 3;
          case "60+": return faixa.severity === 4;
          default: return true;
        }
      });
    }

    // Ordenar por dias de atraso (mais atrasado primeiro)
    resultado.sort(
      (a, b) => diasAtraso(b.data_vencimento) - diasAtraso(a.data_vencimento)
    );

    return resultado;
  }, [contas, busca, filtroFaixa]);

  /* ── Stats ───────────────────────────────────────── */
  const stats = useMemo(() => {
    const totalValor = contas.reduce((s, c) => s + Number(c.valor || 0), 0);
    const totalPacientes = new Set(contas.map((c) => c.paciente_nome || c.paciente_id)).size;
    const mediaAtraso =
      contas.length > 0
        ? Math.round(
            contas.reduce((s, c) => s + diasAtraso(c.data_vencimento), 0) /
              contas.length
          )
        : 0;
    const maiorAtraso = contas.length > 0
      ? Math.max(...contas.map((c) => diasAtraso(c.data_vencimento)))
      : 0;
    return {
      totalContas: contas.length,
      totalValor,
      totalPacientes,
      mediaAtraso,
      maiorAtraso,
    };
  }, [contas]);

  /* ── Handlers ────────────────────────────────────── */
  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const marcarRecebido = async (id) => {
    try {
      await fetch(`${API}/financeiro/contas-receber/${id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          status: "recebido",
          data_recebimento: new Date().toISOString().split("T")[0],
        }),
      });
      carregar();
    } catch (e) {
      console.error(e);
    }
  };

  const enviarCobrancaWhatsApp = (conta) => {
    const telefone = conta.paciente_telefone || conta.telefone || "";
    const numero = telefone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${conta.paciente_nome || ""}! Identificamos um valor em aberto de ${fmt(conta.valor)} com vencimento em ${fmtData(conta.data_vencimento)}. Podemos ajudar com a regularização?`
    );
    window.open(`https://wa.me/55${numero}?text=${msg}`, "_blank");
  };

  /* ── Loading ─────────────────────────────────────── */
  if (carregando) return <Loading text="Carregando inadimplência" />;

  /* ── Colunas ─────────────────────────────────────── */
  const COL = {
    paciente:   { flex: "1.5", minWidth: "150px" },
    descricao:  { flex: "1.5", minWidth: "140px" },
    valor:      { width: "120px", textAlign: "right" },
    vencimento: { width: "110px" },
    atraso:     { width: "100px", textAlign: "center" },
    severidade: { width: "80px", textAlign: "center" },
    acoes:      { width: "80px", justifyContent: "flex-end" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ══════════════════════════════════════════════
          STATS GRID
          ══════════════════════════════════════════════ */}
      <div style={S.statsGrid}>
        <StatCard
          label="Contas em atraso"
          value={stats.totalContas}
          icon={Icons.alertTriangle}
          accent="#dc2626"
          sub="inadimplentes"
        />
        <StatCard
          label="Valor total em atraso"
          value={fmt(stats.totalValor)}
          icon={Icons.dollarSign}
          accent="#ea580c"
          sub="a receber"
        />
        <StatCard
          label="Pacientes devedores"
          value={stats.totalPacientes}
          icon={Icons.users}
          accent="#8b5cf6"
          sub="com pendências"
        />
        <StatCard
          label="Média de atraso"
          value={`${stats.mediaAtraso} dias`}
          icon={Icons.clock}
          accent="#2563eb"
          sub={`maior: ${stats.maiorAtraso} dias`}
        />
      </div>

      {/* ══════════════════════════════════════════════
          SEARCH + FILTROS
          ══════════════════════════════════════════════ */}
      <div style={S.searchBar}>
        <div style={S.searchInputWrap(searchFocused)}>
          <span style={S.searchIcon(searchFocused)}>{Icons.search}</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Buscar por paciente ou descrição..."
            style={S.searchInput}
          />
          {busca && (
            <button style={S.searchClear} onClick={() => setBusca("")}>
              ✕
            </button>
          )}
        </div>

        {/* Filtros por faixa */}
        <div style={{ display: "flex", gap: "6px" }}>
          {[
            { id: "todos", label: "Todos" },
            { id: "1-15", label: "1–15 dias" },
            { id: "16-30", label: "16–30 dias" },
            { id: "31-60", label: "31–60 dias" },
            { id: "60+", label: "60+ dias" },
          ].map((f) => (
            <button
              key={f.id}
              style={S.filterChip(filtroFaixa === f.id)}
              onClick={() => setFiltroFaixa(f.id)}
              onMouseEnter={(e) => {
                if (filtroFaixa !== f.id)
                  e.currentTarget.style.background = "#e2e8f0";
              }}
              onMouseLeave={(e) => {
                if (filtroFaixa !== f.id)
                  e.currentTarget.style.background = "#f1f5f9";
              }}
            >
              {f.label}
            </button>
          ))}
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
      </div>

      {/* ══════════════════════════════════════════════
          TABELA ou EMPTY STATE
          ══════════════════════════════════════════════ */}
      {filtradas.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9" }}>
          <div style={S.emptyState}>
            {Icons.emptyState}
            <h3 style={S.emptyTitle}>
              {busca || filtroFaixa !== "todos"
                ? "Nenhum resultado encontrado"
                : "Nenhuma inadimplência registrada"}
            </h3>
            <p style={S.emptyText}>
              {busca || filtroFaixa !== "todos"
                ? "Tente ajustar os filtros ou o termo de busca."
                : "Ótima notícia! Todas as contas estão em dia. Continue acompanhando para manter o controle."}
            </p>
          </div>
        </div>
      ) : (
        <div style={S.tableCard}>
          {/* Header */}
          <div style={S.tableHeader}>
            <span style={{ ...S.thCell, ...COL.paciente }}>Paciente</span>
            <span style={{ ...S.thCell, ...COL.descricao }}>Descrição</span>
            <span style={{ ...S.thCell, ...COL.valor }}>Valor</span>
            <span style={{ ...S.thCell, ...COL.vencimento }}>Vencimento</span>
            <span style={{ ...S.thCell, ...COL.atraso }}>Atraso</span>
            <span style={{ ...S.thCell, ...COL.severidade }}>Risco</span>
            <span style={{ ...S.thCell, ...COL.acoes }}>Ações</span>
          </div>

          {/* Rows */}
          <ul style={S.list}>
            {filtradas.map((c) => {
              const dias = diasAtraso(c.data_vencimento);
              const faixa = faixaAtraso(dias);
              const isHovered = hoveredId === c.id;
              const isExpanded = expandedId === c.id;

              return (
                <li key={c.id} style={{ margin: 0 }}>
                  {/* ── Main Row ──────────────────── */}
                  <div
                    style={S.row(isHovered)}
                    onMouseEnter={() => setHoveredId(c.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => toggleExpand(c.id)}
                  >
                    {/* Paciente */}
                    <div style={{ ...COL.paciente, minWidth: 0 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={S.cellTextBold}>
                          {c.paciente_nome || "Sem paciente"}
                        </span>
                        {c.paciente_telefone && (
                          <span style={S.cellSub}>{c.paciente_telefone}</span>
                        )}
                      </div>
                    </div>

                    {/* Descrição */}
                    <div style={{ ...COL.descricao, minWidth: 0 }}>
                      <span style={S.cellText}>{c.descricao || "—"}</span>
                    </div>

                    {/* Valor */}
                    <div style={{ ...COL.valor }}>
                      <span
                        style={{
                          ...S.cellTextBold,
                          color: "#dc2626",
                          width: "100%",
                          textAlign: "right",
                          display: "block",
                        }}
                      >
                        {fmt(c.valor)}
                      </span>
                    </div>

                    {/* Vencimento */}
                    <div style={{ ...COL.vencimento }}>
                      <span style={S.cellText}>
                        {fmtData(c.data_vencimento)}
                      </span>
                    </div>

                    {/* Dias de atraso */}
                    <div style={{ ...COL.atraso, display: "flex", justifyContent: "center" }}>
                      <span style={S.diasBadge(faixa)}>
                        {dias} {dias === 1 ? "dia" : "dias"}
                      </span>
                    </div>

                    {/* Severidade */}
                    <div style={{ ...COL.severidade, display: "flex", justifyContent: "center" }}>
                      <SeverityIndicator level={faixa ? faixa.severity : 0} />
                    </div>

                    {/* Expandir */}
                    <div
                      style={{
                        ...COL.acoes,
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ display: "flex", color: "#94a3b8", transition: "transform 0.2s" }}>
                        {isExpanded ? Icons.chevronUp : Icons.chevronDown}
                      </span>
                    </div>
                  </div>

                  {/* ── Expanded Detail ───────────── */}
                  {isExpanded && (
                    <div style={S.expandedRow}>
                      <div style={S.expandedInner}>
                        {/* Card: Info da conta */}
                        <div style={S.detailCard}>
                          <span style={S.detailLabel}>Detalhes da conta</span>
                          <span style={S.detailValue}>{c.descricao || "—"}</span>
                          <span style={S.cellSub}>
                            Vencimento: {fmtData(c.data_vencimento)}
                          </span>
                          <span style={S.cellSub}>
                            Valor: {fmt(c.valor)}
                          </span>
                          {c.observacoes && (
                            <span style={{ ...S.cellSub, fontStyle: "italic" }}>
                              "{c.observacoes}"
                            </span>
                          )}
                        </div>

                        {/* Card: Atraso */}
                        <div style={S.detailCard}>
                          <span style={S.detailLabel}>Análise de atraso</span>
                          <span style={S.detailValue}>{dias} dias em atraso</span>
                          <span style={S.cellSub}>
                            Faixa: {faixa ? faixa.label : "—"}
                          </span>
                          <div style={{ marginTop: "4px" }}>
                            <SeverityIndicator level={faixa ? faixa.severity : 0} />
                          </div>
                        </div>

                        {/* Card: Ações de cobrança */}
                        <div style={S.detailCard}>
                          <span style={S.detailLabel}>Ações de cobrança</span>
                          <div style={S.actionBtnsRow}>
                            <button
                              style={S.actionBtnSmall("#f0fdf4", "#16a34a")}
                              onClick={(e) => {
                                e.stopPropagation();
                                enviarCobrancaWhatsApp(c);
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                            >
                              {Icons.whatsapp}
                              WhatsApp
                            </button>
                            <button
                              style={S.actionBtnSmall("#eff6ff", "#2563eb")}
                              onClick={(e) => {
                                e.stopPropagation();
                                const email = c.paciente_email || "";
                                if (email) {
                                  window.open(
                                    `mailto:${email}?subject=Cobrança - Conta em atraso&body=Prezado(a) ${c.paciente_nome || ""}, identificamos um valor em aberto de ${fmt(c.valor)}.`,
                                    "_blank"
                                  );
                                } else {
                                  alert("E-mail do paciente não cadastrado.");
                                }
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                            >
                              {Icons.mail}
                              E-mail
                            </button>
                            <button
                              style={S.actionBtnSmall("#f1f5f9", "#475569")}
                              onClick={(e) => {
                                e.stopPropagation();
                                const tel = c.paciente_telefone || c.telefone || "";
                                if (tel) {
                                  window.open(`tel:${tel.replace(/\D/g, "")}`, "_self");
                                } else {
                                  alert("Telefone do paciente não cadastrado.");
                                }
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                            >
                              {Icons.phone}
                              Ligar
                            </button>
                          </div>
                          <div style={{ ...S.actionBtnsRow, marginTop: "8px" }}>
                            <button
                              style={S.actionBtnSmall("#f0fdf4", "#16a34a")}
                              onClick={(e) => {
                                e.stopPropagation();
                                marcarRecebido(c.id);
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                            >
                              {Icons.check}
                              Marcar como recebido
                            </button>
                          </div>
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
              {filtradas.length}{" "}
              {filtradas.length === 1 ? "conta em atraso" : "contas em atraso"}
            </span>
            <span style={{ ...S.footerText, fontWeight: "600", color: "#dc2626" }}>
              Total: {fmt(filtradas.reduce((s, c) => s + Number(c.valor || 0), 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inadimplencia;
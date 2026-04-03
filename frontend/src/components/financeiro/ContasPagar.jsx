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

/* ═══════════════════════════════════════════════════════════
   ICONS — Lucide-style inline SVGs
   ═══════════════════════════════════════════════════════════ */
const Icons = {
  dollarSign: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  trendingDown: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  ),
  alertTriangle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  checkCircle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" /><path d="M5 12h14" />
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
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
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
  emptyState: (
    <svg width="64" height="64" viewBox="0 0 120 120" fill="none">
      <rect x="10" y="24" width="100" height="76" rx="16" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="22" y="40" width="76" height="8" rx="4" fill="#e2e8f0" />
      <rect x="22" y="56" width="52" height="8" rx="4" fill="#e2e8f0" />
      <rect x="22" y="72" width="64" height="8" rx="4" fill="#e2e8f0" />
      <circle cx="96" cy="24" r="18" fill="#fef2f2" stroke="#fecaca" strokeWidth="2" />
      <path d="M90 18l12 12M102 18L90 30" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════════════════ */
const STATUS_CONFIG = {
  pendente:  { label: "Pendente",  bg: "#fff7ed", color: "#ea580c", dot: "#fb923c" },
  pago:      { label: "Pago",      bg: "#f0fdf4", color: "#16a34a", dot: "#4ade80" },
  atrasado:  { label: "Atrasado",  bg: "#fef2f2", color: "#dc2626", dot: "#f87171" },
  cancelado: { label: "Cancelado", bg: "#f8fafc", color: "#94a3b8", dot: "#cbd5e1" },
};

const CATEGORIAS = [
  "Aluguel",
  "Água / Luz / Internet",
  "Material de escritório",
  "Equipamentos",
  "Salários",
  "Impostos",
  "Marketing",
  "Software / Assinaturas",
  "Manutenção",
  "Outros",
];

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
  },
  searchInputWrap: (focused) => ({
    flex: 1,
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
    cursor: "default",
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
  cellEmpty: {
    fontSize: "13px",
    color: "#d1d5db",
    fontWeight: "400",
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

  /* ── Action Buttons ──────────────────────────────── */
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

  /* ── Badge ─────��─────────────────────────────────── */
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
  categoriaBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "500",
    background: "#f1f5f9",
    color: "#475569",
    whiteSpace: "nowrap",
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
    maxWidth: "520px",
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
  formTextarea: {
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "10px 14px",
    fontSize: "14px",
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: "80px",
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

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
  return (
    <span style={S.badge(cfg.bg, cfg.color)}>
      <span style={S.badgeDot(cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function EmptyState({ title, text, action, onAction }) {
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

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — ContasPagar
   ═══════════════════════════════════════════════════════════ */
function ContasPagar() {
  const [contas, setContas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);
  const [modal, setModal] = useState(null); // "novo" | "editar" | null
  const [form, setForm] = useState({});

  /* ── Fetch ───────────────────────────────────────── */
  /* ✅ CORRIGIDO: backend retorna { contas, resumo }, não array direto */
  const carregar = () => {
    setCarregando(true);
    fetch(`${API}/financeiro/contas-pagar`, { headers: headers() })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setContas(d);
        } else if (d && Array.isArray(d.contas)) {
          setContas(d.contas);
        } else {
          setContas([]);
        }
      })
      .catch(console.error)
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  /* ── Filtro ──────────────────────────────────────── */
  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return contas;
    return contas.filter(
      (c) =>
        (c.descricao || "").toLowerCase().includes(t) ||
        (c.fornecedor || "").toLowerCase().includes(t) ||
        (c.categoria || "").toLowerCase().includes(t) ||
        (c.status || "").toLowerCase().includes(t)
    );
  }, [contas, busca]);

  /* ── Stats ───────────────────────────────────────── */
  const stats = useMemo(() => {
    const pendentes = contas.filter((c) => c.status === "pendente");
    const pagas = contas.filter((c) => c.status === "pago");
    const atrasadas = contas.filter((c) => c.status === "atrasado");
    return {
      total: contas.length,
      valorPendente: pendentes.reduce((s, c) => s + Number(c.valor || 0), 0),
      valorPago: pagas.reduce((s, c) => s + Number(c.valor || 0), 0),
      qtdAtrasadas: atrasadas.length,
    };
  }, [contas]);

  /* ── Handlers ────────────────────────────────────── */
  const abrirNovo = () => {
    setForm({
      descricao: "",
      valor: "",
      data_vencimento: "",
      fornecedor: "",
      categoria: "",
      status: "pendente",
      observacoes: "",
    });
    setModal("novo");
  };

  const abrirEditar = (c) => {
    setForm({ ...c });
    setModal("editar");
  };

  /* ✅ CORRIGIDO: converte valor para número antes de enviar */
  const salvar = async () => {
    const url =
      modal === "novo"
        ? `${API}/financeiro/contas-pagar`
        : `${API}/financeiro/contas-pagar/${form.id}`;
    const method = modal === "novo" ? "POST" : "PUT";
    try {
      const payload = {
        ...form,
        valor: parseFloat(form.valor) || 0,
      };
      await fetch(url, {
        method,
        headers: headers(),
        body: JSON.stringify(payload),
      });
      setModal(null);
      carregar();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar conta a pagar.");
    }
  };

  const excluir = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta conta a pagar?"))
      return;
    try {
      await fetch(`${API}/financeiro/contas-pagar/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      carregar();
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir.");
    }
  };

  /* ✅ CORRIGIDO: usa rota dedicada /pagar em vez de PUT genérico */
  const marcarPago = async (id) => {
    try {
      await fetch(`${API}/financeiro/contas-pagar/${id}/pagar`, {
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

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
  if (carregando) return <Loading text="Carregando contas a pagar" />;

  /* ── Colunas ─────────────────────────────────────── */
  const COL = {
    descricao:  { flex: "1.8", minWidth: "160px" },
    fornecedor: { flex: "1.2", minWidth: "120px" },
    categoria:  { width: "140px" },
    valor:      { width: "120px", textAlign: "right" },
    vencimento: { width: "110px" },
    status:     { width: "120px" },
    acoes:      { width: "130px", justifyContent: "flex-end" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ══════════════════════════════════════════════
          STATS GRID
          ══════════════════════════════════════════════ */}
      <div style={S.statsGrid}>
        <StatCard
          label="Total de contas"
          value={stats.total}
          icon={Icons.dollarSign}
          accent="#2563eb"
          sub="cadastradas"
        />
        <StatCard
          label="Valor pendente"
          value={fmt(stats.valorPendente)}
          icon={Icons.clock}
          accent="#ea580c"
          sub="a pagar"
        />
        <StatCard
          label="Valor pago"
          value={fmt(stats.valorPago)}
          icon={Icons.checkCircle}
          accent="#16a34a"
          sub="confirmado"
        />
        <StatCard
          label="Em atraso"
          value={stats.qtdAtrasadas}
          icon={Icons.alertTriangle}
          accent="#dc2626"
          sub="contas atrasadas"
        />
      </div>

      {/* ══════════════════════════════════════════════
          SEARCH BAR
          ══════════════════════════════════════════════ */}
      <div style={S.searchBar}>
        <div style={S.searchInputWrap(searchFocused)}>
          <span style={S.searchIcon(searchFocused)}>{Icons.search}</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Buscar por descrição, fornecedor, categoria ou status..."
            style={S.searchInput}
          />
          {busca && (
            <button style={S.searchClear} onClick={() => setBusca("")}>
              ✕
            </button>
          )}
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
          onClick={abrirNovo}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(37,99,235,0.2)";
          }}
        >
          {Icons.plus}
          <span>Nova conta</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════
          TABELA ou EMPTY STATE
          ══════════════════════════════════════════════ */}
      {filtradas.length === 0 ? (
        <EmptyState
          title="Nenhuma conta a pagar encontrada"
          text={
            busca
              ? "Nenhum resultado para a busca atual. Tente outro termo."
              : "Cadastre a primeira conta a pagar para começar a controlar suas despesas."
          }
          action={!busca ? "Nova conta a pagar" : null}
          onAction={abrirNovo}
        />
      ) : (
        <div style={S.tableCard}>
          {/* ── Header ───────────────────────────── */}
          <div style={S.tableHeader}>
            <span style={{ ...S.thCell, ...COL.descricao }}>Descrição</span>
            <span style={{ ...S.thCell, ...COL.fornecedor }}>Fornecedor</span>
            <span style={{ ...S.thCell, ...COL.categoria }}>Categoria</span>
            <span style={{ ...S.thCell, ...COL.valor }}>Valor</span>
            <span style={{ ...S.thCell, ...COL.vencimento }}>Vencimento</span>
            <span style={{ ...S.thCell, ...COL.status }}>Status</span>
            <span style={{ ...S.thCell, ...COL.acoes }}>Ações</span>
          </div>

          {/* ── Rows ─────────────────────────────── */}
          <ul style={S.list}>
            {filtradas.map((c) => {
              const isHovered = hoveredId === c.id;
              return (
                <li
                  key={c.id}
                  style={S.row(isHovered)}
                  onMouseEnter={() => setHoveredId(c.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Descrição */}
                  <div style={{ ...COL.descricao, minWidth: 0 }}>
                    <span style={S.cellTextBold}>{c.descricao || "—"}</span>
                  </div>

                  {/* Fornecedor */}
                  <div style={{ ...COL.fornecedor, minWidth: 0 }}>
                    <span style={c.fornecedor ? S.cellText : S.cellEmpty}>
                      {c.fornecedor || "Sem fornecedor"}
                    </span>
                  </div>

                  {/* Categoria */}
                  <div style={{ ...COL.categoria }}>
                    {c.categoria ? (
                      <span style={S.categoriaBadge}>{c.categoria}</span>
                    ) : (
                      <span style={S.cellEmpty}>—</span>
                    )}
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
                    <span style={S.cellText}>{fmtData(c.data_vencimento)}</span>
                  </div>

                  {/* Status */}
                  <div style={{ ...COL.status }}>
                    <StatusBadge status={c.status} />
                  </div>

                  {/* Ações */}
                  <div
                    style={{
                      ...COL.acoes,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      justifyContent: "flex-end",
                    }}
                  >
                    {/* Marcar como pago */}
                    {c.status !== "pago" && c.status !== "cancelado" && (
                      <button
                        title="Marcar como pago"
                        style={S.actionBtn(
                          hoveredAction === `check-${c.id}`,
                          "#16a34a"
                        )}
                        onClick={() => marcarPago(c.id)}
                        onMouseEnter={() => setHoveredAction(`check-${c.id}`)}
                        onMouseLeave={() => setHoveredAction(null)}
                      >
                        {Icons.check}
                      </button>
                    )}

                    {/* Editar */}
                    <button
                      title="Editar"
                      style={S.actionBtn(
                        hoveredAction === `edit-${c.id}`,
                        "#2563eb"
                      )}
                      onClick={() => abrirEditar(c)}
                      onMouseEnter={() => setHoveredAction(`edit-${c.id}`)}
                      onMouseLeave={() => setHoveredAction(null)}
                    >
                      {Icons.edit}
                    </button>

                    {/* Excluir */}
                    <button
                      title="Excluir"
                      style={S.actionBtn(
                        hoveredAction === `del-${c.id}`,
                        "#dc2626"
                      )}
                      onClick={() => excluir(c.id)}
                      onMouseEnter={() => setHoveredAction(`del-${c.id}`)}
                      onMouseLeave={() => setHoveredAction(null)}
                    >
                      {Icons.trash}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* ── Footer ───────────────────────────── */}
          <div style={S.tableFooter}>
            <span style={S.footerText}>
              {filtradas.length}{" "}
              {filtradas.length === 1 ? "conta encontrada" : "contas encontradas"}
            </span>
            <span style={S.footerText}>
              Total: {fmt(filtradas.reduce((s, c) => s + Number(c.valor || 0), 0))}
            </span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODAL — Nova / Editar conta a pagar
          ══════════════════════════════════════════════ */}
      {modal && (
        <div style={S.modalOverlay} onClick={() => setModal(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={S.modalHeader}>
              <h3 style={S.modalTitle}>
                {modal === "novo"
                  ? "Nova conta a pagar"
                  : "Editar conta a pagar"}
              </h3>
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
              {/* Descrição */}
              <div style={S.formGroup}>
                <label style={S.formLabel}>Descrição *</label>
                <input
                  style={S.formInput}
                  value={form.descricao || ""}
                  onChange={(e) => setField("descricao", e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Ex: Aluguel da clínica"
                />
              </div>

              {/* Valor + Vencimento */}
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={S.formInput}
                    value={form.valor || ""}
                    onChange={(e) => setField("valor", e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="0,00"
                  />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Vencimento *</label>
                  <input
                    type="date"
                    style={S.formInput}
                    value={form.data_vencimento || ""}
                    onChange={(e) =>
                      setField("data_vencimento", e.target.value)
                    }
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
              </div>

              {/* Fornecedor + Categoria */}
              <div style={S.formRow}>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Fornecedor</label>
                  <input
                    style={S.formInput}
                    value={form.fornecedor || ""}
                    onChange={(e) => setField("fornecedor", e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="Nome do fornecedor"
                  />
                </div>
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Categoria</label>
                  <select
                    style={S.formSelect}
                    value={form.categoria || ""}
                    onChange={(e) => setField("categoria", e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  >
                    <option value="">Selecione...</option>
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div style={S.formGroup}>
                <label style={S.formLabel}>Status</label>
                <select
                  style={S.formSelect}
                  value={form.status || "pendente"}
                  onChange={(e) => setField("status", e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              {/* Observações */}
              <div style={S.formGroup}>
                <label style={S.formLabel}>Observações</label>
                <textarea
                  style={S.formTextarea}
                  value={form.observacoes || ""}
                  onChange={(e) => setField("observacoes", e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Anotações opcionais..."
                  rows={3}
                />
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
                onClick={salvar}
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
                {modal === "novo" ? "Criar conta" : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContasPagar;
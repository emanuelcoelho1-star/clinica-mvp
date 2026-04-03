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
  trendingUp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  trendingDown: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  ),
  arrowUpDown: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 16-4 4-4-4" /><path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" /><path d="M7 4v16" />
    </svg>
  ),
  barChart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
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
  arrowUp: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  ),
  arrowDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  emptyState: (
    <svg width="64" height="64" viewBox="0 0 120 120" fill="none">
      <rect x="10" y="24" width="100" height="76" rx="16" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="24" y="70" width="14" height="22" rx="4" fill="#e2e8f0" />
      <rect x="44" y="55" width="14" height="37" rx="4" fill="#e2e8f0" />
      <rect x="64" y="42" width="14" height="50" rx="4" fill="#e2e8f0" />
      <rect x="84" y="50" width="14" height="42" rx="4" fill="#e2e8f0" />
      <circle cx="96" cy="24" r="18" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2" />
      <path d="M90 24h12M96 18v12" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
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

  /* ── Filter Bar ──────────────────────────────────── */
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
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
  periodChip: (active) => ({
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
    background: active ? "#2563eb" : "#f1f5f9",
    color: active ? "#fff" : "#64748b",
  }),

  /* ── Card ────────────────────────────────────────── */
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "20px",
  },

  /* ── Chart (CSS puro) ────────────────────────────── */
  chartContainer: {
    display: "flex",
    alignItems: "flex-end",
    gap: "6px",
    height: "200px",
    padding: "0 4px",
  },
  chartBarGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    height: "100%",
    justifyContent: "flex-end",
  },
  chartBarsRow: {
    display: "flex",
    gap: "3px",
    width: "100%",
    justifyContent: "center",
    alignItems: "flex-end",
    flex: 1,
  },
  chartBar: (color, pct) => ({
    flex: 1,
    maxWidth: "22px",
    borderRadius: "5px 5px 0 0",
    transition: "height 0.6s ease",
    minHeight: "4px",
    background: color,
    height: `${pct}%`,
    cursor: "default",
  }),
  chartLabel: {
    fontSize: "10px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    textAlign: "center",
  },
  legendWrap: {
    display: "flex",
    gap: "16px",
    marginTop: "16px",
    justifyContent: "center",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#64748b",
    fontWeight: "500",
  },
  legendDot: (color) => ({
    width: "10px",
    height: "10px",
    borderRadius: "3px",
    background: color,
  }),

  /* ── Saldo Acumulado (mini chart) ────────────────── */
  saldoBarWrap: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  saldoLabel: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
    width: "80px",
    flexShrink: 0,
  },
  saldoBarTrack: {
    flex: 1,
    height: "8px",
    borderRadius: "4px",
    background: "#f1f5f9",
    overflow: "hidden",
  },
  saldoBarFill: (pct, color) => ({
    height: "100%",
    borderRadius: "4px",
    background: color,
    width: `${Math.min(Math.abs(pct), 100)}%`,
    transition: "width 0.6s ease",
  }),
  saldoValue: (positive) => ({
    fontSize: "14px",
    fontWeight: "700",
    color: positive ? "#16a34a" : "#dc2626",
    minWidth: "100px",
    textAlign: "right",
  }),

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

  /* ── Type Badge ──────────────────────────────────── */
  typeBadge: (tipo) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    flexShrink: 0,
    background: tipo === "entrada" ? "#f0fdf4" : "#fef2f2",
    color: tipo === "entrada" ? "#16a34a" : "#dc2626",
  }),
  typeDot: (tipo) => ({
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    flexShrink: 0,
    background: tipo === "entrada" ? "#4ade80" : "#f87171",
  }),

  /* ── Empty State ─────────────────────────────────── */
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

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — FluxoCaixa
   ✅ CORRIGIDO: 3 bugs — fetch parseamento, valor numérico, rota
   ═══════════════════════════════════════════════════════════ */
function FluxoCaixa() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [dataInicio, setDataInicio] = useState(mesPassado());
  const [dataFim, setDataFim] = useState(hoje());
  const [periodoAtivo, setPeriodoAtivo] = useState("mes");
  const [hoveredId, setHoveredId] = useState(null);

  /* ── Fetch ───────────────────────────────────────── */
  /* ✅ CORREÇÃO 1: backend retorna { movimentacoes, totais, ... }, não array direto */
  const carregar = () => {
    setCarregando(true);
    fetch(
      `${API}/financeiro/fluxo-caixa?data_inicio=${dataInicio}&data_fim=${dataFim}`,
      { headers: headers() }
    )
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setMovimentacoes(d);
        } else if (d && Array.isArray(d.movimentacoes)) {
          setMovimentacoes(d.movimentacoes);
        } else {
          setMovimentacoes([]);
        }
      })
      .catch(console.error)
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, [dataInicio, dataFim]);

  /* ── Atalhos de período ──────────────────────────── */
  const setPeriodo = (tipo) => {
    const h = new Date();
    let inicio;
    switch (tipo) {
      case "semana":
        inicio = new Date(h);
        inicio.setDate(h.getDate() - 7);
        break;
      case "mes":
        inicio = new Date(h);
        inicio.setMonth(h.getMonth() - 1);
        break;
      case "trimestre":
        inicio = new Date(h);
        inicio.setMonth(h.getMonth() - 3);
        break;
      case "ano":
        inicio = new Date(h);
        inicio.setFullYear(h.getFullYear() - 1);
        break;
      default:
        inicio = new Date(h);
        inicio.setMonth(h.getMonth() - 1);
    }
    setDataInicio(inicio.toISOString().split("T")[0]);
    setDataFim(h.toISOString().split("T")[0]);
    setPeriodoAtivo(tipo);
  };

  /* ── KPIs ────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const entradas = movimentacoes.filter((m) => m.tipo === "entrada");
    const saidas = movimentacoes.filter((m) => m.tipo === "saida");
    const totalEntradas = entradas.reduce((s, m) => s + Number(m.valor || 0), 0);
    const totalSaidas = saidas.reduce((s, m) => s + Number(m.valor || 0), 0);
    return {
      totalEntradas,
      totalSaidas,
      saldo: totalEntradas - totalSaidas,
      qtdMovimentacoes: movimentacoes.length,
    };
  }, [movimentacoes]);

  /* ── Dados do gráfico agrupados por dia ──────────── */
  const chartData = useMemo(() => {
    const mapa = {};
    movimentacoes.forEach((m) => {
      const dia = m.data || m.data_vencimento || "sem-data";
      if (!mapa[dia]) mapa[dia] = { dia, entradas: 0, saidas: 0 };
      if (m.tipo === "entrada") mapa[dia].entradas += Number(m.valor || 0);
      else mapa[dia].saidas += Number(m.valor || 0);
    });
    return Object.values(mapa).sort((a, b) => a.dia.localeCompare(b.dia));
  }, [movimentacoes]);

  const maxChart = useMemo(
    () =>
      Math.max(
        ...chartData.map((d) => Math.max(d.entradas, d.saidas)),
        1
      ),
    [chartData]
  );

  /* ── Saldo acumulado por dia ─────────────────────── */
  const saldoAcumulado = useMemo(() => {
    let acumulado = 0;
    return chartData.map((d) => {
      acumulado += d.entradas - d.saidas;
      return { dia: d.dia, saldo: acumulado };
    });
  }, [chartData]);

  const maxSaldo = useMemo(
    () => Math.max(...saldoAcumulado.map((d) => Math.abs(d.saldo)), 1),
    [saldoAcumulado]
  );

  /* ── Input focus handlers ────────────────────────── */
  const handleInputFocus = (e) => {
    e.target.style.borderColor = "#2563eb";
    e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
  };

  const handleInputBlur = (e) => {
    e.target.style.borderColor = "#e2e8f0";
    e.target.style.boxShadow = "none";
  };

  /* ── Loading ─────────────────────────────────────── */
  if (carregando) return <Loading text="Carregando fluxo de caixa" />;

  /* ── Colunas ─────────────────────────────────────── */
  const COL = {
    data:      { width: "110px" },
    descricao: { flex: "2", minWidth: "180px" },
    tipo:      { width: "120px" },
    valor:     { width: "130px", textAlign: "right" },
    saldo:     { width: "130px", textAlign: "right" },
  };

  /* ── Calcular saldo corrente na tabela ───────────── */
  let saldoCorrente = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ══════════════════════════════════════════════
          STATS GRID
          ══════════════════════════════════════════════ */}
      <div style={S.statsGrid}>
        <StatCard
          label="Total de entradas"
          value={fmt(kpis.totalEntradas)}
          icon={Icons.trendingUp}
          accent="#16a34a"
          sub={`${movimentacoes.filter((m) => m.tipo === "entrada").length} movimentações`}
        />
        <StatCard
          label="Total de saídas"
          value={fmt(kpis.totalSaidas)}
          icon={Icons.trendingDown}
          accent="#dc2626"
          sub={`${movimentacoes.filter((m) => m.tipo === "saida").length} movimentações`}
        />
        <StatCard
          label="Saldo do período"
          value={fmt(kpis.saldo)}
          icon={Icons.arrowUpDown}
          accent={kpis.saldo >= 0 ? "#2563eb" : "#dc2626"}
          sub={kpis.saldo >= 0 ? "saldo positivo" : "saldo negativo"}
        />
        <StatCard
          label="Movimentações"
          value={kpis.qtdMovimentacoes}
          icon={Icons.barChart}
          accent="#8b5cf6"
          sub="no período selecionado"
        />
      </div>

      {/* ══════════════════════════════════════════════
          FILTROS DE PERÍODO
          ══════════════════════════════════════════════ */}
      <div style={S.filterBar}>
        {/* Chips rápidos */}
        <div style={{ display: "flex", gap: "6px" }}>
          {[
            { id: "semana", label: "7 dias" },
            { id: "mes", label: "30 dias" },
            { id: "trimestre", label: "3 meses" },
            { id: "ano", label: "12 meses" },
          ].map((p) => (
            <button
              key={p.id}
              style={S.periodChip(periodoAtivo === p.id)}
              onClick={() => setPeriodo(p.id)}
              onMouseEnter={(e) => {
                if (periodoAtivo !== p.id) e.currentTarget.style.background = "#e2e8f0";
              }}
              onMouseLeave={(e) => {
                if (periodoAtivo !== p.id) e.currentTarget.style.background = "#f1f5f9";
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Separador */}
        <div style={{ width: "1px", height: "24px", background: "#e2e8f0" }} />

        {/* Datas customizadas */}
        <div style={S.filterGroup}>
          <span style={S.filterLabel}>
            {Icons.calendar} De
          </span>
          <input
            type="date"
            style={S.filterInput}
            value={dataInicio}
            onChange={(e) => {
              setDataInicio(e.target.value);
              setPeriodoAtivo(null);
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>
        <div style={S.filterGroup}>
          <span style={S.filterLabel}>
            {Icons.calendar} Até
          </span>
          <input
            type="date"
            style={S.filterInput}
            value={dataFim}
            onChange={(e) => {
              setDataFim(e.target.value);
              setPeriodoAtivo(null);
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>

        {/* Atualizar */}
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
          GRID 2 COLUNAS — Gráfico + Saldo Acumulado
          ══════════════════════════════════════════════ */}
      <div style={S.grid}>

        {/* ── Gráfico de barras ────────────────────── */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitleRow}>
              <span style={S.cardIcon}>{Icons.barChart}</span>
              <h2 style={S.cardTitle}>Entradas vs Saídas</h2>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div style={S.emptyStateInline}>
              {Icons.emptyState}
              <p style={S.emptyTitle}>Sem movimentações no período</p>
              <p style={S.emptyText}>Ajuste as datas para visualizar o fluxo.</p>
            </div>
          ) : (
            <>
              <div style={S.chartContainer}>
                {chartData.slice(-12).map((d, i) => {
                  const entradaPct = (d.entradas / maxChart) * 100;
                  const saidaPct = (d.saidas / maxChart) * 100;
                  const labelDia = d.dia !== "sem-data"
                    ? d.dia.slice(8, 10) + "/" + d.dia.slice(5, 7)
                    : "—";
                  return (
                    <div key={i} style={S.chartBarGroup}>
                      <div style={S.chartBarsRow}>
                        <div
                          style={S.chartBar("#2563eb", entradaPct)}
                          title={`Entradas: ${fmt(d.entradas)}`}
                        />
                        <div
                          style={S.chartBar("#f87171", saidaPct)}
                          title={`Saídas: ${fmt(d.saidas)}`}
                        />
                      </div>
                      <span style={S.chartLabel}>{labelDia}</span>
                    </div>
                  );
                })}
              </div>
              <div style={S.legendWrap}>
                <span style={S.legendItem}>
                  <span style={S.legendDot("#2563eb")} />
                  Entradas
                </span>
                <span style={S.legendItem}>
                  <span style={S.legendDot("#f87171")} />
                  Saídas
                </span>
              </div>
            </>
          )}
        </div>

        {/* ── Saldo Acumulado ──────────────────────── */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitleRow}>
              <span style={S.cardIcon}>{Icons.arrowUpDown}</span>
              <h2 style={S.cardTitle}>Saldo acumulado</h2>
            </div>
          </div>

          {saldoAcumulado.length === 0 ? (
            <div style={S.emptyStateInline}>
              {Icons.emptyState}
              <p style={S.emptyTitle}>Sem dados de saldo</p>
              <p style={S.emptyText}>Os dados aparecerão aqui quando disponíveis.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {saldoAcumulado.slice(-8).map((d, i) => {
                const positive = d.saldo >= 0;
                const labelDia = d.dia !== "sem-data"
                  ? d.dia.slice(8, 10) + "/" + d.dia.slice(5, 7)
                  : "—";
                return (
                  <div key={i} style={S.saldoBarWrap}>
                    <span style={S.saldoLabel}>{labelDia}</span>
                    <div style={S.saldoBarTrack}>
                      <div
                        style={S.saldoBarFill(
                          (Math.abs(d.saldo) / maxSaldo) * 100,
                          positive ? "#2563eb" : "#f87171"
                        )}
                      />
                    </div>
                    <span style={S.saldoValue(positive)}>
                      {positive ? "+" : ""}
                      {fmt(d.saldo)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          TABELA DE MOVIMENTAÇÕES
          ══════════════════════════════════════════════ */}
      {movimentacoes.length === 0 ? (
        <div style={{ ...S.card }}>
          <div style={S.emptyState}>
            {Icons.emptyState}
            <h3 style={S.emptyTitle}>Nenhuma movimentação no período</h3>
            <p style={S.emptyText}>
              Selecione outro intervalo de datas ou cadastre contas a receber e a pagar para alimentar o fluxo de caixa.
            </p>
          </div>
        </div>
      ) : (
        <div style={S.tableCard}>
          {/* Header */}
          <div style={S.tableHeader}>
            <span style={{ ...S.thCell, ...COL.data }}>Data</span>
            <span style={{ ...S.thCell, ...COL.descricao }}>Descrição</span>
            <span style={{ ...S.thCell, ...COL.tipo }}>Tipo</span>
            <span style={{ ...S.thCell, ...COL.valor }}>Valor</span>
            <span style={{ ...S.thCell, ...COL.saldo }}>Saldo</span>
          </div>

          {/* Rows */}
          <ul style={S.list}>
            {movimentacoes.map((m, i) => {
              const isEntrada = m.tipo === "entrada";
              if (isEntrada) saldoCorrente += Number(m.valor || 0);
              else saldoCorrente -= Number(m.valor || 0);
              const saldoAtual = saldoCorrente;
              const isHovered = hoveredId === (m.id || i);

              return (
                <li
                  key={m.id || i}
                  style={S.row(isHovered)}
                  onMouseEnter={() => setHoveredId(m.id || i)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Data */}
                  <div style={{ ...COL.data }}>
                    <span style={S.cellText}>
                      {fmtData(m.data || m.data_vencimento)}
                    </span>
                  </div>

                  {/* Descrição */}
                  <div style={{ ...COL.descricao, minWidth: 0 }}>
                    <span style={S.cellTextBold}>{m.descricao || "—"}</span>
                  </div>

                  {/* Tipo */}
                  <div style={{ ...COL.tipo }}>
                    <span style={S.typeBadge(m.tipo)}>
                      <span style={S.typeDot(m.tipo)} />
                      {isEntrada ? "Entrada" : "Saída"}
                    </span>
                  </div>

                  {/* Valor */}
                  <div style={{ ...COL.valor }}>
                    <span
                      style={{
                        ...S.cellTextBold,
                        color: isEntrada ? "#16a34a" : "#dc2626",
                        width: "100%",
                        textAlign: "right",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "4px",
                      }}
                    >
                      <span style={{ display: "flex", color: isEntrada ? "#16a34a" : "#dc2626" }}>
                        {isEntrada ? Icons.arrowUp : Icons.arrowDown}
                      </span>
                      {fmt(m.valor)}
                    </span>
                  </div>

                  {/* Saldo acumulado */}
                  <div style={{ ...COL.saldo }}>
                    <span
                      style={{
                        ...S.cellTextBold,
                        color: saldoAtual >= 0 ? "#2563eb" : "#dc2626",
                        width: "100%",
                        textAlign: "right",
                        display: "block",
                      }}
                    >
                      {saldoAtual >= 0 ? "+" : ""}
                      {fmt(saldoAtual)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Footer */}
          <div style={S.tableFooter}>
            <span style={S.footerText}>
              {movimentacoes.length}{" "}
              {movimentacoes.length === 1 ? "movimentação" : "movimentações"}
            </span>
            <span
              style={{
                ...S.footerText,
                fontWeight: "600",
                color: kpis.saldo >= 0 ? "#16a34a" : "#dc2626",
              }}
            >
              Saldo final: {kpis.saldo >= 0 ? "+" : ""}
              {fmt(kpis.saldo)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default FluxoCaixa;
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

function fmtDataCurta(d) {
  if (!d) return "—";
  const p = d.split("-");
  if (p.length !== 3) return d;
  const meses = [
    "jan","fev","mar","abr","mai","jun",
    "jul","ago","set","out","nov","dez",
  ];
  return `${p[2]} ${meses[Number(p[1]) - 1]}`;
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
  alertTriangle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
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
  arrowRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
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

/* ═══════════════════════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════════════════ */
const STATUS_RECEBER = {
  pendente:  { label: "Pendente",  bg: "#eff6ff", color: "#2563eb", dot: "#60a5fa" },
  recebido:  { label: "Recebido",  bg: "#f0fdf4", color: "#16a34a", dot: "#4ade80" },
  atrasado:  { label: "Atrasado",  bg: "#fef2f2", color: "#dc2626", dot: "#f87171" },
  cancelado: { label: "Cancelado", bg: "#f8fafc", color: "#94a3b8", dot: "#cbd5e1" },
};

const STATUS_PAGAR = {
  pendente:  { label: "Pendente",  bg: "#fff7ed", color: "#ea580c", dot: "#fb923c" },
  pago:      { label: "Pago",      bg: "#f0fdf4", color: "#16a34a", dot: "#4ade80" },
  atrasado:  { label: "Atrasado",  bg: "#fef2f2", color: "#dc2626", dot: "#f87171" },
  cancelado: { label: "Cancelado", bg: "#f8fafc", color: "#94a3b8", dot: "#cbd5e1" },
};

/* ═══════════════════════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   ══════════��════════════════════════════════════════════════ */
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

  /* ── Cards ───────────────────────────────────────── */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "20px",
  },
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

  /* ── List / Rows ─────────────────────────────────── */
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "12px 0",
    gap: "12px",
    transition: "background 0.15s ease",
    cursor: "default",
  },
  rowCell: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  cellTextBold: {
    fontSize: "14px",
    color: "#0f172a",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cellSub: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "500",
  },

  /* ── Badge ───────────────────────────────────────── */
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

  /* ── Chart (CSS puro) ────────────────────────────── */
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
  chartBar: (color, pct) => ({
    width: "100%",
    maxWidth: "40px",
    borderRadius: "6px 6px 0 0",
    transition: "height 0.6s ease",
    minHeight: "4px",
    background: color,
    height: `${pct}%`,
  }),
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

  /* ── Empty State ─────────────────────────────────── */
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

/* ── Loading ───────────────────────────────────────── */
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

/* ── StatCard ──────────────────────────────────────── */
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

/* ── StatusBadge ───────────────────────────────────── */
function StatusBadge({ status, config }) {
  const cfg = config[status] || config.pendente || Object.values(config)[0];
  return (
    <span style={S.badge(cfg.bg, cfg.color)}>
      <span style={S.badgeDot(cfg.dot)} />
      {cfg.label}
    </span>
  );
}

/* ── SectionCard ───────────────────────────────────── */
function SectionCard({ title, icon, action, onAction, children, empty }) {
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
      ) : (
        children
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL — FinanceiroDashboard
   ═══════════════════════════════════════════════════════════ */
function FinanceiroDashboard() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  /* ── Fetch ───────────────────────────────────────── */
  useEffect(() => {
    Promise.all([
      fetch(`${API}/financeiro/dashboard`, { headers: headers() })
        .then((r) => r.json())
        .catch(() => ({})),
      fetch(`${API}/financeiro/contas-receber`, { headers: headers() })
        .then((r) => r.json())
        .catch(() => []),
      fetch(`${API}/financeiro/contas-pagar`, { headers: headers() })
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([dash, receber, pagar]) => {
        setDados({
          ...dash,
          ultimasReceber: Array.isArray(receber) ? receber.slice(0, 5) : [],
          ultimasPagar: Array.isArray(pagar) ? pagar.slice(0, 5) : [],
        });
      })
      .catch((err) => console.error("Erro ao carregar dashboard:", err))
      .finally(() => setCarregando(false));
  }, []);

  /* ── KPIs derivados ──────────────────────────────── */
  const kpis = useMemo(() => {
    if (!dados) return { totalReceber: 0, totalPagar: 0, saldo: 0, inadimplentes: 0 };
    const totalReceber = Number(dados.total_receber || 0);
    const totalPagar = Number(dados.total_pagar || 0);
    return {
      totalReceber,
      totalPagar,
      saldo: totalReceber - totalPagar,
      inadimplentes: Number(dados.inadimplentes || 0),
    };
  }, [dados]);

  /* ── Gráfico — dados de barras ───────────────────── */
  const mesesData = dados?.fluxo_mensal || [];
  const maxVal = useMemo(
    () =>
      Math.max(
        ...mesesData.map((m) =>
          Math.max(Number(m.receitas || 0), Number(m.despesas || 0))
        ),
        1
      ),
    [mesesData]
  );

  /* ── Loading ─────────────────────────────────────── */
  if (carregando) return <Loading text="Carregando painel financeiro" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ══════════════════════════════════════════════
          STATS GRID — 4 KPIs
          ══════════════════════════════════════════════ */}
      <div style={S.statsGrid}>
        <StatCard
          label="Total a receber"
          value={fmt(kpis.totalReceber)}
          icon={Icons.trendingUp}
          accent="#16a34a"
          sub="receitas pendentes"
        />
        <StatCard
          label="Total a pagar"
          value={fmt(kpis.totalPagar)}
          icon={Icons.trendingDown}
          accent="#dc2626"
          sub="despesas pendentes"
        />
        <StatCard
          label="Saldo projetado"
          value={fmt(kpis.saldo)}
          icon={Icons.arrowUpDown}
          accent="#2563eb"
          sub={kpis.saldo >= 0 ? "saldo positivo" : "saldo negativo"}
        />
        <StatCard
          label="Inadimplentes"
          value={kpis.inadimplentes}
          icon={Icons.alertTriangle}
          accent="#ea580c"
          sub="contas em atraso"
        />
      </div>

      {/* ══════════════════════════════════════════════
          GRID 2 COLUNAS — Gráfico + Receber
          ══════════════════════════════════════════════ */}
      <div style={S.grid}>

        {/* ── Gráfico de barras (CSS puro) ─────────── */}
        <SectionCard
          title="Fluxo mensal"
          icon={Icons.barChart}
          empty={
            mesesData.length === 0
              ? "Nenhum dado de fluxo disponível."
              : null
          }
        >
          <div style={S.chartContainer}>
            {mesesData.slice(-6).map((m, i) => {
              const receitaPct = ((Number(m.receitas || 0)) / maxVal) * 100;
              const despesaPct = ((Number(m.despesas || 0)) / maxVal) * 100;
              return (
                <div key={i} style={S.chartBarWrap}>
                  <span style={S.chartValue}>
                    {fmt(m.receitas || 0).replace("R$\u00a0", "")}
                  </span>
                  <div
                    style={S.chartBar("#2563eb", receitaPct)}
                    title={`Receitas: ${fmt(m.receitas)}`}
                  />
                  <div
                    style={{
                      ...S.chartBar("#f87171", despesaPct),
                      borderRadius: "0 0 6px 6px",
                      marginTop: "2px",
                    }}
                    title={`Despesas: ${fmt(m.despesas)}`}
                  />
                  <span style={S.chartLabel}>
                    {m.mes || `M${i + 1}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div style={S.legendWrap}>
            <span style={S.legendItem}>
              <span style={S.legendDot("#2563eb")} />
              Receitas
            </span>
            <span style={S.legendItem}>
              <span style={S.legendDot("#f87171")} />
              Despesas
            </span>
          </div>
        </SectionCard>

        {/* ── Últimas contas a receber ─────────────── */}
        <SectionCard
          title="Contas a receber recentes"
          icon={Icons.trendingUp}
          empty={
            dados.ultimasReceber.length === 0
              ? "Nenhuma conta a receber cadastrada."
              : null
          }
        >
          <ul style={S.list}>
            {dados.ultimasReceber.map((c, i) => (
              <li
                key={c.id || i}
                style={{
                  ...S.row,
                  borderBottom:
                    i < dados.ultimasReceber.length - 1
                      ? "1px solid #f1f5f9"
                      : "none",
                }}
              >
                <div style={{ ...S.rowCell, flex: 1 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={S.cellTextBold}>{c.descricao}</span>
                    <span style={S.cellSub}>
                      {fmtDataCurta(c.data_vencimento)} · {c.paciente_nome || "—"}
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    ...S.cellTextBold,
                    color: "#16a34a",
                    minWidth: "90px",
                    textAlign: "right",
                  }}
                >
                  {fmt(c.valor)}
                </span>
                <StatusBadge status={c.status} config={STATUS_RECEBER} />
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* ══════════════════════════════════════════════
          ÚLTIMAS CONTAS A PAGAR (full-width)
          ══════════════════════════════════════════════ */}
      <SectionCard
        title="Contas a pagar recentes"
        icon={Icons.trendingDown}
        empty={
          dados.ultimasPagar.length === 0
            ? "Nenhuma conta a pagar cadastrada."
            : null
        }
      >
        <ul style={S.list}>
          {dados.ultimasPagar.map((c, i) => (
            <li
              key={c.id || i}
              style={{
                ...S.row,
                borderBottom:
                  i < dados.ultimasPagar.length - 1
                    ? "1px solid #f1f5f9"
                    : "none",
              }}
            >
              <div style={{ ...S.rowCell, flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={S.cellTextBold}>{c.descricao}</span>
                  <span style={S.cellSub}>
                    {fmtDataCurta(c.data_vencimento)} ·{" "}
                    {c.fornecedor || c.categoria || "—"}
                  </span>
                </div>
              </div>
              <span
                style={{
                  ...S.cellTextBold,
                  color: "#dc2626",
                  minWidth: "90px",
                  textAlign: "right",
                }}
              >
                {fmt(c.valor)}
              </span>
              <StatusBadge status={c.status} config={STATUS_PAGAR} />
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

export default FinanceiroDashboard;
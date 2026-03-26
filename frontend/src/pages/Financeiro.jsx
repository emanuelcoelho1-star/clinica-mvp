import { useState } from "react";
import FinanceiroDashboard from "../components/financeiro/FinanceiroDashboard";
import ContasPagar from "../components/financeiro/ContasPagar";
import ContasReceber from "../components/financeiro/ContasReceber";
import FluxoCaixa from "../components/financeiro/FluxoCaixa";
import Inadimplencia from "../components/financeiro/Inadimplencia";
import Comissoes from "../components/financeiro/Comissoes";

/* ═══════════════════════════════════════════════════════════
   ABAS
   ═══════════════════════════════════════════════════════════ */
const ABAS = [
  { id: "dashboard",     label: "Visão geral" },
  { id: "receber",       label: "Contas a receber" },
  { id: "pagar",         label: "Contas a pagar" },
  { id: "fluxo",         label: "Fluxo de caixa" },
  { id: "inadimplencia", label: "Inadimplência" },
  { id: "comissoes",     label: "Comissões" },
];

/* ═══════════════════════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   ═══════════════════════════════════════════════════════════ */
const S = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
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
  headerSub: {
    margin: 0,
    fontSize: "14px",
    color: "#94a3b8",
    fontWeight: "400",
  },
  tabsBar: {
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
};

/* ═══════════════════════════════════════════════════════════
   ICON — inline SVG (Lucide LayoutDashboard)
   ═══════════════════════════════════════════════════════════ */
const FinanceiroIcon = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
function Financeiro() {
  const [aba, setAba] = useState("dashboard");
  const [hoveredTab, setHoveredTab] = useState(null);

  /* ── Render do conteúdo ativo ─────────────────────── */
  const renderConteudo = () => {
    switch (aba) {
      case "dashboard":     return <FinanceiroDashboard />;
      case "receber":       return <ContasReceber />;
      case "pagar":         return <ContasPagar />;
      case "fluxo":         return <FluxoCaixa />;
      case "inadimplencia": return <Inadimplencia />;
      case "comissoes":     return <Comissoes />;
      default:              return <FinanceiroDashboard />;
    }
  };

  return (
    <div style={S.page}>

      {/* ══════════════════════════════════════════════════
          HEADER (padrão Pacientes / Dashboard)
          ══════════════════════════════════════════════════ */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerTitleRow}>
            {FinanceiroIcon}
            <h1 style={S.headerTitle}>Financeiro</h1>
          </div>
          <p style={S.headerSub}>
            Gerencie receitas, despesas, fluxo de caixa e comissões
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TABS (padrão Prontuário — borderBottom 2px)
          ══════════════════════════════════════════════════ */}
      <div style={S.tabsBar}>
        {ABAS.map((a) => {
          const ativa = aba === a.id;
          const hovered = hoveredTab === a.id;

          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              onMouseEnter={() => setHoveredTab(a.id)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                ...S.tab,
                color: ativa
                  ? "#2563eb"
                  : hovered
                    ? "#0f172a"
                    : "#64748b",
                borderBottomColor: ativa
                  ? "#2563eb"
                  : "transparent",
                background: ativa
                  ? "rgba(37, 99, 235, 0.04)"
                  : hovered
                    ? "#fafbfc"
                    : "transparent",
              }}
            >
              {a.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════
          CONTEÚDO DA ABA ATIVA
          ══════════════════════════════════════════════════ */}
      {renderConteudo()}
    </div>
  );
}

export default Financeiro;
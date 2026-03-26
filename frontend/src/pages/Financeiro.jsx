import { useState, useEffect } from "react";
import { Icons, S, MESES } from "../components/financeiro/FinanceiroHelpers";
import FinanceiroDashboard from "../components/financeiro/FinanceiroDashboard";
import ContasPagar from "../components/financeiro/ContasPagar";
import ContasReceber from "../components/financeiro/ContasReceber";
import FluxoCaixa from "../components/financeiro/FluxoCaixa";
import Inadimplencia from "../components/financeiro/Inadimplencia";
import Comissoes from "../components/financeiro/Comissoes";

const ABAS = [
  { id: "dashboard", label: "Dashboard", icon: Icons.dashboard },
  { id: "pagar", label: "Contas a Pagar", icon: Icons.pagar },
  { id: "receber", label: "Contas a Receber", icon: Icons.receber },
  { id: "fluxo", label: "Fluxo de Caixa", icon: Icons.fluxo },
  { id: "inadimplencia", label: "Inadimplência", icon: Icons.inadimplencia },
  { id: "comissoes", label: "Comissões", icon: Icons.comissoes },
];

export default function Financeiro() {
  const [abaAtiva, setAbaAtiva] = useState("dashboard");
  const [hoveredTab, setHoveredTab] = useState(null);

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  // Gerar lista de anos (atual -2 até atual +1)
  const anos = [];
  for (let a = now.getFullYear() - 2; a <= now.getFullYear() + 1; a++) {
    anos.push(a);
  }

  function renderAba() {
    const props = { mes, ano };

    switch (abaAtiva) {
      case "dashboard":
        return <FinanceiroDashboard {...props} />;
      case "pagar":
        return <ContasPagar {...props} />;
      case "receber":
        return <ContasReceber {...props} />;
      case "fluxo":
        return <FluxoCaixa {...props} />;
      case "inadimplencia":
        return <Inadimplencia {...props} />;
      case "comissoes":
        return <Comissoes {...props} />;
      default:
        return <FinanceiroDashboard {...props} />;
    }
  }

  return (
    <div style={{ padding: "0 8px" }}>
      {/* ── Header ─────────────────────────────── */}
      <div style={S.pageHeader}>
        <div>
          <h1 style={S.pageTitle}>💰 Gestão Financeira</h1>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 0 0" }}>
            Controle completo das finanças da sua clínica
          </p>
        </div>

        {/* Seletor de Período */}
        <div style={S.periodSelector}>
          <span style={{ color: "#94a3b8", display: "flex", alignItems: "center" }}>
            {Icons.calendar}
          </span>
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
            style={S.select}
          >
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value))}
            style={S.select}
          >
            {anos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Abas ───────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={S.tabsContainer}>
          {ABAS.map((aba) => {
            const isActive = abaAtiva === aba.id;
            const isHovered = hoveredTab === aba.id;
            return (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                onMouseEnter={() => setHoveredTab(aba.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  ...S.tab,
                  ...(isActive ? S.tabActive : {}),
                  ...(!isActive && isHovered ? S.tabHover : {}),
                }}
              >
                {aba.icon}
                {aba.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Conteúdo da Aba ────────────────────── */}
      {renderAba()}
    </div>
  );
}
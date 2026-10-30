import { useCallback, useEffect, useState } from "react";
import Retornos from "../components/relacionamento/Retornos";
import Inativos from "../components/relacionamento/Inativos";
import Aniversariantes from "../components/relacionamento/Aniversariantes";
import { api } from "../components/relacionamento/relacionamento";

/* ═══════════════════════════════════════════════════════════
   ABAS
   ═══════════════════════════════════════════════════════════ */
const ABAS = [
  { id: "retornos",        label: "Retornos" },
  { id: "inativos",        label: "Pacientes inativos" },
  { id: "aniversariantes", label: "Aniversariantes" },
];

const RelacionamentoIcon = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
function Relacionamento() {
  const [aba, setAba] = useState("retornos");
  const [hoveredTab, setHoveredTab] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [nomeClinica, setNomeClinica] = useState("");

  const carregarResumo = useCallback(() => {
    api("/relacionamento/resumo").then(setResumo).catch(() => setResumo(null));
  }, []);

  useEffect(() => { carregarResumo(); }, [carregarResumo]);

  // Nome usado nas mensagens de WhatsApp ("Aqui é da …")
  useEffect(() => {
    api("/clinica").then((d) => setNomeClinica(d?.clinica?.nome_fantasia || d?.clinica?.nome || "")).catch(() => setNomeClinica(""));
  }, []);

  const indicadores = [
    { label: "Retornos atrasados", valor: resumo?.retornos_atrasados, aba: "retornos", cor: "#dc2626", bg: "#fef2f2", borda: "#fecaca" },
    { label: "Retornos nos próximos 7 dias", valor: resumo?.retornos_proximos_7_dias, aba: "retornos", cor: "#c2410c", bg: "#fff7ed", borda: "#fed7aa" },
    { label: "Inativos há +6 meses", valor: resumo?.inativos, aba: "inativos", cor: "#7c3aed", bg: "#faf5ff", borda: "#ddd6fe" },
    { label: "Aniversariantes hoje", valor: resumo?.aniversariantes_hoje, aba: "aniversariantes", cor: "#15803d", bg: "#f0fdf4", borda: "#bbf7d0" },
  ];

  const renderConteudo = () => {
    switch (aba) {
      case "inativos":        return <Inativos onAlterado={carregarResumo} clinica={nomeClinica} />;
      case "aniversariantes": return <Aniversariantes onAlterado={carregarResumo} clinica={nomeClinica} />;
      default:                return <Retornos onAlterado={carregarResumo} clinica={nomeClinica} />;
    }
  };

  return (
    <div style={S.page}>
      <style>{`
        @media (max-width: 768px) {
          .rel-linha { grid-template-columns: 1fr !important; gap: 8px !important; }
          .rel-linha > :last-child { justify-content: flex-start !important; }
        }
      `}</style>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerTitleRow}>
            {RelacionamentoIcon}
            <h1 style={S.headerTitle}>Relacionamento</h1>
          </div>
          <p style={S.headerSub}>Retornos, reativação de pacientes e datas especiais</p>
        </div>
      </div>

      <div style={S.indicadores}>
        {indicadores.map((i) => (
          <button key={i.label} type="button" onClick={() => setAba(i.aba)}
            style={{ ...S.indicador, background: i.bg, borderColor: i.borda }}>
            <span style={{ ...S.indicadorValor, color: i.cor }}>{i.valor ?? "–"}</span>
            <span style={S.indicadorLabel}>{i.label}</span>
          </button>
        ))}
      </div>

      <div style={S.tabsBar}>
        {ABAS.map((a) => {
          const ativa = aba === a.id;
          const hovered = hoveredTab === a.id;
          return (
            <button key={a.id} type="button" onClick={() => setAba(a.id)}
              onMouseEnter={() => setHoveredTab(a.id)} onMouseLeave={() => setHoveredTab(null)}
              style={{
                ...S.tab,
                color: ativa ? "#2563eb" : hovered ? "#0f172a" : "#64748b",
                borderBottomColor: ativa ? "#2563eb" : "transparent",
                background: ativa ? "rgba(37, 99, 235, 0.04)" : hovered ? "#fafbfc" : "transparent",
              }}>
              {a.label}
            </button>
          );
        })}
      </div>

      {renderConteudo()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const S = {
  page: { display: "flex", flexDirection: "column", gap: "24px" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" },
  headerLeft: { display: "flex", flexDirection: "column", gap: "4px" },
  headerTitleRow: { display: "flex", alignItems: "center", gap: "12px" },
  headerTitle: { margin: 0, fontSize: "28px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.025em", lineHeight: 1.2 },
  headerSub: { margin: 0, fontSize: "14px", color: "#94a3b8", fontWeight: "400" },
  indicadores: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" },
  indicador: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", padding: "14px 16px", borderRadius: "14px", border: "1px solid", cursor: "pointer", textAlign: "left", fontFamily: "inherit" },
  indicadorValor: { fontSize: "26px", fontWeight: "800", lineHeight: 1 },
  indicadorLabel: { fontSize: "13px", fontWeight: "600", color: "#475569" },
  tabsBar: { display: "flex", overflowX: "auto", background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9" },
  tab: { background: "none", border: "none", borderBottom: "2px solid transparent", padding: "14px 16px", fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap", fontFamily: "inherit" },
};

export default Relacionamento;

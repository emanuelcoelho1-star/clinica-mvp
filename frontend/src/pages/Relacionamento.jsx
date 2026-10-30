import { useCallback, useEffect, useState } from "react";
import Retornos from "../components/relacionamento/Retornos";
import Inativos from "../components/relacionamento/Inativos";
import Aniversariantes from "../components/relacionamento/Aniversariantes";
import { api } from "../components/relacionamento/relacionamento";
import FaixaIndicadores from "../components/FaixaIndicadores";

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

  // Cor só onde há ação pendente (DESIGN.md §7); clicar abre a aba correspondente
  const n = (v) => (v ?? "–");
  const indicadores = [
    { rotulo: "Retornos atrasados", valor: n(resumo?.retornos_atrasados), tom: resumo?.retornos_atrasados > 0 ? "perigo" : undefined, onClick: () => setAba("retornos") },
    { rotulo: "Retornos em 7 dias", valor: n(resumo?.retornos_proximos_7_dias), tom: resumo?.retornos_proximos_7_dias > 0 ? "alerta" : undefined, onClick: () => setAba("retornos") },
    { rotulo: "Sem consulta há 6 meses", valor: n(resumo?.inativos), onClick: () => setAba("inativos") },
    { rotulo: "Aniversariantes hoje", valor: n(resumo?.aniversariantes_hoje), onClick: () => setAba("aniversariantes") },
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

      <FaixaIndicadores rotulo="Resumo do relacionamento" itens={indicadores} />

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
  headerSub: { margin: 0, fontSize: "14px", color: "#64748b", fontWeight: "400" },
  tabsBar: { display: "flex", overflowX: "auto", background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9" },
  tab: { background: "none", border: "none", borderBottom: "2px solid transparent", padding: "14px 16px", fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap", fontFamily: "inherit" },
};

export default Relacionamento;

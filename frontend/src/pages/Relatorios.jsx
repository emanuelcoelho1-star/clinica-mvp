import { useEffect, useMemo, useState } from "react";
import { api, hojeISO, adicionarMesesISO, S as R } from "../components/relacionamento/relacionamento";
import { Segmentado, Vazio, Carregando } from "../components/relacionamento/comum";
import FaixaIndicadores from "../components/FaixaIndicadores";

/* ═══════════════════════════════════════════════════════════
   RELATÓRIOS
   Faltas, conversão de orçamentos, ticket médio e de onde vêm
   os pacientes que fecham. Números vêm de /relatorios.
   ═══════════════════════════════════════════════════════════ */
const moeda = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v) => (v === null || v === undefined ? "–" : `${String(v).replace(".", ",")}%`);

function intervalo(preset) {
  const hoje = hojeISO();
  const [a, m] = hoje.split("-").map(Number);
  const primeiro = (ano, mes) => `${ano}-${String(mes).padStart(2, "0")}-01`;
  if (preset === "mes") return { inicio: primeiro(a, m), fim: hoje };
  if (preset === "anterior") {
    const ini = adicionarMesesISO(primeiro(a, m), -1);
    const ultimo = new Date(a, m - 1, 0);
    return { inicio: ini, fim: `${ultimo.getFullYear()}-${String(ultimo.getMonth() + 1).padStart(2, "0")}-${String(ultimo.getDate()).padStart(2, "0")}` };
  }
  if (preset === "90") return { inicio: adicionarMesesISO(hoje, -3), fim: hoje };
  return { inicio: adicionarMesesISO(hoje, -12), fim: hoje };
}

const PRESETS = [
  { value: "mes", label: "Este mês" },
  { value: "anterior", label: "Mês passado" },
  { value: "90", label: "3 meses" },
  { value: "12", label: "12 meses" },
];

/* Tabela enxuta: rótulo, barra proporcional à maior linha e colunas numéricas */
function Tabela({ titulo, nota, colunas, linhas, chaveBarra }) {
  const max = Math.max(1, ...linhas.map((l) => Number(l[chaveBarra]) || 0));
  return (
    <section style={R.card}>
      <div style={S.secHead}>
        <h2 style={S.secTitulo}>{titulo}</h2>
        {nota && <span style={R.sub}>{nota}</span>}
      </div>
      {linhas.length === 0 ? <Vazio titulo="Sem dados no período" /> : (
        <div style={{ overflowX: "auto" }}>
          <table style={S.tabela}>
            <thead>
              <tr>{colunas.map((c, i) => <th key={c.rotulo} style={{ ...S.th, textAlign: i === 0 ? "left" : "right" }}>{c.rotulo}</th>)}</tr>
            </thead>
            <tbody>
              {linhas.map((l, idx) => (
                <tr key={idx}>
                  {colunas.map((c, i) => (
                    <td key={c.rotulo} style={{ ...S.td, textAlign: i === 0 ? "left" : "right" }}>
                      {i === 0 ? (
                        <div style={S.rotuloCel}>
                          <span>{l[c.chave]}</span>
                          <span style={S.trilha}><span style={{ ...S.barra, width: `${((Number(l[chaveBarra]) || 0) / max) * 100}%` }} /></span>
                        </div>
                      ) : (c.fmt ? c.fmt(l[c.chave]) : l[c.chave] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Relatorios() {
  const [preset, setPreset] = useState("mes");
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const periodo = useMemo(() => intervalo(preset), [preset]);

  useEffect(() => {
    let ativo = true;
    api(`/relatorios?inicio=${periodo.inicio}&fim=${periodo.fim}`)
      .then((d) => { if (ativo) { setDados(d); setErro(""); } })
      .catch((e) => { if (ativo) setErro(e.message); });
    return () => { ativo = false; };
  }, [periodo]);

  const c = dados?.consultas;
  const o = dados?.orcamentos;
  const indicadores = [
    { rotulo: "Taxa de faltas", valor: pct(c?.taxa_faltas), detalhe: !c ? "" : c.concluidas + c.faltas ? `${c.faltas} de ${c.concluidas + c.faltas} atendimentos` : "sem atendimentos no período", tom: c?.taxa_faltas >= 15 ? "perigo" : undefined },
    { rotulo: "Conversão de orçamentos", valor: pct(o?.conversao), detalhe: o ? `${o.aprovados} de ${o.criados} aprovados` : "" },
    { rotulo: "Ticket médio", valor: o?.ticket_medio ? moeda(o.ticket_medio) : "–", detalhe: "por orçamento aprovado" },
    { rotulo: "Receita recebida", valor: dados ? moeda(dados.receita_recebida) : "–", detalhe: "contas pagas no período" },
  ];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.titulo}>Relatórios</h1>
          <p style={S.sub}>
            {dados ? `De ${dados.periodo.inicio.split("-").reverse().join("/")} a ${dados.periodo.fim.split("-").reverse().join("/")}` : "Carregando período"}
          </p>
        </div>
        <Segmentado opcoes={PRESETS} valor={preset} onChange={setPreset} />
      </div>

      {erro && <div style={R.formErro}>{erro}</div>}
      {!dados ? <Carregando /> : (
        <>
          <FaixaIndicadores rotulo="Indicadores do período" itens={indicadores} />

          <div style={S.grid}>
            <Tabela titulo="Orçamentos por origem do paciente" nota="Campo “Como conheceu” do cadastro"
              chaveBarra="valor_aprovado" linhas={dados.por_origem}
              colunas={[
                { rotulo: "Origem", chave: "origem" },
                { rotulo: "Orçados", chave: "criados" },
                { rotulo: "Aprovados", chave: "aprovados" },
                { rotulo: "Valor aprovado", chave: "valor_aprovado", fmt: moeda },
              ]} />

            <Tabela titulo="Agenda por profissional" chaveBarra="total" linhas={dados.por_profissional}
              colunas={[
                { rotulo: "Profissional", chave: "nome" },
                { rotulo: "Consultas", chave: "total" },
                { rotulo: "Concluídas", chave: "concluidas" },
                { rotulo: "Faltas", chave: "faltas" },
                { rotulo: "Taxa de faltas", chave: "taxa_faltas", fmt: pct },
              ]} />

            <Tabela titulo="Procedimentos aprovados" nota="Top 8 por valor, antes do desconto" chaveBarra="valor" linhas={dados.procedimentos_aprovados}
              colunas={[
                { rotulo: "Procedimento", chave: "procedimento" },
                { rotulo: "Vezes", chave: "vezes" },
                { rotulo: "Valor", chave: "valor", fmt: moeda },
              ]} />

            <Tabela titulo="Por que recusaram" nota="Registrado ao marcar recusa no funil" chaveBarra="total" linhas={dados.motivos_recusa}
              colunas={[
                { rotulo: "Motivo", chave: "motivo" },
                { rotulo: "Orçamentos", chave: "total" },
              ]} />
          </div>
        </>
      )}
    </div>
  );
}

const S = {
  page: { display: "flex", flexDirection: "column", gap: "24px" },
  header: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" },
  titulo: { margin: 0, fontSize: "28px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.025em", lineHeight: 1.2 },
  sub: { margin: "4px 0 0", fontSize: "14px", color: "#64748b" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: "20px", alignItems: "start" },
  secHead: { display: "flex", flexDirection: "column", gap: "2px", padding: "16px 18px", borderBottom: "1px solid #f1f5f9" },
  secTitulo: { margin: 0, fontSize: "15px", fontWeight: "700", color: "#0f172a" },
  tabela: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { padding: "10px 18px", fontSize: "12px", fontWeight: "600", color: "#64748b", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" },
  td: { padding: "10px 18px", color: "#334155", borderBottom: "1px solid #f8fafc", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
  rotuloCel: { display: "flex", flexDirection: "column", gap: "6px", minWidth: "120px", whiteSpace: "normal", fontWeight: 600, color: "#0f172a" },
  trilha: { display: "block", height: "4px", borderRadius: "2px", background: "#f1f5f9", overflow: "hidden" },
  barra: { display: "block", height: "100%", background: "#2563eb", borderRadius: "2px" },
};

export default Relatorios;

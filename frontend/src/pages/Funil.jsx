import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatarData, S as R } from "../components/relacionamento/relacionamento";
import { Segmentado, Vazio, Carregando } from "../components/relacionamento/comum";
import FaixaIndicadores from "../components/FaixaIndicadores";
import ModalWhatsApp from "../components/ModalWhatsApp";
import { WhatsAppIcon } from "../components/iconeWhatsApp";
import { mensagemOrcamento, telefoneWhatsApp } from "../utils/whatsapp";

/* ═══════════════════════════════════════════════════════════
   FUNIL DE ORÇAMENTOS
   Cada orçamento do "orçado" ao "concluído"; o que está parado
   sem contato aparece primeiro.
   ═══════════════════════════════════════════════════════════ */
const ETAPAS = [
  { value: "pendente",     label: "Em negociação" },
  { value: "aprovado",     label: "Aprovados" },
  { value: "em_andamento", label: "Em tratamento" },
  { value: "concluido",    label: "Concluídos" },
  { value: "recusado",     label: "Recusados" },
];
const FECHADOS = ["aprovado", "em_andamento", "concluido"];
const DIAS_PARADO = 7;
const MOTIVOS = ["Preço", "Vai pensar", "Fechou em outra clínica", "Sem condições no momento", "Não respondeu"];

const moeda = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function textoContato(o) {
  const dias = `${o.dias_sem_contato} ${o.dias_sem_contato === 1 ? "dia" : "dias"}`;
  if (!o.ultimo_contato_em) return o.dias_sem_contato > 0 ? `Sem contato há ${dias}` : "Orçado hoje";
  return o.dias_sem_contato > 0 ? `Último contato há ${dias}` : "Contato feito hoje";
}

function Funil() {
  const navigate = useNavigate();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [etapa, setEtapa] = useState("pendente");
  const [nomeClinica, setNomeClinica] = useState("");
  const [whats, setWhats] = useState(null);
  const [recusando, setRecusando] = useState(null);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [salvando, setSalvando] = useState(null);

  const carregar = useCallback(() => {
    api("/funil").then((d) => { setLista(d); setErro(""); }).catch((e) => { setLista([]); setErro(e.message); });
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    api("/clinica").then((d) => setNomeClinica(d?.clinica?.nome_fantasia || d?.clinica?.nome || "")).catch(() => setNomeClinica(""));
  }, []);

  const contagem = useMemo(() => {
    const c = {};
    for (const o of lista || []) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [lista]);

  const indicadores = useMemo(() => {
    const todos = lista || [];
    const abertos = todos.filter((o) => o.status === "pendente");
    const parados = abertos.filter((o) => o.dias_sem_contato >= DIAS_PARADO);
    // Conversão só sobre o que já teve desfecho, para não punir orçamento feito ontem
    const fechados = todos.filter((o) => FECHADOS.includes(o.status));
    const decididos = fechados.length + todos.filter((o) => o.status === "recusado").length;
    return [
      { rotulo: "Em negociação", valor: abertos.length, detalhe: moeda(abertos.reduce((s, o) => s + o.total, 0)), onClick: () => setEtapa("pendente") },
      { rotulo: `Sem contato há ${DIAS_PARADO}+ dias`, valor: parados.length, tom: parados.length > 0 ? "alerta" : undefined, detalhe: "pedem follow-up", onClick: () => setEtapa("pendente") },
      { rotulo: "Fechados", valor: moeda(fechados.reduce((s, o) => s + o.total, 0)), detalhe: `${fechados.length} ${fechados.length === 1 ? "orçamento" : "orçamentos"}`, onClick: () => setEtapa("aprovado") },
      { rotulo: "Taxa de fechamento", valor: decididos ? `${Math.round((fechados.length / decididos) * 100)}%` : "–", detalhe: "entre aprovados e recusados" },
    ];
  }, [lista]);

  const visiveis = useMemo(() => {
    const l = (lista || []).filter((o) => o.status === etapa);
    return etapa === "pendente" ? [...l].sort((a, b) => b.dias_sem_contato - a.dias_sem_contato) : l;
  }, [lista, etapa]);

  async function mudarStatus(o, status) {
    setSalvando(o.id);
    try {
      const r = await api(`/orcamentos/${o.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      if (r?.aviso) setErro(`Status atualizado, mas houve um aviso: ${r.aviso}`);
      carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(null);
    }
  }

  async function confirmarRecusa(o) {
    setSalvando(o.id);
    try {
      await api(`/funil/${o.id}/recusa`, { method: "PATCH", body: JSON.stringify({ motivo }) });
      setRecusando(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(null);
    }
  }

  function registrarContato(o) {
    api(`/funil/${o.id}/contato`, { method: "PATCH" }).then(carregar).catch((e) => setErro(e.message));
  }

  return (
    <div style={S.page}>
      <style>{`
        @media (max-width: 768px) {
          .funil-linha { grid-template-columns: 1fr !important; gap: 8px !important; }
          .funil-linha > :last-child { justify-content: flex-start !important; }
        }
      `}</style>
      <div>
        <h1 style={S.titulo}>Orçamentos</h1>
        <p style={S.sub}>Do orçamento entregue ao tratamento concluído. Os parados há mais tempo aparecem primeiro.</p>
      </div>

      <FaixaIndicadores rotulo="Resumo do funil" itens={indicadores} />

      <div style={R.card}>
        <div style={R.toolbar}>
          <Segmentado valor={etapa} onChange={setEtapa}
            opcoes={ETAPAS.map((e) => ({ ...e, count: contagem[e.value] || 0 }))} />
        </div>
        {erro && <div style={R.erro}>{erro}</div>}

        {lista === null ? <Carregando /> : visiveis.length === 0 ? (
          <Vazio titulo="Nada nesta etapa"
            texto={etapa === "pendente" ? "Orçamentos criados no prontuário do paciente aparecem aqui até serem aprovados ou recusados." : "Fechados e recusados ficam visíveis por 90 dias."} />
        ) : (
          <div style={R.lista}>
            {visiveis.map((o) => {
              const parado = o.status === "pendente" && o.dias_sem_contato >= DIAS_PARADO;
              const ocupado = salvando === o.id;
              return (
                <div key={o.id} className="funil-linha" style={{ ...R.linha, gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr) auto" }}>
                  <div style={R.col}>
                    <span style={R.nome} onClick={() => navigate(`/pacientes/${o.paciente_id}`)}>{o.paciente_nome}</span>
                    <span style={R.sub}>{o.procedimentos || "Sem procedimentos"}</span>
                  </div>
                  <div style={R.col}>
                    <span style={{ ...R.valor, fontVariantNumeric: "tabular-nums" }}>{moeda(o.total)}</span>
                    {o.status === "pendente" ? (
                      <span style={{ ...R.sub, color: parado ? "#c2410c" : undefined, fontWeight: parado ? 600 : undefined }}>{textoContato(o)}</span>
                    ) : o.status === "recusado" ? (
                      <span style={R.sub}>{o.motivo_recusa || "Sem motivo registrado"}</span>
                    ) : (
                      <span style={R.sub}>Orçado em {formatarData(o.data)}</span>
                    )}
                  </div>

                  <div style={R.acoes}>
                    {o.status === "pendente" && recusando === o.id ? (
                      <>
                        <select style={R.select} value={motivo} onChange={(e) => setMotivo(e.target.value)} aria-label="Motivo da recusa">
                          {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
                        </select>
                        <button type="button" style={R.btnNeutro} onClick={() => setRecusando(null)}>Voltar</button>
                        <button type="button" disabled={ocupado} style={{ ...R.btnNeutro, color: "#b91c1c", ...(ocupado ? R.disabled : {}) }} onClick={() => confirmarRecusa(o)}>Confirmar recusa</button>
                      </>
                    ) : o.status === "pendente" ? (
                      <>
                        <button type="button" style={{ ...R.btnWhats, ...(telefoneWhatsApp(o.paciente_telefone) ? {} : R.disabled) }}
                          disabled={!telefoneWhatsApp(o.paciente_telefone)} title={telefoneWhatsApp(o.paciente_telefone) ? "" : "Paciente sem telefone válido"}
                          onClick={() => setWhats(o)}>
                          {WhatsAppIcon} Follow-up
                        </button>
                        <button type="button" style={R.btnNeutro} onClick={() => { setRecusando(o.id); setMotivo(MOTIVOS[0]); }}>Recusado</button>
                        <button type="button" disabled={ocupado} style={{ ...R.btnAcao, ...(ocupado ? R.disabled : {}) }} onClick={() => mudarStatus(o, "aprovado")}>Aprovar</button>
                      </>
                    ) : o.status === "aprovado" ? (
                      <button type="button" disabled={ocupado} style={{ ...R.btnAcao, ...(ocupado ? R.disabled : {}) }} onClick={() => mudarStatus(o, "em_andamento")}>Iniciar tratamento</button>
                    ) : o.status === "em_andamento" ? (
                      <button type="button" disabled={ocupado} style={{ ...R.btnAcao, ...(ocupado ? R.disabled : {}) }} onClick={() => mudarStatus(o, "concluido")}>Concluir</button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {whats && (
        <ModalWhatsApp
          titulo="Follow-up do orçamento"
          paciente={whats.paciente_nome}
          telefone={whats.paciente_telefone}
          mensagemInicial={mensagemOrcamento({ paciente: whats.paciente_nome, procedimentos: whats.procedimentos, clinica: nomeClinica })}
          dica="Ao abrir o WhatsApp, o contato fica registrado e o orçamento sai da lista de parados."
          onEnviado={() => registrarContato(whats)}
          onFechar={() => setWhats(null)}
        />
      )}
    </div>
  );
}

const S = {
  page: { display: "flex", flexDirection: "column", gap: "24px" },
  titulo: { margin: 0, fontSize: "28px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.025em", lineHeight: 1.2 },
  sub: { margin: "4px 0 0", fontSize: "14px", color: "#64748b" },
};

export default Funil;

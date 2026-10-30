import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModalWhatsApp from "../ModalWhatsApp";
import { WhatsAppIcon } from "../iconeWhatsApp";
import { mensagemRetorno, telefoneWhatsApp } from "../../utils/whatsapp";
import {
  api, registrarContato, formatarData, formatarDataHora, hojeISO, adicionarMesesISO, linkAgendar, S,
} from "./relacionamento";
import { Segmentado, Vazio, Carregando } from "./comum";

const PERIODOS = [
  { value: "atrasados", label: "Atrasados" },
  { value: "semana", label: "Próximos 7 dias" },
  { value: "mes", label: "Próximos 30 dias" },
  { value: "todos", label: "Todos" },
];

const STATUS = [
  { value: "pendente", label: "Pendentes" },
  { value: "agendado", label: "Agendados" },
  { value: "concluido", label: "Concluídos" },
  { value: "cancelado", label: "Cancelados" },
];

const formVazio = () => ({ paciente_id: "", paciente_nome: "", data_prevista: adicionarMesesISO(hojeISO(), 6), motivo: "", profissional_id: "", observacoes: "" });

function prazo(dias) {
  if (dias < 0) return { texto: `${-dias} dia${dias === -1 ? "" : "s"} de atraso`, estilo: S.badgeVermelho };
  if (dias === 0) return { texto: "Hoje", estilo: S.badgeLaranja };
  if (dias <= 7) return { texto: `em ${dias} dia${dias === 1 ? "" : "s"}`, estilo: S.badgeLaranja };
  return { texto: `em ${dias} dias`, estilo: S.badgeCinza };
}

function Retornos({ onAlterado, clinica }) {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState("todos");
  const [status, setStatus] = useState("pendente");
  const [retornos, setRetornos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [whats, setWhats] = useState(null);
  const [modal, setModal] = useState(null); // null | { editando: retorno | null }
  const [excluir, setExcluir] = useState(null);

  async function carregar() {
    try {
      setCarregando(true); setErro("");
      setRetornos(await api(`/relacionamento/retornos?status=${status}&periodo=${status === "pendente" ? periodo : "todos"}`));
    } catch (e) { setErro(e.message); setRetornos([]); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, [periodo, status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function mudarStatus(r, novo) {
    try {
      await api(`/relacionamento/retornos/${r.id}/status`, { method: "PATCH", body: JSON.stringify({ status: novo }) });
      await carregar(); onAlterado?.();
    } catch (e) { setErro(e.message); }
  }

  async function confirmarExclusao() {
    try {
      await api(`/relacionamento/retornos/${excluir.id}`, { method: "DELETE" });
      setExcluir(null); await carregar(); onAlterado?.();
    } catch (e) { setErro(e.message); }
  }

  return (
    <div style={S.card}>
      <div style={S.toolbar}>
        <div style={S.toolbarGroup}>
          <Segmentado opcoes={STATUS} valor={status} onChange={setStatus} />
          {status === "pendente" && <Segmentado opcoes={PERIODOS} valor={periodo} onChange={setPeriodo} />}
        </div>
        <button type="button" style={S.btnPrimary} onClick={() => setModal({ editando: null })}>+ Novo retorno</button>
      </div>

      {erro && <div style={S.erro}>{erro}</div>}

      {carregando ? <Carregando /> : retornos.length === 0 ? (
        <Vazio titulo="Nenhum retorno por aqui"
          texto={status === "pendente" ? "Programe retornos ao concluir uma consulta na Agenda ou use “Novo retorno”." : "Altere o filtro para ver outros retornos."} />
      ) : (
        <div style={S.lista}>
          {retornos.map((r) => {
            const p = prazo(r.dias_para_retorno);
            const temTel = Boolean(telefoneWhatsApp(r.paciente_telefone));
            return (
              <div key={r.id} className="rel-linha" style={{ ...S.linha, gridTemplateColumns: "minmax(160px,1.4fr) minmax(130px,1fr) minmax(140px,1.2fr) minmax(250px,auto)" }}>
                <div style={S.col}>
                  <span style={S.nome} onClick={() => navigate(`/pacientes/${r.paciente_id}`)} title="Abrir prontuário">{r.paciente_nome}</span>
                  <span style={S.sub}>{r.paciente_telefone || "sem telefone"}</span>
                </div>
                <div style={S.col}>
                  <span style={S.valor}>{formatarData(r.data_prevista)}</span>
                  {r.status === "pendente" && <span style={{ ...S.badge, ...p.estilo }}>{p.texto}</span>}
                  {r.status === "agendado" && <span style={{ ...S.badge, ...S.badgeAzul }}>Agendado {r.consulta_data ? `p/ ${formatarData(r.consulta_data)} ${r.consulta_horario || ""}` : ""}</span>}
                  {r.status === "concluido" && <span style={{ ...S.badge, ...S.badgeVerde }}>Concluído</span>}
                  {r.status === "cancelado" && <span style={{ ...S.badge, ...S.badgeCinza }}>Cancelado</span>}
                </div>
                <div style={S.col}>
                  <span style={S.valor}>{r.motivo || "Retorno"}</span>
                  <span style={S.sub}>
                    {[r.profissional_nome, r.ultimo_contato_em ? `contato em ${formatarDataHora(r.ultimo_contato_em)}` : null].filter(Boolean).join(" · ") || "—"}
                  </span>
                </div>
                <div style={S.acoes}>
                  {r.status === "pendente" && (
                    <>
                      <button type="button" style={{ ...S.btnWhats, ...(!temTel ? S.disabled : {}) }} disabled={!temTel}
                        title={temTel ? "" : "Paciente sem telefone válido"} onClick={() => setWhats(r)}>
                        {WhatsAppIcon}<span>{r.ultimo_contato_em ? "Reenviar" : "Lembrar"}</span>
                      </button>
                      <button type="button" style={S.btnAcao} onClick={() => navigate(linkAgendar({
                        paciente_id: r.paciente_id, paciente_nome: r.paciente_nome, profissional_id: r.profissional_id,
                        procedimento: r.motivo ? `Retorno: ${r.motivo}` : "Retorno", retorno_id: r.id,
                      }))}>Agendar</button>
                      <button type="button" style={S.btnNeutro} onClick={() => setModal({ editando: r })}>Editar</button>
                      <button type="button" style={S.btnNeutro} title="Paciente não fará o retorno" onClick={() => mudarStatus(r, "cancelado")}>Cancelar</button>
                    </>
                  )}
                  {r.status === "agendado" && (
                    <button type="button" style={S.btnNeutro} onClick={() => navigate("/agenda")}>Ver na agenda</button>
                  )}
                  {(r.status === "cancelado" || r.status === "concluido") && (
                    <>
                      {r.status === "cancelado" && <button type="button" style={S.btnNeutro} onClick={() => mudarStatus(r, "pendente")}>Reabrir</button>}
                      <button type="button" style={{ ...S.btnNeutro, color: "#dc2626" }} onClick={() => setExcluir(r)}>Excluir</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {whats && (
        <ModalWhatsApp titulo="Lembrete de retorno" paciente={whats.paciente_nome} telefone={whats.paciente_telefone}
          mensagemInicial={mensagemRetorno({ paciente: whats.paciente_nome, motivo: whats.motivo, dataPrevista: whats.data_prevista, profissional: whats.profissional_nome, clinica })}
          onEnviado={async () => { try { await registrarContato(whats.paciente_id, "retorno", whats.id); await carregar(); } catch { /* registro informativo */ } }}
          onFechar={() => setWhats(null)} />
      )}

      {modal && (
        <ModalRetorno editando={modal.editando} onFechar={() => setModal(null)}
          onSalvo={async () => { setModal(null); await carregar(); onAlterado?.(); }} />
      )}

      {excluir && (
        <div style={S.overlay} onClick={() => setExcluir(null)}>
          <div style={{ ...S.modal, maxWidth: "400px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={S.modalTitle}>Excluir retorno?</h3>
            <p style={S.modalSub}>O retorno de {excluir.paciente_nome} e o histórico de lembretes dele serão removidos.</p>
            <div style={{ ...S.formAcoes, justifyContent: "center" }}>
              <button type="button" style={S.btnSecondary} onClick={() => setExcluir(null)}>Cancelar</button>
              <button type="button" style={S.btnDanger} onClick={confirmarExclusao}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL — novo / editar retorno
   ═══════════════════════════════════════════════════════════ */
function ModalRetorno({ editando, onFechar, onSalvo }) {
  const [form, setForm] = useState(editando ? {
    paciente_id: editando.paciente_id, paciente_nome: editando.paciente_nome, data_prevista: editando.data_prevista,
    motivo: editando.motivo || "", profissional_id: editando.profissional_id ? String(editando.profissional_id) : "", observacoes: editando.observacoes || "",
  } : formVazio());
  const [pacientes, setPacientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [busca, setBusca] = useState(editando?.paciente_nome || "");
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const buscaRef = useRef(null);

  useEffect(() => {
    api("/relacionamento/profissionais").then(setProfissionais).catch(() => setProfissionais([]));
  }, []);

  // GET /pacientes é paginado: busca no servidor conforme o texto digitado
  useEffect(() => {
    const t = busca.trim();
    if (editando || !t) { setPacientes([]); return; }
    const timer = setTimeout(() => {
      api(`/pacientes?busca=${encodeURIComponent(t)}&limit=10`)
        .then((d) => setPacientes(Array.isArray(d) ? d : d.dados || []))
        .catch(() => setPacientes([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [busca, editando]);

  useEffect(() => {
    function fora(e) { if (buscaRef.current && !buscaRef.current.contains(e.target)) setMostrarSugestoes(false); }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const sugestoes = useMemo(() => pacientes.slice(0, 6), [pacientes]);

  async function salvar(e) {
    e.preventDefault();
    if (!form.paciente_id || !form.data_prevista) { setErro("Selecione o paciente e a data prevista."); return; }
    try {
      setSalvando(true); setErro("");
      const corpo = { ...form, profissional_id: form.profissional_id ? Number(form.profissional_id) : null };
      if (editando) await api(`/relacionamento/retornos/${editando.id}`, { method: "PUT", body: JSON.stringify(corpo) });
      else await api("/relacionamento/retornos", { method: "POST", body: JSON.stringify(corpo) });
      onSalvo();
    } catch (err) { setErro(err.message); }
    finally { setSalvando(false); }
  }

  const hoje = hojeISO();

  return (
    <div style={S.overlay} onClick={onFechar}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={S.modalTitle}>{editando ? "Editar retorno" : "Novo retorno"}</h2>
        <p style={S.modalSub}>{editando ? editando.paciente_nome : "Defina quando o paciente deve voltar."}</p>

        <form onSubmit={salvar} style={S.form}>
          {!editando && (
            <div style={S.field} ref={buscaRef}>
              <label style={S.label}>Paciente</label>
              <input style={S.input} placeholder="Buscar por nome ou telefone..." value={busca}
                onChange={(e) => { setBusca(e.target.value); setMostrarSugestoes(true); setForm((f) => ({ ...f, paciente_id: "" })); }}
                onFocus={() => busca && setMostrarSugestoes(true)} />
              {mostrarSugestoes && busca.trim() && (
                <div style={S.sugestoes}>
                  {sugestoes.length === 0 ? <div style={{ ...S.sub, padding: "12px 14px" }}>Nenhum paciente encontrado</div> : sugestoes.map((p) => (
                    <button key={p.id} type="button" style={S.sugestao}
                      onClick={() => { setForm((f) => ({ ...f, paciente_id: p.id, paciente_nome: p.nome })); setBusca(p.nome); setMostrarSugestoes(false); }}>
                      <span style={{ ...S.valor, color: "#0f172a" }}>{p.nome}</span>
                      {p.telefone && <span style={S.sub}>{p.telefone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={S.field}>
            <label style={S.label}>Data prevista</label>
            <input type="date" style={S.input} value={form.data_prevista} onChange={(e) => setForm((f) => ({ ...f, data_prevista: e.target.value }))} />
            <div style={S.chips}>
              {[[1, "1 mês"], [3, "3 meses"], [6, "6 meses"], [12, "1 ano"]].map(([m, l]) => {
                const valor = adicionarMesesISO(hoje, m);
                return (
                  <button key={m} type="button" onClick={() => setForm((f) => ({ ...f, data_prevista: valor }))}
                    style={{ ...S.chip, ...(form.data_prevista === valor ? { borderColor: "#2563eb", background: "#eff6ff", color: "#1d4ed8" } : {}) }}>{l}</button>
                );
              })}
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>Motivo</label>
            <input style={S.input} placeholder="Ex: Manutenção ortodôntica, limpeza, revisão de implante..." value={form.motivo}
              onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))} />
          </div>

          <div style={S.field}>
            <label style={S.label}>Profissional</label>
            <select style={{ ...S.select, height: "40px" }} value={form.profissional_id} onChange={(e) => setForm((f) => ({ ...f, profissional_id: e.target.value }))}>
              <option value="">Sem profissional definido</option>
              {profissionais.map((p) => <option key={p.id} value={String(p.id)}>{p.nome}</option>)}
            </select>
          </div>

          <div style={S.field}>
            <label style={S.label}>Observações</label>
            <textarea rows={2} style={S.textarea} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
          </div>

          {erro && <div style={S.formErro}>{erro}</div>}

          <div style={S.formAcoes}>
            <div style={{ flex: 1 }} />
            <button type="button" style={S.btnSecondary} onClick={onFechar} disabled={salvando}>Cancelar</button>
            <button type="submit" style={S.btnPrimary} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Retornos;

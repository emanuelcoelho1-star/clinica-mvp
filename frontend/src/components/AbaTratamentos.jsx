import { useEffect, useState } from "react";
import API_URL from "../api";

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function formatarDataBR(iso) {
  if (!iso) return "—";
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function dataHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatarValor(v) {
  if (!v && v !== 0) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ═══════════════════════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════════════════ */
const STATUS_OPTIONS = [
  { value: "em_andamento", label: "Em andamento", bg: "#eff6ff", color: "#2563eb", border: "#dbeafe" },
  { value: "concluido", label: "Concluído", bg: "#f0fdf4", color: "#15803d", border: "#dcfce7" },
  { value: "cancelado", label: "Cancelado", bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  { value: "pausado", label: "Pausado", bg: "#fefce8", color: "#ca8a04", border: "#fef08a" },
  { value: "planejado", label: "Planejado", bg: "#f8fafc", color: "#64748b", border: "#f1f5f9" },
];

function getStatusConfig(status) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
}

/* ═══════════════════════════════════════════════════════════
   FORM SECTIONS CONFIG
   ═══════════════════════════════════════════════════════════ */
const FORM_SECTIONS = [
  {
    title: "Procedimento",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
      </svg>
    ),
    fields: [
      { name: "procedimento", label: "Procedimento *", type: "text", placeholder: "Ex: Implante, Canal, Ortodontia, Prótese..." },
      { name: "dente", label: "Dente / Região", type: "text", placeholder: "Ex: 18, 36, Arcada superior..." },
    ],
  },
  {
    title: "Valores",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" x2="12" y1="2" y2="22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    fields: [
      { name: "valor", label: "Valor do tratamento (R$)", type: "number", placeholder: "0,00" },
    ],
  },
  {
    title: "Descrição clínica",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    ),
    fields: [
      { name: "descricao", label: "Descrição detalhada", type: "textarea", placeholder: "Descreva o plano de tratamento, etapas, materiais..." },
    ],
  },
  {
    title: "Informações adicionais",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    fields: [
      { name: "profissional", label: "Profissional responsável", type: "text", placeholder: "Nome do profissional..." },
      { name: "observacoes", label: "Observações", type: "textarea", placeholder: "Notas adicionais, retorno, cuidados..." },
    ],
  },
];

const EMPTY_FORM = {
  data_inicio: dataHojeISO(),
  data_fim: "",
  procedimento: "",
  dente: "",
  status: "em_andamento",
  valor: "",
  profissional: "",
  descricao: "",
  observacoes: "",
};

/* ═══════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════ */
const Icons = {
  arrowLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  plus: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  ),
  eye: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  ),
  clipboard: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  ),
  alertTriangle: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  tooth: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5.5c-1.5-2-3.5-2.5-5-2.5A4.5 4.5 0 0 0 2.5 7.5c0 3.5 2 5 3.5 8s1.5 5.5 2.5 5.5 1-2.5 1.5-4c.5-1.5 1-2 2-2s1.5.5 2 2c.5 1.5.5 4 1.5 4s1-2.5 2.5-5.5 3.5-4.5 3.5-8A4.5 4.5 0 0 0 17 3c-1.5 0-3.5.5-5 2.5Z" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════
   COMPONENTE
   ═══════════════════════════════════════════════════════════ */
function AbaTratamentos({ pacienteId }) {
  const [tratamentos, setTratamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [tela, setTela] = useState("lista");
  const [editando, setEditando] = useState(null);
  const [detalhes, setDetalhes] = useState(null);

  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [finalizandoId, setFinalizandoId] = useState(null);
  const [modalFinalizar, setModalFinalizar] = useState(null);
  const [dadosFinalizacao, setDadosFinalizacao] = useState({ profissional: "", data: dataHojeISO(), evolucao: "" });
  const [imagensFinalizacao, setImagensFinalizacao] = useState([]);
  const [carregandoProfissional, setCarregandoProfissional] = useState(false);
  const [salvandoFinalizacao, setSalvandoFinalizacao] = useState(false);
  const [erroFinalizacao, setErroFinalizacao] = useState("");

  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  /* ── Carregar ────────────────────────────── */
  useEffect(() => {
    carregarTratamentos();
    const atualizarAposAprovacao = (evento) => {
      if (Number(evento.detail?.pacienteId) === Number(pacienteId)) carregarTratamentos();
    };
    window.addEventListener("orcamento-aprovado", atualizarAposAprovacao);
    return () => window.removeEventListener("orcamento-aprovado", atualizarAposAprovacao);
  }, [pacienteId]);

  async function carregarTratamentos() {
    try {
      setCarregando(true);
      setErro("");
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/tratamentos/paciente/${pacienteId}`, {
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setTratamentos(Array.isArray(data) ? data : []);
    } catch {
      setErro("Erro ao carregar tratamentos.");
    } finally {
      setCarregando(false);
    }
  }

  /* ── Abrir form ──────────────────────────── */
  function abrirFormNovo() {
    setEditando(null);
    setFormData({ ...EMPTY_FORM });
    setErroForm("");
    setTela("form");
  }

  function abrirFormEditar(item) {
    setEditando(item);
    setFormData({
      data_inicio: item.data_inicio || dataHojeISO(),
      data_fim: item.data_fim || "",
      procedimento: item.procedimento || "",
      dente: item.dente || "",
      status: item.status || "em_andamento",
      valor: item.valor || "",
      profissional: item.profissional || "",
      descricao: (item.descricao || "").startsWith("Gerado automaticamente a partir do orçamento #") ? "" : (item.descricao || ""),
      observacoes: (item.observacoes || "").startsWith("Quantidade aprovada:") ? "" : (item.observacoes || ""),
    });
    setErroForm("");
    setTela("form");
  }

  function abrirDetalhes(item) {
    setDetalhes(item);
    setTela("detalhes");
  }

  function voltarParaLista() {
    setTela("lista");
    setEditando(null);
    setDetalhes(null);
    setErroForm("");
  }

  /* ── Salvar ──────────────────────────────── */
  function handleInput(e) {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  }

  async function handleSalvar(e) {
    e.preventDefault();
    if (!formData.data_inicio) { setErroForm("A data de início é obrigatória."); return; }
    if (!formData.procedimento.trim()) { setErroForm("O procedimento é obrigatório."); return; }

    try {
      setSalvando(true);
      setErroForm("");
      const tk = localStorage.getItem("token");
      const ed = Boolean(editando);
      const body = {
        ...formData,
        paciente_id: Number(pacienteId),
        valor: formData.valor ? Number(formData.valor) : 0,
      };

      const r = await fetch(
        ed ? `${API_URL}/tratamentos/${editando.id}` : `${API_URL}/tratamentos`,
        {
          method: ed ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", Authorization: tk || "" },
          body: JSON.stringify(body),
        }
      );
      if (!r.ok) throw new Error();
      await carregarTratamentos();
      voltarParaLista();
    } catch {
      setErroForm("Não foi possível salvar o tratamento.");
    } finally {
      setSalvando(false);
    }
  }

  /* ── Excluir ─────────────────────────────── */
  async function handleExcluir() {
    if (!confirmarExclusao?.id) return;
    try {
      setExcluindo(true);
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/tratamentos/${confirmarExclusao.id}`, {
        method: "DELETE",
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      setConfirmarExclusao(null);
      await carregarTratamentos();
      if (tela !== "lista") voltarParaLista();
    } catch {
      setErro("Erro ao excluir tratamento.");
    } finally {
      setExcluindo(false);
    }
  }

  /* ── Modal de finalização ────────────────── */
  async function abrirModalFinalizar(item) {
    if (!item?.id || item.status === "concluido") return;
    setModalFinalizar(item);
    setDadosFinalizacao({ profissional: "", data: dataHojeISO(), evolucao: "" });
    setImagensFinalizacao([]);
    setErroFinalizacao("");
    setCarregandoProfissional(true);
    try {
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: tk || "" } });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setDadosFinalizacao((p) => ({ ...p, profissional: data.usuario?.nome || "" }));
    } catch {
      setErroFinalizacao("Não foi possível identificar o usuário conectado.");
    } finally {
      setCarregandoProfissional(false);
    }
  }

  function fecharModalFinalizar() {
    if (salvandoFinalizacao) return;
    setModalFinalizar(null);
    setImagensFinalizacao([]);
    setErroFinalizacao("");
  }

  async function handleFinalizar() {
    if (!modalFinalizar?.id || !dadosFinalizacao.profissional.trim() || !dadosFinalizacao.data || !dadosFinalizacao.evolucao.trim()) {
      setErroFinalizacao("Preencha o profissional, a data e a evolução clínica.");
      return;
    }

    const tk = localStorage.getItem("token");
    let evolucaoId = null;
    const arquivosEnviados = [];
    setSalvandoFinalizacao(true);
    setFinalizandoId(modalFinalizar.id);
    setErroFinalizacao("");

    try {
      const evolucaoResponse = await fetch(`${API_URL}/evolucoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: tk || "" },
        body: JSON.stringify({
          paciente_id: Number(pacienteId),
          data: dadosFinalizacao.data,
          procedimento: modalFinalizar.procedimento || "",
          dente: modalFinalizar.dente || "",
          descricao: dadosFinalizacao.evolucao.trim(),
          observacoes: "",
          profissional: dadosFinalizacao.profissional.trim(),
        }),
      });
      if (!evolucaoResponse.ok) throw new Error("Não foi possível registrar a evolução clínica.");
      const evolucaoCriada = await evolucaoResponse.json();
      evolucaoId = evolucaoCriada.id;

      for (const arquivo of imagensFinalizacao) {
        const form = new FormData();
        form.append("arquivo", arquivo);
        form.append("paciente_id", String(pacienteId));
        form.append("categoria", "evolucao");
        form.append("descricao", `Evolução do tratamento #${modalFinalizar.id} - ${dadosFinalizacao.data}`);
        const uploadResponse = await fetch(`${API_URL}/arquivos`, {
          method: "POST",
          headers: { Authorization: tk || "" },
          body: form,
        });
        if (!uploadResponse.ok) throw new Error("Não foi possível enviar uma das imagens. Verifique se você tem permissão para adicionar arquivos.");
        const arquivoCriado = await uploadResponse.json();
        arquivosEnviados.push(arquivoCriado.id);
      }

      const tratamentoResponse = await fetch(`${API_URL}/tratamentos/${modalFinalizar.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: tk || "" },
        body: JSON.stringify({
          paciente_id: Number(pacienteId),
          data_inicio: modalFinalizar.data_inicio || dadosFinalizacao.data,
          data_fim: dadosFinalizacao.data,
          procedimento: modalFinalizar.procedimento,
          dente: modalFinalizar.dente || "",
          status: "concluido",
          valor: Number(modalFinalizar.valor) || 0,
          profissional: modalFinalizar.profissional || "",
          descricao: modalFinalizar.descricao || "",
          observacoes: modalFinalizar.observacoes || "",
        }),
      });
      if (!tratamentoResponse.ok) throw new Error("A evolução foi registrada, mas não foi possível concluir o tratamento.");

      setModalFinalizar(null);
      setImagensFinalizacao([]);
      await carregarTratamentos();
    } catch (error) {
      // Se o processo falhar antes de concluir o tratamento, desfaz os registros parciais.
      if (evolucaoId) {
        await fetch(`${API_URL}/evolucoes/${evolucaoId}`, { method: "DELETE", headers: { Authorization: tk || "" } }).catch(() => {});
      }
      for (const arquivoId of arquivosEnviados) {
        await fetch(`${API_URL}/arquivos/${arquivoId}`, { method: "DELETE", headers: { Authorization: tk || "" } }).catch(() => {});
      }
      setErroFinalizacao(error.message || "Não foi possível finalizar o tratamento.");
    } finally {
      setSalvandoFinalizacao(false);
      setFinalizandoId(null);
    }
  }

  /* ── Contagem de campos preenchidos ─────── */
  function contarCamposPreenchidos(a) {
    let total = 0;
    FORM_SECTIONS.forEach((sec) => {
      sec.fields.forEach((f) => {
        if (a[f.name]) total++;
      });
    });
    return total;
  }

  /* ═══════════════════════════════════════════
     RENDER — LISTA
     ═══════════════════════════════════════════ */
  if (tela === "lista") {
    return (
      <div style={S.wrapper}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <h2 style={S.title}>Tratamentos</h2>
            <p style={S.subtitle}>
              {tratamentos.length} tratamento{tratamentos.length !== 1 ? "s" : ""} registrado{tratamentos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            style={{
              ...S.btnPrimary,
              ...(hoveredBtn === "novo" ? S.btnPrimaryHover : {}),
            }}
            onMouseEnter={() => setHoveredBtn("novo")}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={abrirFormNovo}
          >
            {Icons.plus}
            <span>Novo tratamento</span>
          </button>
        </div>

        {/* Loading */}
        {carregando && (
          <div style={S.feedbackBox}>
            <div style={S.loadingPulse}>
              <div style={S.loadingDot1} />
              <div style={S.loadingDot2} />
              <div style={S.loadingDot3} />
            </div>
            <span style={S.feedbackText}>Carregando tratamentos...</span>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div style={S.errorBox}>
            <span style={{ display: "flex" }}>{Icons.alertTriangle}</span>
            <span>{erro}</span>
          </div>
        )}

        {/* Vazio */}
        {!carregando && !erro && tratamentos.length === 0 && (
          <div style={S.emptyBox}>
            {Icons.clipboard}
            <h3 style={S.emptyTitle}>Nenhum tratamento registrado</h3>
            <p style={S.emptyText}>Registre o primeiro tratamento deste paciente para acompanhar os procedimentos e planos.</p>
            <button
              style={{
                ...S.btnPrimary,
                marginTop: "4px",
                ...(hoveredBtn === "novo-empty" ? S.btnPrimaryHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("novo-empty")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={abrirFormNovo}
            >
              {Icons.plus}
              <span>Criar tratamento</span>
            </button>
          </div>
        )}

        {/* Lista no mesmo padrão visual de Anamneses e Orçamentos */}
        {!carregando && !erro && tratamentos.length > 0 && (
          <div style={S.documentList}>
            {tratamentos.map((a, indice) => {
              const hovered = hoveredCardId === a.id;
              const statusCfg = getStatusConfig(a.status);
              return (
                <div key={a.id}
                  style={{ ...S.documentRow, ...(indice === tratamentos.length - 1 ? S.documentRowLast : {}), ...(hovered ? S.documentRowHover : {}) }}
                  onMouseEnter={() => setHoveredCardId(a.id)}
                  onMouseLeave={() => setHoveredCardId(null)}>
                  <div style={S.documentRowMain}>
                    <div style={S.documentFileIcon}>{Icons.clipboard}</div>
                    <div style={S.documentRowInfo}>
                      <span style={S.documentRowTitle}>{a.procedimento || `Tratamento #${a.id}`}</span>
                      <div style={S.documentRowMeta}>
                        <span>{formatarDataBR(a.data_inicio)}</span>
                        {a.data_fim && <><span style={S.documentMetaDot}>•</span><span>Conclusão: {formatarDataBR(a.data_fim)}</span></>}
                        {a.dente && <><span style={S.documentMetaDot}>•</span><span>Dente / região: {a.dente}</span></>}
                        {a.profissional && <><span style={S.documentMetaDot}>•</span><span>{a.profissional}</span></>}
                        {Number(a.valor) > 0 && <><span style={S.documentMetaDot}>•</span><span>{formatarValor(a.valor)}</span></>}
                      </div>
                    </div>
                  </div>
                  <div style={S.documentRowActions}>
                    <span style={{ ...S.pillStatus, background: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border }}>
                      {statusCfg.label}
                    </span>
                    {a.status !== "concluido" && (
                      <button type="button" disabled={finalizandoId === a.id}
                        style={{ ...S.finishBtn, ...(hoveredBtn === `finalizar-${a.id}` ? S.finishBtnHover : {}), opacity: finalizandoId === a.id ? 0.65 : 1 }}
                        onMouseEnter={() => setHoveredBtn(`finalizar-${a.id}`)} onMouseLeave={() => setHoveredBtn(null)}
                        onClick={() => abrirModalFinalizar(a)}>
                        <span>{finalizandoId === a.id ? "Finalizando..." : "Finalizar"}</span>
                      </button>
                    )}
                    <button type="button" aria-label="Editar tratamento" title="Editar tratamento"
                      style={{ ...S.listActionBtn, width: "32px", padding: 0, ...(hoveredBtn === `editar-${a.id}` ? S.listActionBtnHover : {}) }}
                      onMouseEnter={() => setHoveredBtn(`editar-${a.id}`)} onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => abrirFormEditar(a)}>
                      {Icons.edit}
                    </button>
                    <button type="button" aria-label="Excluir tratamento" title="Excluir tratamento"
                      style={{ ...S.listDeleteBtn, ...(hoveredBtn === `excluir-${a.id}` ? S.listDeleteBtnHover : {}) }}
                      onMouseEnter={() => setHoveredBtn(`excluir-${a.id}`)} onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => setConfirmarExclusao(a)}>
                      {Icons.trash}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal finalizar tratamento */}
        {modalFinalizar && (
          <div style={S.formModalOverlay} onClick={fecharModalFinalizar}>
            <div style={{ ...S.formModal, maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
              <div style={{ ...S.header, marginBottom: "20px" }}>
                <div>
                  <h2 style={S.title}>Finalizar tratamento</h2>
                  <p style={S.subtitle}>{modalFinalizar.procedimento || "Tratamento"}{modalFinalizar.dente ? ` • Dente/região: ${modalFinalizar.dente}` : ""}</p>
                </div>
                <button type="button" aria-label="Fechar" onClick={fecharModalFinalizar} disabled={salvandoFinalizacao} style={S.listActionBtn}>✕</button>
              </div>

              <div style={S.formWrap}>
                <div style={S.formCard}>
                  <div style={S.fieldGroup}>
                    <label style={S.label}>Profissional responsável</label>
                    <input type="text" value={carregandoProfissional ? "Identificando usuário..." : dadosFinalizacao.profissional}
                      readOnly style={{ ...S.input, background: "#f8fafc", color: "#64748b" }} />
                  </div>
                  <div style={{ ...S.fieldGroup, marginTop: "16px" }}>
                    <label style={S.label}>Data da conclusão *</label>
                    <input type="date" value={dadosFinalizacao.data}
                      onChange={(e) => setDadosFinalizacao((p) => ({ ...p, data: e.target.value }))}
                      style={S.input} />
                  </div>
                </div>

                <div style={S.formCard}>
                  <div style={S.formCardHeader}>
                    <span style={S.formCardIcon}>{Icons.clipboard}</span>
                    <span style={S.formCardTitle}>Evolução clínica</span>
                  </div>
                  <div style={S.fieldGroup}>
                    <textarea value={dadosFinalizacao.evolucao}
                      onChange={(e) => setDadosFinalizacao((p) => ({ ...p, evolucao: e.target.value }))}
                      placeholder="Descreva o procedimento realizado e a evolução clínica..."
                      rows={5} maxLength={5000} style={S.textarea} />
                    <span style={S.charCount}>{dadosFinalizacao.evolucao.length}/5000</span>
                  </div>
                </div>

                <div style={S.formCard}>
                  <div style={S.formCardHeader}>
                    <span style={S.formCardIcon}>{Icons.clipboard}</span>
                    <span style={S.formCardTitle}>Imagens do procedimento</span>
                  </div>
                  <div style={S.fieldGroup}>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple
                      onChange={(e) => setImagensFinalizacao((p) => [...p, ...Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"))].slice(0, 5))}
                      style={S.input} />
                    <span style={{ color: "#94a3b8", fontSize: "12px" }}>Adicione até 5 imagens. Cada imagem deve ter no máximo 10 MB.</span>
                    {imagensFinalizacao.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                        {imagensFinalizacao.map((arquivo, indice) => (
                          <div key={`${arquivo.name}-${indice}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", fontSize: "13px", color: "#475569" }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{arquivo.name}</span>
                            <button type="button" onClick={() => setImagensFinalizacao((p) => p.filter((_, i) => i !== indice))}
                              style={{ ...S.listDeleteBtn, flexShrink: 0 }} aria-label={`Remover ${arquivo.name}`}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {erroFinalizacao && <div style={S.errorBox}><span>{erroFinalizacao}</span></div>}
                <div style={S.formActions}>
                  <button type="button" style={S.btnSecondary} onClick={fecharModalFinalizar} disabled={salvandoFinalizacao}>Cancelar</button>
                  <button type="button" style={S.btnPrimary} onClick={handleFinalizar}
                    disabled={salvandoFinalizacao || carregandoProfissional || !dadosFinalizacao.profissional.trim()}>
                    {salvandoFinalizacao ? "Salvando..." : "Salvar e finalizar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal confirmar exclusão */}
        {confirmarExclusao && (
          <div style={S.overlay} onClick={() => setConfirmarExclusao(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.modalIconWrap}>{Icons.alertTriangle}</div>
              <h3 style={S.confirmTitle}>Excluir tratamento #{confirmarExclusao.id}?</h3>
              <p style={S.confirmText}>Esta ação é irreversível. Todos os dados deste tratamento serão permanentemente removidos.</p>
              <div style={S.modalActions}>
                <button
                  style={{
                    ...S.btnSecondary,
                    ...(hoveredBtn === "cancel-modal" ? S.btnSecondaryHover : {}),
                  }}
                  onMouseEnter={() => setHoveredBtn("cancel-modal")}
                  onMouseLeave={() => setHoveredBtn(null)}
                  onClick={() => setConfirmarExclusao(null)}
                  disabled={excluindo}
                >
                  Cancelar
                </button>
                <button
                  style={{
                    ...S.btnDanger,
                    ...(hoveredBtn === "confirm-modal" ? S.btnDangerHover : {}),
                  }}
                  onMouseEnter={() => setHoveredBtn("confirm-modal")}
                  onMouseLeave={() => setHoveredBtn(null)}
                  onClick={handleExcluir}
                  disabled={excluindo}
                >
                  {Icons.trash}
                  <span>{excluindo ? "Excluindo..." : "Confirmar exclusão"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keyframes */}
        <style>{`
          @keyframes tratamento-pulse-dot {
            0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
          @keyframes tratamento-fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER — FORMULÁRIO
     ══════════════════════��════════════════════ */
  if (tela === "form") {
    return (
      <div style={S.formModalOverlay} onClick={voltarParaLista}>
        <div style={S.formModal} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <button
              style={{
                ...S.backBtn,
                ...(hoveredBtn === "back-form" ? S.backBtnHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("back-form")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={voltarParaLista}
            >
              {Icons.arrowLeft}
              <span>Voltar</span>
            </button>
            <h2 style={S.title}>{editando ? "Editar tratamento" : "Novo tratamento"}</h2>
            <p style={S.subtitle}>{editando ? "Altere os dados do tratamento." : "Registre um novo plano de tratamento."}</p>
          </div>
        </div>

        <form onSubmit={handleSalvar} style={S.formWrap}>

          {editando ? (
            <>
              <div style={S.formCard}>
                <div style={S.formCardHeader}>
                  <span style={S.formCardIcon}>{Icons.tooth}</span>
                  <span style={S.formCardTitle}>Tratamento</span>
                </div>
                <div style={S.fieldGroup}>
                  <input
                    type="text"
                    value={editando.procedimento || ""}
                    readOnly
                    style={{ ...S.input, background: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }}
                  />
                </div>
              </div>

              <div style={S.formCard}>
                <div style={S.formCardHeader}>
                  <span style={S.formCardIcon}>{Icons.clipboard}</span>
                  <span style={S.formCardTitle}>Diagnóstico</span>
                </div>
                <div style={S.fieldGroup}>
                  <textarea
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleInput}
                    style={S.textarea}
                    rows={4}
                    maxLength={500}
                  />
                  <span style={S.charCount}>{formData.descricao.length}/500</span>
                </div>
              </div>

              <div style={S.formCard}>
                <div style={S.formCardHeader}>
                  <span style={S.formCardIcon}>{Icons.notes}</span>
                  <span style={S.formCardTitle}>Observações</span>
                </div>
                <div style={S.fieldGroup}>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleInput}
                    style={S.textarea}
                    rows={4}
                    maxLength={500}
                  />
                  <span style={S.charCount}>{formData.observacoes.length}/500</span>
                </div>
              </div>
            </>
          ) : (
            <>
          {/* Datas + Status */}
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>{Icons.calendar}</span>
              <span style={S.formCardTitle}>Período e status</span>
            </div>
            <div style={S.formGrid3}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Data de início *</label>
                <input
                  type="date"
                  name="data_inicio"
                  value={formData.data_inicio}
                  onChange={handleInput}
                  style={S.input}
                />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Data de conclusão</label>
                <input
                  type="date"
                  name="data_fim"
                  value={formData.data_fim}
                  onChange={handleInput}
                  style={S.input}
                />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInput}
                  style={S.input}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Seções dinâmicas */}
          {FORM_SECTIONS.map((sec) => (
            <div key={sec.title} style={S.formCard}>
              <div style={S.formCardHeader}>
                <span style={S.formCardIcon}>{sec.icon}</span>
                <span style={S.formCardTitle}>{sec.title}</span>
              </div>
              <div style={sec.fields.length <= 2 && sec.fields.every((f) => f.type === "text") ? S.formGrid2 : S.formGrid1}>
                {sec.fields.map((f) => (
                  <div key={f.name} style={S.fieldGroup}>
                    <label style={S.label}>{f.label}</label>
                    {f.type === "textarea" ? (
                      <textarea
                        name={f.name}
                        value={formData[f.name]}
                        onChange={handleInput}
                        placeholder={f.placeholder}
                        style={S.textarea}
                        rows={3}
                      />
                    ) : (
                      <input
                        type={f.type || "text"}
                        name={f.name}
                        value={formData[f.name]}
                        onChange={handleInput}
                        placeholder={f.placeholder}
                        style={S.input}
                        step={f.type === "number" ? "0.01" : undefined}
                        min={f.type === "number" ? "0" : undefined}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
            </>
          )}
          {/* Erro */}
          {erroForm && (
            <div style={S.errorBox}>
              <span>{erroForm}</span>
            </div>
          )}

          {/* Ações */}
          <div style={S.formActions}>
            <button
              type="button"
              style={{
                ...S.btnSecondary,
                ...(hoveredBtn === "cancel-form" ? S.btnSecondaryHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("cancel-form")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={voltarParaLista}
              disabled={salvando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                ...S.btnPrimary,
                ...(hoveredBtn === "salvar-form" ? S.btnPrimaryHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("salvar-form")}
              onMouseLeave={() => setHoveredBtn(null)}
              disabled={salvando}
            >
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Salvar tratamento"}
            </button>
          </div>
        </form>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER — DETALHES
     ═══════════════════════════════════════════ */
  if (tela === "detalhes" && detalhes) {
    const statusCfg = getStatusConfig(detalhes.status);
    return (
      <div style={S.wrapper}>

        {/* Header */}
        <div style={S.header}>
          <div>
            <button
              style={{
                ...S.backBtn,
                ...(hoveredBtn === "back-det" ? S.backBtnHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("back-det")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={voltarParaLista}
            >
              {Icons.arrowLeft}
              <span>Voltar</span>
            </button>
            <h2 style={S.title}>Tratamento #{detalhes.id}</h2>
            <p style={S.subtitle}>Iniciado em {formatarDataBR(detalhes.data_inicio)}</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              style={{
                ...S.btnSecondary,
                ...(hoveredBtn === "editar-det" ? S.btnSecondaryHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("editar-det")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={() => abrirFormEditar(detalhes)}
            >
              {Icons.edit}
              <span>Editar</span>
            </button>
            <button
              style={{
                ...S.btnDanger,
                ...(hoveredBtn === "excluir-det" ? S.btnDangerHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("excluir-det")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={() => setConfirmarExclusao(detalhes)}
            >
              {Icons.trash}
              <span>Excluir</span>
            </button>
          </div>
        </div>

        {/* Pills resumo */}
        <div style={S.pillRow}>
          <span style={{
            ...S.pillStatus,
            background: statusCfg.bg,
            color: statusCfg.color,
            borderColor: statusCfg.border,
          }}>
            {statusCfg.label}
          </span>
          {detalhes.procedimento && <span style={S.pillBlue}>{detalhes.procedimento}</span>}
          {detalhes.dente && (
            <span style={S.pill}>
              <span style={{ display: "flex" }}>{Icons.tooth}</span>
              {detalhes.dente}
            </span>
          )}
          {detalhes.profissional && <span style={S.pillGray}>Dr(a). {detalhes.profissional}</span>}
        </div>

        {/* Conteúdo */}
        <div style={S.detailGrid}>

          {/* Card de período */}
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>{Icons.calendar}</span>
              <span style={S.formCardTitle}>Período</span>
            </div>
            <div style={S.detailItems}>
              <div style={S.detailItem}>
                <span style={S.detailLabel}>Data de início</span>
                <span style={S.detailValue}>{formatarDataBR(detalhes.data_inicio)}</span>
              </div>
              {detalhes.data_fim && (
                <div style={S.detailItem}>
                  <span style={S.detailLabel}>Data de conclusão</span>
                  <span style={S.detailValue}>{formatarDataBR(detalhes.data_fim)}</span>
                </div>
              )}
              {detalhes.valor > 0 && (
                <div style={S.detailItem}>
                  <span style={S.detailLabel}>Valor</span>
                  <span style={S.detailValue}>{formatarValor(detalhes.valor)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Seções dinâmicas */}
          {FORM_SECTIONS.map((sec) => {
            const preenchidos = sec.fields.filter((f) => detalhes[f.name]);
            if (preenchidos.length === 0) return null;
            return (
              <div key={sec.title} style={S.formCard}>
                <div style={S.formCardHeader}>
                  <span style={S.formCardIcon}>{sec.icon}</span>
                  <span style={S.formCardTitle}>{sec.title}</span>
                </div>
                <div style={S.detailItems}>
                  {preenchidos.map((f) => (
                    <div key={f.name} style={S.detailItem}>
                      <span style={S.detailLabel}>{f.label}</span>
                      <span style={S.detailValue}>
                        {f.name === "valor" ? formatarValor(detalhes[f.name]) : detalhes[f.name]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal confirmar exclusão */}
        {confirmarExclusao && (
          <div style={S.overlay} onClick={() => setConfirmarExclusao(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.modalIconWrap}>{Icons.alertTriangle}</div>
              <h3 style={S.confirmTitle}>Excluir tratamento #{confirmarExclusao.id}?</h3>
              <p style={S.confirmText}>Esta ação é irreversível. Todos os dados deste tratamento serão permanentemente removidos.</p>
              <div style={S.modalActions}>
                <button
                  style={{
                    ...S.btnSecondary,
                    ...(hoveredBtn === "cancel-modal-det" ? S.btnSecondaryHover : {}),
                  }}
                  onMouseEnter={() => setHoveredBtn("cancel-modal-det")}
                  onMouseLeave={() => setHoveredBtn(null)}
                  onClick={() => setConfirmarExclusao(null)}
                  disabled={excluindo}
                >
                  Cancelar
                </button>
                <button
                  style={{
                    ...S.btnDanger,
                    ...(hoveredBtn === "confirm-modal-det" ? S.btnDangerHover : {}),
                  }}
                  onMouseEnter={() => setHoveredBtn("confirm-modal-det")}
                  onMouseLeave={() => setHoveredBtn(null)}
                  onClick={handleExcluir}
                  disabled={excluindo}
                >
                  {Icons.trash}
                  <span>{excluindo ? "Excluindo..." : "Confirmar exclusão"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

/* ═════════════��═════════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   ═══════════════════════════════════════════════════════════ */
const S = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    animation: "tratamento-fade-in 0.3s ease",
  },

  /* ── Header ──────────────────────────────────────── */
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0, fontSize: "22px", fontWeight: "700",
    color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1.2,
  },
  subtitle: {
    margin: "6px 0 0", fontSize: "14px",
    color: "#94a3b8", fontWeight: "500", lineHeight: 1.4,
  },

  /* ── Back Button ─────────────────────────────────── */
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    border: "none", background: "none", color: "#64748b",
    fontWeight: "600", fontSize: "13px", cursor: "pointer",
    padding: "6px 10px 6px 4px", marginBottom: "8px",
    marginLeft: "-4px", borderRadius: "8px", transition: "all 0.15s ease",
  },
  backBtnHover: { background: "#f1f5f9", color: "#0f172a" },

  /* ── Buttons ─────────────────────────────────────── */
  btnPrimary: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    border: "none", borderRadius: "10px", padding: "10px 20px",
    background: "#2563eb", color: "#fff", fontWeight: "600",
    fontSize: "14px", cursor: "pointer",
    boxShadow: "0 1px 3px rgba(37,99,235,0.2)",
    transition: "all 0.2s ease", whiteSpace: "nowrap",
    height: "40px", boxSizing: "border-box",
  },
  btnPrimaryHover: {
    background: "#1d4ed8",
    boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
    transform: "translateY(-1px)",
  },
  btnSecondary: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 16px",
    background: "#fff", color: "#475569", fontWeight: "500",
    fontSize: "13px", cursor: "pointer", transition: "all 0.15s ease",
    whiteSpace: "nowrap", height: "40px", boxSizing: "border-box",
  },
  btnSecondaryHover: { background: "#f8fafc", borderColor: "#cbd5e1" },
  btnDanger: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    border: "none", borderRadius: "10px", padding: "0 16px",
    background: "#ef4444", color: "#fff", fontWeight: "600",
    fontSize: "13px", cursor: "pointer", transition: "all 0.2s ease",
    whiteSpace: "nowrap", height: "40px", boxSizing: "border-box",
  },
  btnDangerHover: {
    background: "#dc2626",
    boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
    transform: "translateY(-1px)",
  },

  /* ── Feedback ────────────────────────────────────── */
  feedbackBox: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "16px", padding: "48px", background: "#fff",
    borderRadius: "16px", border: "1px solid #f1f5f9",
  },
  loadingPulse: { display: "flex", gap: "8px", alignItems: "center" },
  loadingDot1: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "tratamento-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0s",
  },
  loadingDot2: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "tratamento-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.2s",
  },
  loadingDot3: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "tratamento-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.4s",
  },
  feedbackText: { fontSize: "14px", color: "#94a3b8", fontWeight: "500" },
  errorBox: {
    display: "flex", alignItems: "center", gap: "12px",
    background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
    borderRadius: "12px", padding: "14px 18px", fontSize: "14px", fontWeight: "600",
  },

  /* ── Empty ───────────────────────────────────────── */
  emptyBox: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "12px", padding: "64px 24px", background: "#fff",
    borderRadius: "16px", border: "1px solid #f1f5f9", textAlign: "center",
  },
  emptyTitle: { margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" },
  emptyText: { margin: 0, fontSize: "14px", color: "#94a3b8", lineHeight: 1.5, maxWidth: "360px" },

  /* ── Lista no padrão de Anamneses e Orçamentos ───── */
  documentList: { display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #f1f5f9", borderRadius: "12px", overflow: "hidden" },
  documentRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px", padding: "13px 16px", borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease", minWidth: 0, flexWrap: "wrap" },
  documentRowLast: { borderBottom: "none" },
  documentRowHover: { background: "#fafcff" },
  documentRowMain: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: "1 1 260px" },
  documentFileIcon: { width: "38px", height: "38px", borderRadius: "9px", background: "#f8fafc", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  documentRowInfo: { display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 },
  documentRowTitle: { color: "#1e293b", fontSize: "13px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  documentRowMeta: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "7px", color: "#94a3b8", fontSize: "11px" },
  documentMetaDot: { color: "#cbd5e1" },
  documentRowActions: { display: "flex", alignItems: "center", gap: "7px", flexShrink: 0, flexWrap: "wrap" },
  listActionBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", height: "32px", padding: "0 11px", border: "1px solid #e8edf3", borderRadius: "7px", background: "#fff", color: "#475569", fontSize: "12px", fontWeight: "600", cursor: "pointer" },
  listActionBtnHover: { background: "#f8fafc", borderColor: "#cbd5e1" },
  finishBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", height: "32px", padding: "0 12px", border: "1px solid #bbf7d0", borderRadius: "7px", background: "#f0fdf4", color: "#15803d", fontSize: "12px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" },
  finishBtnHover: { background: "#dcfce7", borderColor: "#86efac" },
  listDeleteBtn: { width: "32px", height: "32px", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid transparent", borderRadius: "7px", background: "transparent", color: "#94a3b8", cursor: "pointer" },
  listDeleteBtnHover: { color: "#dc2626", background: "#fef2f2", borderColor: "#fee2e2" },

  /* ── Card Grid ───────────────────────────────────── */
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: "16px",
  },

  /* ── Card ─────────────────────────────────────────── */
  card: {
    background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9",
    padding: "22px", display: "flex", flexDirection: "column",
    gap: "16px", transition: "all 0.2s ease", cursor: "default",
  },
  cardHover: { boxShadow: "0 8px 24px rgba(15,23,42,0.06)", borderColor: "#e2e8f0" },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardDateBadge: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "#f8fafc", color: "#334155", border: "1px solid #f1f5f9",
    borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: "600",
  },
  cardId: { fontSize: "12px", color: "#cbd5e1", fontWeight: "500" },
  cardSection: {
    display: "flex", flexDirection: "column", gap: "6px",
    background: "#fafbfc", borderRadius: "10px", padding: "14px 16px",
    border: "1px solid #f1f5f9",
  },
  cardSectionLabel: {
    fontSize: "11px", fontWeight: "600", color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.06em",
  },
  cardSectionText: {
    margin: 0, fontSize: "14px", color: "#334155", lineHeight: 1.5,
    display: "-webkit-box", WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical", overflow: "hidden",
  },

  /* ── Pills ───────────────────────────────────────── */
  pillRow: { display: "flex", gap: "6px", flexWrap: "wrap" },
  pill: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    background: "#f0fdf4", color: "#15803d", border: "1px solid #dcfce7",
    borderRadius: "6px", padding: "4px 10px", fontSize: "12px", fontWeight: "600",
  },
  pillBlue: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    background: "#eff6ff", color: "#2563eb", border: "1px solid #dbeafe",
    borderRadius: "6px", padding: "4px 10px", fontSize: "12px", fontWeight: "600",
  },
  pillGray: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    background: "#f8fafc", color: "#64748b", border: "1px solid #f1f5f9",
    borderRadius: "6px", padding: "4px 10px", fontSize: "12px", fontWeight: "600",
  },
  pillStatus: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    border: "1px solid",
    borderRadius: "6px", padding: "4px 10px", fontSize: "12px", fontWeight: "700",
    letterSpacing: "0.02em",
  },

  /* ── Valor ────────────────────────────────────────── */
  valorRow: {
    display: "flex", alignItems: "center", gap: "8px",
  },
  valorLabel: { fontSize: "12px", fontWeight: "600", color: "#94a3b8" },
  valorValue: { fontSize: "16px", fontWeight: "700", color: "#0f172a" },

  /* ── Meta ─────────────────────────────────────────── */
  metaRow: { display: "flex", alignItems: "center" },
  metaChip: { fontSize: "12px", fontWeight: "500", color: "#94a3b8" },

  /* ── Card Actions ────────────────────────────────── */
  cardActions: {
    display: "flex", gap: "8px", borderTop: "1px solid #f1f5f9",
    paddingTop: "16px", marginTop: "auto",
  },
  cardBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    gap: "6px", border: "1px solid #f1f5f9", background: "#fff",
    borderRadius: "8px", padding: "8px 0", fontSize: "13px",
    fontWeight: "500", color: "#475569", cursor: "pointer", transition: "all 0.15s ease",
  },
  cardBtnHover: { background: "#f8fafc", borderColor: "#e2e8f0" },
  cardBtnDanger: { color: "#ef4444", borderColor: "#fef2f2" },
  cardBtnDangerHover: { background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" },

  /* ── Modal ───────────────────────────────────────── */
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
    backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
    justifyContent: "center", padding: "20px", zIndex: 999,
  },
  modal: {
    width: "100%", maxWidth: "420px", background: "#fff",
    borderRadius: "16px", padding: "32px", textAlign: "center",
    boxShadow: "0 24px 64px rgba(15,23,42,0.18)",
    animation: "tratamento-fade-in 0.2s ease",
  },
  modalIconWrap: { display: "flex", justifyContent: "center", marginBottom: "4px" },
  confirmTitle: { margin: "12px 0 0", fontSize: "17px", fontWeight: "700", color: "#0f172a", lineHeight: 1.3 },
  confirmText: { margin: "8px 0 0", color: "#64748b", fontSize: "14px", lineHeight: 1.5 },
  modalActions: { display: "flex", justifyContent: "center", gap: "10px", marginTop: "24px" },

  /* ── Form ─────────────────────────────────────────── */
  formModalOverlay: {
    position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,0.48)",
    backdropFilter: "blur(5px)", display: "flex", alignItems: "center",
    justifyContent: "center", padding: "20px", overflowY: "auto",
  },
  formModal: {
    width: "100%", maxWidth: "860px", maxHeight: "calc(100vh - 40px)",
    overflowY: "auto", background: "#f8fafc", borderRadius: "16px",
    padding: "24px", boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
    animation: "tratamento-fade-in 0.2s ease",
  },
  charCount: { display: "block", marginTop: "5px", textAlign: "right", color: "#94a3b8", fontSize: "11px" },
  formWrap: { display: "flex", flexDirection: "column", gap: "16px" },
  formCard: {
    background: "#fff", borderRadius: "16px",
    border: "1px solid #f1f5f9", padding: "22px",
  },
  formCardHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" },
  formCardIcon: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "32px", height: "32px", borderRadius: "8px",
    background: "#eff6ff", color: "#2563eb", flexShrink: 0,
  },
  formCardTitle: { fontSize: "14px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.01em" },
  formGrid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" },
  formGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  formGrid1: { display: "flex", flexDirection: "column", gap: "16px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#64748b", letterSpacing: "0.02em" },
  input: {
    width: "100%", height: "42px", borderRadius: "10px",
    border: "1px solid #e2e8f0", padding: "0 14px", outline: "none",
    fontSize: "14px", background: "#fff", boxSizing: "border-box",
    color: "#0f172a", transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  textarea: {
    width: "100%", borderRadius: "10px", border: "1px solid #e2e8f0",
    padding: "12px 14px", outline: "none", fontSize: "14px",
    background: "#fff", boxSizing: "border-box", color: "#0f172a",
    resize: "vertical", fontFamily: "inherit",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    minHeight: "80px", lineHeight: 1.5,
  },
  formActions: { display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" },

  /* ── Detail ──────────────────────────────────────── */
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: "16px",
  },
  detailItems: { display: "flex", flexDirection: "column", gap: "10px" },
  detailItem: {
    display: "flex", flexDirection: "column", gap: "6px",
    background: "#fafbfc", borderRadius: "10px", padding: "14px 16px",
    border: "1px solid #f1f5f9",
  },
  detailLabel: {
    fontSize: "11px", fontWeight: "600", color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.06em",
  },
  detailValue: {
    fontSize: "14px", color: "#0f172a", fontWeight: "500",
    lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
  },
};

export default AbaTratamentos;
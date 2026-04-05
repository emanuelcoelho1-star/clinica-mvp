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

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcularTotalItens(itens) {
  return (itens || []).reduce((acc, i) => acc + (Number(i.valor) || 0) * (Number(i.quantidade) || 1), 0);
}

/* ═══════════════════════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════════════════ */
const STATUS_MAP = {
  pendente:     { label: "Pendente",     bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  aprovado:     { label: "Aprovado",     bg: "#f0fdf4", color: "#15803d", border: "#dcfce7" },
  recusado:     { label: "Recusado",     bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  em_andamento: { label: "Em andamento", bg: "#eff6ff", color: "#1d4ed8", border: "#dbeafe" },
  concluido:    { label: "Concluído",    bg: "#f8fafc", color: "#334155", border: "#e2e8f0" },
};

const STATUS_OPTIONS = [
  { value: "pendente",     label: "Pendente" },
  { value: "aprovado",     label: "Aprovado" },
  { value: "recusado",     label: "Recusado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido",    label: "Concluído" },
];

const EMPTY_ITEM = { dente: "", procedimento: "", valor: 0, quantidade: 1 };

const EMPTY_FORM = {
  data: dataHojeISO(),
  status: "pendente",
  desconto: 0,
  observacoes: "",
  itens: [{ ...EMPTY_ITEM }],
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  ),
  tooth: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5.5c-1.5-2-4-2.5-5.5-1S4 8 5.5 10c1 1.5 2 3 2 5s-.5 4.5 1 5.5 2.5-1.5 3.5-3.5c1 2 2 4.5 3.5 3.5s1-3.5 1-5.5 1-3.5 2-5c1.5-2 1-4-0.5-5.5S13.5 3.5 12 5.5z" />
    </svg>
  ),
  wallet: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  alertTriangle: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  dollarSign: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  fileText: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  ),
  close: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════════════════════ */
function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.pendente;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "600",
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        letterSpacing: "0.01em",
      }}
    >
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE
   ═══════════════════════════════════════════════════════════ */
function AbaOrcamentos({ pacienteId }) {
  const [orcamentos, setOrcamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [tela, setTela] = useState("lista");
  const [editando, setEditando] = useState(null);
  const [detalhes, setDetalhes] = useState(null);

  const [formData, setFormData] = useState({ ...EMPTY_FORM, itens: [{ ...EMPTY_ITEM }] });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  /* ── Carregar ────────────────────────────── */
  useEffect(() => {
    carregarOrcamentos();
  }, [pacienteId]);

  async function carregarOrcamentos() {
    try {
      setCarregando(true);
      setErro("");
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/orcamentos/paciente/${pacienteId}`, {
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setOrcamentos(Array.isArray(data) ? data : []);
    } catch {
      setErro("Erro ao carregar orçamentos.");
    } finally {
      setCarregando(false);
    }
  }

  /* ── Abrir form ──────────────────────────── */
  function abrirFormNovo() {
    setEditando(null);
    setFormData({ ...EMPTY_FORM, itens: [{ ...EMPTY_ITEM }] });
    setErroForm("");
    setTela("form");
  }

  function abrirFormEditar(item) {
    setEditando(item);
    setFormData({
      data: item.data || dataHojeISO(),
      status: item.status || "pendente",
      desconto: item.desconto || 0,
      observacoes: item.observacoes || "",
      itens:
        item.itens && item.itens.length > 0
          ? item.itens.map((i) => ({
              dente: i.dente || "",
              procedimento: i.procedimento || "",
              valor: i.valor || 0,
              quantidade: i.quantidade || 1,
            }))
          : [{ ...EMPTY_ITEM }],
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

  /* ── Form handlers ───────────────────────── */
  function handleInput(e) {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  }

  function handleItemChange(index, field, value) {
    setFormData((p) => {
      const novosItens = [...p.itens];
      novosItens[index] = { ...novosItens[index], [field]: value };
      return { ...p, itens: novosItens };
    });
  }

  function adicionarItem() {
    setFormData((p) => ({ ...p, itens: [...p.itens, { ...EMPTY_ITEM }] }));
  }

  function removerItem(index) {
    setFormData((p) => {
      if (p.itens.length <= 1) return p;
      const novosItens = p.itens.filter((_, i) => i !== index);
      return { ...p, itens: novosItens };
    });
  }

  /* ── Salvar ──────────────────────────────── */
  async function handleSalvar(e) {
    e.preventDefault();
    if (!formData.data) {
      setErroForm("A data é obrigatória.");
      return;
    }

    const itensValidos = formData.itens.filter((i) => i.procedimento.trim() !== "");
    if (itensValidos.length === 0) {
      setErroForm("Adicione pelo menos um procedimento.");
      return;
    }

    try {
      setSalvando(true);
      setErroForm("");
      const tk = localStorage.getItem("token");
      const ed = Boolean(editando);

      const body = {
        paciente_id: Number(pacienteId),
        data: formData.data,
        status: formData.status || "pendente",
        desconto: Number(formData.desconto) || 0,
        observacoes: formData.observacoes || "",
        itens: itensValidos.map((i) => ({
          dente: i.dente || "",
          procedimento: i.procedimento,
          valor: Number(i.valor) || 0,
          quantidade: Number(i.quantidade) || 1,
        })),
      };

      const r = await fetch(
        ed
          ? `${API_URL}/orcamentos/${editando.id}`
          : `${API_URL}/orcamentos`,
        {
          method: ed ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", Authorization: tk || "" },
          body: JSON.stringify(body),
        }
      );
      if (!r.ok) throw new Error();
      await carregarOrcamentos();
      voltarParaLista();
    } catch {
      setErroForm("Não foi possível salvar o orçamento.");
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
      const r = await fetch(`${API_URL}/orcamentos/${confirmarExclusao.id}`, {
        method: "DELETE",
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      setConfirmarExclusao(null);
      await carregarOrcamentos();
      if (tela !== "lista") voltarParaLista();
    } catch {
      setErro("Erro ao excluir orçamento.");
    } finally {
      setExcluindo(false);
    }
  }

  /* ── Totais ──────────────────────────────── */
  const totalForm = calcularTotalItens(formData.itens);
  const descontoForm = Number(formData.desconto) || 0;
  const totalFinalForm = Math.max(0, totalForm - descontoForm);

  /* ═══════════════════════════════════════════
     RENDER — LISTA
     ═══════════════════════════════════════════ */
  if (tela === "lista") {
    return (
      <div style={S.wrapper}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <h2 style={S.title}>Orçamentos</h2>
            <p style={S.subtitle}>
              {orcamentos.length} orçamento{orcamentos.length !== 1 ? "s" : ""} registrado
              {orcamentos.length !== 1 ? "s" : ""}
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
            <span>Novo orçamento</span>
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
            <span style={S.feedbackText}>Carregando orçamentos...</span>
          </div>
        )}

        {/* Erro */}
        {erro && (
          <div style={S.errorBox}>
            <span>{erro}</span>
          </div>
        )}

        {/* Vazio */}
        {!carregando && !erro && orcamentos.length === 0 && (
          <div style={S.emptyBox}>
            {Icons.wallet}
            <h3 style={S.emptyTitle}>Nenhum orçamento registrado</h3>
            <p style={S.emptyText}>Crie o primeiro orçamento deste paciente para registrar procedimentos e valores.</p>
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
              <span>Criar orçamento</span>
            </button>
          </div>
        )}

        {/* Lista de cards */}
        {!carregando && !erro && orcamentos.length > 0 && (
          <div style={S.cardGrid}>
            {orcamentos.map((o) => {
              const hovered = hoveredCardId === o.id;
              const total = calcularTotalItens(o.itens);
              const desconto = Number(o.desconto) || 0;
              const totalFinal = Math.max(0, total - desconto);

              return (
                <div
                  key={o.id}
                  style={{ ...S.card, ...(hovered ? S.cardHover : {}) }}
                  onMouseEnter={() => setHoveredCardId(o.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                >
                  {/* Topo do card */}
                  <div style={S.cardTop}>
                    <div style={S.cardDateBadge}>
                      <span style={{ display: "flex", color: "#2563eb" }}>{Icons.calendar}</span>
                      {formatarDataBR(o.data)}
                    </div>
                    <span style={S.cardId}>#{o.id}</span>
                  </div>

                  {/* Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <StatusBadge status={o.status} />
                  </div>

                  {/* Procedimentos resumidos */}
                  {o.itens && o.itens.length > 0 && (
                    <div style={S.cardSection}>
                      <span style={S.cardSectionLabel}>
                        {o.itens.length} procedimento{o.itens.length !== 1 ? "s" : ""}
                      </span>
                      <p style={S.cardSectionText}>
                        {o.itens
                          .map((i) => i.procedimento)
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}

                  {/* Valores */}
                  <div style={S.pillRow}>
                    <span style={S.pillMoney}>Total: {formatarMoeda(totalFinal)}</span>
                    {desconto > 0 && (
                      <span style={S.pillDiscount}>Desc: {formatarMoeda(desconto)}</span>
                    )}
                  </div>

                  {/* Ações */}
                  <div style={S.cardActions}>
                    <button
                      style={{
                        ...S.cardBtn,
                        ...(hoveredBtn === `ver-${o.id}` ? S.cardBtnHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`ver-${o.id}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => abrirDetalhes(o)}
                    >
                      {Icons.eye}
                      <span>Ver</span>
                    </button>
                    <button
                      style={{
                        ...S.cardBtn,
                        ...(hoveredBtn === `editar-${o.id}` ? S.cardBtnHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`editar-${o.id}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => abrirFormEditar(o)}
                    >
                      {Icons.edit}
                      <span>Editar</span>
                    </button>
                    <button
                      style={{
                        ...S.cardBtn,
                        ...S.cardBtnDanger,
                        ...(hoveredBtn === `excluir-${o.id}` ? S.cardBtnDangerHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`excluir-${o.id}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => setConfirmarExclusao(o)}
                    >
                      {Icons.trash}
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal confirmar exclusão */}
        {confirmarExclusao && (
          <div style={S.overlay} onClick={() => setConfirmarExclusao(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.modalIconWrap}>{Icons.alertTriangle}</div>
              <h3 style={S.confirmTitle}>Excluir orçamento #{confirmarExclusao.id}?</h3>
              <p style={S.confirmText}>Esta ação é irreversível. Todos os dados deste orçamento serão permanentemente removidos.</p>
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
          @keyframes orcamento-pulse-dot {
            0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
          @keyframes orcamento-fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER — FORMULÁRIO
     ═══════════════════════════════════════════ */
  if (tela === "form") {
    return (
      <div style={S.wrapper}>
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
            <h2 style={S.title}>{editando ? "Editar orçamento" : "Novo orçamento"}</h2>
            <p style={S.subtitle}>
              {editando ? "Altere os dados do orçamento." : "Preencha as informações do orçamento."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSalvar} style={S.formWrap}>
          {/* Dados gerais */}
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>{Icons.clipboard}</span>
              <span style={S.formCardTitle}>Dados do orçamento</span>
            </div>
            <div style={S.formGrid2}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Data</label>
                <input
                  type="date"
                  name="data"
                  value={formData.data}
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
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Desconto (R$)</label>
                <input
                  type="number"
                  name="desconto"
                  value={formData.desconto}
                  onChange={handleInput}
                  style={S.input}
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Observações</label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleInput}
                  placeholder="Observações sobre o orçamento..."
                  style={S.textarea}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Itens / Procedimentos */}
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>{Icons.tooth}</span>
              <span style={S.formCardTitle}>Procedimentos</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {formData.itens.map((item, idx) => (
                <div key={idx} style={S.itemRow}>
                  <div style={S.itemFields}>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Dente</label>
                      <input
                        type="text"
                        value={item.dente}
                        onChange={(e) => handleItemChange(idx, "dente", e.target.value)}
                        placeholder="Ex: 11"
                        style={{ ...S.input, maxWidth: "100px" }}
                      />
                    </div>
                    <div style={{ ...S.fieldGroup, flex: 2 }}>
                      <label style={S.label}>Procedimento</label>
                      <input
                        type="text"
                        value={item.procedimento}
                        onChange={(e) => handleItemChange(idx, "procedimento", e.target.value)}
                        placeholder="Ex: Restauração"
                        style={S.input}
                      />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Valor (R$)</label>
                      <input
                        type="number"
                        value={item.valor}
                        onChange={(e) => handleItemChange(idx, "valor", e.target.value)}
                        placeholder="0,00"
                        style={{ ...S.input, maxWidth: "120px" }}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Qtd</label>
                      <input
                        type="number"
                        value={item.quantidade}
                        onChange={(e) => handleItemChange(idx, "quantidade", e.target.value)}
                        style={{ ...S.input, maxWidth: "70px" }}
                        min="1"
                      />
                    </div>
                    <div style={{ ...S.fieldGroup, justifyContent: "flex-end", minWidth: "90px" }}>
                      <label style={S.label}>Subtotal</label>
                      <span style={S.subtotalText}>
                        {formatarMoeda((Number(item.valor) || 0) * (Number(item.quantidade) || 1))}
                      </span>
                    </div>
                  </div>
                  {formData.itens.length > 1 && (
                    <button
                      type="button"
                      style={{
                        ...S.removeItemBtn,
                        ...(hoveredBtn === `remove-${idx}` ? S.removeItemBtnHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`remove-${idx}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => removerItem(idx)}
                      title="Remover item"
                    >
                      {Icons.close}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              style={{
                ...S.addItemBtn,
                ...(hoveredBtn === "add-item" ? S.addItemBtnHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("add-item")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={adicionarItem}
            >
              {Icons.plus}
              <span>Adicionar procedimento</span>
            </button>

            {/* Totais */}
            <div style={S.totaisBox}>
              <div style={S.totaisRow}>
                <span style={S.totaisLabel}>Subtotal</span>
                <span style={S.totaisValue}>{formatarMoeda(totalForm)}</span>
              </div>
              {descontoForm > 0 && (
                <div style={S.totaisRow}>
                  <span style={S.totaisLabel}>Desconto</span>
                  <span style={{ ...S.totaisValue, color: "#ef4444" }}>
                    - {formatarMoeda(descontoForm)}
                  </span>
                </div>
              )}
              <div style={{ ...S.totaisRow, borderTop: "2px solid #e2e8f0", paddingTop: "12px" }}>
                <span style={{ ...S.totaisLabel, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Total</span>
                <span style={{ ...S.totaisValue, fontSize: "18px", fontWeight: "700", color: "#2563eb" }}>
                  {formatarMoeda(totalFinalForm)}
                </span>
              </div>
            </div>
          </div>

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
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Salvar orçamento"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER — DETALHES
     ═══════════════════════════════════════════ */
  if (tela === "detalhes" && detalhes) {
    const totalDet = calcularTotalItens(detalhes.itens);
    const descontoDet = Number(detalhes.desconto) || 0;
    const totalFinalDet = Math.max(0, totalDet - descontoDet);

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
            <h2 style={S.title}>Orçamento #{detalhes.id}</h2>
            <p style={S.subtitle}>Criado em {formatarDataBR(detalhes.data)}</p>
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

        {/* Informações gerais */}
        <div style={S.formCard}>
          <div style={S.formCardHeader}>
            <span style={S.formCardIcon}>{Icons.clipboard}</span>
            <span style={S.formCardTitle}>Informações gerais</span>
          </div>
          <div style={S.detailItems}>
            <div style={S.detailItem}>
              <span style={S.detailLabel}>Status</span>
              <StatusBadge status={detalhes.status} />
            </div>
            <div style={S.detailItem}>
              <span style={S.detailLabel}>Data</span>
              <span style={S.detailValue}>{formatarDataBR(detalhes.data)}</span>
            </div>
            {detalhes.observacoes && (
              <div style={S.detailItem}>
                <span style={S.detailLabel}>Observações</span>
                <span style={S.detailValue}>{detalhes.observacoes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabela de itens */}
        <div style={S.formCard}>
          <div style={S.formCardHeader}>
            <span style={S.formCardIcon}>{Icons.tooth}</span>
            <span style={S.formCardTitle}>Procedimentos</span>
          </div>

          <div style={S.tableWrapper}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Dente</th>
                  <th style={S.th}>Procedimento</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Valor Unit.</th>
                  <th style={{ ...S.th, textAlign: "center" }}>Qtd</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(detalhes.itens || []).map((item, idx) => (
                  <tr key={idx}>
                    <td style={S.td}>{item.dente || "—"}</td>
                    <td style={S.td}>{item.procedimento || "—"}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>{formatarMoeda(item.valor)}</td>
                    <td style={{ ...S.td, textAlign: "center" }}>{item.quantidade || 1}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: "600" }}>
                      {formatarMoeda((Number(item.valor) || 0) * (Number(item.quantidade) || 1))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totais */}
          <div style={S.totaisBox}>
            <div style={S.totaisRow}>
              <span style={S.totaisLabel}>Subtotal</span>
              <span style={S.totaisValue}>{formatarMoeda(totalDet)}</span>
            </div>
            {descontoDet > 0 && (
              <div style={S.totaisRow}>
                <span style={S.totaisLabel}>Desconto</span>
                <span style={{ ...S.totaisValue, color: "#ef4444" }}>
                  - {formatarMoeda(descontoDet)}
                </span>
              </div>
            )}
            <div style={{ ...S.totaisRow, borderTop: "2px solid #e2e8f0", paddingTop: "12px" }}>
              <span style={{ ...S.totaisLabel, fontSize: "15px", fontWeight: "700", color: "#0f172a" }}>Total Final</span>
              <span style={{ ...S.totaisValue, fontSize: "20px", fontWeight: "700", color: "#2563eb" }}>
                {formatarMoeda(totalFinalDet)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal confirmar exclusão */}
        {confirmarExclusao && (
          <div style={S.overlay} onClick={() => setConfirmarExclusao(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.modalIconWrap}>{Icons.alertTriangle}</div>
              <h3 style={S.confirmTitle}>Excluir orçamento #{confirmarExclusao.id}?</h3>
              <p style={S.confirmText}>Esta ação é irreversível. Todos os dados deste orçamento serão permanentemente removidos.</p>
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

/* ═══════════════════════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   ═══════════════════════════════════════════════════════════ */
const S = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    animation: "orcamento-fade-in 0.3s ease",
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
    margin: 0,
    fontSize: "22px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  subtitle: {
    margin: "6px 0 0",
    fontSize: "14px",
    color: "#94a3b8",
    fontWeight: "500",
    lineHeight: 1.4,
  },

  /* ── Back Button ─────────────────────────────────── */
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "none",
    background: "none",
    color: "#64748b",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    padding: "6px 10px 6px 4px",
    marginBottom: "8px",
    marginLeft: "-4px",
    borderRadius: "8px",
    transition: "all 0.15s ease",
  },
  backBtnHover: {
    background: "#f1f5f9",
    color: "#0f172a",
  },

  /* ── Buttons ─────────────────────────────────────── */
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(37,99,235,0.2)",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    height: "40px",
    boxSizing: "border-box",
  },
  btnPrimaryHover: {
    background: "#1d4ed8",
    boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
    transform: "translateY(-1px)",
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
  },
  btnSecondaryHover: {
    background: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  btnDanger: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "none",
    borderRadius: "10px",
    padding: "0 16px",
    background: "#ef4444",
    color: "#fff",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    height: "40px",
    boxSizing: "border-box",
  },
  btnDangerHover: {
    background: "#dc2626",
    boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
    transform: "translateY(-1px)",
  },

  /* ── Feedback ────────────────────────────────────── */
  feedbackBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    padding: "48px",
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
  },
  loadingPulse: { display: "flex", gap: "8px", alignItems: "center" },
  loadingDot1: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "orcamento-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0s",
  },
  loadingDot2: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "orcamento-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.2s",
  },
  loadingDot3: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "orcamento-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.4s",
  },
  feedbackText: {
    fontSize: "14px",
    color: "#94a3b8",
    fontWeight: "500",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: "12px",
    padding: "14px 18px",
    fontSize: "14px",
    fontWeight: "600",
  },

  /* ── Empty ───────────────────────────────────────── */
  emptyBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "64px 24px",
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
    textAlign: "center",
  },
  emptyTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
    color: "#0f172a",
  },
  emptyText: {
    margin: 0,
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: 1.5,
    maxWidth: "360px",
  },

  /* ── Card Grid ───────────────────────────────────── */
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: "16px",
  },

  /* ── Card ─────────────────────────────────────────── */
  card: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
    padding: "22px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    transition: "all 0.2s ease",
    cursor: "default",
  },
  cardHover: {
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
    borderColor: "#e2e8f0",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDateBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "#f8fafc",
    color: "#334155",
    border: "1px solid #f1f5f9",
    borderRadius: "8px",
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: "600",
  },
  cardId: {
    fontSize: "12px",
    color: "#cbd5e1",
    fontWeight: "500",
  },
  cardSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    background: "#fafbfc",
    borderRadius: "10px",
    padding: "14px 16px",
    border: "1px solid #f1f5f9",
  },
  cardSectionLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  cardSectionText: {
    margin: 0,
    fontSize: "14px",
    color: "#334155",
    lineHeight: 1.5,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },

  /* ── Pills ───────────────────────────────────────── */
  pillRow: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  pillMoney: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #dbeafe",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "13px",
    fontWeight: "700",
  },
  pillDiscount: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: "600",
  },

  /* ── Card Actions ────────────────────────────────── */
  cardActions: {
    display: "flex",
    gap: "8px",
    borderTop: "1px solid #f1f5f9",
    paddingTop: "16px",
    marginTop: "auto",
  },
  cardBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    border: "1px solid #f1f5f9",
    background: "#fff",
    borderRadius: "8px",
    padding: "8px 0",
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  cardBtnHover: {
    background: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  cardBtnDanger: {
    color: "#ef4444",
    borderColor: "#fef2f2",
  },
  cardBtnDangerHover: {
    background: "#fef2f2",
    borderColor: "#fecaca",
    color: "#dc2626",
  },

  /* ── Modal ───────────────────────────────────────── */
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.4)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 999,
  },
  modal: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    borderRadius: "16px",
    padding: "32px",
    textAlign: "center",
    boxShadow: "0 24px 64px rgba(15,23,42,0.18)",
    animation: "orcamento-fade-in 0.2s ease",
  },
  modalIconWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "4px",
  },
  confirmTitle: {
    margin: "12px 0 0",
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 1.3,
  },
  confirmText: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  modalActions: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginTop: "24px",
  },

  /* ── Form ────────────────────────────────────────── */
  formWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formCard: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
    padding: "22px",
  },
  formCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  formCardIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "#eff6ff",
    color: "#2563eb",
    flexShrink: 0,
  },
  formCardTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
    letterSpacing: "-0.01em",
  },
  formGrid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b",
    letterSpacing: "0.02em",
  },
  input: {
    width: "100%",
    height: "42px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "0 14px",
    outline: "none",
    fontSize: "14px",
    background: "#fff",
    boxSizing: "border-box",
    color: "#0f172a",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  textarea: {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "12px 14px",
    outline: "none",
    fontSize: "14px",
    background: "#fff",
    boxSizing: "border-box",
    color: "#0f172a",
    resize: "vertical",
    fontFamily: "inherit",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    minHeight: "80px",
    lineHeight: 1.5,
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
  },

  /* ── Item Rows ───────────────────────────────────── */
  itemRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    background: "#fafbfc",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #f1f5f9",
  },
  itemFields: {
    display: "flex",
    gap: "10px",
    flex: 1,
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  subtotalText: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#2563eb",
    padding: "10px 0",
  },
  removeItemBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "1px solid #f1f5f9",
    background: "#fff",
    color: "#94a3b8",
    cursor: "pointer",
    flexShrink: 0,
    marginTop: "24px",
    transition: "all 0.15s ease",
  },
  removeItemBtnHover: {
    background: "#fef2f2",
    borderColor: "#fecaca",
    color: "#ef4444",
  },
  addItemBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "1px dashed #dbeafe",
    borderRadius: "10px",
    padding: "10px 18px",
    background: "#fafbfc",
    color: "#2563eb",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "12px",
    transition: "all 0.15s ease",
  },
  addItemBtnHover: {
    background: "#eff6ff",
    borderColor: "#93c5fd",
  },

  /* ── Totais ──────────────────────────────────────── */
  totaisBox: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "16px",
    padding: "16px 18px",
    background: "#fafbfc",
    borderRadius: "12px",
    border: "1px solid #f1f5f9",
  },
  totaisRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totaisLabel: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#64748b",
  },
  totaisValue: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a",
  },

  /* ── Detail ──────────────────────────────────────── */
  detailItems: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    background: "#fafbfc",
    borderRadius: "10px",
    padding: "14px 16px",
    border: "1px solid #f1f5f9",
  },
  detailLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  detailValue: {
    fontSize: "14px",
    color: "#0f172a",
    fontWeight: "500",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  /* ── Table ───────────────────────────────────────── */
  tableWrapper: {
    overflowX: "auto",
    borderRadius: "10px",
    border: "1px solid #f1f5f9",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    background: "#fafbfc",
    color: "#64748b",
    fontWeight: "600",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "12px 16px",
    color: "#334155",
    borderBottom: "1px solid #fafbfc",
    fontWeight: "500",
  },
};

export default AbaOrcamentos;
import { useEffect, useState, useMemo } from "react";

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

function formatarBRL(valor) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

const FORMAS_PAGAMENTO = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  boleto: "Boleto",
  transferencia: "Transferência",
  cheque: "Cheque",
};

const STATUS_CONFIG = {
  confirmado: { label: "Confirmado", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  pendente: { label: "Pendente", color: "#ca8a04", bg: "#fefce8", border: "#fef08a" },
  cancelado: { label: "Cancelado", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  estornado: { label: "Estornado", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
};

const EMPTY_FORM = {
  data: dataHojeISO(),
  valor: "",
  forma_pagamento: "dinheiro",
  status: "confirmado",
  parcela_atual: 1,
  total_parcelas: 1,
  orcamento_id: "",
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
  dollarSign: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
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
  trendingUp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  hash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" />
      <line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" />
    </svg>
  ),
  fileText: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  ),
  link: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════
   COMPONENTE
   ═══════════════════════════════════════════════════════════ */
function AbaPagamentos({ pacienteId }) {
  const [pagamentos, setPagamentos] = useState([]);
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

  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  const [orcamentos, setOrcamentos] = useState([]);

  /* ── Resumo financeiro ──────────────────── */
  const resumo = useMemo(() => {
    let totalConfirmado = 0;
    let totalPendente = 0;
    pagamentos.forEach((p) => {
      if (p.status === "confirmado") totalConfirmado += p.valor || 0;
      if (p.status === "pendente") totalPendente += p.valor || 0;
    });
    return { totalConfirmado, totalPendente, quantidade: pagamentos.length };
  }, [pagamentos]);

  /* ── Carregar ────────────────────────────── */
  useEffect(() => {
    carregarPagamentos();
  }, [pacienteId]);

  async function carregarPagamentos() {
    try {
      setCarregando(true);
      setErro("");
      const tk = localStorage.getItem("token");
      const r = await fetch(`http://localhost:3001/pagamentos/paciente/${pacienteId}`, {
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setPagamentos(Array.isArray(data) ? data : []);
    } catch {
      setErro("Erro ao carregar pagamentos.");
    } finally {
      setCarregando(false);
    }
  }

  async function carregarOrcamentos() {
    try {
      const tk = localStorage.getItem("token");
      const r = await fetch(`http://localhost:3001/orcamentos/paciente/${pacienteId}`, {
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setOrcamentos(Array.isArray(data) ? data : []);
    } catch {
      setOrcamentos([]);
    }
  }

  /* ── Abrir form ──────────────────────────── */
  function abrirFormNovo() {
    setEditando(null);
    setFormData({ ...EMPTY_FORM });
    setErroForm("");
    carregarOrcamentos();
    setTela("form");
  }

  function abrirFormEditar(item) {
    setEditando(item);
    setFormData({
      data: item.data || dataHojeISO(),
      valor: item.valor || "",
      forma_pagamento: item.forma_pagamento || "dinheiro",
      status: item.status || "confirmado",
      parcela_atual: item.parcela_atual || 1,
      total_parcelas: item.total_parcelas || 1,
      orcamento_id: item.orcamento_id || "",
      descricao: item.descricao || "",
      observacoes: item.observacoes || "",
    });
    setErroForm("");
    carregarOrcamentos();
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
    if (!formData.data) { setErroForm("A data é obrigatória."); return; }
    if (!formData.valor || Number(formData.valor) <= 0) { setErroForm("O valor deve ser maior que zero."); return; }

    try {
      setSalvando(true);
      setErroForm("");
      const tk = localStorage.getItem("token");
      const ed = Boolean(editando);
      const body = {
        ...formData,
        paciente_id: Number(pacienteId),
        valor: Number(formData.valor),
        parcela_atual: Number(formData.parcela_atual) || 1,
        total_parcelas: Number(formData.total_parcelas) || 1,
        orcamento_id: formData.orcamento_id ? Number(formData.orcamento_id) : null,
      };

      const r = await fetch(
        ed ? `http://localhost:3001/pagamentos/${editando.id}` : "http://localhost:3001/pagamentos",
        {
          method: ed ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", Authorization: tk || "" },
          body: JSON.stringify(body),
        }
      );
      if (!r.ok) throw new Error();
      await carregarPagamentos();
      voltarParaLista();
    } catch {
      setErroForm("Não foi possível salvar o pagamento.");
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
      const r = await fetch(`http://localhost:3001/pagamentos/${confirmarExclusao.id}`, {
        method: "DELETE",
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      setConfirmarExclusao(null);
      await carregarPagamentos();
      if (tela !== "lista") voltarParaLista();
    } catch {
      setErro("Erro ao excluir pagamento.");
    } finally {
      setExcluindo(false);
    }
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
            <h2 style={S.title}>Pagamentos</h2>
            <p style={S.subtitle}>
              {pagamentos.length} registro{pagamentos.length !== 1 ? "s" : ""} financeiro{pagamentos.length !== 1 ? "s" : ""}
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
            <span>Novo pagamento</span>
          </button>
        </div>

        {/* Resumo financeiro */}
        {!carregando && !erro && pagamentos.length > 0 && (
          <div style={S.resumoGrid}>
            <div style={S.resumoCard}>
              <div style={S.resumoIconWrap}>
                <span style={{ display: "flex", color: "#16a34a" }}>{Icons.trendingUp}</span>
              </div>
              <div>
                <span style={S.resumoLabel}>Total recebido</span>
                <span style={{ ...S.resumoValue, color: "#16a34a" }}>{formatarBRL(resumo.totalConfirmado)}</span>
              </div>
            </div>
            <div style={S.resumoCard}>
              <div style={{ ...S.resumoIconWrap, background: "#fefce8" }}>
                <span style={{ display: "flex", color: "#ca8a04" }}>{Icons.clock}</span>
              </div>
              <div>
                <span style={S.resumoLabel}>Total pendente</span>
                <span style={{ ...S.resumoValue, color: "#ca8a04" }}>{formatarBRL(resumo.totalPendente)}</span>
              </div>
            </div>
            <div style={S.resumoCard}>
              <div style={{ ...S.resumoIconWrap, background: "#eff6ff" }}>
                <span style={{ display: "flex", color: "#2563eb" }}>{Icons.hash}</span>
              </div>
              <div>
                <span style={S.resumoLabel}>Pagamentos</span>
                <span style={{ ...S.resumoValue, color: "#0f172a" }}>{resumo.quantidade}</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {carregando && (
          <div style={S.feedbackBox}>
            <div style={S.loadingPulse}>
              <div style={S.loadingDot1} />
              <div style={S.loadingDot2} />
              <div style={S.loadingDot3} />
            </div>
            <span style={S.feedbackText}>Carregando pagamentos...</span>
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
        {!carregando && !erro && pagamentos.length === 0 && (
          <div style={S.emptyBox}>
            {Icons.wallet}
            <h3 style={S.emptyTitle}>Nenhum pagamento registrado</h3>
            <p style={S.emptyText}>Registre o primeiro pagamento deste paciente para acompanhar o financeiro.</p>
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
              <span>Registrar pagamento</span>
            </button>
          </div>
        )}

        {/* Lista de cards */}
        {!carregando && !erro && pagamentos.length > 0 && (
          <div style={S.cardGrid}>
            {pagamentos.map((p) => {
              const hovered = hoveredCardId === p.id;
              const stCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pendente;
              return (
                <div
                  key={p.id}
                  style={{ ...S.card, ...(hovered ? S.cardHover : {}) }}
                  onMouseEnter={() => setHoveredCardId(p.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                >
                  {/* Topo */}
                  <div style={S.cardTop}>
                    <div style={S.cardDateBadge}>
                      <span style={{ display: "flex", color: "#2563eb" }}>{Icons.calendar}</span>
                      {formatarDataBR(p.data)}
                    </div>
                    <span
                      style={{
                        ...S.statusBadge,
                        color: stCfg.color,
                        background: stCfg.bg,
                        borderColor: stCfg.border,
                      }}
                    >
                      {stCfg.label}
                    </span>
                  </div>

                  {/* Valor */}
                  <div style={S.valorRow}>
                    <span style={S.valorMain}>{formatarBRL(p.valor)}</span>
                    <span style={S.cardId}>#{p.id}</span>
                  </div>

                  {/* Detalhes rápidos */}
                  <div style={S.pillRow}>
                    <span style={S.pill}>{FORMAS_PAGAMENTO[p.forma_pagamento] || p.forma_pagamento}</span>
                    {p.total_parcelas > 1 && (
                      <span style={S.pill}>{p.parcela_atual}/{p.total_parcelas}x</span>
                    )}
                    {p.orcamento_id && (
                      <span style={{ ...S.pill, background: "#eff6ff", color: "#2563eb", borderColor: "#bfdbfe" }}>
                        Orç. #{p.orcamento_id}
                      </span>
                    )}
                  </div>

                  {/* Descrição */}
                  {p.descricao && (
                    <div style={S.cardSection}>
                      <span style={S.cardSectionLabel}>Descrição</span>
                      <p style={S.cardSectionText}>{p.descricao}</p>
                    </div>
                  )}

                  {/* Ações */}
                  <div style={S.cardActions}>
                    <button
                      style={{
                        ...S.cardBtn,
                        ...(hoveredBtn === `ver-${p.id}` ? S.cardBtnHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`ver-${p.id}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => abrirDetalhes(p)}
                    >
                      {Icons.eye}
                      <span>Ver</span>
                    </button>
                    <button
                      style={{
                        ...S.cardBtn,
                        ...(hoveredBtn === `editar-${p.id}` ? S.cardBtnHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`editar-${p.id}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => abrirFormEditar(p)}
                    >
                      {Icons.edit}
                      <span>Editar</span>
                    </button>
                    <button
                      style={{
                        ...S.cardBtn,
                        ...S.cardBtnDanger,
                        ...(hoveredBtn === `excluir-${p.id}` ? S.cardBtnDangerHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`excluir-${p.id}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => setConfirmarExclusao(p)}
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
              <h3 style={S.confirmTitle}>Excluir pagamento #{confirmarExclusao.id}?</h3>
              <p style={S.confirmText}>Esta ação é irreversível. Todos os dados deste pagamento serão permanentemente removidos.</p>
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
          @keyframes pagamento-pulse-dot {
            0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
          @keyframes pagamento-fade-in {
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
            <h2 style={S.title}>{editando ? "Editar pagamento" : "Novo pagamento"}</h2>
            <p style={S.subtitle}>{editando ? "Altere os dados do pagamento." : "Registre um novo pagamento do paciente."}</p>
          </div>
        </div>

        <form onSubmit={handleSalvar} style={S.formWrap}>

          {/* Dados principais */}
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>{Icons.dollarSign}</span>
              <span style={S.formCardTitle}>Dados do pagamento</span>
            </div>
            <div style={S.formGrid2}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Data *</label>
                <input type="date" name="data" value={formData.data} onChange={handleInput} style={S.input} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Valor (R$) *</label>
                <input type="number" name="valor" value={formData.valor} onChange={handleInput} placeholder="0.00" step="0.01" min="0" style={S.input} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Forma de pagamento</label>
                <select name="forma_pagamento" value={formData.forma_pagamento} onChange={handleInput} style={S.input}>
                  {Object.entries(FORMAS_PAGAMENTO).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Status</label>
                <select name="status" value={formData.status} onChange={handleInput} style={S.input}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Parcela atual</label>
                <input type="number" name="parcela_atual" value={formData.parcela_atual} onChange={handleInput} min="1" style={S.input} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Total de parcelas</label>
                <input type="number" name="total_parcelas" value={formData.total_parcelas} onChange={handleInput} min="1" style={S.input} />
              </div>
            </div>
          </div>

          {/* Vínculo com orçamento */}
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>{Icons.link}</span>
              <span style={S.formCardTitle}>Vínculo com orçamento (opcional)</span>
            </div>
            <div style={S.formGrid1}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Orçamento</label>
                <select name="orcamento_id" value={formData.orcamento_id} onChange={handleInput} style={S.input}>
                  <option value="">Nenhum</option>
                  {orcamentos.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.id} — {formatarDataBR(o.data)} — {o.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Descrição e observações */}
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>{Icons.fileText}</span>
              <span style={S.formCardTitle}>Descrição e observações</span>
            </div>
            <div style={S.formGrid1}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Descrição</label>
                <textarea name="descricao" value={formData.descricao} onChange={handleInput} placeholder="Ex: Pagamento referente a limpeza..." style={S.textarea} rows={3} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Observações</label>
                <textarea name="observacoes" value={formData.observacoes} onChange={handleInput} placeholder="Notas adicionais..." style={S.textarea} rows={3} />
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
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Registrar pagamento"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER — DETALHES
     ═════════════════════════════���═════════════ */
  if (tela === "detalhes" && detalhes) {
    const stCfg = STATUS_CONFIG[detalhes.status] || STATUS_CONFIG.pendente;
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
            <h2 style={S.title}>Pagamento #{detalhes.id}</h2>
            <p style={S.subtitle}>Registrado em {formatarDataBR(detalhes.data)}</p>
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

        {/* Card principal */}
        <div style={S.formCard}>
          <div style={S.formCardHeader}>
            <span style={S.formCardIcon}>{Icons.dollarSign}</span>
            <span style={S.formCardTitle}>Dados do pagamento</span>
          </div>
          <div style={S.detailItems}>
            <div style={S.detailItem}>
              <span style={S.detailLabel}>Valor</span>
              <span style={{ ...S.detailValue, fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>{formatarBRL(detalhes.valor)}</span>
            </div>
            <div style={S.detailItem}>
              <span style={S.detailLabel}>Status</span>
              <span
                style={{
                  ...S.statusBadge,
                  color: stCfg.color,
                  background: stCfg.bg,
                  borderColor: stCfg.border,
                  alignSelf: "flex-start",
                }}
              >
                {stCfg.label}
              </span>
            </div>
            <div style={S.detailItem}>
              <span style={S.detailLabel}>Data</span>
              <span style={S.detailValue}>{formatarDataBR(detalhes.data)}</span>
            </div>
            <div style={S.detailItem}>
              <span style={S.detailLabel}>Forma de pagamento</span>
              <span style={S.detailValue}>{FORMAS_PAGAMENTO[detalhes.forma_pagamento] || detalhes.forma_pagamento}</span>
            </div>
            {detalhes.total_parcelas > 1 && (
              <div style={S.detailItem}>
                <span style={S.detailLabel}>Parcela</span>
                <span style={S.detailValue}>{detalhes.parcela_atual}/{detalhes.total_parcelas}</span>
              </div>
            )}
            {detalhes.orcamento_id && (
              <div style={S.detailItem}>
                <span style={S.detailLabel}>Orçamento vinculado</span>
                <span style={S.detailValue}>#{detalhes.orcamento_id}</span>
              </div>
            )}
          </div>
        </div>

        {/* Descrição e observações */}
        {(detalhes.descricao || detalhes.observacoes) && (
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>{Icons.fileText}</span>
              <span style={S.formCardTitle}>Descrição e observações</span>
            </div>
            <div style={S.detailItems}>
              {detalhes.descricao && (
                <div style={{ ...S.detailItem, gridColumn: "1 / -1" }}>
                  <span style={S.detailLabel}>Descrição</span>
                  <span style={{ ...S.detailValue, whiteSpace: "pre-wrap" }}>{detalhes.descricao}</span>
                </div>
              )}
              {detalhes.observacoes && (
                <div style={{ ...S.detailItem, gridColumn: "1 / -1" }}>
                  <span style={S.detailLabel}>Observações</span>
                  <span style={{ ...S.detailValue, whiteSpace: "pre-wrap" }}>{detalhes.observacoes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal confirmar exclusão */}
        {confirmarExclusao && (
          <div style={S.overlay} onClick={() => setConfirmarExclusao(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.modalIconWrap}>{Icons.alertTriangle}</div>
              <h3 style={S.confirmTitle}>Excluir pagamento #{confirmarExclusao.id}?</h3>
              <p style={S.confirmText}>Esta ação é irreversível. Todos os dados deste pagamento serão permanentemente removidos.</p>
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
    animation: "pagamento-fade-in 0.3s ease",
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

  /* ── Resumo financeiro ───────────────────────────── */
  resumoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },
  resumoCard: {
    display: "flex", alignItems: "center", gap: "14px",
    background: "#fff", borderRadius: "14px",
    border: "1px solid #f1f5f9", padding: "18px 20px",
  },
  resumoIconWrap: {
    width: "40px", height: "40px", borderRadius: "10px",
    background: "#f0fdf4", display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  resumoLabel: {
    display: "block", fontSize: "12px", fontWeight: "600",
    color: "#94a3b8", textTransform: "uppercase",
    letterSpacing: "0.04em", marginBottom: "2px",
  },
  resumoValue: {
    display: "block", fontSize: "18px", fontWeight: "700",
    letterSpacing: "-0.02em",
  },

  /* ── Buttons ─────────────────────────────────────── */
  btnPrimary: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    border: "none", borderRadius: "10px", padding: "10px 20px",
    background: "#2563eb", color: "#fff", fontWeight: "600", fontSize: "14px",
    cursor: "pointer", boxShadow: "0 1px 3px rgba(37,99,235,0.2)",
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
    background: "#fff", color: "#475569", fontWeight: "500", fontSize: "13px",
    cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap",
    height: "40px", boxSizing: "border-box",
  },
  btnSecondaryHover: { background: "#f8fafc", borderColor: "#cbd5e1" },
  btnDanger: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    border: "none", borderRadius: "10px", padding: "0 16px",
    background: "#ef4444", color: "#fff", fontWeight: "600", fontSize: "13px",
    cursor: "pointer", transition: "all 0.2s ease", whiteSpace: "nowrap",
    height: "40px", boxSizing: "border-box",
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
    animation: "pagamento-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0s",
  },
  loadingDot2: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "pagamento-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.2s",
  },
  loadingDot3: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "pagamento-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.4s",
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

  /* ── Status Badge ───────────────────────────────── */
  statusBadge: {
    display: "inline-flex", alignItems: "center",
    fontSize: "12px", fontWeight: "600", borderRadius: "8px",
    padding: "4px 10px", border: "1px solid",
  },

  /* ── Valor ──────────────────────────────────────── */
  valorRow: {
    display: "flex", alignItems: "baseline", justifyContent: "space-between",
  },
  valorMain: {
    fontSize: "20px", fontWeight: "700", color: "#0f172a",
    letterSpacing: "-0.02em",
  },

  /* ── Card section ──────────────────────────────── */
  cardSection: {
    display: "flex", flexDirection: "column", gap: "6px",
    background: "#fafbfc", borderRadius: "10px",
    padding: "14px 16px", border: "1px solid #f1f5f9",
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
    fontSize: "12px", fontWeight: "600", borderRadius: "6px",
    padding: "4px 10px", background: "#f8fafc", color: "#475569",
    border: "1px solid #f1f5f9",
  },

  /* ── Card Actions ────────────────────────────────── */
  cardActions: {
    display: "flex", gap: "8px", borderTop: "1px solid #f8fafc",
    paddingTop: "14px", marginTop: "auto",
  },
  cardBtn: {
    display: "inline-flex", alignItems: "center", gap: "5px",
    border: "1px solid #f1f5f9", borderRadius: "8px", padding: "6px 12px",
    background: "#fff", color: "#64748b", fontSize: "12px", fontWeight: "600",
    cursor: "pointer", transition: "all 0.15s ease",
  },
  cardBtnHover: { background: "#f8fafc", borderColor: "#e2e8f0", color: "#0f172a" },
  cardBtnDanger: { color: "#ef4444", borderColor: "#fef2f2" },
  cardBtnDangerHover: { background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" },

  /* ── Overlay / Modal ─────────────────────────────── */
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: "24px",
  },
  modal: {
    background: "#fff", borderRadius: "20px", padding: "32px",
    maxWidth: "420px", width: "100%", textAlign: "center",
    boxShadow: "0 24px 48px rgba(15,23,42,0.12)",
  },
  modalIconWrap: { marginBottom: "16px", display: "flex", justifyContent: "center" },
  confirmTitle: { margin: "0 0 8px", fontSize: "17px", fontWeight: "700", color: "#0f172a" },
  confirmText: { margin: "0 0 24px", fontSize: "14px", color: "#64748b", lineHeight: 1.5 },
  modalActions: { display: "flex", gap: "10px", justifyContent: "center" },

  /* ── Form ────────────────────────────────────────── */
  formWrap: { display: "flex", flexDirection: "column", gap: "20px" },
  formCard: {
    background: "#fff", borderRadius: "16px",
    border: "1px solid #f1f5f9", padding: "24px",
  },
  formCardHeader: {
    display: "flex", alignItems: "center", gap: "10px",
    marginBottom: "18px",
  },
  formCardIcon: { display: "flex", color: "#94a3b8" },
  formCardTitle: {
    fontSize: "15px", fontWeight: "600", color: "#0f172a",
    letterSpacing: "-0.01em",
  },
  formGrid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  formGrid1: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "16px",
  },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: {
    fontSize: "12px", fontWeight: "600", color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.04em",
  },
  input: {
    width: "100%", padding: "10px 14px", borderRadius: "10px",
    border: "1px solid #e2e8f0", fontSize: "14px", color: "#0f172a",
    outline: "none", transition: "border-color 0.15s ease",
    background: "#fafbfc", boxSizing: "border-box",
  },
  textarea: {
    width: "100%", padding: "10px 14px", borderRadius: "10px",
    border: "1px solid #e2e8f0", fontSize: "14px", color: "#0f172a",
    outline: "none", transition: "border-color 0.15s ease",
    background: "#fafbfc", boxSizing: "border-box", resize: "vertical",
    fontFamily: "inherit",
  },
  formActions: {
    display: "flex", gap: "12px", justifyContent: "flex-end",
  },

  /* ── Detail Items ────────────────────────────────── */
  detailItems: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "2px", borderRadius: "12px", overflow: "hidden",
    background: "#f1f5f9",
  },
  detailItem: {
    display: "flex", flexDirection: "column", gap: "4px",
    padding: "14px 16px", background: "#fafbfc",
  },
  detailLabel: {
    fontSize: "11px", fontWeight: "600", color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.06em",
  },
  detailValue: {
    color: "#0f172a", fontSize: "14px", fontWeight: "500",
    wordBreak: "break-word", lineHeight: 1.4,
  },
};

export default AbaPagamentos;
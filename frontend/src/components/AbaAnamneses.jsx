import API_URL from "../api";
import { useEffect, useState } from "react";

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

/* ═══════════════════════════════════════════════════════════
   FORM SECTIONS CONFIG
   ═══════════════════════════════════════════════════════════ */
const FORM_SECTIONS = [
  {
    title: "Queixa e história",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    fields: [
      { name: "queixa_principal", label: "Queixa principal", type: "textarea", placeholder: "Motivo da consulta..." },
      { name: "historia_medica", label: "História médica", type: "textarea", placeholder: "Antecedentes médicos relevantes..." },
    ],
  },
  {
    title: "Medicamentos e alergias",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </svg>
    ),
    fields: [
      { name: "medicamentos", label: "Medicamentos em uso", type: "textarea", placeholder: "Liste medicamentos..." },
      { name: "alergias", label: "Alergias", type: "textarea", placeholder: "Alergias conhecidas..." },
    ],
  },
  {
    title: "Histórico clínico",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z" />
      </svg>
    ),
    fields: [
      { name: "cirurgias_anteriores", label: "Cirurgias anteriores", type: "textarea", placeholder: "Cirurgias realizadas..." },
      { name: "doencas_cronicas", label: "Doenças crônicas", type: "textarea", placeholder: "Diabetes, hipertensão..." },
      { name: "habitos", label: "Hábitos", type: "textarea", placeholder: "Tabagismo, bruxismo..." },
      { name: "historico_familiar", label: "Histórico familiar", type: "textarea", placeholder: "Doenças na família..." },
    ],
  },
  {
    title: "Sinais vitais",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
    fields: [
      { name: "pressao_arterial", label: "Pressão arterial", type: "text", placeholder: "Ex: 120/80" },
      { name: "frequencia_cardiaca", label: "Freq. cardíaca (bpm)", type: "text", placeholder: "Ex: 72" },
      { name: "glicemia", label: "Glicemia (mg/dL)", type: "text", placeholder: "Ex: 90" },
    ],
  },
  {
    title: "Observações",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    ),
    fields: [
      { name: "observacoes", label: "Observações gerais", type: "textarea", placeholder: "Notas adicionais..." },
    ],
  },
];

const EMPTY_FORM = {
  data: dataHojeISO(),
  queixa_principal: "", historia_medica: "",
  medicamentos: "", alergias: "",
  cirurgias_anteriores: "", doencas_cronicas: "",
  habitos: "", historico_familiar: "",
  observacoes: "",
  pressao_arterial: "", frequencia_cardiaca: "", glicemia: "",
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
};

/* ═══════════════════════════════════════════════════════════
   COMPONENTE
   ═══════════════════════════════════════════════════════════ */
function AbaAnamneses({ pacienteId }) {
  const [anamneses, setAnamneses] = useState([]);
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

  /* ── Carregar ────────────────────────────── */
  useEffect(() => {
    carregarAnamneses();
  }, [pacienteId]);

  async function carregarAnamneses() {
    try {
      setCarregando(true);
      setErro("");
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/anamneses/paciente/${pacienteId}`, {
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setAnamneses(Array.isArray(data) ? data : []);
    } catch {
      setErro("Erro ao carregar anamneses.");
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
      data: item.data || dataHojeISO(),
      queixa_principal: item.queixa_principal || "",
      historia_medica: item.historia_medica || "",
      medicamentos: item.medicamentos || "",
      alergias: item.alergias || "",
      cirurgias_anteriores: item.cirurgias_anteriores || "",
      doencas_cronicas: item.doencas_cronicas || "",
      habitos: item.habitos || "",
      historico_familiar: item.historico_familiar || "",
      observacoes: item.observacoes || "",
      pressao_arterial: item.pressao_arterial || "",
      frequencia_cardiaca: item.frequencia_cardiaca || "",
      glicemia: item.glicemia || "",
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
    if (!formData.data) { setErroForm("A data é obrigatória."); return; }

    try {
      setSalvando(true);
      setErroForm("");
      const tk = localStorage.getItem("token");
      const ed = Boolean(editando);
      const body = { ...formData, paciente_id: Number(pacienteId) };

      const r = await fetch(
        ed ? `${API_URL}/anamneses/${editando.id}` : `${API_URL}/anamneses`,
        {
          method: ed ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", Authorization: tk || "" },
          body: JSON.stringify(body),
        }
      );
      if (!r.ok) throw new Error();
      await carregarAnamneses();
      voltarParaLista();
    } catch {
      setErroForm("Não foi possível salvar a anamnese.");
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
      const r = await fetch(`${API_URL}/anamneses/${confirmarExclusao.id}`, {
        method: "DELETE",
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      setConfirmarExclusao(null);
      await carregarAnamneses();
      if (tela !== "lista") voltarParaLista();
    } catch {
      setErro("Erro ao excluir anamnese.");
    } finally {
      setExcluindo(false);
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
            <h2 style={S.title}>Anamneses</h2>
            <p style={S.subtitle}>
              {anamneses.length} registro{anamneses.length !== 1 ? "s" : ""} clínico{anamneses.length !== 1 ? "s" : ""}
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
            <span>Nova anamnese</span>
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
            <span style={S.feedbackText}>Carregando anamneses...</span>
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
        {!carregando && !erro && anamneses.length === 0 && (
          <div style={S.emptyBox}>
            {Icons.clipboard}
            <h3 style={S.emptyTitle}>Nenhuma anamnese registrada</h3>
            <p style={S.emptyText}>Registre a primeira anamnese deste paciente para manter o histórico clínico atualizado.</p>
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
              <span>Criar anamnese</span>
            </button>
          </div>
        )}

        {/* Lista de cards */}
        {!carregando && !erro && anamneses.length > 0 && (
          <div style={S.cardGrid}>
            {anamneses.map((a) => {
              const hovered = hoveredCardId === a.id;
              const camposPreenchidos = contarCamposPreenchidos(a);
              return (
                <div
                  key={a.id}
                  style={{ ...S.card, ...(hovered ? S.cardHover : {}) }}
                  onMouseEnter={() => setHoveredCardId(a.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                >
                  {/* Topo do card */}
                  <div style={S.cardTop}>
                    <div style={S.cardDateBadge}>
                      <span style={{ display: "flex", color: "#2563eb" }}>{Icons.calendar}</span>
                      {formatarDataBR(a.data)}
                    </div>
                    <span style={S.cardId}>#{a.id}</span>
                  </div>

                  {/* Queixa */}
                  {a.queixa_principal && (
                    <div style={S.cardSection}>
                      <span style={S.cardSectionLabel}>Queixa principal</span>
                      <p style={S.cardSectionText}>{a.queixa_principal}</p>
                    </div>
                  )}

                  {/* Sinais vitais pills */}
                  {(a.pressao_arterial || a.frequencia_cardiaca || a.glicemia) && (
                    <div style={S.pillRow}>
                      {a.pressao_arterial && <span style={S.pill}>PA {a.pressao_arterial}</span>}
                      {a.frequencia_cardiaca && <span style={S.pill}>FC {a.frequencia_cardiaca} bpm</span>}
                      {a.glicemia && <span style={S.pill}>Glic {a.glicemia} mg/dL</span>}
                    </div>
                  )}

                  {/* Campos preenchidos */}
                  <div style={S.metaRow}>
                    <span style={S.metaChip}>{camposPreenchidos} campo{camposPreenchidos !== 1 ? "s" : ""} preenchido{camposPreenchidos !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Ações */}
                  <div style={S.cardActions}>
                    <button
                      style={{
                        ...S.cardBtn,
                        ...(hoveredBtn === `ver-${a.id}` ? S.cardBtnHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`ver-${a.id}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => abrirDetalhes(a)}
                    >
                      {Icons.eye}
                      <span>Ver</span>
                    </button>
                    <button
                      style={{
                        ...S.cardBtn,
                        ...(hoveredBtn === `editar-${a.id}` ? S.cardBtnHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`editar-${a.id}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => abrirFormEditar(a)}
                    >
                      {Icons.edit}
                      <span>Editar</span>
                    </button>
                    <button
                      style={{
                        ...S.cardBtn,
                        ...S.cardBtnDanger,
                        ...(hoveredBtn === `excluir-${a.id}` ? S.cardBtnDangerHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`excluir-${a.id}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => setConfirmarExclusao(a)}
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
              <h3 style={S.confirmTitle}>Excluir anamnese #{confirmarExclusao.id}?</h3>
              <p style={S.confirmText}>Esta ação é irreversível. Todos os dados desta anamnese serão permanentemente removidos.</p>
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
          @keyframes anamnese-pulse-dot {
            0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
          @keyframes anamnese-fade-in {
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
            <h2 style={S.title}>{editando ? "Editar anamnese" : "Nova anamnese"}</h2>
            <p style={S.subtitle}>{editando ? "Altere os dados clínicos do paciente." : "Preencha o questionário de saúde do paciente."}</p>
          </div>
        </div>

        <form onSubmit={handleSalvar} style={S.formWrap}>

          {/* Data */}
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>{Icons.calendar}</span>
              <span style={S.formCardTitle}>Data da anamnese</span>
            </div>
            <input
              type="date"
              name="data"
              value={formData.data}
              onChange={handleInput}
              style={S.input}
            />
          </div>

          {/* Seções dinâmicas */}
          {FORM_SECTIONS.map((sec) => (
            <div key={sec.title} style={S.formCard}>
              <div style={S.formCardHeader}>
                <span style={S.formCardIcon}>{sec.icon}</span>
                <span style={S.formCardTitle}>{sec.title}</span>
              </div>
              <div style={sec.fields.length <= 2 ? S.formGrid2 : S.formGrid1}>
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
                        type="text"
                        name={f.name}
                        value={formData[f.name]}
                        onChange={handleInput}
                        placeholder={f.placeholder}
                        style={S.input}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

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
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Salvar anamnese"}
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
            <h2 style={S.title}>Anamnese #{detalhes.id}</h2>
            <p style={S.subtitle}>Registrada em {formatarDataBR(detalhes.data)}</p>
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

        {/* Conteúdo */}
        <div style={S.detailGrid}>
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
                      <span style={S.detailValue}>{detalhes[f.name]}</span>
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
              <h3 style={S.confirmTitle}>Excluir anamnese #{confirmarExclusao.id}?</h3>
              <p style={S.confirmText}>Esta ação é irreversível. Todos os dados desta anamnese serão permanentemente removidos.</p>
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

/* ═══════════════���═══════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   ═══════════════════════════════════════════════════════════ */
const S = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    animation: "anamnese-fade-in 0.3s ease",
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
    animation: "anamnese-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0s",
  },
  loadingDot2: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "anamnese-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.2s",
  },
  loadingDot3: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "anamnese-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.4s",
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
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "#f0fdf4",
    color: "#15803d",
    border: "1px solid #dcfce7",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: "600",
  },

  /* ── Meta ─────────────────────────────────────────── */
  metaRow: {
    display: "flex",
    alignItems: "center",
  },
  metaChip: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#94a3b8",
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
    animation: "anamnese-fade-in 0.2s ease",
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

  /* ── Form ─────────��──────────────────────────────── */
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
  formGrid1: {
    display: "flex",
    flexDirection: "column",
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

  /* ── Detail ──────────────────────────────────────── */
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: "16px",
  },
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
};

export default AbaAnamneses;
import { useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function formatarDataBR(iso) {
  if (!iso) return "-";
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
    icon: "💬",
    fields: [
      { name: "queixa_principal", label: "Queixa principal", type: "textarea", placeholder: "Motivo da consulta..." },
      { name: "historia_medica", label: "História médica", type: "textarea", placeholder: "Antecedentes médicos relevantes..." },
    ],
  },
  {
    title: "Medicamentos e alergias",
    icon: "💊",
    fields: [
      { name: "medicamentos", label: "Medicamentos em uso", type: "textarea", placeholder: "Liste medicamentos..." },
      { name: "alergias", label: "Alergias", type: "textarea", placeholder: "Alergias conhecidas..." },
    ],
  },
  {
    title: "Histórico clínico",
    icon: "🩺",
    fields: [
      { name: "cirurgias_anteriores", label: "Cirurgias anteriores", type: "textarea", placeholder: "Cirurgias realizadas..." },
      { name: "doencas_cronicas", label: "Doenças crônicas", type: "textarea", placeholder: "Diabetes, hipertensão..." },
      { name: "habitos", label: "Hábitos", type: "textarea", placeholder: "Tabagismo, bruxismo..." },
      { name: "historico_familiar", label: "Histórico familiar", type: "textarea", placeholder: "Doenças na família..." },
    ],
  },
  {
    title: "Sinais vitais",
    icon: "❤️",
    fields: [
      { name: "pressao_arterial", label: "Pressão arterial", type: "text", placeholder: "Ex: 120/80" },
      { name: "frequencia_cardiaca", label: "Freq. cardíaca (bpm)", type: "text", placeholder: "Ex: 72" },
      { name: "glicemia", label: "Glicemia (mg/dL)", type: "text", placeholder: "Ex: 90" },
    ],
  },
  {
    title: "Observações",
    icon: "📝",
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
   COMPONENTE
   ═══════════════════════════════════════════════════════════ */
function AbaAnamneses({ pacienteId }) {
  const [anamneses, setAnamneses] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // Tela atual: "lista" | "form" | "detalhes"
  const [tela, setTela] = useState("lista");
  const [editando, setEditando] = useState(null);
  const [detalhes, setDetalhes] = useState(null);

  // Form
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  // Excluir
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  // Hover states
  const [hoveredCardId, setHoveredCardId] = useState(null);

  /* ── Carregar ────────────────────────────── */
  useEffect(() => {
    carregarAnamneses();
  }, [pacienteId]);

  async function carregarAnamneses() {
    try {
      setCarregando(true); setErro("");
      const tk = localStorage.getItem("token");
      const r = await fetch(`http://localhost:3001/anamneses/paciente/${pacienteId}`, {
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
      setSalvando(true); setErroForm("");
      const tk = localStorage.getItem("token");
      const ed = Boolean(editando);
      const body = { ...formData, paciente_id: Number(pacienteId) };

      const r = await fetch(
        ed ? `http://localhost:3001/anamneses/${editando.id}` : "http://localhost:3001/anamneses",
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
      const r = await fetch(`http://localhost:3001/anamneses/${confirmarExclusao.id}`, {
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
          <button style={S.btnPrimary} onClick={abrirFormNovo}>
            + Nova anamnese
          </button>
        </div>

        {/* Loading */}
        {carregando && (
          <div style={S.feedbackBox}>
            <div style={S.spinner} />
            <span style={S.feedbackText}>Carregando...</span>
          </div>
        )}

        {/* Erro */}
        {erro && <div style={S.errorBox}>{erro}</div>}

        {/* Vazio */}
        {!carregando && !erro && anamneses.length === 0 && (
          <div style={S.emptyBox}>
            <span style={S.emptyIcon}>📋</span>
            <h3 style={S.emptyTitle}>Nenhuma anamnese</h3>
            <p style={S.emptyText}>Registre a primeira anamnese deste paciente.</p>
            <button style={{ ...S.btnPrimary, marginTop: "8px" }} onClick={abrirFormNovo}>
              + Criar anamnese
            </button>
          </div>
        )}

        {/* Lista de cards */}
        {!carregando && !erro && anamneses.length > 0 && (
          <div style={S.cardGrid}>
            {anamneses.map((a) => {
              const hovered = hoveredCardId === a.id;
              return (
                <div
                  key={a.id}
                  style={{ ...S.card, ...(hovered ? S.cardHover : {}) }}
                  onMouseEnter={() => setHoveredCardId(a.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                >
                  {/* Topo do card */}
                  <div style={S.cardTop}>
                    <div style={S.cardDateBadge}>{formatarDataBR(a.data)}</div>
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
                      {a.pressao_arterial && <span style={S.pill}>PA: {a.pressao_arterial}</span>}
                      {a.frequencia_cardiaca && <span style={S.pill}>FC: {a.frequencia_cardiaca}</span>}
                      {a.glicemia && <span style={S.pill}>Glic: {a.glicemia}</span>}
                    </div>
                  )}

                  {/* Ações */}
                  <div style={S.cardActions}>
                    <button style={S.cardBtn} onClick={() => abrirDetalhes(a)}>
                      👁️ Ver
                    </button>
                    <button style={S.cardBtn} onClick={() => abrirFormEditar(a)}>
                      ✏️ Editar
                    </button>
                    <button style={{ ...S.cardBtn, ...S.cardBtnDanger }} onClick={() => setConfirmarExclusao(a)}>
                      Excluir
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
              <div style={S.confirmIcon}>🗑️</div>
              <h3 style={S.confirmTitle}>Excluir anamnese #{confirmarExclusao.id}?</h3>
              <p style={S.confirmText}>Esta ação não poderá ser desfeita.</p>
              <div style={S.modalActions}>
                <button style={S.btnSecondary} onClick={() => setConfirmarExclusao(null)} disabled={excluindo}>
                  Cancelar
                </button>
                <button style={S.btnDanger} onClick={handleExcluir} disabled={excluindo}>
                  {excluindo ? "Excluindo..." : "Confirmar exclusão"}
                </button>
              </div>
            </div>
          </div>
        )}
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
            <button style={S.backBtn} onClick={voltarParaLista}>← Voltar</button>
            <h2 style={S.title}>{editando ? "Editar anamnese" : "Nova anamnese"}</h2>
            <p style={S.subtitle}>{editando ? "Altere os dados clínicos." : "Preencha o questionário de saúde."}</p>
          </div>
        </div>

        <form onSubmit={handleSalvar} style={S.formWrap}>

          {/* Data */}
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>📅</span>
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
          {erroForm && <div style={S.errorBox}>{erroForm}</div>}

          {/* Ações */}
          <div style={S.formActions}>
            <button type="button" style={S.btnSecondary} onClick={voltarParaLista} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" style={S.btnPrimary} disabled={salvando}>
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
            <button style={S.backBtn} onClick={voltarParaLista}>← Voltar</button>
            <h2 style={S.title}>Anamnese #{detalhes.id}</h2>
            <p style={S.subtitle}>Registrada em {formatarDataBR(detalhes.data)}</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={S.btnSecondary} onClick={() => abrirFormEditar(detalhes)}>
              ✏️ Editar
            </button>
            <button style={S.btnDanger} onClick={() => setConfirmarExclusao(detalhes)}>
              Excluir
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
              <div style={S.confirmIcon}>🗑️</div>
              <h3 style={S.confirmTitle}>Excluir anamnese #{confirmarExclusao.id}?</h3>
              <p style={S.confirmText}>Esta ação não poderá ser desfeita.</p>
              <div style={S.modalActions}>
                <button style={S.btnSecondary} onClick={() => setConfirmarExclusao(null)} disabled={excluindo}>
                  Cancelar
                </button>
                <button style={S.btnDanger} onClick={handleExcluir} disabled={excluindo}>
                  {excluindo ? "Excluindo..." : "Confirmar exclusão"}
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
   STYLES
   ════════════════════════════════��══════════════════════════ */
const S = {
  wrapper: { display: "flex", flexDirection: "column", gap: "20px" },

  /* Header */
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" },
  title: { margin: 0, fontSize: "22px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.02em" },
  subtitle: { margin: "4px 0 0", fontSize: "14px", color: "#64748b", fontWeight: "500" },
  backBtn: { display: "inline-flex", alignItems: "center", gap: "4px", border: "none", background: "none", color: "#2563eb", fontWeight: "700", fontSize: "13px", cursor: "pointer", padding: "0", marginBottom: "8px" },

  /* Buttons */
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: "6px", border: "none", borderRadius: "12px", padding: "10px 20px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.2)", transition: "all 0.2s ease", whiteSpace: "nowrap" },
  btnSecondary: { display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #dbe4f0", borderRadius: "12px", padding: "10px 18px", background: "#fff", color: "#475569", fontWeight: "700", fontSize: "13px", cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap" },
  btnDanger: { display: "inline-flex", alignItems: "center", gap: "6px", border: "none", borderRadius: "12px", padding: "10px 18px", background: "#ef4444", color: "#fff", fontWeight: "700", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" },

  /* Feedback */
  feedbackBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", padding: "40px", background: "#fff", borderRadius: "20px", border: "1px solid #eef2f7" },
  spinner: { width: "32px", height: "32px", border: "3px solid #dbeafe", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  feedbackText: { fontSize: "14px", color: "#64748b", fontWeight: "600" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "14px", padding: "14px 18px", fontSize: "14px", fontWeight: "600" },

  /* Empty */
  emptyBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "48px 24px", background: "#fff", borderRadius: "20px", border: "1px solid #eef2f7", textAlign: "center" },
  emptyIcon: { fontSize: "40px" },
  emptyTitle: { margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" },
  emptyText: { margin: 0, fontSize: "14px", color: "#64748b" },

  /* Card grid */
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" },

  /* Card */
  card: { background: "#fff", borderRadius: "20px", border: "1px solid #eef2f7", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 6px 18px rgba(15,23,42,0.04)", transition: "all 0.2s ease", cursor: "default" },
  cardHover: { boxShadow: "0 12px 28px rgba(15,23,42,0.08)", borderColor: "#dbeafe" },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardDateBadge: { display: "inline-flex", alignItems: "center", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "6px 12px", fontSize: "13px", fontWeight: "700" },
  cardId: { fontSize: "12px", color: "#cbd5e1", fontWeight: "600" },

  cardSection: { display: "flex", flexDirection: "column", gap: "4px", background: "#f8fafc", borderRadius: "12px", padding: "12px 14px", border: "1px solid #f1f5f9" },
  cardSectionLabel: { fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  cardSectionText: { fontSize: "14px", color: "#334155", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },

  pillRow: { display: "flex", gap: "6px", flexWrap: "wrap" },
  pill: { display: "inline-flex", alignItems: "center", gap: "4px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "5px 10px", fontSize: "12px", fontWeight: "600" },

  cardActions: { display: "flex", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "14px", marginTop: "auto" },
  cardBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", border: "1px solid #eef2f7", background: "#fff", borderRadius: "10px", padding: "8px 0", fontSize: "13px", fontWeight: "600", color: "#475569", cursor: "pointer", transition: "all 0.15s ease" },
  cardBtnDanger: { color: "#ef4444", borderColor: "#fecaca" },

  /* Modal */
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 999 },
  modal: { width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "20px", padding: "32px", textAlign: "center", boxShadow: "0 24px 64px rgba(15,23,42,0.18)" },
  confirmIcon: { fontSize: "36px" },
  confirmTitle: { margin: "12px 0 0", fontSize: "18px", fontWeight: "800", color: "#0f172a" },
  confirmText: { margin: "6px 0 0", color: "#64748b", fontSize: "14px", lineHeight: 1.5 },
  modalActions: { display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" },

  /* Form */
  formWrap: { display: "flex", flexDirection: "column", gap: "16px" },

  formCard: { background: "#fff", borderRadius: "20px", border: "1px solid #eef2f7", padding: "20px", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" },
  formCardHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" },
  formCardIcon: { fontSize: "16px" },
  formCardTitle: { fontSize: "13px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em" },

  formGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  formGrid1: { display: "flex", flexDirection: "column", gap: "14px" },

  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" },
  input: { width: "100%", height: "42px", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "0 14px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a", transition: "border-color 0.2s" },
  textarea: { width: "100%", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "12px 14px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a", resize: "vertical", fontFamily: "inherit", transition: "border-color 0.2s", minHeight: "80px" },

  formActions: { display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" },

  /* Detail */
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" },
  detailItems: { display: "flex", flexDirection: "column", gap: "10px" },
  detailItem: { display: "flex", flexDirection: "column", gap: "4px", background: "#f8fafc", borderRadius: "12px", padding: "12px 14px", border: "1px solid #f1f5f9" },
  detailLabel: { fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" },
  detailValue: { fontSize: "15px", color: "#0f172a", fontWeight: "600", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" },
};

export default AbaAnamneses;
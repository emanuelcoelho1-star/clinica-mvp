import { useState } from "react";
import API_URL from "../api";
import gerarPdfAtestado from "../utils/gerarPdfAtestado";

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════��═════════════════ */
function dataHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatarDataBR(iso) {
  if (!iso) return "—";
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function formatCpf(cpf) {
  if (!cpf) return "";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return cpf;
}

const INITIAL_STATE = {
  profissional: "",
  tipoAtestado: "dias",
  data: dataHojeISO(),
  dias: "",
  cid: "",
  horaInicial: "",
  horaFinal: "",
};

/* ═══════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════ */
const IconClose = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

const IconPdf = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════
   COMPONENTE
   ═══════════════════════════════════════════════════════════ */
function ModalAtestado({ aberto, onFechar, paciente, pacienteId, onDocumentoCriado }) {
  const [form, setForm] = useState({ ...INITIAL_STATE });
  const [hoveredBtn, setHoveredBtn] = useState(null);

  if (!aberto) return null;

  function handleInput(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  function fechar() {
    setForm({ ...INITIAL_STATE });
    onFechar();
  }

  function handleGerar() {
    if (!form.profissional.trim()) {
      alert("Informe o profissional.");
      return;
    }
    if (form.tipoAtestado === "dias" && !form.dias) {
      alert("Informe a quantidade de dias.");
      return;
    }
    if (form.tipoAtestado === "presenca" && (!form.horaInicial || !form.horaFinal)) {
      alert("Informe a hora inicial e final.");
      return;
    }

    // Gerar PDF
    gerarPdfAtestado({
      paciente,
      profissional: form.profissional,
      tipoAtestado: form.tipoAtestado,
      data: form.data,
      dias: form.dias,
      cid: form.cid,
      horaInicial: form.horaInicial,
      horaFinal: form.horaFinal,
    });

    // Salvar no banco como documento
    const tk = localStorage.getItem("token");
    const titulo =
      form.tipoAtestado === "dias"
        ? "Atestado de Dias"
        : "Declaração de Comparecimento";
    const conteudo =
      form.tipoAtestado === "dias"
        ? `Atestado de ${form.dias} dias. Data: ${formatarDataBR(form.data)}. CID: ${form.cid || "N/A"}`
        : `Comparecimento em ${formatarDataBR(form.data)} das ${form.horaInicial} às ${form.horaFinal}. CID: ${form.cid || "N/A"}`;

    fetch(`${API_URL}/documentos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: tk || "",
      },
      body: JSON.stringify({
        paciente_id: Number(pacienteId),
        data: form.data,
        tipo: "atestado",
        titulo,
        conteudo,
        profissional: form.profissional,
        observacoes: "",
      }),
    })
      .then(() => {
        if (onDocumentoCriado) onDocumentoCriado();
      })
      .catch(() => {});

    fechar();
  }

  return (
    <div style={M.overlay} onClick={fechar}>
      <div style={M.modal} onClick={(e) => e.stopPropagation()}>

        {/* ── Header ──────────────────────────── */}
        <div style={M.header}>
          <h3 style={M.title}>Gerar Atestado</h3>
          <button style={M.closeBtn} onClick={fechar}>
            {IconClose}
          </button>
        </div>

        {/* ── Profissional ───────────────────── */}
        <div style={M.field}>
          <label style={M.label}>Profissional</label>
          <input
            type="text"
            name="profissional"
            value={form.profissional}
            onChange={handleInput}
            placeholder="Nome do profissional responsável"
            style={M.input}
          />
        </div>

        {/* ── Tipo de Atestado ───────────────── */}
        <div style={M.field}>
          <label style={M.label}>Tipo de Atestado</label>
          <div style={M.radioGroup}>
            <label
              style={{
                ...M.radioLabel,
                ...(form.tipoAtestado === "dias" ? M.radioLabelActive : {}),
              }}
            >
              <input
                type="radio"
                name="tipoAtestado"
                value="dias"
                checked={form.tipoAtestado === "dias"}
                onChange={handleInput}
                style={{ display: "none" }}
              />
              <div
                style={{
                  ...M.radioCircle,
                  ...(form.tipoAtestado === "dias" ? M.radioCircleActive : {}),
                }}
              />
              <span>Atestado de Dias</span>
            </label>
            <label
              style={{
                ...M.radioLabel,
                ...(form.tipoAtestado === "presenca" ? M.radioLabelActive : {}),
              }}
            >
              <input
                type="radio"
                name="tipoAtestado"
                value="presenca"
                checked={form.tipoAtestado === "presenca"}
                onChange={handleInput}
                style={{ display: "none" }}
              />
              <div
                style={{
                  ...M.radioCircle,
                  ...(form.tipoAtestado === "presenca" ? M.radioCircleActive : {}),
                }}
              />
              <span>Presença na Consulta</span>
            </label>
          </div>
        </div>

        {/* ── Campos: Atestado de Dias ───────── */}
        {form.tipoAtestado === "dias" && (
          <div style={M.fieldGrid}>
            <div style={M.field}>
              <label style={M.label}>Data do Atestado</label>
              <input
                type="date"
                name="data"
                value={form.data}
                onChange={handleInput}
                style={M.input}
              />
            </div>
            <div style={M.field}>
              <label style={M.label}>Quantidade de Dias</label>
              <input
                type="number"
                name="dias"
                value={form.dias}
                onChange={handleInput}
                placeholder="Ex: 2"
                min="1"
                style={M.input}
              />
            </div>
            <div style={M.field}>
              <label style={M.label}>CID (opcional)</label>
              <input
                type="text"
                name="cid"
                value={form.cid}
                onChange={handleInput}
                placeholder="Ex: K02.1"
                style={M.input}
              />
            </div>
          </div>
        )}

        {/* ── Campos: Presença na Consulta ───── */}
        {form.tipoAtestado === "presenca" && (
          <div style={M.fieldGrid}>
            <div style={M.field}>
              <label style={M.label}>Data do Atestado</label>
              <input
                type="date"
                name="data"
                value={form.data}
                onChange={handleInput}
                style={M.input}
              />
            </div>
            <div style={M.field}>
              <label style={M.label}>Hora Inicial</label>
              <input
                type="time"
                name="horaInicial"
                value={form.horaInicial}
                onChange={handleInput}
                style={M.input}
              />
            </div>
            <div style={M.field}>
              <label style={M.label}>Hora Final</label>
              <input
                type="time"
                name="horaFinal"
                value={form.horaFinal}
                onChange={handleInput}
                style={M.input}
              />
            </div>
            <div style={M.field}>
              <label style={M.label}>CID (opcional)</label>
              <input
                type="text"
                name="cid"
                value={form.cid}
                onChange={handleInput}
                placeholder="Ex: K02.1"
                style={M.input}
              />
            </div>
          </div>
        )}

        {/* ── Pré-visualização ───────────────── */}
        <div style={M.previewBox}>
          <span style={M.previewLabel}>Pré-visualização</span>
          <p style={M.previewText}>
            {form.tipoAtestado === "dias"
              ? `Atesto que ${paciente?.nome || "Paciente"}, CPF ${formatCpf(paciente?.cpf)}, esteve sob cuidados profissionais no dia ${formatarDataBR(form.data)}, devendo permanecer em repouso por ${form.dias || "___"} dias.${form.cid ? ` CID: ${form.cid}` : ""}`
              : `Atesto que ${paciente?.nome || "Paciente"}, CPF ${formatCpf(paciente?.cpf)}, esteve sob cuidados profissionais no dia ${formatarDataBR(form.data)} das ${form.horaInicial || "__:__"} às ${form.horaFinal || "__:__"} horas.${form.cid ? ` CID: ${form.cid}` : ""}`
            }
          </p>
        </div>

        {/* ── Ações ──────────────────────────── */}
        <div style={M.footerActions}>
          <button
            style={{
              ...M.btnSecondary,
              ...(hoveredBtn === "cancel" ? M.btnSecondaryHover : {}),
            }}
            onMouseEnter={() => setHoveredBtn("cancel")}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={fechar}
          >
            Cancelar
          </button>
          <button
            style={{
              ...M.btnPrimary,
              ...(hoveredBtn === "gerar" ? M.btnPrimaryHover : {}),
            }}
            onMouseEnter={() => setHoveredBtn("gerar")}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={handleGerar}
          >
            {IconPdf}
            <span>Gerar PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const M = {
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
    maxWidth: "560px",
    background: "#fff",
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 24px 64px rgba(15,23,42,0.18)",
    animation: "documento-fade-in 0.2s ease",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    maxHeight: "90vh",
    overflowY: "auto",
  },

  /* Header */
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
  },
  closeBtn: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: "1px solid #f1f5f9",
    background: "#fff",
    color: "#64748b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
  },

  /* Fields */
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
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

  /* Radio */
  radioGroup: {
    display: "flex",
    gap: "10px",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
    transition: "all 0.15s ease",
    flex: 1,
  },
  radioLabelActive: {
    borderColor: "#2563eb",
    background: "#eff6ff",
    color: "#1d4ed8",
  },
  radioCircle: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    border: "2px solid #cbd5e1",
    flexShrink: 0,
    transition: "all 0.15s ease",
  },
  radioCircleActive: {
    border: "5px solid #2563eb",
  },

  /* Preview */
  previewBox: {
    background: "#f8fafc",
    borderRadius: "10px",
    border: "1px solid #f1f5f9",
    padding: "16px",
  },
  previewLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: "8px",
  },
  previewText: {
    margin: 0,
    fontSize: "13px",
    color: "#334155",
    lineHeight: 1.6,
    fontStyle: "italic",
  },

  /* Footer */
  footerActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    paddingTop: "8px",
    borderTop: "1px solid #f1f5f9",
  },

  /* Buttons */
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
};

export default ModalAtestado;
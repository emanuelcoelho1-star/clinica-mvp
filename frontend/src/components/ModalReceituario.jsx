import { useState } from "react";

function dataHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const IconClose = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

function ModalReceituario({ aberto, onFechar }) {
  const [etapa, setEtapa] = useState("tipo");
  const [form, setForm] = useState({
    profissional: "",
    data: dataHojeISO(),
    medicamento: "",
  });

  if (!aberto) return null;

  function fechar() {
    setEtapa("tipo");
    setForm({ profissional: "", data: dataHojeISO(), medicamento: "" });
    onFechar();
  }

  function voltar() {
    setEtapa("tipo");
  }

  function handleInput(e) {
    const { name, value } = e.target;
    setForm((atual) => ({ ...atual, [name]: value }));
  }

  return (
    <div style={M.overlay} onClick={fechar}>
      <div style={M.modal} onClick={(e) => e.stopPropagation()}>
        <div style={M.header}>
          <div>
            <h3 style={M.title}>{etapa === "tipo" ? "Novo receituário" : etapa === "impresso" ? "Receituário impresso" : "Receituário digital"}</h3>
            <p style={M.subtitle}>
              {etapa === "tipo"
                ? "Escolha como deseja emitir o receituário."
                : etapa === "impresso"
                  ? "Informe os dados para o receituário impresso."
                  : "O fluxo do receituário digital será configurado na próxima etapa."}
            </p>
          </div>
          <button type="button" style={M.closeBtn} onClick={fechar} aria-label="Fechar">
            {IconClose}
          </button>
        </div>

        {etapa === "tipo" && (
          <div style={M.options}>
            <button type="button" style={M.optionCard} onClick={() => setEtapa("impresso")}>
              <span style={{ ...M.optionIcon, background: "#eff6ff", color: "#2563eb" }}>
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /><path d="M17 12h.01" />
                </svg>
              </span>
              <strong style={M.optionTitle}>Receituário impresso</strong>
              <span style={M.optionDescription}>Gerar uma receita para impressão em papel.</span>
            </button>

            <button type="button" style={M.optionCard} onClick={() => setEtapa("digital")}>
              <span style={{ ...M.optionIcon, background: "#f0fdf4", color: "#16a34a" }}>
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 6h6M8 11h8M8 15h5" /><path d="m14 18 2 2 4-4" />
                </svg>
              </span>
              <strong style={M.optionTitle}>Receituário digital</strong>
              <span style={M.optionDescription}>Preparar uma receita em formato digital.</span>
            </button>
          </div>
        )}

        {etapa === "impresso" && (
          <>
            <div style={M.fields}>
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
              <div style={M.field}>
                <label style={M.label}>Data</label>
                <input
                  type="date"
                  name="data"
                  value={form.data}
                  onChange={handleInput}
                  style={M.input}
                />
              </div>
              <div style={M.field}>
                <label style={M.label}>Nome do medicamento</label>
                <input
                  type="text"
                  name="medicamento"
                  value={form.medicamento}
                  onChange={handleInput}
                  placeholder="Digite o nome do medicamento"
                  style={M.input}
                />
              </div>
            </div>
            <div style={M.footer}>
              <button type="button" style={M.secondary} onClick={voltar}>Voltar</button>
              <button type="button" style={M.primary} onClick={fechar}>Fechar</button>
            </div>
          </>
        )}

        {etapa === "digital" && (
          <div style={M.digitalInfo}>
            <p>Esta opção ficará disponível quando definirmos o fluxo do receituário digital.</p>
            <button type="button" style={M.secondary} onClick={voltar}>Voltar</button>
          </div>
        )}
      </div>
    </div>
  );
}

const M = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
    backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
    justifyContent: "center", padding: "20px", zIndex: 1000,
  },
  modal: {
    width: "100%", maxWidth: "560px", background: "#fff", borderRadius: "16px",
    padding: "28px", boxShadow: "0 24px 64px rgba(15,23,42,0.18)",
    animation: "documento-fade-in 0.2s ease", display: "flex",
    flexDirection: "column", gap: "22px", maxHeight: "90vh", overflowY: "auto",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" },
  title: { margin: 0, fontSize: "18px", fontWeight: "700", color: "#0f172a" },
  subtitle: { margin: "6px 0 0", fontSize: "13px", color: "#94a3b8", lineHeight: 1.5 },
  closeBtn: {
    width: "34px", height: "34px", borderRadius: "8px", border: "1px solid #f1f5f9",
    background: "#fff", color: "#64748b", cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  options: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  optionCard: {
    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "12px",
    padding: "22px", border: "1px solid #e2e8f0", borderRadius: "14px",
    background: "#fff", cursor: "pointer", textAlign: "left", transition: "all 0.18s ease",
  },
  optionIcon: { width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  optionTitle: { fontSize: "14px", color: "#0f172a", fontWeight: "700" },
  optionDescription: { fontSize: "12px", color: "#64748b", lineHeight: 1.5 },
  fields: { display: "flex", flexDirection: "column", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#64748b" },
  input: {
    width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #e2e8f0",
    padding: "0 14px", outline: "none", fontSize: "14px", background: "#fff",
    boxSizing: "border-box", color: "#0f172a",
  },
  footer: { display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" },
  primary: {
    border: "none", borderRadius: "10px", padding: "0 18px", height: "40px",
    background: "#2563eb", color: "#fff", fontWeight: "600", cursor: "pointer",
  },
  secondary: {
    border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 16px",
    height: "40px", background: "#fff", color: "#475569", fontWeight: "500", cursor: "pointer",
  },
  digitalInfo: { display: "flex", flexDirection: "column", gap: "14px", alignItems: "flex-start", color: "#64748b", fontSize: "13px" },
};

export default ModalReceituario;

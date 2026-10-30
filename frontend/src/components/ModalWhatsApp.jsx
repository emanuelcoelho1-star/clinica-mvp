import { useState } from "react";
import { WhatsAppIcon } from "./iconeWhatsApp";
import { abrirConversaWhatsApp, telefoneWhatsApp } from "../utils/whatsapp";

/* ═══════════════════════════════════════════════════════════
   MODAL — revisar e enviar mensagem pelo WhatsApp
   Abre o WhatsApp com a mensagem pronta; onEnviado registra o contato.
   ═══════════════════════════════════════════════════════════ */
const CloseIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

function ModalWhatsApp({ titulo = "Enviar pelo WhatsApp", paciente, telefone, mensagemInicial, dica, onEnviado, onFechar }) {
  const [mensagem, setMensagem] = useState(mensagemInicial || "");
  const valido = Boolean(telefoneWhatsApp(telefone));

  function enviar() {
    if (!abrirConversaWhatsApp(telefone, mensagem)) return;
    onEnviado?.(mensagem);
    onFechar();
  }

  return (
    <div style={S.overlay} onClick={onFechar}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.header}>
          <div>
            <h2 style={S.title}>{titulo}</h2>
            <p style={S.sub}>{paciente}{telefone ? ` · ${telefone}` : ""}</p>
          </div>
          <button type="button" style={S.closeBtn} onClick={onFechar}>{CloseIcon}</button>
        </div>

        <div style={S.body}>
          <label style={S.label}>Mensagem</label>
          <textarea rows={7} value={mensagem} onChange={(e) => setMensagem(e.target.value)} style={S.textarea} />
          {!valido && <div style={S.erro}>Paciente sem telefone válido para WhatsApp. Atualize o cadastro.</div>}
          <span style={S.hint}>{dica || "O WhatsApp abrirá com a mensagem pronta para você revisar e enviar."}</span>
        </div>

        <div style={S.actions}>
          <button type="button" style={S.btnSecondary} onClick={onFechar}>Cancelar</button>
          <button type="button" style={{ ...S.btnWhats, ...(!valido || !mensagem.trim() ? S.disabled : {}) }}
            disabled={!valido || !mensagem.trim()} onClick={enviar}>
            {WhatsAppIcon}<span>Abrir WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1100, overflowY: "auto" },
  modal: { width: "100%", maxWidth: "520px", background: "#fff", borderRadius: "16px", padding: "28px", boxShadow: "0 24px 64px rgba(15,23,42,0.18)", margin: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "18px" },
  title: { margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.02em" },
  sub: { margin: "4px 0 0", color: "var(--text-muted)", fontSize: "14px" },
  closeBtn: { border: "1px solid #f1f5f9", background: "#fafbfc", width: "34px", height: "34px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexShrink: 0 },
  body: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" },
  textarea: { width: "100%", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "10px 12px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5 },
  hint: { fontSize: "12px", color: "var(--text-muted)" },
  erro: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", fontWeight: "500" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
  btnSecondary: { border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 16px", background: "#fff", color: "#475569", fontWeight: "500", fontSize: "13px", cursor: "pointer", height: "40px" },
  btnWhats: { display: "inline-flex", alignItems: "center", gap: "8px", border: "none", borderRadius: "10px", padding: "0 18px", background: "#16a34a", color: "#fff", fontWeight: "600", fontSize: "14px", cursor: "pointer", height: "40px" },
  disabled: { opacity: 0.5, cursor: "not-allowed" },
};

export default ModalWhatsApp;

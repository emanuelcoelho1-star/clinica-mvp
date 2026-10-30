import API_URL from "../../api";

/* ═══════════════════════════════════════════════════════════
   HELPERS compartilhados pelas abas de Relacionamento
   ═══════════════════════════════════════════════════════════ */
export async function api(caminho, opcoes = {}) {
  const tk = localStorage.getItem("token");
  const r = await fetch(`${API_URL}${caminho}`, {
    ...opcoes,
    headers: { "Content-Type": "application/json", Authorization: tk || "", ...(opcoes.headers || {}) },
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || "Erro ao comunicar com o servidor.");
  return dados;
}

export function registrarContato(paciente_id, tipo, retorno_id = null) {
  return api("/relacionamento/contatos", { method: "POST", body: JSON.stringify({ paciente_id, tipo, retorno_id }) });
}

export function formatarData(iso) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function formatarDataHora(valor) {
  if (!valor) return "";
  const [d, h = ""] = valor.split(" ");
  return `${formatarData(d)}${h ? ` ${h.slice(0, 5)}` : ""}`;
}

export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function adicionarMesesISO(iso, meses) {
  const [a, m, d] = iso.split("-").map(Number);
  const alvo = new Date(a, m - 1 + meses, 1);
  const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(d, ultimoDia));
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, "0")}-${String(alvo.getDate()).padStart(2, "0")}`;
}

/* Link para a Agenda abrir um novo agendamento já preenchido */
export function linkAgendar({ paciente_id, paciente_nome, procedimento, profissional_id, retorno_id }) {
  const q = new URLSearchParams({ paciente: String(paciente_id), nome: paciente_nome || "" });
  if (procedimento) q.set("procedimento", procedimento);
  if (profissional_id) q.set("profissional", String(profissional_id));
  if (retorno_id) q.set("retorno", String(retorno_id));
  return `/agenda?${q.toString()}`;
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
export const S = {
  card: { background: "#fff", border: "1px solid #f1f5f9", borderRadius: "16px", overflow: "hidden" },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", padding: "16px 18px", borderBottom: "1px solid #f1f5f9" },
  toolbarGroup: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },

  segWrap: { display: "inline-flex", background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "10px", padding: "3px", gap: "2px", flexWrap: "wrap" },
  segBtn: { border: "none", background: "transparent", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: "600", color: "#64748b", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "inherit" },
  segBtnAtivo: { background: "#fff", color: "#0f172a", boxShadow: "0 1px 3px rgba(15,23,42,0.08)" },
  segCount: { background: "#e2e8f0", color: "#475569", borderRadius: "6px", padding: "1px 6px", fontSize: "11px" },
  segCountAtivo: { background: "#2563eb", color: "#fff" },

  lista: { display: "flex", flexDirection: "column" },
  linha: { display: "grid", alignItems: "center", gap: "14px", padding: "14px 18px", borderBottom: "1px solid #f8fafc" },
  nome: { fontSize: "14px", fontWeight: "700", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" },
  sub: { fontSize: "12px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  col: { display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 },
  valor: { fontSize: "13px", fontWeight: "600", color: "#334155" },
  acoes: { display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" },

  badge: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", border: "1px solid", alignSelf: "flex-start", whiteSpace: "nowrap" },
  badgeVermelho: { background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" },
  badgeLaranja: { background: "#fff7ed", color: "#c2410c", borderColor: "#fed7aa" },
  badgeAzul: { background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" },
  badgeVerde: { background: "#f0fdf4", color: "#15803d", borderColor: "#bbf7d0" },
  badgeCinza: { background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" },
  badgeRoxo: { background: "#faf5ff", color: "#7c3aed", borderColor: "#ddd6fe" },

  btnWhats: { display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "0 12px", background: "#f0fdf4", color: "#15803d", fontWeight: "600", fontSize: "12px", cursor: "pointer", height: "32px", fontFamily: "inherit" },
  btnAcao: { display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0 12px", background: "#eff6ff", color: "#1d4ed8", fontWeight: "600", fontSize: "12px", cursor: "pointer", height: "32px", fontFamily: "inherit" },
  btnNeutro: { display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0 10px", background: "#fff", color: "#475569", fontWeight: "600", fontSize: "12px", cursor: "pointer", height: "32px", fontFamily: "inherit" },
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: "8px", border: "none", borderRadius: "10px", padding: "0 18px", background: "#2563eb", color: "#fff", fontWeight: "600", fontSize: "14px", cursor: "pointer", height: "40px", fontFamily: "inherit" },
  btnSecondary: { border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 16px", background: "#fff", color: "#475569", fontWeight: "500", fontSize: "13px", cursor: "pointer", height: "40px", fontFamily: "inherit" },
  btnDanger: { border: "none", borderRadius: "10px", padding: "0 16px", background: "#ef4444", color: "#fff", fontWeight: "600", fontSize: "13px", cursor: "pointer", height: "40px", fontFamily: "inherit" },
  disabled: { opacity: 0.45, cursor: "not-allowed" },

  select: { height: "36px", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "0 10px", fontSize: "13px", background: "#fff", color: "#0f172a", fontFamily: "inherit" },
  check: { display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#475569", cursor: "pointer" },

  vazio: { display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "48px 20px", textAlign: "center" },
  vazioTitulo: { fontSize: "15px", fontWeight: "700", color: "#334155" },
  vazioTexto: { fontSize: "13px", color: "#94a3b8" },
  erro: { margin: "16px 18px 0", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: "500" },

  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 999 },
  modal: { width: "100%", maxWidth: "520px", background: "#fff", borderRadius: "16px", padding: "28px", boxShadow: "0 24px 64px rgba(15,23,42,0.18)" },
  modalTitle: { margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.02em" },
  modalSub: { margin: "4px 0 18px", color: "#94a3b8", fontSize: "14px" },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
  field: { display: "flex", flexDirection: "column", gap: "6px", position: "relative" },
  label: { fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  input: { width: "100%", height: "40px", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "0 12px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" },
  textarea: { width: "100%", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "10px 12px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit", resize: "vertical" },
  chips: { display: "flex", gap: "6px", flexWrap: "wrap" },
  chip: { border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0 10px", height: "30px", background: "#fff", color: "#475569", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
  sugestoes: { position: "absolute", top: "100%", left: 0, right: 0, marginTop: "6px", border: "1px solid #f1f5f9", borderRadius: "12px", background: "#fff", maxHeight: "220px", overflowY: "auto", boxShadow: "0 12px 32px rgba(15,23,42,0.1)", zIndex: 10 },
  sugestao: { display: "flex", flexDirection: "column", gap: "2px", width: "100%", border: "none", borderBottom: "1px solid #f8fafc", background: "#fff", padding: "10px 14px", textAlign: "left", cursor: "pointer", fontFamily: "inherit" },
  formErro: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: "500" },
  formAcoes: { display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" },
};

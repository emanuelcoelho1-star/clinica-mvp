import { useEffect, useState } from "react";
import API_URL from "../api";

const CAMPOS = [
  { name: "nome", label: "Nome da clínica *", required: true },
  { name: "nome_fantasia", label: "Nome fantasia" },
  { name: "razao_social", label: "Razão social" },
  { name: "cnpj", label: "CNPJ" },
  { name: "email_contato", label: "E-mail de contato", type: "email" },
  { name: "telefone", label: "Telefone principal", type: "tel" },
  { name: "telefone_secundario", label: "Telefone secundário", type: "tel" },
  { name: "cep", label: "CEP" },
  { name: "rua", label: "Rua / Avenida" },
  { name: "numero", label: "Número" },
  { name: "complemento", label: "Complemento" },
  { name: "bairro", label: "Bairro" },
  { name: "cidade", label: "Cidade" },
  { name: "estado", label: "Estado" },
  { name: "responsavel_tecnico", label: "Responsável técnico" },
  { name: "cro", label: "CRO do responsável" },
  { name: "site", label: "Site da clínica", type: "url" },
  { name: "logo_url", label: "Link do logo (URL da imagem)", type: "url" },
];

export default function ClinicaForm({ onComplete, modoOnboarding = false }) {
  const [dados, setDados] = useState({ nome: "", nome_fantasia: "", razao_social: "", cnpj: "", email_contato: "", telefone: "", telefone_secundario: "", cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", responsavel_tecnico: "", cro: "", site: "", logo_url: "" });
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    let ativo = true;
    fetch(`${API_URL}/clinica`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro || "Não foi possível carregar a clínica.");
        if (ativo && data.clinica) setDados((atual) => ({ ...atual, ...data.clinica }));
      })
      .catch((err) => { if (ativo) setErro(err.message || "Erro ao carregar os dados da clínica."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [token]);

  const alterar = (e) => setDados((atual) => ({ ...atual, [e.target.name]: e.target.value }));

  const salvar = async (e) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setSalvando(true);
    try {
      const res = await fetch(`${API_URL}/clinica`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(dados),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Não foi possível salvar os dados.");
      setSucesso("Dados da clínica salvos com sucesso.");
      if (onComplete) onComplete();
    } catch (err) {
      setErro(err.message || "Não foi possível conectar ao servidor.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) return <div style={S.notice}>Carregando dados da clínica...</div>;

  return (
    <section style={S.wrapper}>
      {modoOnboarding && (
        <div style={S.intro}>
          <div style={S.step}>2 de 2</div>
          <h1 style={S.title}>Configure sua clínica</h1>
          <p style={S.subtitle}>Essas informações poderão aparecer nos receituários, atestados e demais documentos gerados pelo OdontoPro. Você poderá alterá-las depois em Configurações.</p>
        </div>
      )}
      {!modoOnboarding && <div style={S.intro}><h2 style={S.title}>Dados da clínica</h2><p style={S.subtitle}>Mantenha os dados institucionais atualizados para reutilizá-los nos documentos clínicos.</p></div>}
      {erro && <div role="alert" style={S.error}>{erro}</div>}
      {sucesso && <div role="status" style={S.success}>{sucesso}</div>}
      <form onSubmit={salvar}>
        <div style={S.grid}>
          {CAMPOS.map((campo) => (
            <label key={campo.name} style={S.field}>
              <span style={S.label}>{campo.label}</span>
              <input name={campo.name} type={campo.type || "text"} value={dados[campo.name] || ""} onChange={alterar} required={Boolean(campo.required)} maxLength={campo.name === "logo_url" ? 1500 : 250} placeholder={campo.name === "cnpj" ? "00.000.000/0000-00" : ""} style={S.input} />
            </label>
          ))}
        </div>
        {dados.logo_url && <div style={S.logoPreview}><span style={S.label}>Prévia do logo</span><img src={dados.logo_url} alt="Prévia do logo da clínica" style={S.logo} onError={(e) => { e.currentTarget.style.display = "none"; }} /></div>}
        <div style={S.actions}>
          <button type="submit" disabled={salvando} style={{ ...S.button, opacity: salvando ? 0.7 : 1 }}>{salvando ? "Salvando..." : modoOnboarding ? "Salvar e entrar no sistema" : "Salvar alterações"}</button>
          {modoOnboarding && <button type="button" onClick={onComplete} style={S.skip}>Preencher depois</button>}
        </div>
      </form>
    </section>
  );
}

const S = {
  wrapper: { background: "var(--bg-card, #fff)", border: "1px solid var(--border-primary, #e2e8f0)", borderRadius: 16, padding: 24, color: "var(--text-primary, #0f172a)" },
  intro: { marginBottom: 22 },
  step: { display: "inline-flex", background: "#eff6ff", color: "#1d4ed8", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700, marginBottom: 12 },
  title: { margin: "0 0 7px", fontSize: 22, fontWeight: 750 },
  subtitle: { margin: 0, color: "var(--text-secondary, #64748b)", fontSize: 14, lineHeight: 1.6 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 7, minWidth: 0 },
  label: { fontSize: 12, fontWeight: 700, color: "var(--text-secondary, #475569)" },
  input: { width: "100%", minWidth: 0, boxSizing: "border-box", border: "1px solid var(--border-primary, #cbd5e1)", background: "var(--bg-input, #fff)", color: "var(--text-primary, #0f172a)", borderRadius: 9, padding: "11px 12px", fontSize: 14, outlineColor: "#2563eb" },
  actions: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 },
  button: { border: 0, borderRadius: 10, background: "#2563eb", color: "#fff", padding: "12px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  skip: { border: "1px solid var(--border-primary, #cbd5e1)", borderRadius: 10, background: "transparent", color: "var(--text-primary, #334155)", padding: "12px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  error: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 9, padding: 12, marginBottom: 16, fontSize: 13 },
  success: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 9, padding: 12, marginBottom: 16, fontSize: 13 },
  notice: { padding: 24, color: "var(--text-secondary, #64748b)" },
  logoPreview: { display: "flex", alignItems: "center", gap: 14, marginTop: 20 },
  logo: { maxWidth: 180, maxHeight: 90, objectFit: "contain" },
};

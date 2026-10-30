import { useEffect, useRef, useState } from "react";
import API_URL from "../api";
import { useTheme } from "../contexts/ThemeContext";

const SECOES = [
  { titulo: "Identificação da clínica", descricao: "Informações principais para identificar sua clínica.", campos: [
    { name: "nome", label: "Nome da clínica *", required: true, wide: true },
    { name: "nome_fantasia", label: "Nome fantasia" },
    { name: "razao_social", label: "Razão social" },
    { name: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00" },
  ]},
  { titulo: "Contato", descricao: "Canais de contato que poderão aparecer nos documentos.", campos: [
    { name: "email_contato", label: "E-mail de contato", type: "email" },
    { name: "telefone", label: "Telefone principal", type: "tel" },
    { name: "telefone_secundario", label: "Telefone secundário", type: "tel" },
    { name: "site", label: "Site da clínica", type: "url", placeholder: "https://..." },
  ]},
  { titulo: "Endereço", descricao: "Endereço completo para cabeçalhos, receituários e atestados.", campos: [
    { name: "cep", label: "CEP" },
    { name: "rua", label: "Rua / Avenida", wide: true },
    { name: "numero", label: "Número" },
    { name: "complemento", label: "Complemento" },
    { name: "bairro", label: "Bairro" },
    { name: "cidade", label: "Cidade" },
    { name: "estado", label: "Estado", placeholder: "Ex.: PI" },
  ]},
  { titulo: "Responsável técnico", descricao: "Dados profissionais para identificação nos documentos, quando necessário.", campos: [
    { name: "responsavel_tecnico", label: "Nome do responsável técnico", wide: true },
    { name: "cro", label: "CRO do responsável", placeholder: "Ex.: CRO-PI 0000" },
  ]},
];

const DADOS_INICIAIS = {
  nome: "", nome_fantasia: "", razao_social: "", cnpj: "", email_contato: "",
  telefone: "", telefone_secundario: "", cep: "", rua: "", numero: "",
  complemento: "", bairro: "", cidade: "", estado: "", responsavel_tecnico: "",
  cro: "", site: "", logo_url: "",
};

export default function ClinicaForm({ onComplete, modoOnboarding = false }) {
  const [dados, setDados] = useState(DADOS_INICIAIS);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [modoLogo, setModoLogo] = useState("upload");
  const { tema } = useTheme();
  const modoEscuro = tema === "dark";
  const [arquivoLogo, setArquivoLogo] = useState("");
  const inputArquivoRef = useRef(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    let ativo = true;
    fetch(`${API_URL}/clinica`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro || "Não foi possível carregar a clínica.");
        if (ativo && data.clinica) {
          setDados((atual) => ({ ...atual, ...data.clinica }));
          setModoLogo(String(data.clinica.logo_url || "").startsWith("data:image/") ? "upload" : "url");
        }
      })
      .catch((err) => { if (ativo) setErro(err.message || "Erro ao carregar os dados da clínica."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [token]);

  const alterar = (e) => setDados((atual) => ({ ...atual, [e.target.name]: e.target.value }));

  const selecionarLogo = (event) => {
    const arquivo = event.target.files && event.target.files[0];
    setArquivoLogo("");
    setErro("");
    if (!arquivo) return;
    const tiposPermitidos = ["image/png", "image/jpeg", "image/webp"];
    if (!tiposPermitidos.includes(arquivo.type)) {
      setErro("Escolha uma imagem PNG, JPG ou WEBP.");
      event.target.value = "";
      return;
    }
    if (arquivo.size > 500 * 1024) {
      setErro("O logo deve ter no máximo 500 KB. Reduza o tamanho da imagem e tente novamente.");
      event.target.value = "";
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      if (typeof leitor.result !== "string") return setErro("Não foi possível ler a imagem selecionada.");
      setDados((atual) => ({ ...atual, logo_url: leitor.result }));
      setArquivoLogo(arquivo.name);
    };
    leitor.onerror = () => setErro("Não foi possível ler a imagem selecionada.");
    leitor.readAsDataURL(arquivo);
  };

  const mudarModoLogo = (modo) => {
    setModoLogo(modo);
    setArquivoLogo("");
    if (modo === "url" && String(dados.logo_url || "").startsWith("data:image/")) {
      setDados((atual) => ({ ...atual, logo_url: "" }));
    }
    if (modo === "upload" && dados.logo_url && !String(dados.logo_url).startsWith("data:image/")) {
      setDados((atual) => ({ ...atual, logo_url: "" }));
    }
  };

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
      <div style={S.intro}>
        {modoOnboarding && <div style={S.step}>Etapa 2 de 2</div>}
        <h1 style={S.title}>{modoOnboarding ? "Configure sua clínica" : "Dados da clínica"}</h1>
        <p style={S.subtitle}>{modoOnboarding ? "Preencha as informações abaixo para personalizar o OdontoPro. Você poderá editar tudo depois em Configurações." : "Organize e mantenha atualizadas as informações que poderão ser usadas nos documentos clínicos."}</p>
      </div>
      {erro && <div role="alert" style={S.error}>{erro}</div>}
      {sucesso && <div role="status" style={S.success}>{sucesso}</div>}
      <form onSubmit={salvar}>
        <div style={S.sections}>
          <section style={S.section}>
            <div style={S.sectionHeading}>
              <span style={S.sectionNumber}>05</span>
              <div><h2 style={S.sectionTitle}>Identidade visual</h2><p style={S.sectionDescription}>Adicione o logo que poderá ser usado nos receituários, atestados e outros documentos.</p></div>
            </div>
            <div style={S.logoModes} role="group" aria-label="Forma de adicionar o logo">
              <button type="button" onClick={() => mudarModoLogo("upload")} style={{ ...S.modeButton, ...(modoLogo === "upload" ? S.modeActive : {}) }}>Fazer upload da imagem</button>
              <button type="button" onClick={() => mudarModoLogo("url")} style={{ ...S.modeButton, ...(modoLogo === "url" ? S.modeActive : {}) }}>Usar link da imagem</button>
            </div>
            {modoLogo === "upload" ? (
              <div style={S.uploadBox}>
                <input ref={inputArquivoRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={selecionarLogo} style={{ display: "none" }} />
                <div style={{ ...S.uploadIcon, ...(modoEscuro ? S.uploadIconDark : S.uploadIconLight) }} aria-hidden="true">↑</div>
                <strong style={{ fontSize: 14 }}>Selecione o logo da sua clínica</strong>
                <span style={S.uploadHelp}>PNG, JPG ou WEBP · máximo de 500 KB</span>
                <button type="button" onClick={() => inputArquivoRef.current?.click()} style={S.secondaryButton}>Escolher imagem</button>
                {arquivoLogo && <span style={S.fileName}>{arquivoLogo}</span>}
              </div>
            ) : (
              <label style={S.field}>
                <span style={S.label}>Link direto da imagem</span>
                <input type="url" value={String(dados.logo_url || "").startsWith("data:image/") ? "" : dados.logo_url || ""} onChange={(e) => setDados((atual) => ({ ...atual, logo_url: e.target.value }))} placeholder="https://exemplo.com/logo.png" style={S.input} />
                <span style={S.uploadHelp}>Cole um endereço direto para uma imagem pública.</span>
              </label>
            )}
            {dados.logo_url && <div style={S.logoPreview}><img src={dados.logo_url} alt="Prévia do logo da clínica" style={S.logo} onError={(e) => { e.currentTarget.style.display = "none"; }} /><div><strong style={{ fontSize: 13 }}>Prévia do logo</strong><p style={S.uploadHelp}>Confira se a imagem está nítida e correta.</p><button type="button" onClick={() => { setDados((atual) => ({ ...atual, logo_url: "" })); setArquivoLogo(""); if (inputArquivoRef.current) inputArquivoRef.current.value = ""; }} style={S.removeLogo}>Remover logo</button></div></div>}
          </section>

          {SECOES.map((secao, indice) => (
            <section key={secao.titulo} style={S.section}>
              <div style={S.sectionHeading}>
                <span style={S.sectionNumber}>{String(indice + 2).padStart(2, "0")}</span>
                <div><h2 style={S.sectionTitle}>{secao.titulo}</h2><p style={S.sectionDescription}>{secao.descricao}</p></div>
              </div>
              <div style={S.grid}>
                {secao.campos.map((campo) => (
                  <label key={campo.name} style={{ ...S.field, ...(campo.wide ? S.wide : {}) }}>
                    <span style={S.label}>{campo.label}</span>
                    <input name={campo.name} type={campo.type || "text"} value={dados[campo.name] || ""} onChange={alterar} required={Boolean(campo.required)} maxLength={250} placeholder={campo.placeholder || ""} style={S.input} />
                  </label>
                ))}
              </div>
            </section>
          ))}

        </div>
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
  intro: { marginBottom: 26 },
  step: { display: "inline-flex", background: "#eff6ff", color: "#1d4ed8", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700, marginBottom: 12 },
  title: { margin: "0 0 7px", fontSize: 23, fontWeight: 750 },
  subtitle: { margin: 0, color: "var(--text-secondary, #64748b)", fontSize: 14, lineHeight: 1.6, maxWidth: 720 },
  sections: { display: "flex", flexDirection: "column", gap: 18 },
  section: { border: "1px solid var(--border-primary, #e2e8f0)", borderRadius: 13, padding: 20, background: "var(--bg-card, #fff)" },
  sectionHeading: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 },
  sectionNumber: { flexShrink: 0, display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, background: "var(--bg-muted, #eff6ff)", color: "#2563eb", fontSize: 12, fontWeight: 800 },
  sectionTitle: { margin: "1px 0 4px", fontSize: 16, fontWeight: 750, color: "var(--text-primary, #0f172a)" },
  sectionDescription: { margin: 0, fontSize: 12, lineHeight: 1.5, color: "var(--text-secondary, #64748b)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 7, minWidth: 0 },
  wide: { gridColumn: "1 / -1" },
  label: { fontSize: 12, fontWeight: 700, color: "var(--text-secondary, #475569)" },
  input: { width: "100%", minWidth: 0, boxSizing: "border-box", border: "1px solid var(--border-primary, #cbd5e1)", background: "var(--bg-input, #fff)", color: "var(--text-primary, #0f172a)", borderRadius: 9, padding: "11px 12px", fontSize: 14, outlineColor: "#2563eb" },
  logoModes: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  modeButton: { border: "1px solid var(--border-primary, #cbd5e1)", borderRadius: 9, padding: "10px 13px", background: "transparent", color: "var(--text-primary, #334155)", fontSize: 13, fontWeight: 650, cursor: "pointer" },
  modeActive: { borderColor: "#2563eb", background: "#eff6ff", color: "#1d4ed8" },
  uploadBox: { border: "1px dashed var(--border-primary, #94a3b8)", borderRadius: 12, padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 9, textAlign: "center", background: "var(--bg-muted, var(--bg-card, #1e293b))", color: "var(--text-primary, #f1f5f9)" },
  uploadIcon: { width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 12, fontSize: 25, fontWeight: 700, lineHeight: 1 },
  uploadIconLight: { background: "#dbeafe", color: "#1d4ed8" },
  uploadIconDark: { background: "#334155", color: "#93c5fd" },
  uploadHelp: { margin: 0, fontSize: 12, lineHeight: 1.5, color: "var(--text-secondary, #64748b)" },
  secondaryButton: { border: "1px solid var(--border-primary, #cbd5e1)", borderRadius: 9, background: "var(--bg-card, #fff)", color: "var(--text-primary, #334155)", padding: "9px 13px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  fileName: { color: "#15803d", fontSize: 12, fontWeight: 650, overflowWrap: "anywhere" },
  logoPreview: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16, marginTop: 18, padding: 14, borderRadius: 10, background: "var(--bg-muted, #f8fafc)" },
  logo: { maxWidth: 180, maxHeight: 90, objectFit: "contain", background: "#fff", borderRadius: 8, padding: 8 },
  removeLogo: { marginTop: 8, border: 0, padding: 0, background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 650, cursor: "pointer" },
  actions: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 },
  button: { border: 0, borderRadius: 10, background: "#2563eb", color: "#fff", padding: "12px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  skip: { border: "1px solid var(--border-primary, #cbd5e1)", borderRadius: 10, background: "transparent", color: "var(--text-primary, #334155)", padding: "12px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  error: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 9, padding: 12, marginBottom: 16, fontSize: 13 },
  success: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 9, padding: 12, marginBottom: 16, fontSize: 13 },
  notice: { padding: 24, color: "var(--text-secondary, #64748b)" },
};

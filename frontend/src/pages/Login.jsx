import { useState } from "react";
import API_URL from "../api";
import { useTheme } from "../contexts/ThemeContext";

/* ── Icons ────────────────────────────────────────────────── */
const SunIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const MailIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const KeyIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m21 2-9.3 9.3" />
    <path d="M18.5 5.5 21 3" />
  </svg>
);

const EyeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

function Login() {
  const { tema, alternarTema } = useTheme();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [modoCadastro, setModoCadastro] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusSenha, setFocusSenha] = useState(false);

  const cadastrar = async (e) => {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (senha.length < 8) {
      setErro("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), email, senha }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Não foi possível criar a conta.");
        setCarregando(false);
        return;
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        if (data.usuario) localStorage.setItem("usuario", JSON.stringify(data.usuario));
        window.location.href = "/cadastro-clinica";
        return;
      }
      setModoCadastro(false);
      setSenha("");
      setConfirmarSenha("");
      setNome("");
      setErro("");
      setSucesso("Cadastro realizado! Entre com seu e-mail e senha.");
      setCarregando(false);
    } catch (error) {
      setErro("Não foi possível conectar ao servidor.");
      setCarregando(false);
    }
  };

  const fazerLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCarregando(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao fazer login");
        setCarregando(false);
        return;
      }

      localStorage.setItem("token", data.token);
      if (data.usuario) {
        localStorage.setItem("usuario", JSON.stringify(data.usuario));
      }

      window.location.href = "/";
    } catch (error) {
      setErro("Não foi possível conectar ao servidor");
      setCarregando(false);
    }
  };

  return (
    <div className="login-page" style={S.page}>
      <button type="button" className="login-theme-toggle" onClick={alternarTema} aria-label={tema === "dark" ? "Ativar tema claro" : "Ativar tema escuro"} title={tema === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}>
        {tema === "dark" ? SunIcon : MoonIcon} <span>{tema === "dark" ? "Modo claro" : "Modo escuro"}</span>
      </button>

      <div style={S.wrapper}>
        {/* ── Logo / Header ──────────────────── */}
        <div style={S.logoSection}>
          <div style={S.logoBox}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5.5c-1.5-2-4-2.5-6-1s-2.5 4.5-1 7c1.3 2.2 5 6 7 8.5 2-2.5 5.7-6.3 7-8.5 1.5-2.5.5-5.5-1-7s-4.5-1-6 1z" />
            </svg>
          </div>
          <div>
            <h1 style={S.logoTitle}>OdontoPro</h1>
            <p style={S.logoSub}>Sistema de gestão odontológica</p>
          </div>
        </div>

        {/* ── Card Principal ─────────────────── */}
        <div className="login-card" style={S.card}>
          <div style={S.cardHeader}>
            <h2 style={S.cardTitle}>{modoCadastro ? "Cadastre sua clínica" : "Acesse sua clínica"}</h2>
            <p style={S.cardDesc}>
              {modoCadastro
                ? "Quem cria a conta vira o administrador da clínica e convida o resto da equipe depois."
                : "Use o acesso que a clínica criou para você."}
            </p>
          </div>

          <div className="login-tabs" role="tablist" aria-label="Acesso à conta">
            <button
              type="button"
              role="tab"
              aria-selected={!modoCadastro}
              className={!modoCadastro ? "login-tab active" : "login-tab"}
              onClick={() => { setModoCadastro(false); setErro(""); setSucesso(""); }}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modoCadastro}
              className={modoCadastro ? "login-tab active" : "login-tab"}
              onClick={() => { setModoCadastro(true); setErro(""); setSucesso(""); }}
            >
              Criar conta
            </button>
          </div>

          {sucesso && !modoCadastro && (
            <div className="login-success" role="status">{sucesso}</div>
          )}

          <form onSubmit={modoCadastro ? cadastrar : fazerLogin} style={S.form}>
            {modoCadastro && (
              <div style={S.inputGroup}>
                <label style={S.label}>Nome completo</label>
                <div style={S.inputWrapper}>
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    style={S.input}
                    required
                    autoComplete="name"
                    maxLength={120}
                  />
                </div>
              </div>
            )}

            {/* E-mail */}
            <div style={S.inputGroup}>
              <label style={S.label}>E-mail</label>
              <div style={{
                ...S.inputWrapper,
                borderColor: focusEmail ? "#2563eb" : "#e2e8f0",
                boxShadow: focusEmail ? "0 0 0 3px rgba(37, 99, 235, 0.1)" : "none",
              }}>
                <span style={{ ...S.inputIcon, color: focusEmail ? "#2563eb" : "#94a3b8" }}>{MailIcon}</span>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusEmail(true)}
                  onBlur={() => setFocusEmail(false)}
                  style={S.input}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Senha */}
            <div style={S.inputGroup}>
              <label style={S.label}>Senha</label>
              <div style={{
                ...S.inputWrapper,
                borderColor: focusSenha ? "#2563eb" : "#e2e8f0",
                boxShadow: focusSenha ? "0 0 0 3px rgba(37, 99, 235, 0.1)" : "none",
              }}>
                <span style={{ ...S.inputIcon, color: focusSenha ? "#2563eb" : "#94a3b8" }}>{KeyIcon}</span>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onFocus={() => setFocusSenha(true)}
                  onBlur={() => setFocusSenha(false)}
                  style={S.input}
                  required
                  autoComplete={modoCadastro ? "new-password" : "current-password"}
                  minLength={modoCadastro ? 8 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  style={S.toggleSenha}
                  tabIndex={-1}
                >
                  {mostrarSenha ? EyeOffIcon : EyeIcon}
                </button>
              </div>
            </div>

            {modoCadastro && (
              <div style={S.inputGroup}>
                <label style={S.label}>Confirmar senha</label>
                <div style={{
                  ...S.inputWrapper,
                  borderColor: confirmarSenha && confirmarSenha !== senha ? "#ef4444" : confirmarSenha && confirmarSenha === senha ? "#16a34a" : "#e2e8f0",
                }}>
                  <input
                    type={mostrarConfirmarSenha ? "text" : "password"}
                    placeholder="Digite a senha novamente"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    style={S.input}
                    required
                    autoComplete="new-password"
                    minLength={8}
                    aria-invalid={Boolean(confirmarSenha && confirmarSenha !== senha)}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                    style={S.toggleSenha}
                    aria-label={mostrarConfirmarSenha ? "Ocultar senha de confirmação" : "Mostrar senha de confirmação"}
                    title={mostrarConfirmarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarConfirmarSenha ? EyeOffIcon : EyeIcon}
                  </button>
                </div>
                {confirmarSenha && (
                  <span style={{ fontSize: "12px", fontWeight: 600, color: confirmarSenha === senha ? "#16a34a" : "#dc2626" }}>
                    {confirmarSenha === senha ? "✓ As senhas coincidem" : "As senhas ainda não coincidem"}
                  </span>
                )}
              </div>
            )}

            {/* Erro */}
            {erro && (
              <div style={S.erroBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" x2="9" y1="9" y2="15" />
                  <line x1="9" x2="15" y1="9" y2="15" />
                </svg>
                <span>{erro}</span>
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              style={{
                ...S.btnPrimary,
                opacity: carregando ? 0.7 : 1,
                cursor: carregando ? "not-allowed" : "pointer",
              }}
              disabled={carregando}
            >
              {carregando ? (
                <>
                  <span className="login-spinner" style={S.spinner} />
                  <span>{modoCadastro ? "Criando conta..." : "Entrando..."}</span>
                </>
              ) : (
                <span>{modoCadastro ? "Criar conta" : "Entrar"}</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Keyframes: o spinner para quando o sistema pede menos movimento */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .login-spinner { animation: none !important; } }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES — Mesmo design system do ProntuarioPaciente
   ═══════════════════════════════════════════════════════════ */
const S = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0f4fa",
    fontFamily: "'Inter', 'DM Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: "24px",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
  },

  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "24px",
    width: "100%",
    maxWidth: "420px",
    position: "relative",
    zIndex: 2,
  },

  /* Logo section */
  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  logoBox: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.025em",
  },
  logoSub: {
    margin: "2px 0 0 0",
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "500",
  },

  /* Card — mesmo padrão do prontuário */
  card: {
    width: "100%",
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
    padding: "32px",
    boxSizing: "border-box",
  },

  cardHeader: {
    textAlign: "center",
    marginBottom: "28px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.02em",
    textWrap: "balance",
  },
  cardDesc: {
    margin: "6px 0 0 0",
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "500",
    lineHeight: 1.5,
    textWrap: "pretty",
  },

  /* Form */
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  inputWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "0 14px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    background: "#fafbfc",
    height: "46px",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
  },
  inputIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    transition: "color 0.2s ease",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: "14px",
    color: "#0f172a",
    fontWeight: "500",
    fontFamily: "inherit",
    height: "100%",
  },
  toggleSenha: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
    padding: "4px",
    borderRadius: "6px",
    transition: "all 0.15s ease",
    flexShrink: 0,
  },

  /* Erro — mesmo padrão do prontuário alertaBanner */
  erroBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: "600",
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
  },

  /* Botão — mesmo padrão do btnPrimary do prontuário */
  btnPrimary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    border: "none",
    borderRadius: "12px",
    padding: "0 20px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    height: "46px",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    marginTop: "4px",
  },

  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
    flexShrink: 0,
  },

};

export default Login;
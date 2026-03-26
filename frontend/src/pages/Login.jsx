import { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const fazerLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const response = await fetch("http://localhost:3001/auth/login", {
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

      // Salvar token e dados do usuário
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
    <div style={styles.container}>
      <div style={styles.backgroundGlowOne}></div>
      <div style={styles.backgroundGlowTwo}></div>

      <div style={styles.card}>
        <div style={styles.logo}>🦷</div>
        <h1 style={styles.title}>Odonto Pro</h1>
        <p style={styles.subtitle}>Acesse sua clínica com segurança</p>

        <form onSubmit={fazerLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              autoComplete="email"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Senha</label>
            <div style={styles.senhaWrapper}>
              <input
                type={mostrarSenha ? "text" : "password"}
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                style={{ ...styles.input, paddingRight: "48px" }}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                style={styles.toggleSenha}
                tabIndex={-1}
              >
                {mostrarSenha ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {erro && <p style={styles.erro}>{erro}</p>}

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: carregando ? 0.7 : 1,
              cursor: carregando ? "not-allowed" : "pointer",
            }}
            disabled={carregando}
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p style={styles.footer}>
          Protegido com criptografia de ponta a ponta
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 45%, #f8fafc 100%)",
    fontFamily: "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: "24px",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
  },
  backgroundGlowOne: {
    position: "absolute",
    width: "320px",
    height: "320px",
    borderRadius: "999px",
    background: "rgba(37, 99, 235, 0.15)",
    top: "-80px",
    left: "-80px",
    filter: "blur(30px)",
  },
  backgroundGlowTwo: {
    position: "absolute",
    width: "320px",
    height: "320px",
    borderRadius: "999px",
    background: "rgba(59, 130, 246, 0.12)",
    bottom: "-100px",
    right: "-80px",
    filter: "blur(30px)",
  },
  card: {
    width: "100%",
    maxWidth: "430px",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    backdropFilter: "blur(10px)",
    borderRadius: "28px",
    padding: "36px",
    boxShadow: "0 30px 60px rgba(15, 23, 42, 0.12)",
    border: "1px solid rgba(255, 255, 255, 0.7)",
    boxSizing: "border-box",
    textAlign: "center",
    position: "relative",
    zIndex: 2,
  },
  logo: {
    width: "72px",
    height: "72px",
    margin: "0 auto 18px auto",
    borderRadius: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    boxShadow: "0 16px 30px rgba(37, 99, 235, 0.28)",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    color: "#0f172a",
    fontWeight: "800",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: "10px 0 28px 0",
    color: "#64748b",
    fontSize: "15px",
    fontWeight: "500",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    textAlign: "left",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  input: {
    width: "100%",
    padding: "13px 16px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  },
  senhaWrapper: {
    position: "relative",
    width: "100%",
  },
  toggleSenha: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
  },
  button: {
    marginTop: "12px",
    padding: "13px 18px",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.22)",
    height: "44px",
    transition: "all 0.2s ease",
  },
  erro: {
    margin: 0,
    color: "#b91c1c",
    fontSize: "14px",
    backgroundColor: "#fee2e2",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #fecaca",
    fontWeight: "600",
  },
  footer: {
    marginTop: "20px",
    marginBottom: 0,
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "500",
  },
};

export default Login;
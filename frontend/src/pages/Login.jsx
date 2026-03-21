import { useState } from "react";

function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const fazerLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const response = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao fazer login");
        setCarregando(false);
        return;
      }

      localStorage.setItem("token", data.token);
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
              placeholder="admin@teste.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Senha</label>
            <input
              type="password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={styles.input}
            />
          </div>

          {erro && <p style={styles.erro}>{erro}</p>}

          <button type="submit" style={styles.button} disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
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
    backgroundColor: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(10px)",
    borderRadius: "28px",
    padding: "36px",
    boxShadow: "0 30px 60px rgba(15, 23, 42, 0.12)",
    border: "1px solid rgba(255,255,255,0.7)",
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
  },
  subtitle: {
    margin: "10px 0 28px 0",
    color: "#64748b",
    fontSize: "15px",
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
  },
  input: {
    padding: "15px 16px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
    outline: "none",
    backgroundColor: "#f8fafc",
    color: "#0f172a",
  },
  button: {
    marginTop: "6px",
    padding: "15px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 14px 26px rgba(37, 99, 235, 0.24)",
  },
  erro: {
    margin: 0,
    color: "#dc2626",
    fontSize: "14px",
    backgroundColor: "#fee2e2",
    padding: "12px",
    borderRadius: "12px",
  },
};

export default Login;
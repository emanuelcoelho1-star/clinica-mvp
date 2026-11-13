import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API_URL from "../api";

export default function VerificarEmail() {
  const [params] = useSearchParams();
  const [estado, setEstado] = useState("verificando");
  const [mensagem, setMensagem] = useState("Estamos confirmando seu endereço de e-mail...");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setEstado("erro");
      setMensagem("O link de verificação está incompleto. Solicite um novo e-mail.");
      return;
    }
    let ativo = true;
    fetch(`${API_URL}/auth/verificar-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro || "Não foi possível verificar o e-mail.");
        if (!data.token || !data.usuario) {
          throw new Error("E-mail confirmado, mas não foi possível iniciar sua sessão. Faça login para continuar.");
        }
        if (ativo) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("sorrisa_last_activity", String(Date.now()));
          localStorage.setItem("usuario", JSON.stringify(data.usuario));
          setEstado("sucesso");
          setMensagem(data.mensagem || "E-mail verificado com sucesso! Vamos continuar com o cadastro da sua clínica.");
        }
      })
      .catch((error) => {
        if (ativo) {
          setEstado("erro");
          setMensagem(error.message || "Não foi possível verificar o e-mail.");
        }
      });
    return () => { ativo = false; };
  }, [params]);

  const sucesso = estado === "sucesso";
  return (
    <main style={S.page}>
      <section style={S.card}>
        <div style={{ ...S.icon, background: sucesso ? "#dcfce7" : estado === "erro" ? "#fee2e2" : "#dbeafe", color: sucesso ? "#15803d" : estado === "erro" ? "#b91c1c" : "#1d4ed8" }}>
          {estado === "verificando" ? "…" : sucesso ? "✓" : "!"}
        </div>
        <h1 style={S.title}>{estado === "verificando" ? "Verificando e-mail" : sucesso ? "E-mail confirmado" : "Não foi possível confirmar"}</h1>
        <p style={S.message}>{mensagem}</p>
        {estado !== "verificando" && (
          sucesso
            ? <a href="/cadastro-clinica" style={S.link}>Continuar cadastro da clínica</a>
            : <Link to="/" style={S.link}>Voltar para o acesso</Link>
        )}
      </section>
    </main>
  );
}

const S = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f0f4fa", fontFamily: "Inter, Arial, sans-serif" },
  card: { width: "100%", maxWidth: 440, boxSizing: "border-box", padding: 32, borderRadius: 16, background: "#fff", textAlign: "center", boxShadow: "0 16px 45px rgba(15,23,42,.08)" },
  icon: { width: 54, height: 54, borderRadius: 16, display: "grid", placeItems: "center", margin: "0 auto 18px", fontSize: 26, fontWeight: 800 },
  title: { margin: "0 0 10px", color: "#0f172a", fontSize: 21 },
  message: { margin: "0 0 22px", color: "#64748b", fontSize: 14, lineHeight: 1.6 },
  link: { display: "inline-block", padding: "11px 18px", borderRadius: 9, background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" },
};

import { useEffect, useState } from "react";
import API_URL from "../api";

const TOKEN_KEY = "sorrisa_admin_token";
const formatarBytes = (bytes = 0) => {
  const valor = Number(bytes) || 0;
  if (valor < 1024) return valor + " B";
  const unidades = ["KB", "MB", "GB", "TB"];
  let tamanho = valor / 1024;
  let indice = 0;
  while (tamanho >= 1024 && indice < unidades.length - 1) {
    tamanho /= 1024;
    indice += 1;
  }
  return tamanho.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " " + unidades[indice];
};
const dataBR = (valor) => valor ? new Date(String(valor).replace(" ", "T")).toLocaleDateString("pt-BR") : "—";

export default function AdminPortal() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [email, setEmail] = useState("emanuelcoelho1@gmail.com");
  const [senha, setSenha] = useState("");
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");

  async function carregarPainel(chave = token) {
    if (!chave) return;
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch(API_URL + "/admin/dashboard", {
        headers: { Authorization: "Bearer " + chave },
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro || "Não foi possível carregar o painel.");
      setDados(corpo);
    } catch (e) {
      setErro(e.message || "Falha de conexão com o servidor.");
      if (e.message?.toLowerCase().includes("sessão") || e.message?.toLowerCase().includes("autorizado")) {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        setDados(null);
      }
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (token) carregarPainel(token);
  }, []);

  async function entrar(evento) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const resposta = await fetch(API_URL + "/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro || "Não foi possível entrar.");
      localStorage.setItem(TOKEN_KEY, corpo.token);
      setToken(corpo.token);
      setSenha("");
      await carregarPainel(corpo.token);
    } catch (e) {
      setErro(e.message || "Falha de conexão com o servidor.");
    } finally {
      setCarregando(false);
    }
  }

  function sair() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setDados(null);
  }

  const clinicasFiltradas = (dados?.clinicas || []).filter((c) =>
    [c.nome, c.email_contato, String(c.id)].some((v) => String(v || "").toLowerCase().includes(busca.toLowerCase()))
  );

  const base = { minHeight: "100vh", background: "#f5f7fb", color: "#172033", fontFamily: "Inter, Arial, sans-serif" };
  const card = { background: "#fff", border: "1px solid #e8edf5", borderRadius: 16, padding: 20, boxShadow: "0 4px 18px rgba(20,35,70,.04)" };
  const button = { border: 0, borderRadius: 10, padding: "11px 16px", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer" };

  if (!token) return (
    <div style={{ ...base, display: "grid", placeItems: "center", padding: 20 }}>
      <form onSubmit={entrar} style={{ ...card, width: "100%", maxWidth: 420, padding: 32 }}>
        <div style={{ color: "#2563eb", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, marginBottom: 12 }}>SORRISA · CONTROLE INTERNO</div>
        <h1 style={{ fontSize: 26, margin: "0 0 8px" }}>Administração</h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 26px" }}>Acesso exclusivo do administrador da plataforma.</p>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 7 }}>E-mail</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" required style={campo} />
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, margin: "17px 0 7px" }}>Senha</label>
        <input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" autoComplete="current-password" required style={campo} />
        {erro && <p role="alert" style={{ color: "#dc2626", fontSize: 13, margin: "14px 0 0" }}>{erro}</p>}
        <button type="submit" disabled={carregando} style={{ ...button, width: "100%", marginTop: 22, opacity: carregando ? .7 : 1 }}>{carregando ? "Verificando..." : "Entrar no painel"}</button>
      </form>
    </div>
  );

  return (
    <div style={base}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e8edf5", padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div><div style={{ color: "#2563eb", fontWeight: 800, letterSpacing: 1.2, fontSize: 12 }}>SORRISA</div><strong style={{ fontSize: 19 }}>Administração da plataforma</strong></div>
        <button onClick={sair} style={{ ...button, background: "#eef2ff", color: "#334155" }}>Sair</button>
      </header>
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
          <div><h1 style={{ margin: 0, fontSize: 25 }}>Visão geral</h1><p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>Indicadores gerais de todas as clínicas cadastradas.</p></div>
          <button onClick={() => carregarPainel()} style={{ ...button, background: "#fff", color: "#334155", border: "1px solid #dbe3ef" }}>Atualizar dados</button>
        </div>
        {erro && <div role="alert" style={{ ...card, color: "#b91c1c", marginBottom: 18 }}>{erro}</div>}
        {carregando && !dados ? <div style={card}>Carregando dados...</div> : <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 26 }}>
            {[
              ["Clínicas cadastradas", dados?.indicadores.total_clinicas ?? 0],
              ["Clínicas ativas", dados?.indicadores.clinicas_ativas ?? 0],
              ["Usuários", dados?.indicadores.total_usuarios ?? 0],
              ["Armazenamento total", formatarBytes(dados?.indicadores.armazenamento_bytes)],
              ["Assinaturas ativas", dados?.indicadores.assinaturas_ativas ?? 0],
              ["Assinaturas pendentes", dados?.indicadores.assinaturas_pendentes ?? 0],
            ].map(([titulo, valor]) => <div key={titulo} style={card}><div style={{ color: "#64748b", fontSize: 13 }}>{titulo}</div><div style={{ fontSize: 27, fontWeight: 750, marginTop: 9 }}>{valor}</div></div>)}
          </section>
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
              <div><h2 style={{ margin: 0, fontSize: 18 }}>Clínicas</h2><p style={{ color: "#64748b", fontSize: 13, margin: "5px 0 0" }}>Usuários, armazenamento e situação da assinatura.</p></div>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar clínica..." style={{ ...campo, maxWidth: 280 }} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                <thead><tr>{["Clínica","Usuários","Arquivos","Armazenamento","Plano","Assinatura","Cadastro"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>{clinicasFiltradas.map((c) => <tr key={c.id}>
                  <td style={td}><strong>{c.nome}</strong><div style={{ color: "#94a3b8", marginTop: 3 }}>{c.email_contato || "Sem e-mail"} · #{c.id}</div></td>
                  <td style={td}>{c.total_usuarios}</td><td style={td}>{c.total_arquivos}</td><td style={td}>{formatarBytes(c.armazenamento_bytes)}</td>
                  <td style={td}>{c.plano || "—"}</td><td style={td}><span style={{ padding: "4px 8px", borderRadius: 20, background: c.assinatura_status === "ativa" ? "#dcfce7" : "#fef3c7", color: c.assinatura_status === "ativa" ? "#166534" : "#92400e" }}>{c.assinatura_status || "sem assinatura"}</span></td>
                  <td style={td}>{dataBR(c.created_at)}</td>
                </tr>)}
                {!clinicasFiltradas.length && <tr><td colSpan="7" style={{ ...td, textAlign: "center", color: "#64748b" }}>Nenhuma clínica encontrada.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        </>}
      </main>
    </div>
  );
}

const campo = { width: "100%", height: 44, border: "1px solid #dbe3ef", borderRadius: 10, padding: "0 12px", fontSize: 14, outline: "none", background: "#fff", color: "#172033" };
const th = { padding: "12px 10px", color: "#64748b", fontWeight: 600, borderBottom: "1px solid #e8edf5", whiteSpace: "nowrap" };
const td = { padding: "14px 10px", borderBottom: "1px solid #eef2f7", verticalAlign: "top" };

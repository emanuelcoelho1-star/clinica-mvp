import { useState, useEffect } from "react";

function Configuracoes() {
  /* ── Estado ─────────────────────────────────── */
  const [usuario, setUsuario] = useState({ nome: "", email: "" });
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [mensagemPerfil, setMensagemPerfil] = useState("");
  const [erroPerfil, setErroPerfil] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("perfil");
  const [hoverAba, setHoverAba] = useState(null);

  const token = localStorage.getItem("token");

  /* ── Carregar dados do usuário ──────────────── */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("http://localhost:3001/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.usuario) {
          setUsuario(data.usuario);
          localStorage.setItem("usuario", JSON.stringify(data.usuario));
        }
      } catch (err) {
        console.error("Erro ao carregar usuário:", err);
      }
    };
    loadUser();
  }, [token]);

  /* ── Salvar perfil ──────────────────────────── */
  const salvarPerfil = async (e) => {
    e.preventDefault();
    setErroPerfil("");
    setMensagemPerfil("");
    setSalvando(true);

    try {
      const res = await fetch("http://localhost:3001/auth/perfil", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: usuario.nome }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErroPerfil(data.erro || "Erro ao salvar perfil.");
      } else {
        setMensagemPerfil("Perfil atualizado com sucesso!");
        const updated = { ...usuario, nome: usuario.nome };
        localStorage.setItem("usuario", JSON.stringify(updated));
      }
    } catch (error) {
      setErroPerfil("Não foi possível conectar ao servidor.");
    }
    setSalvando(false);
  };

  /* ── Alterar senha ──────────────────────────── */
  const alterarSenha = async (e) => {
    e.preventDefault();
    setErro("");
    setMensagem("");

    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setSalvandoSenha(true);

    try {
      const res = await fetch("http://localhost:3001/auth/alterar-senha", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.erro || "Erro ao alterar senha.");
      } else {
        setMensagem("Senha alterada com sucesso!");
        setSenhaAtual("");
        setNovaSenha("");
        setConfirmarSenha("");
      }
    } catch (error) {
      setErro("Não foi possível conectar ao servidor.");
    }
    setSalvandoSenha(false);
  };

  /* ── Render ─────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div style={S.pageHeader}>
        <h1 style={S.pageTitle}>Configurações</h1>
        <p style={S.pageSubtitle}>Gerencie seu perfil e preferências da conta</p>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {[
          { key: "perfil", label: "Perfil", icon: "👤" },
          { key: "seguranca", label: "Segurança", icon: "🔒" },
        ].map((aba) => (
          <button
            key={aba.key}
            onClick={() => setAbaAtiva(aba.key)}
            onMouseEnter={() => setHoverAba(aba.key)}
            onMouseLeave={() => setHoverAba(null)}
            style={{
              ...S.tab,
              ...(abaAtiva === aba.key ? S.tabActive : {}),
              ...(hoverAba === aba.key && abaAtiva !== aba.key ? S.tabHover : {}),
            }}
          >
            <span>{aba.icon}</span>
            <span>{aba.label}</span>
          </button>
        ))}
      </div>

      {/* ── Aba Perfil ──────────────────────── */}
      {abaAtiva === "perfil" && (
        <div style={S.card}>
          <h2 style={S.cardTitle}>Informações do Perfil</h2>
          <p style={S.cardDesc}>Atualize suas informações pessoais</p>

          <form onSubmit={salvarPerfil} style={S.form}>
            {/* Avatar preview */}
            <div style={S.avatarSection}>
              <div style={S.avatarLarge}>
                {usuario.nome ? (
                  <span style={S.avatarLargeText}>
                    {usuario.nome.trim().split(" ").filter(Boolean).length > 1
                      ? usuario.nome.trim().split(" ")[0][0].toUpperCase() +
                        usuario.nome.trim().split(" ").pop()[0].toUpperCase()
                      : usuario.nome[0]?.toUpperCase() || "U"}
                  </span>
                ) : (
                  <span style={S.avatarLargeText}>U</span>
                )}
              </div>
              <div>
                <p style={S.avatarLabel}>{usuario.nome || "Administrador"}</p>
                <p style={S.avatarSub}>{usuario.email}</p>
              </div>
            </div>

            <div style={S.inputGroup}>
              <label style={S.label}>Nome completo</label>
              <input
                type="text"
                value={usuario.nome || ""}
                onChange={(e) => setUsuario({ ...usuario, nome: e.target.value })}
                style={S.input}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div style={S.inputGroup}>
              <label style={S.label}>E-mail</label>
              <input
                type="email"
                value={usuario.email || ""}
                style={{ ...S.input, backgroundColor: "#f1f5f9", color: "#94a3b8", cursor: "not-allowed" }}
                disabled
              />
              <span style={S.inputHint}>O e-mail não pode ser alterado.</span>
            </div>

            {erroPerfil && <p style={S.erro}>{erroPerfil}</p>}
            {mensagemPerfil && <p style={S.sucesso}>{mensagemPerfil}</p>}

            <button
              type="submit"
              style={{
                ...S.btnPrimary,
                opacity: salvando ? 0.7 : 1,
                cursor: salvando ? "not-allowed" : "pointer",
              }}
              disabled={salvando}
            >
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>
          </form>
        </div>
      )}

      {/* ── Aba Segurança ───────────────────── */}
      {abaAtiva === "seguranca" && (
        <div style={S.card}>
          <h2 style={S.cardTitle}>Alterar Senha</h2>
          <p style={S.cardDesc}>Atualize sua senha para manter a conta segura</p>

          <form onSubmit={alterarSenha} style={S.form}>
            <div style={S.inputGroup}>
              <label style={S.label}>Senha atual</label>
              <input
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                style={S.input}
                placeholder="Digite sua senha atual"
                required
              />
            </div>

            <div style={S.inputGroup}>
              <label style={S.label}>Nova senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                style={S.input}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div style={S.inputGroup}>
              <label style={S.label}>Confirmar nova senha</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                style={S.input}
                placeholder="Repita a nova senha"
                required
              />
            </div>

            {erro && <p style={S.erro}>{erro}</p>}
            {mensagem && <p style={S.sucesso}>{mensagem}</p>}

            <button
              type="submit"
              style={{
                ...S.btnPrimary,
                opacity: salvandoSenha ? 0.7 : 1,
                cursor: salvandoSenha ? "not-allowed" : "pointer",
              }}
              disabled={salvandoSenha}
            >
              {salvandoSenha ? "Alterando..." : "Alterar senha"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const S = {
  pageHeader: { marginBottom: "24px" },
  pageTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.025em",
  },
  pageSubtitle: {
    margin: "6px 0 0 0",
    fontSize: "14px",
    color: "#64748b",
    fontWeight: "500",
  },

  /* Tabs */
  tabs: {
    display: "flex",
    gap: "4px",
    marginBottom: "24px",
    background: "#fff",
    borderRadius: "12px",
    padding: "4px",
    border: "1px solid #f1f5f9",
    width: "fit-content",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 20px",
    border: "none",
    borderRadius: "9px",
    background: "transparent",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tabActive: {
    background: "#2563eb",
    color: "#fff",
    fontWeight: "600",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
  },
  tabHover: {
    background: "#f8fafc",
    color: "#334155",
  },

  /* Card */
  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "32px",
    border: "1px solid #f1f5f9",
    maxWidth: "560px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a",
  },
  cardDesc: {
    margin: "6px 0 28px 0",
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: "500",
  },

  /* Avatar section */
  avatarSection: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
    padding: "16px",
    background: "#f8fafc",
    borderRadius: "14px",
    border: "1px solid #f1f5f9",
  },
  avatarLarge: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 8px 20px rgba(37, 99, 235, 0.25)",
  },
  avatarLargeText: {
    color: "#fff",
    fontSize: "19px",
    fontWeight: "700",
    lineHeight: 1,
  },
  avatarLabel: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a",
  },
  avatarSub: {
    margin: "2px 0 0 0",
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: "500",
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
    fontSize: "13px",
    fontWeight: "600",
    color: "#334155",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  input: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#fff",
    color: "#0f172a",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
    width: "100%",
  },
  inputHint: {
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: "500",
  },

  /* Buttons */
  btnPrimary: {
    marginTop: "8px",
    padding: "12px 24px",
    border: "none",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(37, 99, 235, 0.22)",
    transition: "all 0.2s ease",
    width: "fit-content",
  },

  /* Messages */
  erro: {
    margin: 0,
    color: "#b91c1c",
    fontSize: "13px",
    backgroundColor: "#fee2e2",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #fecaca",
    fontWeight: "600",
  },
  sucesso: {
    margin: 0,
    color: "#15803d",
    fontSize: "13px",
    backgroundColor: "#f0fdf4",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #dcfce7",
    fontWeight: "600",
  },
};

export default Configuracoes;
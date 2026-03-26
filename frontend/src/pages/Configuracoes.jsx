import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* ── Icons (mesmos SVGs do prontuário) ────────────────────── */
const Icons = {
  arrowLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  user: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  mail: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  lock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  shield: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" x2="9" y1="9" y2="15" />
      <line x1="9" x2="15" y1="9" y2="15" />
    </svg>
  ),
};

/* ── Helpers ────────────────────────────────────────���─────── */
function getInitials(nome) {
  if (!nome) return "U";
  const parts = nome.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

/* ── Componente InfoItem (reutilizável, como no prontuário) ── */
function InfoItem({ label, value, icon }) {
  return (
    <div style={S.infoItem}>
      <span style={S.infoLabel}>
        {icon && <span style={S.infoLabelIcon}>{icon}</span>}
        {label}
      </span>
      <span style={S.infoValue}>{value || "—"}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
function Configuracoes() {
  const navigate = useNavigate();
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
  const [hoveredTab, setHoveredTab] = useState(null);

  const token = localStorage.getItem("token");

  /* ── Carregar dados ─────────────────────────────── */
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

  /* ── Salvar perfil ──────────────────────────────── */
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
        setTimeout(() => setMensagemPerfil(""), 4000);
      }
    } catch (error) {
      setErroPerfil("Não foi possível conectar ao servidor.");
    }
    setSalvando(false);
  };

  /* ── Alterar senha ──────────────────────────────── */
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
        setTimeout(() => setMensagem(""), 4000);
      }
    } catch (error) {
      setErro("Não foi possível conectar ao servidor.");
    }
    setSalvandoSenha(false);
  };

  /* ── Tab config ─────────────────────────────────── */
  const ABAS = [
    { id: "perfil", label: "Perfil" },
    { id: "seguranca", label: "Segurança" },
  ];

  /* ── Render ─────────────────────────────────────── */
  return (
    <div style={S.page}>

      {/* ── Breadcrumb (igual ao prontuário) ─────── */}
      <div style={S.topBar}>
        <button
          style={S.backBtn}
          onClick={() => navigate("/")}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {Icons.arrowLeft}
          <span>Dashboard</span>
        </button>
        <span style={S.breadcrumbSep}>/</span>
        <span style={S.breadcrumbCurrent}>Configurações</span>
      </div>

      {/* ── Profile Card (igual ao prontuário) ───── */}
      <div style={S.profileCard}>
        <div style={S.profileTop}>
          {/* Avatar */}
          <div style={S.avatar}>
            {getInitials(usuario.nome)}
          </div>

          {/* Info */}
          <div style={S.profileInfo}>
            <div style={S.profileNameRow}>
              <h1 style={S.profileName}>{usuario.nome || "Administrador"}</h1>
            </div>
            <div style={S.chipsRow}>
              <span style={S.chip}>
                <span style={S.chipIcon}>{Icons.mail}</span>
                {usuario.email || "—"}
              </span>
              <span style={S.chip}>
                <span style={S.chipIcon}>{Icons.shield}</span>
                Administrador
              </span>
            </div>
          </div>
        </div>

        {/* ── Tabs (igual ao prontuário) ──────────── */}
        <div style={S.tabsBar}>
          {ABAS.map((aba) => {
            const ativa = abaAtiva === aba.id;
            const hovered = hoveredTab === aba.id;
            return (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaAtiva(aba.id)}
                onMouseEnter={() => setHoveredTab(aba.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  ...S.tab,
                  color: ativa ? "#2563eb" : hovered ? "#0f172a" : "#64748b",
                  borderBottomColor: ativa ? "#2563eb" : "transparent",
                }}
              >
                {aba.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Aba: Perfil ═══════════════════════════ */}
      {abaAtiva === "perfil" && (
        <div style={S.grid}>
          {/* Card: Informações atuais */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitleRow}>
                <span style={S.cardIcon}>{Icons.user}</span>
                <h2 style={S.cardTitle}>Informações atuais</h2>
              </div>
            </div>
            <div style={S.infoGrid}>
              <InfoItem label="Nome completo" value={usuario.nome || "Administrador"} />
              <InfoItem label="E-mail" value={usuario.email} />
              <InfoItem label="Perfil" value="Administrador" />
            </div>
          </div>

          {/* Card: Editar perfil */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitleRow}>
                <span style={S.cardIcon}>{Icons.user}</span>
                <h2 style={S.cardTitle}>Editar perfil</h2>
              </div>
            </div>

            <form onSubmit={salvarPerfil} style={S.form}>
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
                  style={{ ...S.input, background: "#f8fafc", color: "#94a3b8", cursor: "not-allowed" }}
                  disabled
                />
                <span style={S.inputHint}>O e-mail não pode ser alterado.</span>
              </div>

              {erroPerfil && (
                <div style={S.alertaErro}>
                  <span style={{ display: "flex" }}>{Icons.x}</span>
                  <span>{erroPerfil}</span>
                </div>
              )}
              {mensagemPerfil && (
                <div style={S.alertaSucesso}>
                  <span style={{ display: "flex" }}>{Icons.check}</span>
                  <span>{mensagemPerfil}</span>
                </div>
              )}

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
        </div>
      )}

      {/* ═══ Aba: Segurança ════════════════════════ */}
      {abaAtiva === "seguranca" && (
        <div style={S.grid}>
          {/* Card: Status */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitleRow}>
                <span style={S.cardIcon}>{Icons.shield}</span>
                <h2 style={S.cardTitle}>Status de segurança</h2>
              </div>
            </div>
            <div style={S.infoGrid}>
              <InfoItem label="Autenticação" value="Ativa — JWT Token" />
              <InfoItem label="Criptografia" value="bcrypt (hash)" />
              <InfoItem label="Validade do token" value="7 dias" />
            </div>
          </div>

          {/* Card: Alterar senha */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitleRow}>
                <span style={S.cardIcon}>{Icons.lock}</span>
                <h2 style={S.cardTitle}>Alterar senha</h2>
              </div>
            </div>

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

              {erro && (
                <div style={S.alertaErro}>
                  <span style={{ display: "flex" }}>{Icons.x}</span>
                  <span>{erro}</span>
                </div>
              )}
              {mensagem && (
                <div style={S.alertaSucesso}>
                  <span style={{ display: "flex" }}>{Icons.check}</span>
                  <span>{mensagem}</span>
                </div>
              )}

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
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES — Mesmo design system do ProntuarioPaciente
   ═══════════════════════════════════════════════════════════ */
const S = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  /* ── Breadcrumb (idêntico ao prontuário) ───────── */
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "transparent",
    border: "none",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "#64748b",
    transition: "all 0.15s ease",
  },
  breadcrumbSep: { color: "#d1d5db", fontSize: "14px" },
  breadcrumbCurrent: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
  },

  /* ── Profile Card (idêntico ao prontuário) ─────── */
  profileCard: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
    overflow: "hidden",
  },
  profileTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: "20px",
    padding: "28px 28px 20px",
    flexWrap: "wrap",
  },
  avatar: {
    width: "72px",
    height: "72px",
    borderRadius: "16px",
    background: "#f0f4ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: "700",
    flexShrink: 0,
    letterSpacing: "0.02em",
  },
  profileInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    flex: 1,
    minWidth: "260px",
  },
  profileNameRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  profileName: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  chipsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
    background: "#f8fafc",
    borderRadius: "8px",
    padding: "5px 12px",
    border: "1px solid #f1f5f9",
  },
  chipIcon: {
    display: "flex",
    alignItems: "center",
    color: "#94a3b8",
  },

  /* ── Tabs (idêntico ao prontuário) ──────────────── */
  tabsBar: {
    display: "flex",
    gap: "0",
    borderTop: "1px solid #f1f5f9",
    padding: "0 28px",
    overflowX: "auto",
  },
  tab: {
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "14px 16px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },

  /* ── Grid ───────────────────────────────────────── */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "20px",
  },

  /* ── Card (idêntico ao prontuário) ──────────────── */
  card: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
    padding: "24px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "18px",
  },
  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  cardIcon: {
    display: "flex",
    color: "#94a3b8",
  },
  cardTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a",
    letterSpacing: "-0.01em",
  },

  /* ── Info Grid (idêntico ao prontuário) ──────────── */
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "2px",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#f1f5f9",
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "14px 16px",
    background: "#fafbfc",
  },
  infoLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  infoLabelIcon: {
    display: "flex",
    alignItems: "center",
  },
  infoValue: {
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "500",
    wordBreak: "break-word",
    lineHeight: 1.4,
  },

  /* ── Form ───────────────────────────────────────── */
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
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
  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#fff",
    color: "#0f172a",
    fontWeight: "500",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
    width: "100%",
    fontFamily: "inherit",
  },
  inputHint: {
    fontSize: "11px",
    color: "#94a3b8",
    fontWeight: "500",
  },

  /* ── Alertas (mesmo padrão do prontuário) ────────── */
  alertaErro: {
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
  alertaSucesso: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: "600",
    border: "1px solid #dcfce7",
    background: "#f0fdf4",
    color: "#15803d",
  },

  /* ── Botão (mesmo padrão do prontuário) ──────────── */
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(37,99,235,0.2)",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    height: "40px",
    boxSizing: "border-box",
    width: "fit-content",
    fontFamily: "inherit",
    marginTop: "4px",
  },
};

export default Configuracoes;
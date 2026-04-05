import API_URL from "../api";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ── helpers ─────────────────────────────────────────────── */
const AVATAR_PALETTES = [
  { bg: "#f0f4ff", color: "#4361ee" },
  { bg: "#fef3f2", color: "#e63946" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fefce8", color: "#ca8a04" },
  { bg: "#faf5ff", color: "#9333ea" },
  { bg: "#fff1f2", color: "#e11d48" },
  { bg: "#ecfeff", color: "#0891b2" },
  { bg: "#fdf4ff", color: "#c026d3" },
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function formatCpf(cpf) {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return cpf;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

/* ── SVG Icons (inline, sem dependências) ────────────────── */
const Icons = {
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  ),
  phone: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  mail: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  whatsapp: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  ),
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  emptyState: (
    <svg width="64" height="64" viewBox="0 0 120 120" fill="none">
      <rect x="10" y="24" width="100" height="76" rx="16" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="22" y="40" width="76" height="8" rx="4" fill="#e2e8f0" />
      <rect x="22" y="56" width="52" height="8" rx="4" fill="#e2e8f0" />
      <rect x="22" y="72" width="64" height="8" rx="4" fill="#e2e8f0" />
      <circle cx="96" cy="24" r="18" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2" />
      <path d="M96 16v16M88 24h16" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
};

/* ── Componente Principal ────────────────────────────────── */
function Pacientes() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const carregarPacientes = () => {
    const token = localStorage.getItem("token");
    setCarregando(true);
    fetch(`${API_URL}/pacientes`, {
      headers: { Authorization: token },
    })
      .then((res) => res.json())
      .then((data) => {
        setPacientes(Array.isArray(data) ? data : []);
        setCarregando(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar pacientes:", err);
        setCarregando(false);
      });
  };

  useEffect(() => {
    carregarPacientes();
  }, []);

  const pacientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return pacientes;
    return pacientes.filter(
      (p) =>
        (p.nome || "").toLowerCase().includes(termo) ||
        String(p.cpf || "").toLowerCase().includes(termo) ||
        String(p.telefone || "").toLowerCase().includes(termo) ||
        String(p.email || "").toLowerCase().includes(termo)
    );
  }, [pacientes, busca]);

  const stats = useMemo(() => {
    const comTel = pacientes.filter((p) => p.telefone).length;
    const comEmail = pacientes.filter((p) => p.email).length;
    return { total: pacientes.length, comTel, comEmail };
  }, [pacientes]);

  const gerarLinkWhatsApp = (telefone) => {
    if (!telefone) return "#";
    let numero = String(telefone).replace(/\D/g, "");
    if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
    return `https://wa.me/${numero}`;
  };

  const deletarPaciente = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este paciente?")) return;
    const token = localStorage.getItem("token");
    try {
      const resposta = await fetch(`${API_URL}/pacientes/${id}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      if (!resposta.ok) throw new Error("Erro ao excluir paciente");
      carregarPacientes();
    } catch (erro) {
      console.error(erro);
      alert("Não foi possível excluir o paciente.");
    }
  };

  /* ── Loading State ──────────────────────────────────────── */
  if (carregando) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.loadingPulse}>
          <div style={s.loadingDot1} />
          <div style={s.loadingDot2} />
          <div style={s.loadingDot3} />
        </div>
        <span style={s.loadingText}>Carregando pacientes</span>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div style={s.page}>
      {/* ── Header ──────────────────────────────────────── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerTitleRow}>
            <h1 style={s.headerTitle}>Pacientes</h1>
            <span style={s.headerCount}>{stats.total}</span>
          </div>
          <p style={s.headerSub}>
            Gerencie os pacientes cadastrados na clínica
          </p>
        </div>
        <button
          style={s.btnPrimary}
          onClick={() => navigate("/pacientes/novo")}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(37,99,235,0.2)";
          }}
        >
          {Icons.plus}
          <span>Novo paciente</span>
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────── */}
      <div style={s.statsRow}>
        {[
          { label: "Total", value: stats.total, accent: "#2563eb", bg: "#eff6ff" },
          { label: "Com telefone", value: stats.comTel, accent: "#16a34a", bg: "#f0fdf4" },
          { label: "Com e-mail", value: stats.comEmail, accent: "#9333ea", bg: "#faf5ff" },
        ].map((stat) => (
          <div key={stat.label} style={s.statCard}>
            <span style={{ ...s.statValue, color: stat.accent }}>{stat.value}</span>
            <span style={s.statLabel}>{stat.label}</span>
            <div style={{ ...s.statBar, background: stat.bg }}>
              <div
                style={{
                  ...s.statBarFill,
                  background: stat.accent,
                  width: stats.total > 0 ? `${(stat.value / stats.total) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Bar ──────────────────────────── */}
      <div style={s.searchBar}>
        <div
          style={{
            ...s.searchInputWrap,
            borderColor: searchFocused ? "#2563eb" : "#e2e8f0",
            boxShadow: searchFocused
              ? "0 0 0 3px rgba(37,99,235,0.1)"
              : "none",
          }}
        >
          <span style={{ ...s.searchIcon, color: searchFocused ? "#2563eb" : "#94a3b8" }}>
            {Icons.search}
          </span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Buscar por nome, CPF, telefone ou e-mail..."
            style={s.searchInput}
          />
          {busca && (
            <button style={s.searchClear} onClick={() => setBusca("")}>
              ✕
            </button>
          )}
        </div>
        <button
          style={s.btnSecondary}
          onClick={carregarPacientes}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          {Icons.refresh}
          <span>Atualizar</span>
        </button>
      </div>

      {/* ── Tabela / Lista ──────────────────────────────── */}
      <div style={s.tableCard}>
        {/* Table header */}
        <div style={s.tableHeader}>
          <span style={{ ...s.thCell, flex: 1 }}>Paciente</span>
          <span style={{ ...s.thCell, width: "150px" }}>CPF</span>
          <span style={{ ...s.thCell, width: "140px" }}>Telefone</span>
          <span style={{ ...s.thCell, width: "180px" }}>E-mail</span>
          <span style={{ ...s.thCell, width: "120px", textAlign: "right" }}>Ações</span>
        </div>

        {/* Conteúdo */}
        {pacientesFiltrados.length === 0 ? (
          <div style={s.emptyState}>
            {Icons.emptyState}
            <h3 style={s.emptyTitle}>
              {busca ? "Nenhum resultado" : "Nenhum paciente"}
            </h3>
            <p style={s.emptyText}>
              {busca
                ? `Não encontramos pacientes com "${busca}". Tente outro termo.`
                : "Comece cadastrando o primeiro paciente da sua clínica."}
            </p>
            {!busca && (
              <button
                style={{ ...s.btnPrimary, marginTop: "4px" }}
                onClick={() => navigate("/pacientes/novo")}
              >
                {Icons.plus}
                <span>Cadastrar primeiro paciente</span>
              </button>
            )}
          </div>
        ) : (
          <ul style={s.list}>
            {pacientesFiltrados.map((p) => {
              const isHovered = hoveredId === p.id;
              const palette = getAvatarColor(p.nome);
              return (
                <li
                  key={p.id}
                  style={{
                    ...s.row,
                    background: isHovered ? "#fafbfd" : "transparent",
                  }}
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Avatar + Nome */}
                  <div style={{ ...s.rowCell, flex: 1, gap: "14px" }}>
                    <div
                      style={{
                        ...s.avatar,
                        background: palette.bg,
                        color: palette.color,
                      }}
                    >
                      {getInitials(p.nome)}
                    </div>
                    <div style={s.nameWrap}>
                      <button
                        style={{
                          ...s.nameBtn,
                          color: isHovered ? "#2563eb" : "#0f172a",
                        }}
                        onClick={() => navigate(`/pacientes/${p.id}`)}
                      >
                        {p.nome}
                      </button>
                      {p.profissao && (
                        <span style={s.profession}>{p.profissao}</span>
                      )}
                    </div>
                  </div>

                  {/* CPF */}
                  <div style={{ ...s.rowCell, width: "150px" }}>
                    <span style={s.cellText}>{formatCpf(p.cpf)}</span>
                  </div>

                  {/* Telefone */}
                  <div style={{ ...s.rowCell, width: "140px" }}>
                    {p.telefone ? (
                      <span style={{ ...s.cellText, display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "#94a3b8", display: "flex" }}>{Icons.phone}</span>
                        {p.telefone}
                      </span>
                    ) : (
                      <span style={s.cellEmpty}>—</span>
                    )}
                  </div>

                  {/* Email */}
                  <div style={{ ...s.rowCell, width: "180px" }}>
                    {p.email ? (
                      <span style={{ ...s.cellText, display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "#94a3b8", display: "flex" }}>{Icons.mail}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.email}
                        </span>
                      </span>
                    ) : (
                      <span style={s.cellEmpty}>—</span>
                    )}
                  </div>

                  {/* Actions — apenas WhatsApp, Editar e Excluir */}
                  <div
                    style={{
                      ...s.rowCell,
                      width: "120px",
                      justifyContent: "flex-end",
                      gap: "6px",
                      opacity: isHovered ? 1 : 0.4,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {p.telefone && (
                      <a
                        href={gerarLinkWhatsApp(p.telefone)}
                        target="_blank"
                        rel="noreferrer"
                        style={s.actionBtn}
                        title="WhatsApp"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f0fdf4";
                          e.currentTarget.style.color = "#16a34a";
                          e.currentTarget.style.borderColor = "#bbf7d0";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#64748b";
                          e.currentTarget.style.borderColor = "transparent";
                        }}
                      >
                        {Icons.whatsapp}
                      </a>
                    )}
                    <button
                      style={s.actionBtn}
                      onClick={() => navigate(`/pacientes/editar/${p.id}`)}
                      title="Editar paciente"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fffbeb";
                        e.currentTarget.style.color = "#d97706";
                        e.currentTarget.style.borderColor = "#fde68a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#64748b";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      {Icons.edit}
                    </button>
                    <button
                      style={s.actionBtn}
                      onClick={() => deletarPaciente(p.id)}
                      title="Excluir paciente"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fef2f2";
                        e.currentTarget.style.color = "#dc2626";
                        e.currentTarget.style.borderColor = "#fecaca";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#64748b";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      {Icons.trash}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer */}
        {pacientesFiltrados.length > 0 && (
          <div style={s.tableFooter}>
            <span style={s.footerText}>
              Exibindo{" "}
              <strong>{pacientesFiltrados.length}</strong> de{" "}
              <strong>{pacientes.length}</strong> paciente
              {pacientes.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Keyframes para loading */}
      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   ═══════════════════════════════════════════════════════════ */
const s = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  /* ── Loading ──────────────────────────────────────── */
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    minHeight: "400px",
  },
  loadingPulse: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  loadingDot1: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite",
    animationDelay: "0s",
  },
  loadingDot2: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite",
    animationDelay: "0.2s",
  },
  loadingDot3: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite",
    animationDelay: "0.4s",
  },
  loadingText: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#94a3b8",
    letterSpacing: "0.02em",
  },

  /* ── Header ───────────────────────────────────────── */
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.025em",
    lineHeight: 1.2,
  },
  headerCount: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f1f5f9",
    color: "#475569",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    padding: "4px 10px",
    lineHeight: 1,
  },
  headerSub: {
    margin: 0,
    fontSize: "14px",
    color: "#94a3b8",
    fontWeight: "400",
  },

  /* ── Buttons ──────────────────────────────────────── */
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
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "0 16px",
    background: "#fff",
    color: "#475569",
    fontWeight: "500",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    height: "40px",
    boxSizing: "border-box",
  },

  /* ── Stats ────────────────────────────────────────── */
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
  },
  statCard: {
    background: "#fff",
    border: "1px solid #f1f5f9",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: "500",
  },
  statBar: {
    height: "4px",
    borderRadius: "999px",
    marginTop: "8px",
    overflow: "hidden",
  },
  statBarFill: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.6s ease",
  },

  /* ── Search Bar ──────────────────────────────────── */
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  searchInputWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    height: "40px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "0 14px",
    background: "#fff",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
  },
  searchIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    transition: "color 0.2s ease",
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "14px",
    color: "#0f172a",
    background: "transparent",
    fontWeight: "400",
    height: "100%",
  },
  searchClear: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "none",
    background: "#f1f5f9",
    color: "#94a3b8",
    fontSize: "10px",
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1,
  },

  /* ── Table Card ──────────────────────────────────── */
  tableCard: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
    overflow: "hidden",
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    height: "44px",
    background: "#fafbfc",
    borderBottom: "1px solid #f1f5f9",
    gap: "12px",
  },
  thCell: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  /* ── Row ──────────────────────────────────────────── */
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "12px 24px",
    borderBottom: "1px solid #f8fafc",
    gap: "12px",
    transition: "background 0.15s ease",
    cursor: "default",
  },
  rowCell: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "700",
    flexShrink: 0,
    letterSpacing: "0.02em",
  },
  nameWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  nameBtn: {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    textAlign: "left",
    transition: "color 0.15s ease",
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  profession: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "400",
    lineHeight: 1.3,
  },
  cellText: {
    fontSize: "13px",
    color: "#475569",
    fontWeight: "400",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cellEmpty: {
    fontSize: "13px",
    color: "#d1d5db",
    fontWeight: "400",
  },

  /* ── Action buttons ──────────────────────────────── */
  actionBtn: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: "1px solid transparent",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    transition: "all 0.15s ease",
    padding: 0,
    flexShrink: 0,
  },

  /* ── Empty State ─────────────────────────────────── */
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "64px 20px",
  },
  emptyTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
    color: "#0f172a",
  },
  emptyText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: "400",
    textAlign: "center",
    maxWidth: "360px",
    lineHeight: 1.5,
  },

  /* ── Table Footer ────────────────────────────────── */
  tableFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    borderTop: "1px solid #f1f5f9",
    background: "#fafbfc",
  },
  footerText: {
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: "400",
  },
};

export default Pacientes;
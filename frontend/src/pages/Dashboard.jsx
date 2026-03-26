import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

const AVATAR_PALETTES = [
  { bg: "#f0f4ff", color: "#4361ee" },
  { bg: "#fef3f2", color: "#e63946" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fefce8", color: "#ca8a04" },
  { bg: "#faf5ff", color: "#9333ea" },
  { bg: "#ecfeff", color: "#0891b2" },
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

const STATUS_CONFIG = {
  agendado:  { label: "Agendado",  bg: "#eff6ff", color: "#2563eb", dot: "#60a5fa" },
  realizado: { label: "Realizado", bg: "#f0fdf4", color: "#16a34a", dot: "#4ade80" },
  cancelado: { label: "Cancelado", bg: "#fef2f2", color: "#dc2626", dot: "#f87171" },
  faltou:    { label: "Faltou",    bg: "#fff7ed", color: "#ea580c", dot: "#fb923c" },
};

/* ═══════════════════════════════════════════════════════════
   ICONS — SVG reais (mesmo padrão Lucide do prontuário)
   ═══════════════════════════════════════════════════════════ */
const Icons = {
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  ),
  calendarCheck: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  ),
  clock: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  activity: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  ),
  arrowRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
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
  zap: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  userPlus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  ),
  list: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  ),
  emptyCalendar: (
    <svg width="48" height="48" viewBox="0 0 120 120" fill="none">
      <rect x="20" y="28" width="80" height="72" rx="14" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="20" y="28" width="80" height="22" rx="14" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
      <circle cx="44" cy="70" r="4" fill="#e2e8f0" />
      <circle cx="60" cy="70" r="4" fill="#e2e8f0" />
      <circle cx="76" cy="70" r="4" fill="#e2e8f0" />
      <circle cx="44" cy="84" r="4" fill="#e2e8f0" />
      <circle cx="60" cy="84" r="4" fill="#e2e8f0" />
      <path d="M46 18v16" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M74 18v16" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTES
   ═══════════════════════════════════════════════════════════ */
function StatCard({ label, value, icon, accent, sub }) {
  return (
    <div style={S.statCard}>
      <div style={S.statTop}>
        <span style={{ ...S.statIconBox, background: accent + "12", color: accent }}>
          {icon}
        </span>
        <span style={S.statLabel}>{label}</span>
      </div>
      <strong style={S.statValue}>{value}</strong>
      {sub && <span style={S.statSub}>{sub}</span>}
    </div>
  );
}

function SectionCard({ title, icon, action, onAction, children, empty }) {
  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={S.cardTitleRow}>
          {icon && <span style={S.cardIcon}>{icon}</span>}
          <h2 style={S.cardTitle}>{title}</h2>
        </div>
        {action && (
          <button
            style={S.sectionAction}
            onClick={onAction}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span>{action}</span>
            {Icons.arrowRight}
          </button>
        )}
      </div>
      {empty ? (
        <div style={S.emptyState}>
          {Icons.emptyCalendar}
          <p style={S.emptyTitle}>{empty}</p>
          <p style={S.emptyText}>Os dados aparecerão aqui quando disponíveis.</p>
        </div>
      ) : children}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.agendado;
  return (
    <span style={{ ...S.badge, background: cfg.bg, color: cfg.color }}>
      <span style={{ ...S.badgeDot, background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
function Dashboard() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [consultas, setConsultas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: token };

    Promise.all([
      fetch("http://localhost:3001/pacientes", { headers }).then((r) => r.json()),
      fetch("http://localhost:3001/consultas", { headers }).then((r) => r.json()),
    ])
      .then(([p, c]) => {
        setPacientes(Array.isArray(p) ? p : []);
        setConsultas(Array.isArray(c) ? c : []);
      })
      .catch((err) => console.error("Erro ao buscar dados:", err))
      .finally(() => setCarregando(false));
  }, []);

  const hoje = new Date().toISOString().split("T")[0];

  const consultasHoje = useMemo(
    () => consultas.filter((c) => c.data === hoje).sort((a, b) => a.horario.localeCompare(b.horario)),
    [consultas, hoje]
  );

  const proximasConsultas = useMemo(
    () =>
      [...consultas]
        .filter((c) => c.data >= hoje)
        .sort((a, b) => `${a.data}T${a.horario}`.localeCompare(`${b.data}T${b.horario}`))
        .slice(0, 6),
    [consultas, hoje]
  );

  const consultasSemana = useMemo(() => {
    const fim = new Date();
    fim.setDate(fim.getDate() + 7);
    const fimISO = fim.toISOString().split("T")[0];
    return consultas.filter((c) => c.data >= hoje && c.data <= fimISO).length;
  }, [consultas, hoje]);

  const ultimosPacientes = pacientes.slice(0, 5);

  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const nomeUsuario = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("usuario"));
      return u?.nome?.split(" ")[0] || "Doutor(a)";
    } catch {
      return "Doutor(a)";
    }
  })();

  /* ── Loading ─────────────────────────────────────── */
  if (carregando) {
    return (
      <div style={S.loadingWrap}>
        <div style={S.loadingPulse}>
          <div style={S.loadingDot1} />
          <div style={S.loadingDot2} />
          <div style={S.loadingDot3} />
        </div>
        <span style={S.loadingText}>Carregando painel</span>
        <style>{`
          @keyframes pulse-dot {
            0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={S.page}>

      {/* ── Hero / Welcome Card ──────────────────── */}
      <div style={S.heroCard}>
        <div style={S.heroTop}>
          <div style={S.heroLeft}>
            <div style={S.heroDateChip}>
              <span style={S.heroDateIcon}>{Icons.calendar}</span>
              <span>{dataFormatada}</span>
            </div>
            <h1 style={S.heroTitle}>{saudacao()}, {nomeUsuario}</h1>
            <p style={S.heroSub}>
              Você tem <strong style={{ color: "#2563eb" }}>{consultasHoje.length} consulta{consultasHoje.length !== 1 ? "s" : ""}</strong> agendada{consultasHoje.length !== 1 ? "s" : ""} para hoje
              {consultasHoje.length > 0 ? ` — próxima às ${consultasHoje[0].horario}.` : "."}
            </p>
          </div>
          <div style={S.heroRight}>
            <button
              style={S.heroBtnPrimary}
              onClick={() => navigate("/pacientes/novo")}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 12px 28px rgba(37,99,235,0.35)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.25)")}
            >
              {Icons.plus}
              <span>Novo paciente</span>
            </button>
            <button
              style={S.heroBtnSecondary}
              onClick={() => navigate("/agenda")}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              {Icons.calendar}
              <span>Ver agenda</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ───────────────────────────── */}
      <div style={S.statsGrid}>
        <StatCard label="Total de pacientes" value={pacientes.length} icon={Icons.users} accent="#2563eb" sub="cadastrados no sistema" />
        <StatCard label="Consultas hoje" value={consultasHoje.length} icon={Icons.calendarCheck} accent="#0ea5e9" sub={consultasHoje.length > 0 ? `Próx. às ${consultasHoje[0].horario}` : "Nenhuma consulta"} />
        <StatCard label="Esta semana" value={consultasSemana} icon={Icons.clock} accent="#8b5cf6" sub="próximos 7 dias" />
        <StatCard label="Total de consultas" value={consultas.length} icon={Icons.activity} accent="#10b981" sub="registradas no sistema" />
      </div>

      {/* ── Grid Principal ───────────────────────── */}
      <div style={S.mainGrid}>

        {/* Consultas de hoje */}
        <SectionCard
          title="Consultas de hoje"
          icon={Icons.calendarCheck}
          action="Ver agenda completa"
          onAction={() => navigate("/agenda")}
          empty={consultasHoje.length === 0 ? "Nenhuma consulta agendada para hoje." : null}
        >
          <ul style={S.listUl}>
            {consultasHoje.map((c, i) => (
              <li key={c.id} style={{ ...S.listRow, borderBottom: i < consultasHoje.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                <div style={S.horarioBox}>
                  <span style={S.horarioText}>{c.horario.slice(0, 5)}</span>
                </div>
                <div style={S.rowInfo}>
                  <strong style={S.rowNome}>{c.paciente_nome || "Paciente"}</strong>
                  <span style={S.rowSub}>{c.procedimento || "Procedimento não informado"}</span>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Próximas consultas */}
        <SectionCard
          title="Próximas consultas"
          icon={Icons.clock}
          empty={proximasConsultas.length === 0 ? "Nenhuma consulta futura cadastrada." : null}
        >
          <ul style={S.listUl}>
            {proximasConsultas.map((c, i) => (
              <li key={c.id} style={{ ...S.listRow, borderBottom: i < proximasConsultas.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                <div style={S.dateBox}>
                  <span style={S.dateDia}>{c.data.split("-")[2]}</span>
                  <span style={S.dateMes}>
                    {new Date(c.data + "T00:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                  </span>
                </div>
                <div style={S.rowInfo}>
                  <strong style={S.rowNome}>{c.paciente_nome || "Paciente"}</strong>
                  <span style={S.rowSub}>{c.horario.slice(0, 5)} · {c.procedimento || "Sem procedimento"}</span>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* ── Grid Inferior ────────────────────────── */}
      <div style={S.mainGrid}>

        {/* Últimos pacientes */}
        <SectionCard
          title="Últimos pacientes"
          icon={Icons.users}
          action="Ver todos"
          onAction={() => navigate("/pacientes")}
          empty={ultimosPacientes.length === 0 ? "Nenhum paciente cadastrado ainda." : null}
        >
          <ul style={S.listUl}>
            {ultimosPacientes.map((p, i) => {
              const pal = getAvatarColor(p.nome);
              return (
                <li
                  key={p.id}
                  style={{
                    ...S.listRow,
                    borderBottom: i < ultimosPacientes.length - 1 ? "1px solid #f1f5f9" : "none",
                    cursor: "pointer",
                    borderRadius: "10px",
                  }}
                  onClick={() => navigate(`/pacientes/${p.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ ...S.avatar, background: pal.bg, color: pal.color }}>
                    {getInitials(p.nome)}
                  </div>
                  <div style={S.rowInfo}>
                    <strong style={S.rowNome}>{p.nome}</strong>
                    <div style={S.rowChips}>
                      {p.telefone && (
                        <span style={S.rowChip}>
                          <span style={S.rowChipIcon}>{Icons.phone}</span>
                          {p.telefone}
                        </span>
                      )}
                      {p.email && (
                        <span style={S.rowChip}>
                          <span style={S.rowChipIcon}>{Icons.mail}</span>
                          {p.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={S.chevron}>{Icons.arrowRight}</span>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        {/* Ações rápidas */}
        <div style={S.quickCard}>
          <div style={S.quickBadge}>
            <span style={{ display: "flex" }}>{Icons.zap}</span>
            <span>AÇÕES RÁPIDAS</span>
          </div>
          <h2 style={S.quickTitle}>O que deseja fazer agora?</h2>
          <p style={S.quickSub}>Acesse as principais funcionalidades do sistema rapidamente.</p>
          <div style={S.quickActions}>
            <button
              style={S.quickBtn}
              onClick={() => navigate("/pacientes/novo")}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            >
              <span style={S.quickBtnIcon}>{Icons.userPlus}</span>
              <div style={S.quickBtnInfo}>
                <span style={S.quickBtnLabel}>Cadastrar paciente</span>
                <span style={S.quickBtnDesc}>Adicione um novo paciente ao sistema</span>
              </div>
              <span style={S.quickBtnArrow}>{Icons.arrowRight}</span>
            </button>
            <button
              style={S.quickBtn}
              onClick={() => navigate("/agenda")}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            >
              <span style={S.quickBtnIcon}>{Icons.calendar}</span>
              <div style={S.quickBtnInfo}>
                <span style={S.quickBtnLabel}>Abrir agenda</span>
                <span style={S.quickBtnDesc}>Gerencie seus compromissos</span>
              </div>
              <span style={S.quickBtnArrow}>{Icons.arrowRight}</span>
            </button>
            <button
              style={S.quickBtn}
              onClick={() => navigate("/pacientes")}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            >
              <span style={S.quickBtnIcon}>{Icons.list}</span>
              <div style={S.quickBtnInfo}>
                <span style={S.quickBtnLabel}>Listar pacientes</span>
                <span style={S.quickBtnDesc}>Veja todos os pacientes cadastrados</span>
              </div>
              <span style={S.quickBtnArrow}>{Icons.arrowRight}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const S = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  /* ── Loading ───────────────────────────────────── */
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    minHeight: "400px",
  },
  loadingPulse: { display: "flex", gap: "8px", alignItems: "center" },
  loadingDot1: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0s",
  },
  loadingDot2: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.2s",
  },
  loadingDot3: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.4s",
  },
  loadingText: {
    fontSize: "14px", fontWeight: "500", color: "#94a3b8", letterSpacing: "0.02em",
  },

  /* ── Hero Card ─────────────────────────────────── */
  heroCard: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
    overflow: "hidden",
  },
  heroTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    padding: "28px 28px",
    flexWrap: "wrap",
  },
  heroLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  heroDateChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#2563eb",
    background: "#eff6ff",
    borderRadius: "8px",
    padding: "5px 12px",
    border: "1px solid #dbeafe",
    textTransform: "capitalize",
    width: "fit-content",
  },
  heroDateIcon: {
    display: "flex",
    alignItems: "center",
    color: "#60a5fa",
  },
  heroTitle: {
    margin: 0,
    fontSize: "26px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.025em",
    lineHeight: 1.2,
  },
  heroSub: {
    margin: 0,
    fontSize: "15px",
    color: "#64748b",
    fontWeight: "500",
    lineHeight: 1.5,
  },
  heroRight: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  heroBtnPrimary: {
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
    boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    height: "40px",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  heroBtnSecondary: {
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
    fontFamily: "inherit",
  },

  /* ── Stats ─────────────────────────────────────── */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  statCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "22px",
    border: "1px solid #f1f5f9",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  statTop: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  statIconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b",
  },
  statValue: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },
  statSub: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "500",
  },

  /* ── Card ───────────────────────────────────────── */
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
    gap: "12px",
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
  sectionAction: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "transparent",
    border: "none",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: "6px 10px",
    borderRadius: "8px",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },

  /* ── Grid ───────────────────────────────────────── */
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "20px",
  },

  /* ── Lists ──────────────────────────────────────── */
  listUl: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  listRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 4px",
    transition: "background 0.15s ease",
  },

  /* ── Horário box ────────────────────────────────── */
  horarioBox: {
    width: "48px",
    height: "48px",
    background: "#eff6ff",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "1px solid #dbeafe",
  },
  horarioText: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#2563eb",
  },

  /* ── Date box ───────────────────────────────────── */
  dateBox: {
    width: "48px",
    height: "48px",
    background: "#f8fafc",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #f1f5f9",
    flexShrink: 0,
  },
  dateDia: {
    fontSize: "17px",
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 1,
  },
  dateMes: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  /* ── Row info ───────────────────────────────────── */
  rowInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    flex: 1,
    minWidth: 0,
  },
  rowNome: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowSub: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "500",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "2px",
  },
  rowChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    fontWeight: "500",
    color: "#64748b",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowChipIcon: {
    display: "flex",
    alignItems: "center",
    color: "#94a3b8",
  },

  /* ── Avatar ─────────────────────────────────────── */
  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "15px",
    fontWeight: "700",
    flexShrink: 0,
    letterSpacing: "0.02em",
  },

  chevron: {
    display: "flex",
    alignItems: "center",
    color: "#cbd5e1",
    flexShrink: 0,
  },

  /* ── Badge ──────────────────────────────────────── */
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  badgeDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    flexShrink: 0,
  },

  /* ── Empty state ────────────────────────────────── */
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    padding: "32px 0",
  },
  emptyTitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "600",
  },
  emptyText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: "500",
  },

  /* ── Quick Actions Card ─────────────────────────── */
  quickCard: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    borderRadius: "16px",
    padding: "28px",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  quickBadge: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: "6px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    padding: "5px 12px",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.06em",
    color: "#93c5fd",
  },
  quickTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "700",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  quickSub: {
    margin: 0,
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: 1.5,
    fontWeight: "500",
  },
  quickActions: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "4px",
  },
  quickBtn: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "14px 16px",
    color: "#f1f5f9",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.15s ease",
    fontFamily: "inherit",
  },
  quickBtnIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "#93c5fd",
  },
  quickBtnInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
  },
  quickBtnLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#f1f5f9",
  },
  quickBtnDesc: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#64748b",
  },
  quickBtnArrow: {
    display: "flex",
    alignItems: "center",
    color: "#475569",
    flexShrink: 0,
  },
};

export default Dashboard;
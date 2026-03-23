import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// ---- Helpers ----
function formatarData(iso) {
  if (!iso) return "-";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const STATUS_CONFIG = {
  agendado:   { label: "Agendado",   bg: "#eff6ff", color: "#2563eb", dot: "#60a5fa" },
  realizado:  { label: "Realizado",  bg: "#f0fdf4", color: "#16a34a", dot: "#4ade80" },
  cancelado:  { label: "Cancelado",  bg: "#fef2f2", color: "#dc2626", dot: "#f87171" },
  faltou:     { label: "Faltou",     bg: "#fff7ed", color: "#ea580c", dot: "#fb923c" },
};

// ---- Sub-componentes ----

function StatCard({ label, value, icon, accent, sub }) {
  return (
    <div style={{ ...dStyles.statCard, borderTop: `3px solid ${accent}` }}>
      <div style={dStyles.statTop}>
        <span style={{ ...dStyles.statIcon, background: accent + "18", color: accent }}>{icon}</span>
        <span style={dStyles.statLabel}>{label}</span>
      </div>
      <strong style={dStyles.statValue}>{value}</strong>
      {sub && <span style={dStyles.statSub}>{sub}</span>}
    </div>
  );
}

function SectionCard({ title, action, onAction, children, empty }) {
  return (
    <div style={dStyles.sectionCard}>
      <div style={dStyles.sectionHeader}>
        <h2 style={dStyles.sectionTitle}>{title}</h2>
        {action && (
          <button style={dStyles.sectionAction} onClick={onAction}>{action}</button>
        )}
      </div>
      {empty ? (
        <div style={dStyles.emptyState}>
          <span style={dStyles.emptyIcon}>📅</span>
          <p style={dStyles.emptyText}>{empty}</p>
        </div>
      ) : children}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.agendado;
  return (
    <span style={{ ...dStyles.badge, background: cfg.bg, color: cfg.color }}>
      <span style={{ ...dStyles.badgeDot, background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ---- Dashboard principal ----

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

  if (carregando) {
    return (
      <div style={dStyles.loadingWrap}>
        <div style={dStyles.loadingSpinner} />
        <span style={dStyles.loadingText}>Carregando painel...</span>
      </div>
    );
  }

  return (
    <div style={dStyles.page}>

      {/* Hero header */}
      <div style={dStyles.hero}>
        <div style={dStyles.heroLeft}>
          <p style={dStyles.heroData}>{dataFormatada}</p>
          <h1 style={dStyles.heroTitle}>{saudacao()}, clínica 👋</h1>
          <p style={dStyles.heroSub}>
            Você tem <strong style={{ color: "#2563eb" }}>{consultasHoje.length} consulta{consultasHoje.length !== 1 ? "s" : ""}</strong> hoje
            {consultasHoje.length > 0 ? ` — a próxima às ${consultasHoje[0].horario}.` : "."}
          </p>
        </div>
        <div style={dStyles.heroRight}>
          <button style={dStyles.heroBtnPrimary} onClick={() => navigate("/pacientes/novo")}>
            + Novo paciente
          </button>
          <button style={dStyles.heroBtnSecondary} onClick={() => navigate("/agenda")}>
            Ver agenda
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div style={dStyles.statsGrid}>
        <StatCard
          label="Total de pacientes"
          value={pacientes.length}
          icon="◎"
          accent="#2563eb"
          sub="cadastrados"
        />
        <StatCard
          label="Consultas hoje"
          value={consultasHoje.length}
          icon="◫"
          accent="#0ea5e9"
          sub={consultasHoje.length > 0 ? `Próx. às ${consultasHoje[0].horario}` : "Sem consultas"}
        />
        <StatCard
          label="Esta semana"
          value={consultasSemana}
          icon="⊡"
          accent="#8b5cf6"
          sub="próximos 7 dias"
        />
        <StatCard
          label="Total de consultas"
          value={consultas.length}
          icon="⊞"
          accent="#10b981"
          sub="no sistema"
        />
      </div>

      {/* Grid principal */}
      <div style={dStyles.mainGrid}>

        {/* Consultas de hoje */}
        <SectionCard
          title="Consultas de hoje"
          action="Ver agenda completa"
          onAction={() => navigate("/agenda")}
          empty={consultasHoje.length === 0 ? "Nenhuma consulta agendada para hoje." : null}
        >
          <ul style={dStyles.list}>
            {consultasHoje.map((c) => (
              <li key={c.id} style={dStyles.consultaRow}>
                <div style={dStyles.consultaHorario}>
                  <span style={dStyles.horarioHour}>{c.horario.slice(0, 5)}</span>
                </div>
                <div style={dStyles.consultaInfo}>
                  <strong style={dStyles.consultaNome}>{c.paciente_nome || "Paciente"}</strong>
                  <span style={dStyles.consultaProc}>{c.procedimento || "Procedimento não informado"}</span>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Próximas consultas */}
        <SectionCard
          title="Próximas consultas"
          empty={proximasConsultas.length === 0 ? "Nenhuma consulta futura cadastrada." : null}
        >
          <ul style={dStyles.list}>
            {proximasConsultas.map((c) => (
              <li key={c.id} style={dStyles.proximaRow}>
                <div style={dStyles.proximaData}>
                  <span style={dStyles.proximaDia}>{c.data.split("-")[2]}</span>
                  <span style={dStyles.proximaMes}>
                    {new Date(c.data + "T00:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                  </span>
                </div>
                <div style={dStyles.consultaInfo}>
                  <strong style={dStyles.consultaNome}>{c.paciente_nome || "Paciente"}</strong>
                  <span style={dStyles.consultaProc}>{c.horario} · {c.procedimento || "Sem procedimento"}</span>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        </SectionCard>

      </div>

      {/* Grid inferior */}
      <div style={dStyles.bottomGrid}>

        {/* Últimos pacientes */}
        <SectionCard
          title="Últimos pacientes"
          action="Ver todos"
          onAction={() => navigate("/pacientes")}
          empty={ultimosPacientes.length === 0 ? "Nenhum paciente cadastrado ainda." : null}
        >
          <ul style={dStyles.list}>
            {ultimosPacientes.map((p) => (
              <li
                key={p.id}
                style={dStyles.pacienteRow}
                onClick={() => navigate(`/pacientes/${p.id}`)}
              >
                <div style={dStyles.avatar}>
                  {(p.nome || "?").charAt(0).toUpperCase()}
                </div>
                <div style={dStyles.consultaInfo}>
                  <strong style={dStyles.consultaNome}>{p.nome}</strong>
                  <span style={dStyles.consultaProc}>{p.telefone || "Sem telefone"} · {p.email || "Sem e-mail"}</span>
                </div>
                <span style={dStyles.chevron}>›</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Card de ação rápida */}
        <div style={dStyles.quickCard}>
          <div style={dStyles.quickCardBadge}>Ações rápidas</div>
          <h2 style={dStyles.quickCardTitle}>O que deseja fazer agora?</h2>
          <p style={dStyles.quickCardSub}>Acesse as principais funcionalidades do sistema rapidamente.</p>
          <div style={dStyles.quickActions}>
            <button style={dStyles.quickAction} onClick={() => navigate("/pacientes/novo")}>
              <span style={dStyles.qaIcon}>＋</span>
              <span>Cadastrar paciente</span>
            </button>
            <button style={dStyles.quickAction} onClick={() => navigate("/agenda")}>
              <span style={dStyles.qaIcon}>◫</span>
              <span>Abrir agenda</span>
            </button>
            <button style={dStyles.quickAction} onClick={() => navigate("/pacientes")}>
              <span style={dStyles.qaIcon}>◎</span>
              <span>Listar pacientes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ---- Estilos ----
const dStyles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  // Loading
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",
    minHeight: "300px",
  },
  loadingSpinner: {
    width: "36px",
    height: "36px",
    border: "3px solid #dbeafe",
    borderTopColor: "#2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    color: "#64748b",
    fontSize: "15px",
    fontWeight: "600",
  },

  // Hero
  hero: {
    background: "linear-gradient(135deg, #ffffff 0%, #f0f6ff 100%)",
    borderRadius: "24px",
    padding: "32px",
    border: "1px solid #dbeafe",
    boxShadow: "0 8px 32px rgba(37,99,235,0.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
  },
  heroLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  heroData: {
    margin: 0,
    fontSize: "13px",
    fontWeight: "700",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  heroTitle: {
    margin: 0,
    fontSize: "30px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  heroSub: {
    margin: 0,
    fontSize: "15px",
    color: "#475569",
  },
  heroRight: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  heroBtnPrimary: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 22px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(37,99,235,0.22)",
  },
  heroBtnSecondary: {
    background: "#ffffff",
    color: "#334155",
    border: "1px solid #dbe4f0",
    borderRadius: "12px",
    padding: "12px 22px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  // Stats
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
  },
  statCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "22px",
    border: "1px solid #eef2f7",
    boxShadow: "0 4px 16px rgba(15,23,42,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  statTop: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  statIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "800",
    flexShrink: 0,
  },
  statLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b",
  },
  statValue: {
    fontSize: "36px",
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

  // Section cards
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "20px",
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "20px",
  },
  sectionCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "24px",
    border: "1px solid #eef2f7",
    boxShadow: "0 4px 20px rgba(15,23,42,0.05)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
    gap: "12px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: "-0.01em",
  },
  sectionAction: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "8px",
  },

  // Empty
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    padding: "28px 0",
  },
  emptyIcon: {
    fontSize: "28px",
  },
  emptyText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: "500",
  },

  // List
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },

  // Consulta row
  consultaRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 0",
    borderBottom: "1px solid #f8fafc",
  },
  consultaHorario: {
    width: "52px",
    height: "52px",
    background: "#eff6ff",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  horarioHour: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#2563eb",
  },
  consultaInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
    minWidth: 0,
  },
  consultaNome: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  consultaProc: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "500",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  // Badge
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  badgeDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    flexShrink: 0,
  },

  // Proxima row
  proximaRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 0",
    borderBottom: "1px solid #f8fafc",
  },
  proximaData: {
    width: "52px",
    height: "52px",
    background: "#f8fafc",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #eef2f7",
    flexShrink: 0,
  },
  proximaDia: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 1,
  },
  proximaMes: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  // Paciente row
  pacienteRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "12px 10px",
    borderRadius: "14px",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "17px",
    fontWeight: "800",
    color: "#1d4ed8",
    flexShrink: 0,
  },
  chevron: {
    fontSize: "20px",
    color: "#cbd5e1",
    flexShrink: 0,
  },

  // Quick card
  quickCard: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    borderRadius: "22px",
    padding: "28px",
    color: "#fff",
    boxShadow: "0 12px 40px rgba(15,23,42,0.18)",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  quickCardBadge: {
    display: "inline-flex",
    alignSelf: "flex-start",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "999px",
    padding: "5px 12px",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#93c5fd",
  },
  quickCardTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "800",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  quickCardSub: {
    margin: 0,
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: 1.6,
  },
  quickActions: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "4px",
  },
  quickAction: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    padding: "13px 16px",
    color: "#f1f5f9",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.15s",
  },
  qaIcon: {
    fontSize: "16px",
    width: "26px",
    height: "26px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
};

export default Dashboard;

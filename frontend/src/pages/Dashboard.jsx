import { useEffect, useMemo, useState } from "react";

function Dashboard() {
  const [pacientes, setPacientes] = useState([]);
  const [consultas, setConsultas] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/pacientes")
      .then((res) => res.json())
      .then((data) => setPacientes(data))
      .catch((err) => console.error("Erro ao buscar pacientes:", err));

    fetch("http://localhost:3001/consultas")
      .then((res) => res.json())
      .then((data) => setConsultas(data))
      .catch((err) => console.error("Erro ao buscar consultas:", err));
  }, []);

  const hoje = new Date().toISOString().split("T")[0];

  const consultasHoje = useMemo(() => {
    return consultas.filter((consulta) => consulta.data === hoje);
  }, [consultas, hoje]);

  const proximasConsultas = useMemo(() => {
    return [...consultas]
      .sort((a, b) => `${a.data}T${a.horario}`.localeCompare(`${b.data}T${b.horario}`))
      .slice(0, 5);
  }, [consultas]);

  return (
    <div>
      <div style={styles.hero}>
        <div>
          <p style={styles.heroTag}>Visão geral</p>
          <h1 style={styles.title}>Dashboard da Clínica</h1>
          <p style={styles.subtitle}>
            Acompanhe pacientes, agenda e indicadores principais.
          </p>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Pacientes</span>
          <strong style={styles.statNumber}>{pacientes.length}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Consultas hoje</span>
          <strong style={styles.statNumber}>{consultasHoje.length}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total de consultas</span>
          <strong style={styles.statNumber}>{consultas.length}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Próximas</span>
          <strong style={styles.statNumber}>{proximasConsultas.length}</strong>
        </div>
      </div>

      <div style={styles.grid}>
        <section style={styles.cardLarge}>
          <h2 style={styles.cardTitle}>Consultas de hoje</h2>

          {consultasHoje.length === 0 ? (
            <p style={styles.empty}>Nenhuma consulta para hoje.</p>
          ) : (
            <ul style={styles.list}>
              {consultasHoje.map((consulta) => (
                <li key={consulta.id} style={styles.row}>
                  <div>
                    <strong style={styles.rowTitle}>{consulta.paciente_nome}</strong>
                    <p style={styles.rowText}>
                      {consulta.procedimento || "Procedimento não informado"}
                    </p>
                  </div>
                  <span style={styles.badge}>{consulta.horario}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={styles.cardLarge}>
          <h2 style={styles.cardTitle}>Próximas consultas</h2>

          {proximasConsultas.length === 0 ? (
            <p style={styles.empty}>Nenhuma consulta cadastrada.</p>
          ) : (
            <ul style={styles.list}>
              {proximasConsultas.map((consulta) => (
                <li key={consulta.id} style={styles.columnRow}>
                  <strong style={styles.rowTitle}>{consulta.paciente_nome}</strong>
                  <span style={styles.rowText}>
                    {consulta.data} às {consulta.horario}
                  </span>
                  <span style={styles.status}>Status: {consulta.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div style={styles.gridBottom}>
        <section style={styles.cardLarge}>
          <h2 style={styles.cardTitle}>Últimos pacientes</h2>

          {pacientes.length === 0 ? (
            <p style={styles.empty}>Nenhum paciente cadastrado.</p>
          ) : (
            <ul style={styles.list}>
              {pacientes.slice(0, 5).map((paciente) => (
                <li key={paciente.id} style={styles.row}>
                  <div>
                    <strong style={styles.rowTitle}>{paciente.nome}</strong>
                    <p style={styles.rowText}>
                      {paciente.telefone || "Sem telefone"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={styles.highlight}>
          <p style={styles.highlightMini}>Resumo rápido</p>
          <h2 style={styles.highlightTitle}>Seu painel está evoluindo bem</h2>
          <p style={styles.highlightText}>
            Você já tem um MVP funcional com pacientes, consultas, dashboard e navegação.
          </p>
        </section>
      </div>
    </div>
  );
}

const styles = {
  hero: {
    background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
    borderRadius: "24px",
    padding: "28px",
    marginBottom: "24px",
    border: "1px solid #dbeafe",
  },
  heroTag: {
    margin: 0,
    color: "#2563eb",
    fontWeight: "700",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  title: {
    margin: "8px 0 8px 0",
    fontSize: "32px",
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    color: "#475569",
    fontSize: "15px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "18px",
    marginBottom: "24px",
  },
  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
    border: "1px solid #eef2f7",
  },
  statLabel: {
    display: "block",
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "10px",
  },
  statNumber: {
    fontSize: "32px",
    color: "#0f172a",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },
  gridBottom: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  cardLarge: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
    border: "1px solid #eef2f7",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "18px",
    color: "#0f172a",
    fontSize: "20px",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  columnRow: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "14px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  rowTitle: {
    color: "#0f172a",
  },
  rowText: {
    margin: "4px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  badge: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "700",
  },
  status: {
    color: "#475569",
    fontSize: "14px",
  },
  empty: {
    color: "#64748b",
  },
  highlight: {
    borderRadius: "20px",
    padding: "28px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    boxShadow: "0 16px 35px rgba(37, 99, 235, 0.28)",
  },
  highlightMini: {
    margin: 0,
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    opacity: 0.9,
  },
  highlightTitle: {
    marginTop: "10px",
    marginBottom: "12px",
    fontSize: "28px",
  },
  highlightText: {
    margin: 0,
    lineHeight: 1.6,
    opacity: 0.95,
  },
};

export default Dashboard;
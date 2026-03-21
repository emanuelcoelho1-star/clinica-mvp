import { useEffect, useState } from "react";

function Consultas() {
  const [pacientes, setPacientes] = useState([]);
  const [consultas, setConsultas] = useState([]);
  const [pacienteId, setPacienteId] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [procedimento, setProcedimento] = useState("");

  const carregarPacientes = () => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:3001/pacientes", {
      headers: {
        Authorization: token,
      },
    })
      .then((res) => res.json())
      .then((data) => setPacientes(data))
      .catch((err) => console.error("Erro ao carregar pacientes:", err));
  };

  const carregarConsultas = () => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:3001/consultas", {
      headers: {
        Authorization: token,
      },
    })
      .then((res) => res.json())
      .then((data) => setConsultas(data))
      .catch((err) => console.error("Erro ao carregar consultas:", err));
  };

  useEffect(() => {
    carregarPacientes();
    carregarConsultas();
  }, []);

  const cadastrarConsulta = async () => {
    if (!pacienteId || !data || !horario) {
      alert("Paciente, data e horário são obrigatórios.");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const resposta = await fetch("http://localhost:3001/consultas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          paciente_id: Number(pacienteId),
          data,
          horario,
          procedimento,
        }),
      });

      if (!resposta.ok) {
        throw new Error("Erro ao cadastrar consulta");
      }

      setPacienteId("");
      setData("");
      setHorario("");
      setProcedimento("");
      carregarConsultas();
    } catch (erro) {
      console.error(erro);
      alert("Não foi possível cadastrar a consulta.");
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Consultas</h1>
        <p style={styles.subtitle}>Organize a agenda clínica de forma simples.</p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Nova consulta</h2>

        <div style={styles.formGrid}>
          <select
            style={styles.input}
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
          >
            <option value="">Selecione um paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>

          <input
            style={styles.input}
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />

          <input
            style={styles.input}
            type="time"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
          />

          <input
            style={styles.input}
            type="text"
            placeholder="Procedimento"
            value={procedimento}
            onChange={(e) => setProcedimento(e.target.value)}
          />
        </div>

        <button style={styles.primaryButton} onClick={cadastrarConsulta}>
          Cadastrar consulta
        </button>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Agenda</h2>

        {consultas.length === 0 ? (
          <p style={styles.empty}>Nenhuma consulta cadastrada.</p>
        ) : (
          <ul style={styles.list}>
            {consultas.map((c) => (
              <li key={c.id} style={styles.listItem}>
                <div>
                  <strong style={styles.name}>{c.paciente_nome}</strong>
                  <p style={styles.info}>
                    {c.data} às {c.horario}
                  </p>
                  <p style={styles.info}>
                    {c.procedimento || "Sem procedimento"}
                  </p>
                </div>

                <span style={styles.statusBadge}>{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: {
    marginBottom: "22px",
  },
  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "30px",
  },
  subtitle: {
    marginTop: "8px",
    color: "#64748b",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
    border: "1px solid #eef2f7",
    marginBottom: "20px",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "18px",
    color: "#0f172a",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
    marginBottom: "16px",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #dbe3ee",
    backgroundColor: "#f8fafc",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
  },
  primaryButton: {
    border: "none",
    borderRadius: "14px",
    padding: "13px 18px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.22)",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  name: {
    color: "#0f172a",
    fontSize: "16px",
  },
  info: {
    margin: "6px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  statusBadge: {
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  empty: {
    color: "#64748b",
  },
};

export default Consultas;
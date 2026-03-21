import { useEffect, useState } from "react";

function Consultas() {
  const [pacientes, setPacientes] = useState([]);
  const [consultas, setConsultas] = useState([]);

  const [pacienteId, setPacienteId] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [procedimento, setProcedimento] = useState("");

  const carregarPacientes = () => {
    fetch("http://localhost:3001/pacientes")
      .then((res) => res.json())
      .then((data) => setPacientes(data));
  };

  const carregarConsultas = () => {
    fetch("http://localhost:3001/consultas")
      .then((res) => res.json())
      .then((data) => setConsultas(data));
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

    await fetch("http://localhost:3001/consultas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paciente_id: Number(pacienteId),
        data,
        horario,
        procedimento,
      }),
    });

    setPacienteId("");
    setData("");
    setHorario("");
    setProcedimento("");

    carregarConsultas();
  };

  return (
    <div>
      <h1 style={styles.title}>Consultas</h1>

      <div style={styles.card}>
        <h2 style={styles.subtitle}>Nova Consulta</h2>

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

        <button style={styles.button} onClick={cadastrarConsulta}>
          Cadastrar Consulta
        </button>
      </div>

      <div style={styles.card}>
        <h2 style={styles.subtitle}>Agenda</h2>

        {consultas.length === 0 ? (
          <p style={styles.empty}>Nenhuma consulta cadastrada.</p>
        ) : (
          <ul style={styles.list}>
            {consultas.map((c) => (
              <li key={c.id} style={styles.listItem}>
                <strong>{c.paciente_nome}</strong>
                <span>{c.data} - {c.horario}</span>
                <span>{c.procedimento || "Sem procedimento"}</span>
                <span>Status: {c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = {
  title: {
    marginBottom: "20px",
    color: "#1f2937",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    marginBottom: "20px",
  },
  subtitle: {
    marginBottom: "15px",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  list: {
    listStyle: "none",
    padding: 0,
  },
  listItem: {
    display: "flex",
    flexDirection: "column",
    padding: "10px",
    borderBottom: "1px solid #eee",
  },
  empty: {
    color: "#888",
  },
};

export default Consultas;
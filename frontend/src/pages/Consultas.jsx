import { useEffect, useState } from "react";

function Consultas() {
  const [pacientes, setPacientes] = useState([]);
  const [consultas, setConsultas] = useState([]);
  const [pacienteId, setPacienteId] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [procedimento, setProcedimento] = useState("");
  const [status, setStatus] = useState("agendado");
  const [editandoId, setEditandoId] = useState(null);

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

  const limparFormulario = () => {
    setPacienteId("");
    setData("");
    setHorario("");
    setProcedimento("");
    setStatus("agendado");
    setEditandoId(null);
  };

  const selecionarConsultaParaEditar = (consulta) => {
    setEditandoId(consulta.id);
    setPacienteId(String(consulta.paciente_id));
    setData(consulta.data || "");
    setHorario(consulta.horario || "");
    setProcedimento(consulta.procedimento || "");
    setStatus(consulta.status || "agendado");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const salvarConsulta = async () => {
    if (!pacienteId || !data || !horario) {
      alert("Paciente, data e horário são obrigatórios.");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const url = editandoId
        ? `http://localhost:3001/consultas/${editandoId}`
        : "http://localhost:3001/consultas";

      const metodo = editandoId ? "PUT" : "POST";

      const resposta = await fetch(url, {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          paciente_id: Number(pacienteId),
          data,
          horario,
          procedimento,
          status,
        }),
      });

      if (!resposta.ok) {
        throw new Error("Erro ao salvar consulta");
      }

      limparFormulario();
      carregarConsultas();
    } catch (erro) {
      console.error(erro);
      alert("Não foi possível salvar a consulta.");
    }
  };

  const excluirConsulta = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta consulta?")) {
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const resposta = await fetch(`http://localhost:3001/consultas/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: token,
        },
      });

      if (!resposta.ok) {
        throw new Error("Erro ao excluir consulta");
      }

      if (editandoId === id) {
        limparFormulario();
      }

      carregarConsultas();
    } catch (erro) {
      console.error(erro);
      alert("Não foi possível excluir a consulta.");
    }
  };

  const getStatusStyle = (statusAtual) => {
    switch (statusAtual) {
      case "confirmado":
        return {
          backgroundColor: "#dcfce7",
          color: "#166534",
        };
      case "concluido":
        return {
          backgroundColor: "#ede9fe",
          color: "#6d28d9",
        };
      case "cancelado":
        return {
          backgroundColor: "#fee2e2",
          color: "#b91c1c",
        };
      default:
        return {
          backgroundColor: "#dbeafe",
          color: "#1d4ed8",
        };
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Consultas</h1>
        <p style={styles.subtitle}>Organize a agenda clínica de forma simples.</p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
          {editandoId ? "Editar consulta" : "Nova consulta"}
        </h2>

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

          <select
            style={styles.input}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="agendado">Agendado</option>
            <option value="confirmado">Confirmado</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={salvarConsulta}>
            {editandoId ? "Salvar alterações" : "Cadastrar consulta"}
          </button>

          {editandoId && (
            <button style={styles.secondaryButton} onClick={limparFormulario}>
              Cancelar edição
            </button>
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Agenda</h2>

        {consultas.length === 0 ? (
          <p style={styles.empty}>Nenhuma consulta cadastrada.</p>
        ) : (
          <ul style={styles.list}>
            {consultas.map((c) => (
              <li
                key={c.id}
                style={{
                  ...styles.listItem,
                  ...(editandoId === c.id ? styles.listItemActive : {}),
                }}
                onClick={() => selecionarConsultaParaEditar(c)}
              >
                <div style={styles.consultaInfo}>
                  <strong style={styles.name}>{c.paciente_nome}</strong>
                  <p style={styles.info}>
                    {c.data} às {c.horario}
                  </p>
                  <p style={styles.info}>
                    {c.procedimento || "Sem procedimento"}
                  </p>
                </div>

                <div style={styles.actions}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      ...getStatusStyle(c.status),
                    }}
                  >
                    {c.status}
                  </span>

                  <button
                    style={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      excluirConsulta(c.id);
                    }}
                  >
                    Excluir
                  </button>
                </div>
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
    fontSize: "32px",
  },
  subtitle: {
    marginTop: "8px",
    color: "#64748b",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.06)",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
  buttonGroup: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "none",
    borderRadius: "14px",
    padding: "13px 18px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.22)",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    padding: "13px 18px",
    background: "#fff",
    color: "#0f172a",
    fontWeight: "700",
    cursor: "pointer",
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
    gap: "12px",
    padding: "16px",
    borderBottom: "1px solid #f1f5f9",
    flexWrap: "wrap",
    cursor: "pointer",
    borderRadius: "14px",
    transition: "0.2s",
  },
  listItemActive: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
  },
  consultaInfo: {
    minWidth: "220px",
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
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  statusBadge: {
    padding: "8px 14px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "700",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  deleteButton: {
    border: "none",
    borderRadius: "10px",
    padding: "8px 12px",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    fontWeight: "700",
    cursor: "pointer",
  },
  empty: {
    color: "#64748b",
  },
};

export default Consultas;
import { useEffect, useState } from "react";

function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [pacienteEditando, setPacienteEditando] = useState(null);

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

  useEffect(() => {
    carregarPacientes();
  }, []);

  const salvarPaciente = async () => {
    if (!nome) {
      alert("Nome é obrigatório");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      let resposta;

      if (pacienteEditando) {
        resposta = await fetch(
          `http://localhost:3001/pacientes/${pacienteEditando.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: token,
            },
            body: JSON.stringify({ nome, telefone }),
          }
        );
      } else {
        resposta = await fetch("http://localhost:3001/pacientes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({ nome, telefone }),
        });
      }

      if (!resposta.ok) throw new Error("Erro ao salvar paciente");

      setNome("");
      setTelefone("");
      setPacienteEditando(null);
      carregarPacientes();
    } catch (erro) {
      console.error(erro);
      alert("Não foi possível salvar o paciente.");
    }
  };

  const deletarPaciente = async (id) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;

    const token = localStorage.getItem("token");

    try {
      const resposta = await fetch(`http://localhost:3001/pacientes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: token,
        },
      });

      if (!resposta.ok) throw new Error("Erro ao excluir paciente");

      carregarPacientes();
    } catch (erro) {
      console.error(erro);
      alert("Não foi possível excluir o paciente.");
    }
  };

  const editarPaciente = (paciente) => {
    setNome(paciente.nome);
    setTelefone(paciente.telefone || "");
    setPacienteEditando(paciente);
  };

  const cancelarEdicao = () => {
    setNome("");
    setTelefone("");
    setPacienteEditando(null);
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Pacientes</h1>
        <p style={styles.subtitle}>Gerencie os pacientes cadastrados na clínica.</p>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
          {pacienteEditando ? "Editar paciente" : "Novo paciente"}
        </h2>

        <div style={styles.formGrid}>
          <input
            style={styles.input}
            type="text"
            placeholder="Nome do paciente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <input
            style={styles.input}
            type="text"
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>

        <div style={styles.actionsTop}>
          <button style={styles.primaryButton} onClick={salvarPaciente}>
            {pacienteEditando ? "Atualizar paciente" : "Cadastrar paciente"}
          </button>

          {pacienteEditando && (
            <button style={styles.secondaryButton} onClick={cancelarEdicao}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Lista de pacientes</h2>

        {pacientes.length === 0 ? (
          <p style={styles.empty}>Nenhum paciente cadastrado.</p>
        ) : (
          <ul style={styles.list}>
            {pacientes.map((paciente) => (
              <li key={paciente.id} style={styles.listItem}>
                <div style={styles.patientInfo}>
                  <strong style={styles.name}>{paciente.nome}</strong>
                  <p style={styles.phone}>{paciente.telefone || "Sem telefone"}</p>
                </div>

                <div style={styles.itemActions}>
                  <button
                    style={styles.editButton}
                    onClick={() => editarPaciente(paciente)}
                  >
                    Editar
                  </button>

                  <button
                    style={styles.deleteButton}
                    onClick={() => deletarPaciente(paciente.id)}
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
  actionsTop: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
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
    border: "none",
    borderRadius: "14px",
    padding: "13px 18px",
    backgroundColor: "#e2e8f0",
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
    padding: "16px 0",
    borderBottom: "1px solid #f1f5f9",
    flexWrap: "wrap",
  },
  patientInfo: {
    minWidth: "220px",
  },
  name: {
    color: "#0f172a",
    fontSize: "16px",
  },
  phone: {
    margin: "6px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  itemActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  editButton: {
    backgroundColor: "#f59e0b",
    color: "#fff",
    border: "none",
    padding: "10px 14px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "10px 14px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "700",
  },
  empty: {
    color: "#64748b",
  },
};

export default Pacientes;
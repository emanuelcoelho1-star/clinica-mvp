import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Pacientes() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);

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

  const deletarPaciente = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este paciente?")) return;

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

  return (
    <div>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Pacientes</h1>
          <p style={styles.subtitle}>Gerencie os pacientes cadastrados na clínica.</p>
        </div>

        <button style={styles.primaryButton} onClick={() => navigate("/pacientes/novo")}>
          Cadastrar paciente
        </button>
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
                  <p style={styles.meta}>{paciente.telefone || "Sem telefone"}</p>
                  <p style={styles.meta}>{paciente.email || "Sem email"}</p>
                </div>

                <div style={styles.itemActions}>
                  <button
                    style={styles.editButton}
                    onClick={() => navigate(`/pacientes/editar/${paciente.id}`)}
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
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "22px",
    flexWrap: "wrap",
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
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "18px",
    color: "#0f172a",
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
    minWidth: "240px",
  },
  name: {
    color: "#0f172a",
    fontSize: "16px",
  },
  meta: {
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
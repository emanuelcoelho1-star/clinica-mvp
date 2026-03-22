import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function Pacientes() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState("");

  const carregarPacientes = () => {
    const token = localStorage.getItem("token");

    fetch("http://localhost:3001/pacientes", {
      headers: {
        Authorization: token,
      },
    })
      .then((res) => res.json())
      .then((data) => setPacientes(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Erro ao carregar pacientes:", err));
  };

  useEffect(() => {
    carregarPacientes();
  }, []);

  const pacientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return pacientes;

    return pacientes.filter((p) => {
      return (
        (p.nome || "").toLowerCase().includes(termo) ||
        String(p.cpf || "").toLowerCase().includes(termo) ||
        String(p.telefone || "").toLowerCase().includes(termo)
      );
    });
  }, [pacientes, busca]);

  const gerarLinkWhatsApp = (telefone) => {
    if (!telefone) return "#";

    let numero = String(telefone).replace(/\D/g, "");

    if (numero.length === 10 || numero.length === 11) {
      numero = `55${numero}`;
    }

    return `https://wa.me/${numero}`;
  };

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

      if (!resposta.ok) {
        throw new Error("Erro ao excluir paciente");
      }

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

        <div style={styles.headerActions}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar paciente..."
            style={styles.searchInput}
          />

          <button
            style={styles.primaryButton}
            onClick={() => navigate("/pacientes/novo")}
          >
            Cadastrar paciente
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Lista de pacientes</h2>

        {pacientesFiltrados.length === 0 ? (
          <p style={styles.empty}>
            {busca ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado."}
          </p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nome</th>
                  <th style={styles.th}>CPF</th>
                  <th style={styles.th}>Telefone</th>
                  <th style={styles.thAcoes}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {pacientesFiltrados.map((p) => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.tdNome}>
                      <button
                        type="button"
                        style={styles.nomeButton}
                        onClick={() => navigate(`/pacientes/${p.id}`)}
                        title="Abrir prontuário"
                      >
                        {p.nome}
                      </button>
                    </td>

                    <td style={styles.td}>{p.cpf || "-"}</td>

                    <td style={styles.td}>
                      {p.telefone ? (
                        <a
                          href={gerarLinkWhatsApp(p.telefone)}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.whatsappNumberLink}
                          title="Abrir conversa no WhatsApp"
                        >
                          <span style={styles.whatsappIcon}>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.5 0 .16 5.34.16 11.91c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 0 0 5.75 1.47h.01c6.57 0 11.91-5.34 11.91-11.91 0-3.18-1.24-6.17-3.47-8.42ZM12.08 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.66-.24-.38a9.86 9.86 0 0 1-1.52-5.24c0-5.47 4.45-9.92 9.92-9.92 2.65 0 5.14 1.03 7.01 2.91a9.86 9.86 0 0 1 2.9 7c0 5.47-4.45 9.92-9.91 9.92Zm5.44-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.47-1.74-1.64-2.04-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.26 5.16 4.57.72.31 1.28.49 1.72.63.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
                            </svg>
                          </span>
                          <span>{p.telefone}</span>
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td style={styles.tdAcoes}>
                      <div style={styles.itemActions}>
                        <button
                          style={styles.editButton}
                          onClick={() => navigate(`/pacientes/editar/${p.id}`)}
                          title="Editar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>

                        <button
                          style={styles.deleteButton}
                          onClick={() => deletarPaciente(p.id)}
                          title="Excluir"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
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
  searchInput: {
    minWidth: "260px",
    padding: "13px 16px",
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
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.22)",
    whiteSpace: "nowrap",
  },
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    borderBottom: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "700",
    backgroundColor: "#f8fafc",
  },
  thAcoes: {
    textAlign: "right",
    padding: "14px 16px",
    borderBottom: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "700",
    backgroundColor: "#f8fafc",
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
  },
  td: {
    padding: "16px",
    color: "#64748b",
    fontSize: "14px",
    verticalAlign: "middle",
  },
  tdNome: {
    padding: "16px",
    verticalAlign: "middle",
  },
  nomeButton: {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    color: "#0f172a",
    fontSize: "16px",
    fontWeight: "700",
    textAlign: "left",
  },
  tdAcoes: {
    padding: "16px",
    verticalAlign: "middle",
    textAlign: "right",
  },
  itemActions: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  editButton: {
    width: "40px",
    height: "40px",
    borderRadius: "14px",
    border: "1px solid #fde7b0",
    background: "linear-gradient(180deg, #fffdf7 0%, #fff7e6 100%)",
    color: "#d97706",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "0 1px 2px rgba(15,23,42,0.04), 0 8px 18px rgba(217,119,6,0.10)",
    transition: "all 0.2s ease",
  },
  deleteButton: {
    width: "40px",
    height: "40px",
    borderRadius: "14px",
    border: "1px solid #ffd5d5",
    background: "linear-gradient(180deg, #fffafa 0%, #fff1f1 100%)",
    color: "#dc2626",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "0 1px 2px rgba(15,23,42,0.04), 0 8px 18px rgba(220,38,38,0.10)",
    transition: "all 0.2s ease",
  },
  whatsappNumberLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: "#0f172a",
    textDecoration: "none",
    fontWeight: "600",
    padding: "6px 0",
  },
  whatsappIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#16a34a",
    flexShrink: 0,
  },
  empty: {
    color: "#64748b",
  },
};

export default Pacientes;
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function Pacientes() {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);

  const carregarPacientes = () => {
    const token = localStorage.getItem("token");
    setCarregando(true);

    fetch("http://localhost:3001/pacientes", {
      headers: {
        Authorization: token,
      },
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

  if (carregando) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingSpinner} />
        <span style={styles.loadingText}>Carregando pacientes...</span>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Hero section */}
      <div style={styles.hero}>
        <div style={styles.heroLeft}>
          <h1 style={styles.heroTitle}>Pacientes</h1>
          <p style={styles.heroSub}>
            Gerencie os pacientes cadastrados na clínica.
          </p>
        </div>

        <div style={styles.heroRight}>
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
            + Cadastrar paciente
          </button>
        </div>
      </div>

      {/* Card principal */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            Lista de pacientes ({pacientesFiltrados.length})
          </h2>
        </div>

        {pacientesFiltrados.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>👥</span>
            <p style={styles.emptyText}>
              {busca ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado."}
            </p>
          </div>
        ) : (
          <ul style={styles.list}>
            {pacientesFiltrados.map((p) => (
              <li key={p.id} style={styles.pacienteRow}>
                {/* Avatar */}
                <div style={styles.avatar}>
                  {(p.nome || "?").charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={styles.pacienteInfo}>
                  <button
                    style={styles.nomeButton}
                    onClick={() => navigate(`/pacientes/${p.id}`)}
                    title="Abrir prontuário"
                  >
                    {p.nome}
                  </button>
                  
                  <div style={styles.pacienteDetalhes}>
                    <span style={styles.detalhe}>
                      <span style={styles.label}>CPF:</span> {p.cpf || "-"}
                    </span>
                    
                    {p.telefone && (
                      <>
                        <span style={styles.separator}>|</span>
                        <span style={styles.detalhe}>
                          <span style={styles.label}>Tel:</span> {p.telefone}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={styles.pacienteActions}>
                  {p.telefone && (
                    <a
                      href={gerarLinkWhatsApp(p.telefone)}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.whatsappButton}
                      title="Enviar mensagem WhatsApp"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l6.29-.97C9.95 21.58 11 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1 0-2-.24-2.95-.67l-.21-.1-2.17.33.33-2.17-.1-.21C4.24 14 4 13 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z" />
                      </svg>
                    </a>
                  )}

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
                      strokeWidth="2.2"
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
                      strokeWidth="2.2"
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const styles = {
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
    alignItems: "center",
    flexWrap: "wrap",
  },
  searchInput: {
    minWidth: "240px",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid #dbeafe",
    backgroundColor: "#ffffff",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
    color: "#0f172a",
    transition: "all 0.2s ease",
  },
  primaryButton: {
    border: "none",
    borderRadius: "12px",
    padding: "12px 22px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(37,99,235,0.22)",
    whiteSpace: "nowrap",
    height: "44px",
    transition: "all 0.2s ease",
  },

  // Section card
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

  // Empty state
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    padding: "48px 0",
  },
  emptyIcon: {
    fontSize: "48px",
  },
  emptyText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "15px",
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

  // Paciente row
  pacienteRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    padding: "16px 0",
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.15s ease",
  },
  avatar: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "800",
    color: "#1d4ed8",
    flexShrink: 0,
    marginTop: "2px",
  },
  pacienteInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    flex: 1,
    minWidth: 0,
  },
  nomeButton: {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: "700",
    textAlign: "left",
    transition: "color 0.2s ease",
  },
  pacienteDetalhes: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  detalhe: {
    fontSize: "13px",
    color: "#64748b",
    fontWeight: "500",
    display: "flex",
    gap: "4px",
    alignItems: "center",
  },
  label: {
    fontWeight: "700",
    color: "#334155",
  },
  separator: {
    color: "#cbd5e1",
    fontSize: "12px",
  },
  pacienteActions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexShrink: 0,
  },
  whatsappButton: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    border: "1px solid #dcfce7",
    background: "linear-gradient(180deg, #f0fdf4 0%, #f8fff9 100%)",
    color: "#16a34a",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 16px rgba(22,163,74,0.08)",
    textDecoration: "none",
    transition: "all 0.2s ease",
  },
  editButton: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    border: "1px solid #fde7b0",
    background: "linear-gradient(180deg, #fffdf7 0%, #fff7e6 100%)",
    color: "#d97706",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 16px rgba(217,119,6,0.08)",
    transition: "all 0.2s ease",
  },
  deleteButton: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    border: "1px solid #fecaca",
    background: "linear-gradient(180deg, #fffafa 0%, #fff1f1 100%)",
    color: "#dc2626",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 16px rgba(220,38,38,0.08)",
    transition: "all 0.2s ease",
  },
};

export default Pacientes;
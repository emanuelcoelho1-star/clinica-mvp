import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function ToothSvg({ numero, arcada = "superior" }) {
  const tipo = getToothType(numero);

  const isTooth18 = Number(numero) === 18;
  const isTooth17 = Number(numero) === 17;

  const pathMap = {
    superior_molar_default:
      "M14 9 C10 8, 8 10, 7 13 C6 18, 7 24, 10 28 C11 30, 10 35, 8 40 C6 45, 6 50, 8 54 C10 58, 13 56, 15 52 C17 48, 18 43, 20 38 C22 43, 23 48, 25 52 C27 56, 30 58, 32 54 C34 50, 34 45, 32 40 C30 35, 29 30, 30 28 C33 24, 34 18, 33 13 C32 10, 30 8, 26 9 C24 10, 22 12, 20 12 C18 12, 16 10, 14 9 Z",

    superior_molar_18: `
      M24 6
      C21 7, 19 9, 18 13
      C17 18, 17 24, 19 31
      C20 36, 21 42, 21 48
      C21 55, 20 61, 20 68
      C20 76, 22 83, 26 89
      C28 92, 31 94, 34 93
      C36 92, 37 89, 38 85
      C39 80, 39 73, 39 66
      C39 58, 40 50, 42 42
      C44 33, 46 26, 47 19
      C47 14, 46 10, 43 8
      C40 6, 36 5, 32 6
      C29 7, 27 8, 25 9
      C24 9, 24 7, 24 6
      Z
    `,

    superior_molar_17: `
      M19 8
      C15 7, 13 9, 12 13
      C11 17, 12 22, 14 26
      C15 29, 15 33, 14 38
      C13 42, 12 47, 13 52
      C14 56, 17 58, 20 56
      C22 54, 23 50, 23 45
      C23 40, 22 35, 22 31
      C22 27, 23 23, 24 18
      C25 13, 27 9, 31 8
      C34 7, 37 8, 39 11
      C41 14, 42 18, 42 23
      C42 28, 41 33, 40 38
      C39 42, 38 46, 39 51
      C40 56, 39 61, 37 66
      C35 71, 34 76, 34 82
      C34 87, 35 91, 37 94
      C35 95, 33 95, 31 94
      C28 92, 27 88, 26 83
      C25 77, 24 71, 23 65
      C22 72, 21 78, 20 84
      C19 89, 18 93, 16 95
      C14 92, 13 87, 13 81
      C13 75, 14 69, 15 63
      C16 57, 17 52, 17 47
      C17 42, 16 37, 15 33
      C14 29, 13 25, 13 21
      C13 16, 15 11, 19 8
      Z
    `,

    superior_premolar:
      "M18 8 C13 8, 10 12, 10 18 C10 24, 12 29, 14 34 C16 39, 16 45, 15 51 C14 57, 15 61, 18 61 C21 61, 22 56, 23 50 C24 43, 24 36, 26 30 C28 24, 30 18, 30 14 C30 10, 26 8, 22 8 L18 8 Z",
    superior_canino:
      "M20 6 C16 8, 13 12, 13 18 C13 25, 15 31, 17 39 C19 46, 19 53, 18 59 C17 64, 18 68, 20 68 C22 68, 23 64, 22 58 C21 51, 21 44, 23 36 C25 28, 27 22, 27 15 C27 10, 24 6, 20 6 Z",
    superior_incisivo:
      "M18 7 C14 7, 12 10, 12 15 C12 22, 13 29, 14 36 C15 44, 15 52, 14 59 C13 64, 14 68, 18 68 C22 68, 23 64, 22 58 C21 49, 21 40, 22 32 C23 24, 24 17, 24 12 C24 9, 21 7, 18 7 Z",
    inferior_molar:
      "M10 16 C8 22, 9 28, 12 32 C14 35, 14 40, 12 46 C9 54, 8 60, 10 64 C12 67, 15 66, 18 60 C20 56, 21 49, 22 42 C23 49, 24 56, 26 60 C29 66, 32 67, 34 64 C36 60, 35 54, 32 46 C30 40, 30 35, 32 32 C35 28, 36 22, 34 16 C32 10, 28 8, 22 10 C20 11, 18 13, 16 13 C14 13, 12 11, 10 16 Z",
    inferior_premolar:
      "M12 16 C11 22, 12 28, 14 34 C16 41, 17 47, 16 55 C15 62, 16 67, 19 67 C22 67, 23 62, 22 55 C21 47, 22 40, 24 32 C26 24, 28 18, 27 13 C26 8, 22 7, 18 8 C14 9, 13 12, 12 16 Z",
    inferior_canino:
      "M14 14 C12 20, 13 27, 15 34 C17 42, 18 50, 17 58 C16 64, 17 69, 20 69 C23 69, 24 64, 23 57 C22 48, 23 39, 25 30 C27 22, 28 15, 26 10 C25 7, 22 6, 18 8 C16 9, 15 11, 14 14 Z",
    inferior_incisivo:
      "M15 14 C13 20, 14 27, 15 34 C16 42, 17 50, 16 58 C15 64, 16 69, 19 69 C22 69, 23 64, 22 57 C21 48, 21 39, 22 31 C23 23, 24 16, 23 11 C22 8, 20 7, 17 8 C16 9, 15 11, 15 14 Z",
  };

  let d;
  if (arcada === "superior" && tipo === "molar" && isTooth18) {
    d = pathMap.superior_molar_18;
  } else if (arcada === "superior" && tipo === "molar" && isTooth17) {
    d = pathMap.superior_molar_17;
  } else if (arcada === "superior" && tipo === "molar") {
    d = pathMap.superior_molar_default;
  } else {
    const key = `${arcada}_${tipo}`;
    d = pathMap[key] || pathMap.superior_incisivo;
  }

  const showCrownLine18 = isTooth18 && arcada === "superior" && tipo === "molar";
  const showCrownLine17 = isTooth17 && arcada === "superior" && tipo === "molar";

  return (
    <svg
      viewBox="0 0 64 102"
      style={{
        ...styles.toothSvg,
        transform:
          arcada === "superior"
            ? isTooth18
              ? "scaleY(-1) scaleX(-1)"
              : "scaleY(-1)"
            : "none",
        transformOrigin: "center",
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`tooth-fill-${numero}-${arcada}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#eef2f7" />
        </linearGradient>

        <filter id={`tooth-shadow-${numero}-${arcada}`} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" floodColor="rgba(15,23,42,0.10)" />
        </filter>
      </defs>

      <g filter={`url(#tooth-shadow-${numero}-${arcada})`}>
        <path
          d={d}
          fill={`url(#tooth-fill-${numero}-${arcada})`}
          stroke="#8f98a8"
          strokeWidth="1.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {showCrownLine18 && (
          <>
            <path
              d="M20 38 C23 35, 29 34, 35 35 C39 36, 42 37, 44 40"
              fill="none"
              stroke="#9aa3b2"
              strokeWidth="1.05"
              strokeLinecap="round"
            />
            <path
              d="M22 39 C22 33, 24 29, 28 27"
              fill="none"
              stroke="#c7ced8"
              strokeWidth="0.7"
              strokeLinecap="round"
              opacity="0.7"
            />
          </>
        )}

        {showCrownLine17 && (
          <>
            <path
              d="M16 33 C20 30, 27 29, 34 30 C38 31, 41 33, 43 36"
              fill="none"
              stroke="#9aa3b2"
              strokeWidth="1.0"
              strokeLinecap="round"
            />
            <path
              d="M22 66 C22 73, 21 80, 19 87"
              fill="none"
              stroke="#c7ced8"
              strokeWidth="0.75"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M26 64 C28 72, 30 80, 33 88"
              fill="none"
              stroke="#c7ced8"
              strokeWidth="0.75"
              strokeLinecap="round"
              opacity="0.75"
            />
          </>
        )}
      </g>
    </svg>
  );
}

function getToothType(numero) {
  const n = Number(String(numero).slice(-1));

  if (n === 6 || n === 7 || n === 8) return "molar";
  if (n === 4 || n === 5) return "premolar";
  if (n === 3) return "canino";
  return "incisivo";
}

function getFaceColor(status) {
  if (status === "carie") return "#ef4444";
  if (status === "restaurado") return "#3b82f6";
  if (status === "tratado") return "#22c55e";
  return "#ffffff";
}

function getNextStatus(atual) {
  if (atual === "saudavel") return "carie";
  if (atual === "carie") return "restaurado";
  if (atual === "restaurado") return "tratado";
  return "saudavel";
}

function FaceSquare({ numero, data, onChange }) {
  const dente = data[numero] || {};

  const trocar = (face) => {
    const atual = dente[face] || "saudavel";
    onChange(numero, face, getNextStatus(atual));
  };

  return (
    <div style={styles.faceBox}>
      <svg viewBox="0 0 40 40" style={styles.faceSvg}>
        <polygon
          points="6,6 34,6 26,14 14,14"
          fill={getFaceColor(dente.top || "saudavel")}
          stroke="#6b7280"
          strokeWidth="1"
          onClick={() => trocar("top")}
          style={styles.faceShape}
        >
          <title>{`Dente ${numero} - face superior`}</title>
        </polygon>

        <polygon
          points="6,6 14,14 14,26 6,34"
          fill={getFaceColor(dente.left || "saudavel")}
          stroke="#6b7280"
          strokeWidth="1"
          onClick={() => trocar("left")}
          style={styles.faceShape}
        >
          <title>{`Dente ${numero} - face esquerda`}</title>
        </polygon>

        <polygon
          points="34,6 26,14 26,26 34,34"
          fill={getFaceColor(dente.right || "saudavel")}
          stroke="#6b7280"
          strokeWidth="1"
          onClick={() => trocar("right")}
          style={styles.faceShape}
        >
          <title>{`Dente ${numero} - face direita`}</title>
        </polygon>

        <polygon
          points="6,34 34,34 26,26 14,26"
          fill={getFaceColor(dente.bottom || "saudavel")}
          stroke="#6b7280"
          strokeWidth="1"
          onClick={() => trocar("bottom")}
          style={styles.faceShape}
        >
          <title>{`Dente ${numero} - face inferior`}</title>
        </polygon>

        <rect
          x="14"
          y="14"
          width="12"
          height="12"
          fill={getFaceColor(dente.center || "saudavel")}
          stroke="#6b7280"
          strokeWidth="1"
          onClick={() => trocar("center")}
          style={styles.faceShape}
        >
          <title>{`Dente ${numero} - face central`}</title>
        </rect>
      </svg>
    </div>
  );
}

function DenteSuperior({ numero, data, onChange }) {
  return (
    <div style={styles.denteColuna}>
      <ToothSvg numero={numero} arcada="superior" />
      <div style={styles.denteNumero}>{numero}</div>
      <FaceSquare numero={numero} data={data} onChange={onChange} />
    </div>
  );
}

function DenteInferior({ numero, data, onChange }) {
  return (
    <div style={styles.denteColuna}>
      <FaceSquare numero={numero} data={data} onChange={onChange} />
      <div style={styles.denteNumero}>{numero}</div>
      <ToothSvg numero={numero} arcada="inferior" />
    </div>
  );
}

function ProntuarioPaciente() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [paciente, setPaciente] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [odontograma, setOdontograma] = useState({});

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    const token = localStorage.getItem("token");

    try {
      const [resPaciente, resOdontograma] = await Promise.all([
        fetch(`http://localhost:3001/pacientes/${id}`, {
          headers: { Authorization: token },
        }),
        fetch(`http://localhost:3001/pacientes/${id}/odontograma`, {
          headers: { Authorization: token },
        }),
      ]);

      if (!resPaciente.ok) {
        throw new Error("Paciente não encontrado");
      }

      const pacienteData = await resPaciente.json();
      const odontogramaData = resOdontograma.ok ? await resOdontograma.json() : {};

      setPaciente(pacienteData);
      setOdontograma(odontogramaData || {});
    } catch (error) {
      console.error("Erro ao carregar paciente:", error);
      setPaciente(null);
    } finally {
      setCarregando(false);
    }
  };

  const salvarOdontograma = async (novoMapa) => {
    const token = localStorage.getItem("token");

    try {
      await fetch(`http://localhost:3001/pacientes/${id}/odontograma`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ mapa: novoMapa }),
      });
    } catch (error) {
      console.error("Erro ao salvar odontograma:", error);
    }
  };

  const atualizarFaceDente = (numero, face, status) => {
    const novoMapa = {
      ...odontograma,
      [numero]: {
        ...(odontograma[numero] || {}),
        [face]: status,
      },
    };

    setOdontograma(novoMapa);
    salvarOdontograma(novoMapa);
  };

  const alertaAniversario = useMemo(() => {
    if (!paciente?.data_nascimento) return null;

    const partes = paciente.data_nascimento.split("-");
    if (partes.length !== 3) return null;

    const ano = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const dia = Number(partes[2]);

    if (Number.isNaN(ano) || Number.isNaN(mes) || Number.isNaN(dia)) {
      return null;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let aniversario = new Date(hoje.getFullYear(), mes, dia);
    aniversario.setHours(0, 0, 0, 0);

    if (aniversario < hoje) {
      aniversario = new Date(hoje.getFullYear() + 1, mes, dia);
      aniversario.setHours(0, 0, 0, 0);
    }

    const diffMs = aniversario.getTime() - hoje.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return "Hoje é aniversário do paciente 🎉";
    if (diffDias > 0 && diffDias <= 15) return `Aniversário em ${diffDias} dia(s) 🎂`;

    return null;
  }, [paciente]);

  const dataNascimentoFormatada = useMemo(() => {
    if (!paciente?.data_nascimento) return "-";

    const partes = paciente.data_nascimento.split("-");
    if (partes.length !== 3) return paciente.data_nascimento;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }, [paciente]);

  const dataResponsavelFormatada = useMemo(() => {
    if (!paciente?.responsavel_data_nascimento) return "-";

    const partes = paciente.responsavel_data_nascimento.split("-");
    if (partes.length !== 3) return paciente.responsavel_data_nascimento;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }, [paciente]);

  const dentesSuperior = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const dentesInferior = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  if (carregando) {
    return <div style={styles.loading}>Carregando...</div>;
  }

  if (!paciente) {
    return <div style={styles.loading}>Paciente não encontrado.</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button style={styles.backButton} onClick={() => navigate("/pacientes")}>
          Voltar
        </button>
      </div>

      <div style={styles.heroCard}>
        <div style={styles.heroLeft}>
          <div style={styles.avatarBox}>
            {paciente.foto_url ? (
              <img
                src={paciente.foto_url}
                alt={paciente.nome}
                style={styles.avatarImage}
              />
            ) : (
              <span style={styles.avatarLetter}>
                {(paciente.nome || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div style={styles.heroInfo}>
            <div style={styles.badge}>Prontuário do paciente</div>
            <h1 style={styles.nome}>{paciente.nome}</h1>
            <p style={styles.codigo}>Código do paciente: #{paciente.id}</p>

            <div style={styles.quickInfo}>
              <span style={styles.quickInfoItem}>CPF: {paciente.cpf || "-"}</span>
              <span style={styles.quickInfoDivider}>•</span>
              <span style={styles.quickInfoItem}>
                Telefone: {paciente.telefone || "-"}
              </span>
            </div>

            {alertaAniversario && (
              <div style={styles.alertaAniversario}>{alertaAniversario}</div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Dados principais</h2>
            <span style={styles.cardTag}>Visão geral</span>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Nome completo</span>
              <span style={styles.infoValue}>{paciente.nome || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>CPF</span>
              <span style={styles.infoValue}>{paciente.cpf || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Telefone</span>
              <span style={styles.infoValue}>{paciente.telefone || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>E-mail</span>
              <span style={styles.infoValue}>{paciente.email || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Data de nascimento</span>
              <span style={styles.infoValue}>{dataNascimentoFormatada}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Gênero</span>
              <span style={styles.infoValue}>{paciente.genero || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Profissão</span>
              <span style={styles.infoValue}>{paciente.profissao || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Como conheceu</span>
              <span style={styles.infoValue}>{paciente.como_conheceu || "-"}</span>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Endereço</h2>
            <span style={styles.cardTag}>Cadastro</span>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>CEP</span>
              <span style={styles.infoValue}>{paciente.cep || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Rua</span>
              <span style={styles.infoValue}>{paciente.rua || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Número</span>
              <span style={styles.infoValue}>{paciente.numero || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Complemento</span>
              <span style={styles.infoValue}>{paciente.complemento || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Bairro</span>
              <span style={styles.infoValue}>{paciente.bairro || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Cidade</span>
              <span style={styles.infoValue}>{paciente.cidade || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Estado</span>
              <span style={styles.infoValue}>{paciente.estado || "-"}</span>
            </div>
          </div>
        </div>

        <div style={styles.cardFull}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Odontograma</h2>
            <span style={styles.cardTag}>Permanentes</span>
          </div>

          <div style={styles.legendRow}>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: "#ffffff" }} />
              Saudável
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: "#ef4444" }} />
              Cárie
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: "#3b82f6" }} />
              Restauração
            </div>
            <div style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: "#22c55e" }} />
              Tratado
            </div>
          </div>

          <div style={styles.odontogramaSection}>
            <div style={styles.arcadaTitulo}>Arcada superior</div>
            <div style={styles.odontogramaLinha}>
              {dentesSuperior.map((numero) => (
                <DenteSuperior
                  key={numero}
                  numero={numero}
                  data={odontograma}
                  onChange={atualizarFaceDente}
                />
              ))}
            </div>
          </div>

          <div style={styles.odontogramaSection}>
            <div style={styles.arcadaTitulo}>Arcada inferior</div>
            <div style={styles.odontogramaLinha}>
              {dentesInferior.map((numero) => (
                <DenteInferior
                  key={numero}
                  numero={numero}
                  data={odontograma}
                  onChange={atualizarFaceDente}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Responsável</h2>
            <span style={styles.cardTag}>Cadastro</span>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Nome do responsável</span>
              <span style={styles.infoValue}>{paciente.responsavel_nome || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>CPF do responsável</span>
              <span style={styles.infoValue}>{paciente.responsavel_cpf || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Nascimento do responsável</span>
              <span style={styles.infoValue}>{dataResponsavelFormatada}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Telefone do responsável</span>
              <span style={styles.infoValue}>{paciente.responsavel_telefone || "-"}</span>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Observações</h2>
            <span style={styles.cardTag}>Cadastro</span>
          </div>

          <div style={styles.observacoesBox}>
            {paciente.observacoes || "Nenhuma observação cadastrada."}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  topBar: {
    display: "flex",
  },
  backButton: {
    border: "none",
    borderRadius: "14px",
    background: "#e2e8f0",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: "700",
    color: "#0f172a",
    boxShadow: "0 6px 16px rgba(15, 23, 42, 0.06)",
  },
  heroCard: {
    background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)",
    borderRadius: "26px",
    padding: "28px",
    border: "1px solid #e8eef8",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
  },
  heroLeft: {
    display: "flex",
    alignItems: "center",
    gap: "22px",
    flexWrap: "wrap",
  },
  avatarBox: {
    width: "96px",
    height: "96px",
    borderRadius: "24px",
    overflow: "hidden",
    background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 12px 24px rgba(37, 99, 235, 0.12)",
    flexShrink: 0,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarLetter: {
    fontSize: "34px",
    fontWeight: "800",
    color: "#1d4ed8",
  },
  heroInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  badge: {
    display: "inline-flex",
    alignSelf: "flex-start",
    background: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "700",
  },
  nome: {
    margin: 0,
    fontSize: "34px",
    lineHeight: 1.1,
    color: "#0f172a",
    fontWeight: "800",
  },
  codigo: {
    margin: 0,
    color: "#64748b",
    fontSize: "15px",
  },
  quickInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "4px",
  },
  quickInfoItem: {
    color: "#334155",
    fontWeight: "600",
    fontSize: "14px",
  },
  quickInfoDivider: {
    color: "#94a3b8",
  },
  alertaAniversario: {
    marginTop: "8px",
    display: "inline-flex",
    alignSelf: "flex-start",
    background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
    color: "#c2410c",
    border: "1px solid #fdba74",
    borderRadius: "14px",
    padding: "10px 14px",
    fontWeight: "700",
    fontSize: "14px",
    boxShadow: "0 8px 18px rgba(249, 115, 22, 0.10)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "20px",
  },
  card: {
    background: "#ffffff",
    borderRadius: "24px",
    padding: "24px",
    border: "1px solid #eef2f7",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.06)",
  },
  cardFull: {
    gridColumn: "1 / -1",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "24px",
    border: "1px solid #eef2f7",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.06)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },
  cardTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: "20px",
    fontWeight: "800",
  },
  cardTag: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "999px",
    padding: "6px 10px",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "14px",
    borderRadius: "16px",
    background: "#f8fafc",
    border: "1px solid #edf2f7",
  },
  infoLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  infoValue: {
    color: "#0f172a",
    fontSize: "15px",
    fontWeight: "600",
    wordBreak: "break-word",
  },
  observacoesBox: {
    minHeight: "90px",
    padding: "16px",
    borderRadius: "16px",
    background: "#f8fafc",
    border: "1px solid #edf2f7",
    color: "#334155",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  legendRow: {
    display: "flex",
    gap: "18px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#475569",
    fontWeight: "600",
    fontSize: "14px",
  },
  legendDot: {
    width: "14px",
    height: "14px",
    borderRadius: "999px",
    border: "1px solid #cbd5e1",
  },
  odontogramaSection: {
    marginBottom: "28px",
  },
  arcadaTitulo: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#334155",
    marginBottom: "14px",
  },
  odontogramaLinha: {
    display: "grid",
    gridTemplateColumns: "repeat(16, minmax(44px, 1fr))",
    gap: "8px",
    alignItems: "start",
    overflowX: "auto",
  },
  denteColuna: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    minWidth: "44px",
  },
  denteNumero: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 1,
  },
  toothSvg: {
    width: "44px",
    height: "78px",
    display: "block",
  },
  faceBox: {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  faceSvg: {
    width: "40px",
    height: "40px",
    display: "block",
  },
  faceShape: {
    cursor: "pointer",
  },
  loading: {
    color: "#334155",
    fontSize: "16px",
  },
};

export default ProntuarioPaciente;
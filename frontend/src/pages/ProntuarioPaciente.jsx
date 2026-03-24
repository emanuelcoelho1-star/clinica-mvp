import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AbaAnamneses from "../components/AbaAnamneses";

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return "-";

  const partes = dataNascimento.split("-");
  if (partes.length !== 3) return "-";

  const ano = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);

  if (Number.isNaN(ano) || Number.isNaN(mes) || Number.isNaN(dia)) {
    return "-";
  }

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;

  const aindaNaoFezAniversarioNesteAno =
    hoje.getMonth() < mes ||
    (hoje.getMonth() === mes && hoje.getDate() < dia);

  if (aindaNaoFezAniversarioNesteAno) {
    idade -= 1;
  }

  if (idade < 0) return "-";

  return `${idade} ano${idade === 1 ? "" : "s"}`;
}

function formatarData(data) {
  if (!data) return "-";

  const partes = data.split("-");
  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function InfoCard({ title, tag, items }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>{title}</h2>
        <span style={styles.cardTag}>{tag}</span>
      </div>

      <div style={styles.infoGrid}>
        {items.map((item) => (
          <div key={item.label} style={styles.infoItem}>
            <span style={styles.infoLabel}>{item.label}</span>
            <span style={styles.infoValue}>{item.value || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProntuarioPaciente() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [paciente, setPaciente] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");

  const abas = [
    { id: "visao-geral", label: "Visão geral" },
    { id: "anamneses", label: "Anamneses" },
    { id: "orcamentos", label: "Orçamentos" },
    { id: "tratamentos", label: "Tratamentos" },
    { id: "pagamentos", label: "Pagamentos" },
    { id: "evolucoes", label: "Evoluções" },
    { id: "documentos", label: "Documentos" },
    { id: "arquivos", label: "Arquivos" },
  ];

  useEffect(() => {
    const carregarDados = async () => {
      const token = localStorage.getItem("token");

      try {
        const resPaciente = await fetch(`http://localhost:3001/pacientes/${id}`, {
          headers: { Authorization: token },
        });

        if (!resPaciente.ok) {
          throw new Error("Paciente não encontrado");
        }

        const pacienteData = await resPaciente.json();
        setPaciente(pacienteData);
      } catch (error) {
        console.error("Erro ao carregar paciente:", error);
        setPaciente(null);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [id]);

  const idadePaciente = useMemo(
    () => calcularIdade(paciente?.data_nascimento),
    [paciente?.data_nascimento]
  );

  const dataResponsavelFormatada = useMemo(
    () => formatarData(paciente?.responsavel_data_nascimento),
    [paciente?.responsavel_data_nascimento]
  );

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
  }, [paciente?.data_nascimento]);

  const dadosPrincipais = [
    { label: "Nome completo", value: paciente?.nome },
    { label: "CPF", value: paciente?.cpf },
    { label: "Telefone", value: paciente?.telefone },
    { label: "E-mail", value: paciente?.email },
    { label: "Gênero", value: paciente?.genero },
    { label: "Profissão", value: paciente?.profissao },
    { label: "Como conheceu", value: paciente?.como_conheceu },
  ];

  const dadosEndereco = [
    { label: "CEP", value: paciente?.cep },
    { label: "Rua", value: paciente?.rua },
    { label: "Número", value: paciente?.numero },
    { label: "Complemento", value: paciente?.complemento },
    { label: "Bairro", value: paciente?.bairro },
    { label: "Cidade", value: paciente?.cidade },
    { label: "Estado", value: paciente?.estado },
  ];

  const dadosResponsavel = [
    { label: "Nome do responsável", value: paciente?.responsavel_nome },
    { label: "CPF do responsável", value: paciente?.responsavel_cpf },
    { label: "Nascimento do responsável", value: dataResponsavelFormatada },
    { label: "Telefone do responsável", value: paciente?.responsavel_telefone },
  ];

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
              <span style={styles.quickInfoItem}>Idade: {idadePaciente}</span>
              <span style={styles.quickInfoDivider}>•</span>
              <span style={styles.quickInfoItem}>
                Telefone: {paciente.telefone || "-"}
              </span>
            </div>

            <div style={styles.menuAbas}>
              {abas.map((aba) => {
                const ativa = abaAtiva === aba.id;

                return (
                  <button
                    key={aba.id}
                    type="button"
                    onClick={() => setAbaAtiva(aba.id)}
                    style={{
                      ...styles.abaButton,
                      ...(ativa ? styles.abaButtonAtiva : {}),
                    }}
                  >
                    {aba.label}
                  </button>
                );
              })}
            </div>

            {alertaAniversario && (
              <div style={styles.alertaAniversario}>{alertaAniversario}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Aba: Visão geral ─────────────────── */}
      {abaAtiva === "visao-geral" && (
        <div style={styles.grid}>
          <InfoCard
            title="Dados principais"
            tag="Visão geral"
            items={dadosPrincipais}
          />

          <InfoCard title="Endereço" tag="Cadastro" items={dadosEndereco} />

          <InfoCard
            title="Responsável"
            tag="Cadastro"
            items={dadosResponsavel}
          />

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
      )}

      {/* ── Aba: Anamneses ───────────────────── */}
      {abaAtiva === "anamneses" && (
        <AbaAnamneses pacienteId={id} />
      )}

      {/* ── Abas futuras (placeholder) ───────── */}
      {abaAtiva !== "visao-geral" && abaAtiva !== "anamneses" && (
        <div style={styles.placeholderCard}>
          <div style={styles.placeholderIcon}>📁</div>
          <h2 style={styles.placeholderTitle}>
            {abas.find((aba) => aba.id === abaAtiva)?.label}
          </h2>
          <p style={styles.placeholderText}>
            Esta seção será montada no próximo passo.
          </p>
        </div>
      )}
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
    flex: 1,
    minWidth: "280px",
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
  menuAbas: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "12px",
  },
  abaButton: {
    border: "1px solid #dbe4f0",
    background: "#ffffff",
    color: "#475569",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)",
  },
  abaButtonAtiva: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#ffffff",
    border: "1px solid #2563eb",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.18)",
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
  placeholderCard: {
    background: "#ffffff",
    borderRadius: "24px",
    padding: "40px 24px",
    border: "1px solid #eef2f7",
    boxShadow: "0 14px 32px rgba(15, 23, 42, 0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    textAlign: "center",
  },
  placeholderIcon: {
    fontSize: "36px",
  },
  placeholderTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "800",
    color: "#0f172a",
  },
  placeholderText: {
    margin: 0,
    fontSize: "15px",
    color: "#64748b",
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
  loading: {
    color: "#334155",
    fontSize: "16px",
  },
};

export default ProntuarioPaciente;
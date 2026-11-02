import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API_URL from "../api";
import AbaAnamneses from "../components/AbaAnamneses";
import AbaOrcamentos from "../components/AbaOrcamentos";
import AbaDocumentos from "../components/AbaDocumentos";
import AbaArquivos from "../components/AbaArquivos";
import AbaPagamentos from "../components/AbaPagamentos";
import AbaEvolucoes from "../components/AbaEvolucoes";
import AbaTratamentos from "../components/AbaTratamentos";
import Odontograma from "../components/Odontograma";

/* ── Helpers ─────────────────────────────────────────────── */
const AVATAR_PALETTES = [
  { bg: "#f0f4ff", color: "#4361ee" },
  { bg: "#fef3f2", color: "#e63946" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fefce8", color: "#ca8a04" },
  { bg: "#faf5ff", color: "#9333ea" },
  { bg: "#fff1f2", color: "#e11d48" },
  { bg: "#ecfeff", color: "#0891b2" },
  { bg: "#fdf4ff", color: "#c026d3" },
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return "—";
  const partes = dataNascimento.split("-");
  if (partes.length !== 3) return "—";
  const ano = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);
  if (Number.isNaN(ano) || Number.isNaN(mes) || Number.isNaN(dia)) return "—";
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() < mes || (hoje.getMonth() === mes && hoje.getDate() < dia)) idade -= 1;
  if (idade < 0) return "—";
  return `${idade} ano${idade === 1 ? "" : "s"}`;
}

function formatarData(data) {
  if (!data) return "—";
  const partes = data.split("-");
  if (partes.length !== 3) return data;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatCpf(cpf) {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return cpf;
}

/* ── Icons ───────────────────────────────────────────────── */
const Icons = {
  arrowLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  user: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  id: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  ),
  phone: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  mail: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  mapPin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  users: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  fileText: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  ),
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
  cake: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
      <path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" />
      <path d="M2 21h20" /><path d="M7 8v3" /><path d="M12 8v3" /><path d="M17 8v3" />
      <path d="M7 4h.01" /><path d="M12 4h.01" /><path d="M17 4h.01" />
    </svg>
  ),
  dollarSign: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  placeholderSvg: (
    <svg width="56" height="56" viewBox="0 0 120 120" fill="none">
      <rect x="16" y="28" width="88" height="68" rx="14" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="28" y="44" width="64" height="6" rx="3" fill="#e2e8f0" />
      <rect x="28" y="56" width="44" height="6" rx="3" fill="#e2e8f0" />
      <rect x="28" y="68" width="52" height="6" rx="3" fill="#e2e8f0" />
      <circle cx="92" cy="28" r="16" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2" />
      <path d="M92 20v16M84 28h16" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  notFound: (
    <svg width="64" height="64" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="40" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
      <path d="M60 40v20" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="72" r="2" fill="#94a3b8" />
    </svg>
  ),
};

/* ── Tab config ──────────────────────────────────────────── */
const ABAS = [
  { id: "visao-geral", label: "Visão geral", icon: Icons.user },
  { id: "anamneses", label: "Anamneses", modulo: "anamneses", icon: Icons.fileText },
  { id: "orcamentos", label: "Orçamentos", modulo: "orcamentos", icon: Icons.id },
  { id: "tratamentos", label: "Tratamentos", modulo: "tratamentos", icon: Icons.calendar },
  { id: "pagamentos", label: "Pagamentos", modulo: "pagamentos", icon: Icons.dollarSign },
  { id: "evolucoes", label: "Evoluções", modulo: "evolucoes", icon: Icons.fileText },
  { id: "documentos", label: "Documentos", modulo: "documentos", icon: Icons.fileText },
  { id: "arquivos", label: "Arquivos", modulo: "arquivos", icon: Icons.fileText },
];

/* ── InfoCard component ──────────────────────────────────── */
function InfoCard({ title, icon, items, style }) {
  return (
    <div style={{ ...s.card, ...style }}>
      <div style={s.cardHeader}>
        <div style={s.cardTitleRow}>
          <span style={s.cardIcon}>{icon}</span>
          <h2 style={s.cardTitle}>{title}</h2>
        </div>
      </div>
      <div style={s.infoGrid}>
        {items.map((item, index) => (
          <React.Fragment key={item.label}>
            {item.section && (index === 0 || items[index - 1]?.section !== item.section) && (
              <div style={s.infoSectionTitle}>{item.section}</div>
            )}
            <div style={s.infoItem}>
              <span style={s.infoLabel}>{item.label}</span>
              <span style={s.infoValue}>{item.value || "—"}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ── Componente Principal ────────────────────────────────── */
function ProntuarioPaciente() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [paciente, setPaciente] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");
  const [hoveredTab, setHoveredTab] = useState(null);
  const [consultasPaciente, setConsultasPaciente] = useState([]);
  const [carregandoConsultas, setCarregandoConsultas] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      const token = localStorage.getItem("token");
      try {
        const resPaciente = await fetch(`${API_URL}/pacientes/${id}`, {
          headers: { Authorization: token },
        });

        if (!resPaciente.ok) {
          const erro = await resPaciente.json().catch(() => ({}));
          throw new Error(erro.erro || "Não foi possível carregar o paciente.");
        }

        const pacienteData = await resPaciente.json();
        setPaciente(pacienteData);

      } catch (error) {
        console.error("Erro ao carregar prontuário:", error);
        setPaciente(null);
      } finally {
        setCarregando(false);
      }
    };
    carregarDados();
  }, [id]);

  useEffect(() => {
    let ativo = true;
    const carregarConsultasPaciente = async () => {
      setCarregandoConsultas(true);
      try {
        const token = localStorage.getItem("token");
        const resposta = await fetch(`${API_URL}/pacientes/${id}/consultas`, {
          headers: { Authorization: token },
        });
        if (!resposta.ok) throw new Error("Não foi possível carregar as consultas.");
        const dados = await resposta.json();
        if (ativo) setConsultasPaciente(Array.isArray(dados) ? dados : []);
      } catch (erro) {
        console.error("Erro ao carregar consultas do paciente:", erro);
        if (ativo) setConsultasPaciente([]);
      } finally {
        if (ativo) setCarregandoConsultas(false);
      }
    };
    carregarConsultasPaciente();
    return () => { ativo = false; };
  }, [id]);

  const idadePaciente = useMemo(() => calcularIdade(paciente?.data_nascimento), [paciente?.data_nascimento]);
  const dataResponsavelFormatada = useMemo(() => formatarData(paciente?.responsavel_data_nascimento), [paciente?.responsavel_data_nascimento]);

  const alertaAniversario = useMemo(() => {
    if (!paciente?.data_nascimento) return null;
    const partes = paciente.data_nascimento.split("-");
    if (partes.length !== 3) return null;
    const ano = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const dia = Number(partes[2]);
    if (Number.isNaN(ano) || Number.isNaN(mes) || Number.isNaN(dia)) return null;
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
    if (diffDias === 0) return { text: "Hoje é aniversário do paciente!", type: "today" };
    if (diffDias > 0 && diffDias <= 15) return { text: `Aniversário em ${diffDias} dia${diffDias > 1 ? "s" : ""}`, type: "soon" };
    return null;
  }, [paciente?.data_nascimento]);

  const palette = useMemo(() => getAvatarColor(paciente?.nome), [paciente?.nome]);

  const agoraConsultas = new Date();
  const dataHoraAtual = `${agoraConsultas.getFullYear()}-${String(agoraConsultas.getMonth() + 1).padStart(2, "0")}-${String(agoraConsultas.getDate()).padStart(2, "0")}T${String(agoraConsultas.getHours()).padStart(2, "0")}:${String(agoraConsultas.getMinutes()).padStart(2, "0")}`;
  const consultasRealizadas = consultasPaciente
    .filter((consulta) => consulta.status === "realizado")
    .sort((a, b) => (b.data + "T" + b.horario).localeCompare(a.data + "T" + a.horario));
  const consultasFuturas = consultasPaciente
    .filter((consulta) => consulta.status === "agendado" && (consulta.data + "T" + (consulta.horario || "").slice(0, 5)) >= dataHoraAtual)
    .sort((a, b) => (a.data + "T" + a.horario).localeCompare(b.data + "T" + b.horario));
  const formatarDataConsulta = (data) => {
    if (!data) return "—";
    const [ano, mes, dia] = data.split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
  };

  const dadosPrincipais = [
    { section: "Dados principais", label: "Nome completo", value: paciente?.nome },
    { section: "Dados principais", label: "CPF", value: formatCpf(paciente?.cpf) },
    { section: "Dados principais", label: "Telefone", value: paciente?.telefone },
    { section: "Dados principais", label: "E-mail", value: paciente?.email },
    { section: "Dados principais", label: "Gênero", value: paciente?.genero },
    { section: "Dados principais", label: "Profissão", value: paciente?.profissao },
    { section: "Dados principais", label: "Como conheceu", value: paciente?.como_conheceu },
  ];

  const dadosEndereco = [
    { section: "Endereço", label: "CEP", value: paciente?.cep },
    { section: "Endereço", label: "Rua", value: paciente?.rua },
    { section: "Endereço", label: "Número", value: paciente?.numero },
    { section: "Endereço", label: "Complemento", value: paciente?.complemento },
    { section: "Endereço", label: "Bairro", value: paciente?.bairro },
    { section: "Endereço", label: "Cidade", value: paciente?.cidade },
    { section: "Endereço", label: "Estado", value: paciente?.estado },
  ];

  const dadosResponsavel = [
    { section: "Responsável", label: "Nome", value: paciente?.responsavel_nome },
    { section: "Responsável", label: "CPF", value: formatCpf(paciente?.responsavel_cpf) },
    { section: "Responsável", label: "Nascimento", value: dataResponsavelFormatada },
    { section: "Responsável", label: "Telefone", value: paciente?.responsavel_telefone },
  ];
  const possuiResponsavel = Boolean(
    paciente?.responsavel_nome || paciente?.responsavel_cpf ||
    paciente?.responsavel_telefone || paciente?.responsavel_data_nascimento
  );
  const dadosCadastrais = [
    ...dadosPrincipais,
    ...dadosEndereco,
    ...(possuiResponsavel ? dadosResponsavel : []),
  ];

  const anamneseInicial = paciente?.anamnese_inicial || null;
  const dadosHistoricoClinico = [
    { label: "História médica", value: anamneseInicial?.historia_medica },
    { label: "Cirurgias anteriores", value: anamneseInicial?.cirurgias_anteriores },
    { label: "Doenças crônicas", value: anamneseInicial?.doencas_cronicas },
    { label: "Hábitos", value: anamneseInicial?.habitos },
    { label: "Histórico familiar", value: anamneseInicial?.historico_familiar },
  ];

  /* ── Loading ────────────────────────────────────────────── */
  if (carregando) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.loadingPulse}>
          <div style={s.loadingDot1} />
          <div style={s.loadingDot2} />
          <div style={s.loadingDot3} />
        </div>
        <span style={s.loadingText}>Carregando prontuário</span>
      </div>
    );
  }

  /* ── Not Found ──────────────────────────────────────────── */
  if (!paciente) {
    return (
      <div style={s.notFoundWrap}>
        {Icons.notFound}
        <h2 style={s.notFoundTitle}>Paciente não encontrado</h2>
        <p style={s.notFoundText}>O paciente solicitado não existe ou foi removido.</p>
        <button
          style={s.btnPrimary}
          onClick={() => navigate("/pacientes")}
        >
          {Icons.arrowLeft}
          <span>Voltar para pacientes</span>
        </button>
      </div>
    );
  }

  /* ── Abas que já têm componente ─────────────────────────── */
  const ABAS_COM_COMPONENTE = ["visao-geral", "anamneses", "orcamentos", "tratamentos", "evolucoes", "documentos", "arquivos", "pagamentos"];

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div style={s.page}>

      {/* ── Top bar / Breadcrumb ─────────────────────────── */}
      <div style={s.topBar}>
        <button
          style={s.backBtn}
          onClick={() => navigate("/pacientes")}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {Icons.arrowLeft}
          <span>Pacientes</span>
        </button>
        <span style={s.breadcrumbSep}>/</span>
        <span style={s.breadcrumbCurrent}>{paciente.nome}</span>

        <div style={s.topBarRight}>
          <button
            style={s.btnSecondary}
            onClick={() => navigate(`/pacientes/editar/${paciente.id}`)}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            {Icons.edit}
            <span>Editar</span>
          </button>
        </div>
      </div>

      {/* ── Profile header ───────────────────────────────── */}
      <div style={s.profileCard}>
        <div style={s.profileTop}>
          {/* Avatar */}
          <div style={{ ...s.avatar, background: palette.bg, color: palette.color }}>
            {paciente.foto_url ? (
              <img src={paciente.foto_url} alt={paciente.nome} style={s.avatarImage} />
            ) : (
              getInitials(paciente.nome)
            )}
          </div>

          {/* Info */}
          <div style={s.profileInfo}>
            <div style={s.profileNameRow}>
              <h1 style={s.profileName}>{paciente.nome}</h1>
              <span style={s.profileId}>#{paciente.id}</span>
            </div>

            {/* Quick chips */}
            <div style={s.chipsRow}>
              {paciente.cpf && (
                <span style={s.chip}>
                  <span style={s.chipIcon}>{Icons.id}</span>
                  {formatCpf(paciente.cpf)}
                </span>
              )}
              <span style={s.chip}>
                <span style={s.chipIcon}>{Icons.calendar}</span>
                {idadePaciente}
              </span>
              {paciente.telefone && (
                <span style={s.chip}>
                  <span style={s.chipIcon}>{Icons.phone}</span>
                  {paciente.telefone}
                </span>
              )}
              {paciente.email && (
                <span style={s.chip}>
                  <span style={s.chipIcon}>{Icons.mail}</span>
                  {paciente.email}
                </span>
              )}
              {paciente.profissao && (
                <span style={s.chip}>
                  <span style={s.chipIcon}>{Icons.user}</span>
                  {paciente.profissao}
                </span>
              )}
            </div>

            {/* Alerta aniversário */}
            {alertaAniversario && (
              <div style={{
                ...s.alertaBanner,
                background: alertaAniversario.type === "today" ? "#fef3c7" : "#fff7ed",
                borderColor: alertaAniversario.type === "today" ? "#fbbf24" : "#fdba74",
                color: alertaAniversario.type === "today" ? "#92400e" : "#c2410c",
              }}>
                <span style={{ display: "flex" }}>{Icons.cake}</span>
                <span>{alertaAniversario.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────── */}
        <div style={s.tabsBar}>
          {ABAS.map((aba) => {
            const ativa = abaAtiva === aba.id;
            const hovered = hoveredTab === aba.id;
            return (
              <button
                key={aba.id}
                type="button"
                onClick={() => setAbaAtiva(aba.id)}
                onMouseEnter={() => setHoveredTab(aba.id)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  ...s.tab,
                  color: ativa ? "#2563eb" : hovered ? "#0f172a" : "#64748b",
                  borderBottomColor: ativa ? "#2563eb" : "transparent",
                }}
              >
                {aba.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab: Visão geral ─────────────────────────────── */}
      {abaAtiva === "visao-geral" && (
        <>
          {/* ── CONSULTAS DO PACIENTE ───────────────────── */}
          <section style={s.consultasSection}>
            <div style={s.sectionHeading}>
              <div><h2 style={s.sectionTitle}>Consultas</h2></div>
            </div>
            <div style={s.consultasGrid}>
              <div style={s.consultasCard}>
                <div style={s.consultasCardHeader}>
                  <div>
                    <h3 style={s.consultasCardTitle}>Consultas realizadas</h3>
                    <span style={s.consultasCount}>{consultasRealizadas.length} registro{consultasRealizadas.length !== 1 ? "s" : ""}</span>
                  </div>
                  <span style={s.consultaIcon}>✓</span>
                </div>
                {carregandoConsultas ? (
                  <p style={s.consultasEmpty}>Carregando consultas...</p>
                ) : consultasRealizadas.length === 0 ? (
                  <p style={s.consultasEmpty}>Nenhuma consulta realizada registrada.</p>
                ) : (
                  <ul style={s.consultasList}>
                    {consultasRealizadas.map((consulta) => (
                      <li key={consulta.id} style={s.consultaRow}>
                        <div style={s.consultaDate}>
                          <strong>{formatarDataConsulta(consulta.data)}</strong>
                          <span>{(consulta.horario || "").slice(0, 5)}</span>
                        </div>
                        <div style={s.consultaInfo}>
                          <strong>{consulta.procedimento || "Consulta"}</strong>
                          <span>Realizada</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div style={s.consultasCard}>
                <div style={s.consultasCardHeader}>
                  <div>
                    <h3 style={s.consultasCardTitle}>Próximas consultas</h3>
                    <span style={s.consultasCount}>{consultasFuturas.length} agendada{consultasFuturas.length !== 1 ? "s" : ""}</span>
                  </div>
                  <span style={s.consultaIconFuture}>◷</span>
                </div>
                {carregandoConsultas ? (
                  <p style={s.consultasEmpty}>Carregando consultas...</p>
                ) : consultasFuturas.length === 0 ? (
                  <p style={s.consultasEmpty}>Não há consultas futuras agendadas.</p>
                ) : (
                  <ul style={s.consultasList}>
                    {consultasFuturas.map((consulta) => (
                      <li key={consulta.id} style={s.consultaRow}>
                        <div style={s.consultaDateFuture}>
                          <strong>{formatarDataConsulta(consulta.data)}</strong>
                          <span>{(consulta.horario || "").slice(0, 5)}</span>
                        </div>
                        <div style={s.consultaInfo}>
                          <strong>{consulta.procedimento || "Consulta"}</strong>
                          <span>Agendada</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section style={s.overviewSection}>
            <div style={s.sectionHeading}>
              <div>
                <h2 style={s.sectionTitle}>Resumo do paciente</h2>
              </div>
            </div>
            <div style={s.grid}>
              <InfoCard title="Dados cadastrais" icon={Icons.user} items={dadosCadastrais} style={s.cardFull} />
              <InfoCard title="Histórico clínico" icon={Icons.fileText} items={dadosHistoricoClinico} />
              <InfoCard title="Alergias a medicamentos" icon={Icons.fileText} items={[{ label: "Alergias registradas na primeira anamnese", value: anamneseInicial?.alergias }]} />

            {/* Observações */}
            <div style={{ ...s.card, ...s.cardFull }}>
              <div style={s.cardHeader}>
                <div style={s.cardTitleRow}>
                  <span style={s.cardIcon}>{Icons.fileText}</span>
                  <h2 style={s.cardTitle}>Observações</h2>
                </div>
              </div>
              <div style={s.obsBox}>
                {paciente.observacoes || (
                  <span style={s.obsEmpty}>Nenhuma observação cadastrada.</span>
                )}
              </div>
            </div>
            </div>
          </section>

          {/* ── ODONTOGRAMA ──────────────────────────────── */}
          <div style={s.odontogramaCard}>
            <Odontograma pacienteId={paciente.id} />
          </div>
        </>
      )}

      {/* ── Tab: Anamneses ───────────────────────────────── */}
      {abaAtiva === "anamneses" && (
        <AbaAnamneses pacienteId={paciente.id} />
      )}

      {/* ── Tab: Orçamentos ──────────────────────────────── */}
      {abaAtiva === "orcamentos" && (
        <AbaOrcamentos pacienteId={paciente.id} />
      )}

      {/* ── Tab: Tratamentos ─────────────────────────────── */}
      {abaAtiva === "tratamentos" && (
        <AbaTratamentos pacienteId={paciente.id} />
      )}

      {/* ── Tab: Pagamentos ──────────────────────────────── */}
      {abaAtiva === "pagamentos" && (
        <AbaPagamentos pacienteId={paciente.id} />
      )}

      {/* ── Tab: Evoluções ────────────────────────────────── */}
      {abaAtiva === "evolucoes" && (
        <AbaEvolucoes pacienteId={paciente.id} />
      )}

      {/* ── Tab: Documentos ──────────────────────────────── */}
      {abaAtiva === "documentos" && (
        <AbaDocumentos pacienteId={paciente.id} paciente={paciente} />
      )}

      {/* ── Tab: Arquivos ────────────────────────────────── */}
      {abaAtiva === "arquivos" && (
        <AbaArquivos pacienteId={paciente.id} />
      )}

      {/* ── Tab: Placeholder (abas ainda não implementadas) ── */}
      {!ABAS_COM_COMPONENTE.includes(abaAtiva) && (
        <div style={s.placeholderCard}>
          {Icons.placeholderSvg}
          <h2 style={s.placeholderTitle}>
            {ABAS.find((a) => a.id === abaAtiva)?.label}
          </h2>
          <p style={s.placeholderText}>
            Esta seção será implementada em breve.
          </p>
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   ═══════════════════════════════════════════════════════════ */
const s = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  /* ── Loading ──────────────────────────────────────── */
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    minHeight: "400px",
  },
  loadingPulse: { display: "flex", gap: "8px", alignItems: "center" },
  loadingDot1: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0s",
  },
  loadingDot2: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.2s",
  },
  loadingDot3: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.4s",
  },
  loadingText: { fontSize: "14px", fontWeight: "500", color: "#94a3b8", letterSpacing: "0.02em" },

  /* ── Not Found ────────────────────────────────────── */
  notFoundWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: "16px", minHeight: "400px",
  },
  notFoundTitle: { margin: 0, fontSize: "18px", fontWeight: "600", color: "#0f172a" },
  notFoundText: { margin: 0, fontSize: "14px", color: "#94a3b8", textAlign: "center" },

  /* ── Top Bar / Breadcrumb ─────────────────────────── */
  topBar: {
    display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
  },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "transparent", border: "none", borderRadius: "8px",
    padding: "6px 10px", cursor: "pointer", fontSize: "14px",
    fontWeight: "500", color: "#64748b", transition: "all 0.15s ease",
  },
  breadcrumbSep: { color: "#d1d5db", fontSize: "14px" },
  breadcrumbCurrent: {
    fontSize: "14px", fontWeight: "600", color: "#0f172a",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    maxWidth: "300px",
  },
  topBarRight: { marginLeft: "auto", display: "flex", gap: "8px" },

  /* ── Buttons ──────────────────────────────────────── */
  btnPrimary: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    border: "none", borderRadius: "10px", padding: "10px 20px",
    background: "#2563eb", color: "#fff", fontWeight: "600", fontSize: "14px",
    cursor: "pointer", boxShadow: "0 1px 3px rgba(37,99,235,0.2)",
    transition: "all 0.2s ease", whiteSpace: "nowrap", height: "40px", boxSizing: "border-box",
  },
  btnSecondary: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 16px",
    background: "#fff", color: "#475569", fontWeight: "500", fontSize: "13px",
    cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap",
    height: "36px", boxSizing: "border-box",
  },

  /* ── Profile Card ─────────────────────────────────── */
  profileCard: {
    background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9",
    overflow: "hidden",
  },
  profileTop: {
    display: "flex", alignItems: "flex-start", gap: "20px",
    padding: "28px 28px 20px", flexWrap: "wrap",
  },
  avatar: {
    width: "72px", height: "72px", borderRadius: "16px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "22px", fontWeight: "700", flexShrink: 0,
    letterSpacing: "0.02em", overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%", objectFit: "cover" },
  profileInfo: {
    display: "flex", flexDirection: "column", gap: "10px",
    flex: 1, minWidth: "260px",
  },
  profileNameRow: { display: "flex", alignItems: "center", gap: "10px" },
  profileName: {
    margin: 0, fontSize: "24px", fontWeight: "700", color: "#0f172a",
    letterSpacing: "-0.02em", lineHeight: 1.2,
  },
  profileId: {
    fontSize: "13px", fontWeight: "500", color: "#94a3b8",
    background: "#f8fafc", borderRadius: "6px", padding: "2px 8px",
  },

  /* ── Chips ────────────────────────────────────────── */
  chipsRow: {
    display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center",
  },
  chip: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    fontSize: "13px", fontWeight: "500", color: "#475569",
    background: "#f8fafc", borderRadius: "8px", padding: "5px 12px",
    border: "1px solid #f1f5f9",
  },
  chipIcon: {
    display: "flex", alignItems: "center", color: "#94a3b8",
  },

  /* ── Alerta Aniversário ──────────────────────────── */
  alertaBanner: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    alignSelf: "flex-start", borderRadius: "10px",
    padding: "8px 14px", fontSize: "13px", fontWeight: "600",
    border: "1px solid",
  },

  /* ── Tabs ─────────────────────────────────────────── */
  tabsBar: {
    display: "flex", gap: "0", borderTop: "1px solid #f1f5f9",
    padding: "0 28px", overflowX: "auto",
  },
  tab: {
    background: "none", border: "none",
    borderBottom: "2px solid transparent",
    padding: "14px 16px", fontSize: "13px", fontWeight: "600",
    cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap",
  },

  /* ── Grid ─────────────────────────────────────────── */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: "20px",
  },
  cardFull: { gridColumn: "1 / -1" },

  /* ── Card ─────────────────────────────────────────── */
  card: {
    background: "#fff", borderRadius: "16px",
    border: "1px solid #f1f5f9", padding: "24px",
  },
  cardHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: "18px",
  },
  cardTitleRow: { display: "flex", alignItems: "center", gap: "10px" },
  cardIcon: { display: "flex", color: "#94a3b8" },
  cardTitle: {
    margin: 0, fontSize: "15px", fontWeight: "600", color: "#0f172a",
    letterSpacing: "-0.01em",
  },

  /* ── Info Grid ────────────────────────────────────── */
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "2px", borderRadius: "12px", overflow: "hidden",
    background: "#f1f5f9",
  },
  infoItem: {
    display: "flex", flexDirection: "column", gap: "4px",
    padding: "14px 16px", background: "#fafbfc",
  },
  infoSectionTitle: {
    gridColumn: "1 / -1", padding: "12px 16px 8px",
    background: "#f8fafc", color: "#64748b", fontSize: "11px",
    fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em",
    borderTop: "1px solid #e2e8f0",
  },
  infoLabel: {
    fontSize: "11px", fontWeight: "600", color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.06em",
  },
  infoValue: {
    color: "#0f172a", fontSize: "14px", fontWeight: "500",
    wordBreak: "break-word", lineHeight: 1.4,
  },

  /* ── Observações ──────────────────────────────────── */
  obsBox: {
    padding: "16px 18px", borderRadius: "12px",
    background: "#fafbfc", border: "1px solid #f1f5f9",
    color: "#334155", fontSize: "14px", lineHeight: 1.7,
    whiteSpace: "pre-wrap", minHeight: "80px",
    borderLeft: "3px solid #e2e8f0",
  },
  obsEmpty: { color: "#c1c9d4", fontStyle: "italic" },

  /* ── Consultas do paciente ───────────────────────── */
  consultasSection: { display: "flex", flexDirection: "column", gap: "14px" },
  consultasGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" },
  consultasCard: { background: "#fff", border: "1px solid #f1f5f9", borderRadius: "16px", padding: "22px 24px", minWidth: 0 },
  consultasCardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px" },
  consultasCardTitle: { margin: 0, color: "#0f172a", fontSize: "15px", fontWeight: "600" },
  consultasCount: { display: "block", marginTop: "4px", color: "#94a3b8", fontSize: "12px", fontWeight: "500" },
  consultaIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: "#f0fdf4", color: "#16a34a", fontSize: "19px", fontWeight: "700" },
  consultaIconFuture: { display: "flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: "#eff6ff", color: "#2563eb", fontSize: "22px", fontWeight: "700" },
  consultasEmpty: { margin: 0, padding: "18px 0 8px", color: "#94a3b8", fontSize: "13px" },
  consultasList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" },
  consultaRow: { display: "flex", alignItems: "center", gap: "14px", padding: "12px 0", borderTop: "1px solid #f1f5f9" },
  consultaDate: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "88px", color: "#16a34a", fontSize: "12px" },
  consultaDateFuture: { display: "flex", flexDirection: "column", gap: "3px", minWidth: "88px", color: "#2563eb", fontSize: "12px" },
  consultaInfo: { display: "flex", flexDirection: "column", gap: "3px", minWidth: 0, flex: 1 },
  consultaInfoTitle: { color: "#0f172a", fontSize: "13px", fontWeight: "600" },
  /* ── Odontograma Card ─────────────────────────────── */
  odontogramaCard: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
    padding: "24px",
    marginTop: "4px",
  },

  /* ── Placeholder ──────────────────────────────────── */
  placeholderCard: {
    background: "#fff", borderRadius: "16px",
    border: "1px solid #f1f5f9", padding: "64px 24px",
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "12px", textAlign: "center",
  },
  placeholderTitle: { margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" },
  placeholderText: { margin: 0, fontSize: "14px", color: "#94a3b8", lineHeight: 1.5 },
};

export default ProntuarioPaciente;
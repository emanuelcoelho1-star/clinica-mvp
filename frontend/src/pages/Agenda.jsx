import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API_URL from "../api";
import ModalWhatsApp from "../components/ModalWhatsApp";
import { mensagemConfirmacao, telefoneWhatsApp } from "../utils/whatsapp";
import { adicionarMesesISO } from "../components/relacionamento/relacionamento";

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════════════ */
const horarios = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30",
];

const nomesDias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const nomesMeses = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const statusOptions = [
  { value: "agendado",   label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "concluido",  label: "Concluído" },
  { value: "faltou",     label: "Faltou" },
  { value: "cancelado",  label: "Cancelado" },
];

const STATUS_STYLE = {
  agendado:   { bg: "#eff6ff", color: "#1d4ed8", dot: "#60a5fa", border: "#bfdbfe" },
  confirmado: { bg: "#f0fdf4", color: "#15803d", dot: "#4ade80", border: "#bbf7d0" },
  concluido:  { bg: "#faf5ff", color: "#7c3aed", dot: "#a78bfa", border: "#ddd6fe" },
  faltou:     { bg: "#fff7ed", color: "#c2410c", dot: "#fb923c", border: "#fed7aa" },
  cancelado:  { bg: "#fef2f2", color: "#dc2626", dot: "#f87171", border: "#fecaca" },
};

const duracaoOptions = [15, 30, 45, 60, 90, 120].map((m) => ({
  value: m, label: m < 60 ? `${m} min` : `${Math.floor(m/60)}h${m % 60 ? ` ${m % 60}min` : ""}`,
}));

// Status que não ocupam a cadeira (não bloqueiam horário)
const STATUS_LIVRES = ["cancelado", "faltou"];
const SLOT_MIN = 30;
const SLOT_ALTURA = 68;

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function zerarHora(data) { const d = new Date(data); d.setHours(0,0,0,0); return d; }
function obterInicioAgenda(data) {
  const d = zerarHora(data);
  const diaSemana = d.getDay();
  // A visualização semanal fica ancorada na segunda-feira (segunda a sábado).
  d.setDate(d.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
  return d;
}
function formatarDataISO(data) {
  return `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,"0")}-${String(data.getDate()).padStart(2,"0")}`;
}
function adicionarDias(data, dias) { const d = new Date(data); d.setDate(d.getDate()+dias); return d; }
function calcularFim(horario, dur = 30) {
  if (!horario || !horario.includes(":")) return horario;
  const [h, m] = horario.split(":").map(Number);
  const t = h*60+m+dur;
  return `${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;
}
function normalizarConsulta(c) {
  const duracao = Number(c.duracao) || SLOT_MIN;
  return {
    id: c.id, data: c.data, inicio: c.horario, fim: calcularFim(c.horario, duracao), duracao,
    paciente: c.paciente_nome || c.paciente || c.nome_paciente || "Paciente",
    telefone: c.paciente_telefone || "",
    procedimento: c.procedimento || "Consulta",
    profissional_id: c.profissional_id ? String(c.profissional_id) : "",
    dentista: c.profissional_nome || "",
    observacoes: c.observacoes || "",
    lembrete_enviado_em: c.lembrete_enviado_em || null,
    confirmado_em: c.confirmado_em || null,
    status: c.status || "agendado", paciente_id: c.paciente_id,
  };
}
function obterMinutos(horario) {
  if (!horario || !horario.includes(":")) return 0;
  const [h, m] = horario.split(":").map(Number); return h*60+m;
}
function obterLabelStatus(status) { return statusOptions.find((o) => o.value === status)?.label || "Agendado"; }
function sobrepoe(ag, inicioMin, fimMin) {
  const i = obterMinutos(ag.inicio);
  return i < fimMin && i + ag.duracao > inicioMin;
}
function formatarDataHoraBR(valor) {
  if (!valor) return "";
  const [d, h = ""] = valor.split(" ");
  const [a, m, dia] = d.split("-");
  return `${dia}/${m}/${a}${h ? ` às ${h.slice(0, 5)}` : ""}`;
}

/* Abaixo de 768px a agenda mostra um dia por vez */
const MEDIA_MOBILE = "(max-width: 768px)";
function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(MEDIA_MOBILE).matches);
  useEffect(() => {
    const mq = window.matchMedia(MEDIA_MOBILE);
    const h = (e) => setMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return mobile;
}

/* Distribui agendamentos sobrepostos do mesmo dia em colunas lado a lado */
function distribuirEmColunas(eventos) {
  const ordenados = [...eventos].sort((a, b) => obterMinutos(a.inicio) - obterMinutos(b.inicio) || b.duracao - a.duracao);
  const resultado = [];
  let grupo = []; let fimGrupo = -1; let fimColunas = [];
  const fecharGrupo = () => { grupo.forEach((e) => { e.colunas = fimColunas.length; }); grupo = []; fimColunas = []; };
  ordenados.forEach((ev) => {
    const ini = obterMinutos(ev.inicio); const fim = ini + ev.duracao;
    if (ini >= fimGrupo) { fecharGrupo(); fimGrupo = -1; }
    let coluna = fimColunas.findIndex((f) => f <= ini);
    if (coluna === -1) { coluna = fimColunas.length; fimColunas.push(fim); } else fimColunas[coluna] = fim;
    const item = { ...ev, coluna }; grupo.push(item); resultado.push(item);
    fimGrupo = Math.max(fimGrupo, fim);
  });
  fecharGrupo();
  return resultado;
}

/* ═══════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════ */
const Icons = {
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14"/><path d="M5 12h14"/>
    </svg>
  ),
  chevronLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6"/>
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  refresh: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>
    </svg>
  ),
  trash: (
    <svg width="48" height="48" viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="40" fill="#fef2f2" stroke="#fecaca" strokeWidth="2"/>
      <path d="M42 50h36" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"/>
      <path d="M72 50l-2 30a3 3 0 0 1-3 3H53a3 3 0 0 1-3-3l-2-30" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M55 58v14" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M65 58v14" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M52 50v-4a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  userPlus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>
    </svg>
  ),
  whatsapp: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.38 9.38 0 0 1 6.67 2.77 9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.44 9.43zm8.03-17.46A11.27 11.27 0 0 0 12.05.72C5.8.72.7 5.8.7 12.07c0 2 .52 3.95 1.52 5.67L.6 23.6l6-1.57a11.3 11.3 0 0 0 5.43 1.38h.01c6.25 0 11.35-5.09 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02z"/>
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  bell: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════
   CUSTOM DROPDOWN
   ═══════════════════════════════════════════════════════════ */
function CustomDropdown({ value, options, onChange, placeholder = "Selecione", disabled = false, triggerStyle = {}, menuStyle = {}, maxHeight = "220px" }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const sel = options.find((o) => o.value === value);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div style={S.dropWrap} ref={ref}>
      <button type="button" onClick={() => !disabled && setAberto((p) => !p)} disabled={disabled}
        style={{ ...S.dropTrigger, ...(disabled ? S.dropTriggerDisabled : {}), ...triggerStyle }}>
        <span style={S.dropText}>{sel?.label || placeholder}</span>
        <span style={{ ...S.dropArrow, ...(aberto ? S.dropArrowOpen : {}) }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </span>
      </button>
      {aberto && (
        <div style={{ ...S.dropMenu, maxHeight, ...menuStyle }}>
          {options.length === 0
            ? <div style={S.dropEmpty}>Nenhuma opção</div>
            : options.map((opt, i) => (
              <button key={`${opt.value}-${i}`} type="button" disabled={opt.disabled}
                onClick={() => { if (!opt.disabled) { onChange(opt.value); setAberto(false); }}}
                style={{ ...S.dropOption, ...(i === options.length-1 ? S.dropOptionLast : {}), ...(opt.value === value ? S.dropOptionActive : {}), ...(opt.disabled ? S.dropOptionDisabled : {}) }}>
                {opt.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
function Agenda() {
  const [filtroProfissional, setFiltroProfissional] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [mostrarGerenciador, setMostrarGerenciador] = useState(false);
  const [buscaGerenciador, setBuscaGerenciador] = useState("");
  const [statusGerenciador, setStatusGerenciador] = useState("todos");
  const [inicioSemana, setInicioSemana] = useState(obterInicioAgenda(new Date()));
  const [diaSelecionado, setDiaSelecionado] = useState(() => Math.min((new Date().getDay() + 6) % 7, 5)); // índice em diasSemana (seg=0…sáb=5); começa no dia de hoje
  const isMobile = useIsMobile();
  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroFormulario, setErroFormulario] = useState("");
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);
  const [retornoPersonalizado, setRetornoPersonalizado] = useState(false);
  const [diasRetornoPersonalizado, setDiasRetornoPersonalizado] = useState("10");
  const [confirmarExclusaoAberto, setConfirmarExclusaoAberto] = useState(false);
  const [agora, setAgora] = useState(new Date());
  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [mostrarSugestoesPaciente, setMostrarSugestoesPaciente] = useState(false);
  const [modalPacienteAberto, setModalPacienteAberto] = useState(false);
  const [salvandoPaciente, setSalvandoPaciente] = useState(false);
  const [erroPaciente, setErroPaciente] = useState("");
  const [formPaciente, setFormPaciente] = useState({
    nome: "", telefone: "", email: "", comoConheceu: "", profissao: "", genero: "",
    dataNascimento: "", cpf: "", observacoes: "", cep: "", rua: "", numero: "",
    complemento: "", bairro: "", cidade: "", estado: "", responsavelNome: "",
    responsavelCpf: "", responsavelDataNascimento: "", responsavelTelefone: "",
  });
  const [buscandoCepPaciente, setBuscandoCepPaciente] = useState(false);
  const [profissionais, setProfissionais] = useState([]);
  const [nomeClinica, setNomeClinica] = useState("");
  const [whatsAppAg, setWhatsAppAg] = useState(null);
  const [painelConfirmacoesAberto, setPainelConfirmacoesAberto] = useState(false);
  const [dataConfirmacoes, setDataConfirmacoes] = useState(formatarDataISO(adicionarDias(new Date(), 1)));
  const [acaoRapida, setAcaoRapida] = useState(null);
  const [retornoVinculado, setRetornoVinculado] = useState(null);
  const [programarRetorno, setProgramarRetorno] = useState({ meses: "", motivo: "" });
  const [searchParams, setSearchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    paciente_id: "", data: formatarDataISO(new Date()), horario: "08:00", procedimento: "", status: "agendado",
    profissional_id: "", duracao: SLOT_MIN, observacoes: "",
  });
  const patientSearchRef = useRef(null);

  useEffect(() => { const i = setInterval(() => setAgora(new Date()), 30000); return () => clearInterval(i); }, []);
  useEffect(() => {
    function h(e) { if (patientSearchRef.current && !patientSearchRef.current.contains(e.target)) setMostrarSugestoesPaciente(false); }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const diasSemana = useMemo(() =>
    Array.from({ length: 6 }).map((_, i) => {
      const d = adicionarDias(inicioSemana, i);
      return { data: d, label: nomesDias[d.getDay()], numero: String(d.getDate()).padStart(2,"0"), iso: formatarDataISO(d) };
    }), [inicioSemana]);
  const diasVisiveis = isMobile ? [diasSemana[diaSelecionado]] : diasSemana;
  const colunasGrade = `${isMobile ? "52px" : "68px"} repeat(${diasVisiveis.length}, 1fr)`;

  const hojeIso = formatarDataISO(agora);
  useEffect(() => { carregarDadosIniciais(); }, []);
  async function carregarDadosIniciais() { await Promise.all([carregarConsultas(), carregarProfissionais()]); }

  async function carregarConsultas() {
    try { setCarregando(true); setErro(""); const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/consultas`, { headers: { Authorization: tk || "" } });
      if (!r.ok) throw new Error(); const d = await r.json();
      setConsultas(Array.isArray(d) ? d.map(normalizarConsulta) : []);
    } catch { setErro("Erro ao carregar consultas."); setConsultas([]); }
    finally { setCarregando(false); }
  }
  // GET /pacientes é paginado ({ dados, paginacao }): busca no servidor pelo texto digitado
  async function carregarPacientes(termo = buscaPaciente) {
    const t = String(termo || "").trim();
    if (!t) { setPacientes([]); return; }
    try { const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/pacientes?busca=${encodeURIComponent(t)}&limit=10`, { headers: { Authorization: tk || "" } });
      if (!r.ok) throw new Error(); const d = await r.json();
      // A API de pacientes usa paginação e retorna { dados, paginacao }; aceita também os formatos antigos.
      setPacientes(Array.isArray(d) ? d : Array.isArray(d.dados) ? d.dados : Array.isArray(d.pacientes) ? d.pacientes : []);
    } catch { setPacientes([]); }
  }
  useEffect(() => {
    if (!mostrarSugestoesPaciente) return;
    const timer = setTimeout(() => carregarPacientes(buscaPaciente), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaPaciente, mostrarSugestoesPaciente]);
  // Lista da própria agenda (não exige permissão do Financeiro) e nome da clínica para as mensagens
  async function carregarProfissionais() {
    const tk = localStorage.getItem("token");
    try {
      const r = await fetch(`${API_URL}/consultas/profissionais`, { headers: { Authorization: tk || "" } });
      if (!r.ok) throw new Error(); const d = await r.json();
      setProfissionais(Array.isArray(d) ? d : []);
    } catch { setProfissionais([]); }
    try {
      const r = await fetch(`${API_URL}/clinica`, { headers: { Authorization: tk || "" } });
      const d = r.ok ? await r.json() : null;
      setNomeClinica(d?.clinica?.nome_fantasia || d?.clinica?.nome || "");
    } catch { setNomeClinica(""); }
  }

  const profissionaisOptions = useMemo(() => [
    { value: "Todos", label: "Todos os profissionais" },
    ...profissionais.map((p) => ({ value: String(p.id), label: p.nome })),
  ], [profissionais]);

  const profissionaisFormOptions = useMemo(() => [
    { value: "", label: "Sem profissional" },
    ...profissionais.map((p) => ({ value: String(p.id), label: p.especialidade ? `${p.nome} · ${p.especialidade}` : p.nome })),
  ], [profissionais]);

  const pacientesFiltrados = buscaPaciente.trim() ? pacientes : [];

  const agendamentosFiltrados = useMemo(() => {
    return consultas.filter((item) => {
      const pp = filtroProfissional === "Todos" || item.profissional_id === filtroProfissional;
      const t = busca.toLowerCase();
      const pb = item.paciente.toLowerCase().includes(t) || item.procedimento.toLowerCase().includes(t) || item.dentista.toLowerCase().includes(t);
      return pp && pb && diasSemana.map((d) => d.iso).includes(item.data);
    });
  }, [consultas, filtroProfissional, busca, diasSemana]);

  const eventosPorDia = useMemo(() => {
    const mapa = {};
    diasSemana.forEach((d) => {
      mapa[d.iso] = distribuirEmColunas(agendamentosFiltrados.filter((a) => a.data === d.iso));
    });
    return mapa;
  }, [agendamentosFiltrados, diasSemana]);

  const confirmacoesDoDia = useMemo(() =>
    consultas
      .filter((c) => c.data === dataConfirmacoes && ["agendado", "confirmado"].includes(c.status))
      .filter((c) => filtroProfissional === "Todos" || c.profissional_id === filtroProfissional)
      .sort((a, b) => obterMinutos(a.inicio) - obterMinutos(b.inicio)),
  [consultas, dataConfirmacoes, filtroProfissional]);

  const pendentesAmanha = useMemo(() => {
    const amanha = formatarDataISO(adicionarDias(agora, 1));
    return consultas.filter((c) => c.data === amanha && c.status === "agendado").length;
  }, [consultas, agora]);

  const weekStats = useMemo(() => {
    // Os indicadores mostram o total geral de consultas cadastradas, não apenas a semana visível.
    const s = { total: consultas.length, agendado: 0, confirmado: 0, concluido: 0, faltou: 0, cancelado: 0 };
    consultas.forEach((a) => { if (s[a.status] !== undefined) s[a.status]++; });
    return s;
  }, [consultas]);

  // Lista de gestão independente da semana exibida no calendário.
  const consultasGerenciadas = useMemo(() => {
    const termo = buscaGerenciador.trim().toLocaleLowerCase("pt-BR");
    return consultas
      .filter((item) => {
        const correspondeStatus = statusGerenciador === "todos" || item.status === statusGerenciador;
        const texto = [item.paciente, item.procedimento, item.dentista, item.data, item.inicio]
          .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
        return correspondeStatus && (!termo || texto.includes(termo));
      })
      .sort((a, b) => String(b.data).localeCompare(String(a.data)) || String(b.inicio).localeCompare(String(a.inicio)));
  }, [consultas, buscaGerenciador, statusGerenciador]);

  const tituloPeriodo = useMemo(() => {
    const p = diasSemana[0]?.data; const u = diasSemana[diasSemana.length-1]?.data;
    if (!p || !u) return "";
    if (p.getMonth() === u.getMonth() && p.getFullYear() === u.getFullYear())
      return `${nomesMeses[p.getMonth()]} ${p.getFullYear()}`;
    return `${nomesMeses[p.getMonth()]} — ${nomesMeses[u.getMonth()]} ${u.getFullYear()}`;
  }, [diasSemana]);

  // "Hoje" e o salvar levam à semana da data; no celular seleciona o próprio dia (domingo → sábado)
  function irParaData(data) {
    setInicioSemana(obterInicioAgenda(data));
    setDiaSelecionado(Math.min((data.getDay() + 6) % 7, 5));
  }
  // No celular as setas andam um dia; ao passar do sábado/segunda, muda a semana
  function voltarSemana() {
    if (isMobile && diaSelecionado > 0) { setDiaSelecionado((d) => d - 1); return; }
    setInicioSemana((p) => adicionarDias(p, -7));
    if (isMobile) setDiaSelecionado(5);
  }
  function avancarSemana() {
    if (isMobile && diaSelecionado < 5) { setDiaSelecionado((d) => d + 1); return; }
    setInicioSemana((p) => adicionarDias(p, 7));
    if (isMobile) setDiaSelecionado(0);
  }
  function irParaHoje() { irParaData(new Date()); }
  function eventosQueIniciamNoSlot(iso, h) {
    const ini = obterMinutos(h);
    return (eventosPorDia[iso] || []).filter((e) => { const m = obterMinutos(e.inicio); return m >= ini && m < ini + SLOT_MIN; });
  }
  function slotOcupado(iso, h) {
    const ini = obterMinutos(h);
    return (eventosPorDia[iso] || []).some((e) => !STATUS_LIVRES.includes(e.status) && sobrepoe(e, ini, ini + SLOT_MIN));
  }

  function horarioPassado(iso, h) {
    if (!iso || !h) return false;
    const [a, m, d] = iso.split("-").map(Number); const [hr, mn] = h.split(":").map(Number);
    return new Date(a, m-1, d, hr, mn).getTime() + 30*60*1000 <= agora.getTime();
  }

  function ajustarHorario(novaData) {
    const disp = horarios.filter((h) => !horarioPassado(novaData, h));
    setFormData((p) => ({ ...p, data: novaData, horario: disp.length === 0 ? "" : disp.includes(p.horario) ? p.horario : disp[0] }));
  }

  // Agenda um novo retorno a partir de uma consulta já existente.
  function definirRetorno(dias) {
    if (!agendamentoEditando || !Number.isInteger(Number(dias)) || Number(dias) < 1 || Number(dias) > 365) {
      setErroFormulario("Informe uma quantidade de dias entre 1 e 365.");
      return;
    }

    const dataRetorno = formatarDataISO(adicionarDias(new Date(), Number(dias)));
    const horarioAtual = formData.horario;
    const horarioDisponivel = horarios.filter((h) => !horarioPassado(dataRetorno, h));
    const horarioRetorno = horarioDisponivel.includes(horarioAtual)
      ? horarioAtual
      : (horarioDisponivel[0] || "");
    const pacienteId = String(formData.paciente_id || agendamentoEditando.paciente_id || "");

    // Ao escolher o retorno, o próximo salvamento cria uma nova consulta (POST)
    // e mantém intacta a consulta original.
    setAgendamentoEditando(null);
    setFormData((p) => ({
      ...p,
      paciente_id: pacienteId,
      data: dataRetorno,
      horario: horarioRetorno,
      procedimento: "Retorno",
      status: "agendado",
    }));
    setRetornoPersonalizado(false);
    setErroFormulario("");
  }

  function abrirModal(ag = null, dataPad = null, horPad = "08:00", preenchimento = null) {
    setErroFormulario(""); setConfirmarExclusaoAberto(false); setMostrarSugestoesPaciente(false);
    setRetornoVinculado(preenchimento?.retorno_id || null);
    setProgramarRetorno({ meses: "", motivo: "" });
    if (ag) {
      setAgendamentoEditando(ag);
      setRetornoPersonalizado(false);
      setFormData({ paciente_id: String(ag.paciente_id||""), data: ag.data||formatarDataISO(new Date()), horario: ag.inicio||"08:00", procedimento: ag.procedimento||"", status: ag.status||"agendado",
        profissional_id: ag.profissional_id || "", duracao: ag.duracao || SLOT_MIN, observacoes: ag.observacoes || "" });
      setBuscaPaciente(ag.paciente||"");
    } else {
      const di = dataPad || diasVisiveis[0]?.iso || formatarDataISO(new Date());
      let hi = horPad; if (horarioPassado(di, hi)) hi = horarios.find((h) => !horarioPassado(di, h)) || "";
      setAgendamentoEditando(null);
      setRetornoPersonalizado(false);
      setFormData({ paciente_id: preenchimento?.paciente_id || "", data: di, horario: hi, procedimento: preenchimento?.procedimento || "", status: "agendado",
        profissional_id: preenchimento?.profissional_id || (filtroProfissional === "Todos" ? "" : filtroProfissional), duracao: SLOT_MIN, observacoes: "" });
      setBuscaPaciente(preenchimento?.paciente_nome || "");
    }
    setModalAberto(true);
  }

  // Abre um novo agendamento já preenchido quando a tela vem de um retorno (/agenda?paciente=...&retorno=...)
  useEffect(() => {
    const pacienteId = searchParams.get("paciente");
    if (!pacienteId) return;
    abrirModal(null, null, "08:00", {
      paciente_id: pacienteId,
      paciente_nome: searchParams.get("nome") || "",
      procedimento: searchParams.get("procedimento") || "Retorno",
      profissional_id: searchParams.get("profissional") || "",
      retorno_id: searchParams.get("retorno") || null,
    });
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function salvarRetornoProgramado(consultaId, tk) {
    const meses = Number(programarRetorno.meses);
    if (formData.status !== "concluido" || !meses) return;
    await fetch(`${API_URL}/relacionamento/retornos`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: tk || "" },
      body: JSON.stringify({
        paciente_id: Number(formData.paciente_id),
        profissional_id: formData.profissional_id ? Number(formData.profissional_id) : null,
        data_prevista: adicionarMesesISO(formData.data, meses),
        motivo: programarRetorno.motivo.trim() || formData.procedimento.replace(/^retorno:\s*/i, "") || "Retorno",
        consulta_origem_id: consultaId,
      }),
    });
  }

  function fecharModal() {
    if (salvando || excluindo) return;
    setModalAberto(false); setErroFormulario(""); setAgendamentoEditando(null);
    setConfirmarExclusaoAberto(false); setBuscaPaciente(""); setMostrarSugestoesPaciente(false);
  }

  function handleInput(e) {
    const { name, value } = e.target;
    if (name === "data") { ajustarHorario(value); return; }
    setFormData((p) => ({ ...p, [name]: value }));
  }

  async function handleSalvar(e) {
    e.preventDefault();
    if (!formData.paciente_id || !formData.data || !formData.horario) { setErroFormulario("Preencha paciente, data e horário."); return; }
    if (!agendamentoEditando && horarioPassado(formData.data, formData.horario)) { setErroFormulario("Não é possível agendar em horários passados."); return; }

    // Mesma regra da API: considera a duração; com profissional, só conflita com o mesmo profissional
    const inicioNovo = obterMinutos(formData.horario);
    const fimNovo = inicioNovo + (Number(formData.duracao) || SLOT_MIN);
    const conflito = !STATUS_LIVRES.includes(formData.status) && consultas.find((item) =>
      item.data === formData.data &&
      !STATUS_LIVRES.includes(item.status) &&
      String(item.id) !== String(agendamentoEditando?.id || "") &&
      (!formData.profissional_id || item.profissional_id === String(formData.profissional_id)) &&
      sobrepoe(item, inicioNovo, fimNovo)
    );
    if (conflito) {
      setErroFormulario(`Este horário já está ocupado por ${conflito.paciente} (${conflito.inicio}–${conflito.fim}). Escolha outro horário.`);
      return;
    }

    try {
      setSalvando(true);
      setErroFormulario("");
      const tk = localStorage.getItem("token");
      const ed = Boolean(agendamentoEditando);
      const r = await fetch(ed ? `${API_URL}/consultas/${agendamentoEditando.id}` : `${API_URL}/consultas`, {
        method: ed ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: tk || "" },
        body: JSON.stringify({
          paciente_id: Number(formData.paciente_id), data: formData.data, horario: formData.horario,
          procedimento: formData.procedimento, status: formData.status,
          profissional_id: formData.profissional_id ? Number(formData.profissional_id) : null,
          duracao: Number(formData.duracao) || SLOT_MIN, observacoes: formData.observacoes,
        }),
      });
      const resposta = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(resposta.erro || "");
      const consultaId = ed ? agendamentoEditando.id : resposta.id;
      if (!ed && retornoVinculado && consultaId) {
        await fetch(`${API_URL}/relacionamento/retornos/${retornoVinculado}/status`, {
          method: "PATCH", headers: { "Content-Type": "application/json", Authorization: tk || "" },
          body: JSON.stringify({ status: "agendado", consulta_id: consultaId }),
        });
      }
      await salvarRetornoProgramado(consultaId, tk);
      await carregarConsultas(); fecharModal();
      irParaData(new Date(`${formData.data}T00:00:00`));
    } catch (err) { setErroFormulario(err.message || "Não foi possível salvar o agendamento."); }
    finally { setSalvando(false); }
  }

  /* ── Confirmação via WhatsApp ───────────────────────────── */
  function abrirWhatsApp(ag) { setWhatsAppAg(ag); }

  async function registrarLembrete(ag) {
    try {
      const tk = localStorage.getItem("token");
      await fetch(`${API_URL}/consultas/${ag.id}/lembrete`, { method: "PATCH", headers: { Authorization: tk || "" } });
      await carregarConsultas();
    } catch { /* o envio já foi aberto; o registro é apenas informativo */ }
  }

  async function alterarStatusRapido(ag, status) {
    try {
      setAcaoRapida(`${ag.id}-${status}`);
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/consultas/${ag.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: tk || "" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error();
      await carregarConsultas();
      if (agendamentoEditando?.id === ag.id) setFormData((p) => ({ ...p, status }));
    } catch { setErro("Não foi possível atualizar o status."); }
    finally { setAcaoRapida(null); }
  }

  async function handleExcluir() {
    if (!agendamentoEditando?.id) return;
    try { setExcluindo(true); setErroFormulario(""); const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/consultas/${agendamentoEditando.id}`, { method: "DELETE", headers: { Authorization: tk || "" } });
      if (!r.ok) throw new Error(); setConfirmarExclusaoAberto(false); await carregarConsultas(); fecharModal();
    } catch { setErroFormulario("Não foi possível excluir."); }
    finally { setExcluindo(false); }
  }

  const numeros = (valor) => String(valor || "").replace(/\D/g, "");
  function formatarCpfPaciente(valor) {
    return numeros(valor).slice(0, 11)
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  function formatarTelefonePaciente(valor) {
    const n = numeros(valor).slice(0, 11);
    if (n.length <= 10) return n.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    return n.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }
  function atualizarCampoPaciente(campo, valor) {
    setFormPaciente((p) => ({ ...p, [campo]: valor }));
  }
  function abrirModalPaciente() {
    setErroPaciente("");
    setFormPaciente({
      nome: "", telefone: "", email: "", comoConheceu: "", profissao: "", genero: "",
      dataNascimento: "", cpf: "", observacoes: "", cep: "", rua: "", numero: "",
      complemento: "", bairro: "", cidade: "", estado: "", responsavelNome: "",
      responsavelCpf: "", responsavelDataNascimento: "", responsavelTelefone: "",
    });
    setModalPacienteAberto(true);
  }
  function fecharModalPaciente() { if (salvandoPaciente) return; setModalPacienteAberto(false); setErroPaciente(""); }

  async function buscarCepPaciente(valor) {
    const cep = numeros(valor);
    if (cep.length !== 8) return;
    try {
      setBuscandoCepPaciente(true);
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!r.ok || d.erro) { setErroPaciente("CEP não encontrado."); return; }
      setFormPaciente((p) => ({ ...p, cidade: d.localidade || "", estado: d.uf || "" }));
    } catch { setErroPaciente("Não foi possível buscar o CEP."); }
    finally { setBuscandoCepPaciente(false); }
  }

  async function handleSalvarPaciente(e) {
    e.preventDefault();
    if (!formPaciente.nome.trim()) { setErroPaciente("Preencha o Nome Completo."); return; }
    if (numeros(formPaciente.telefone).length < 10) { setErroPaciente("Preencha o Telefone Celular corretamente."); return; }
    if (numeros(formPaciente.cpf).length !== 11) { setErroPaciente("Preencha o CPF corretamente."); return; }
    if (!formPaciente.genero) { setErroPaciente("Selecione o gênero."); return; }
    if (!formPaciente.dataNascimento) { setErroPaciente("Preencha a data de nascimento."); return; }
    try {
      setSalvandoPaciente(true); setErroPaciente("");
      const tk = localStorage.getItem("token");
      const payload = {
        nome: formPaciente.nome.trim(), telefone: numeros(formPaciente.telefone), email: formPaciente.email,
        comoConheceu: formPaciente.comoConheceu, profissao: formPaciente.profissao,
        genero: formPaciente.genero, dataNascimento: formPaciente.dataNascimento,
        cpf: numeros(formPaciente.cpf), observacoes: formPaciente.observacoes,
        cep: numeros(formPaciente.cep), rua: formPaciente.rua, numero: formPaciente.numero,
        complemento: formPaciente.complemento, bairro: formPaciente.bairro, cidade: formPaciente.cidade,
        estado: formPaciente.estado, responsavelNome: formPaciente.responsavelNome,
        responsavelCpf: numeros(formPaciente.responsavelCpf),
        responsavelDataNascimento: formPaciente.responsavelDataNascimento,
        responsavelTelefone: numeros(formPaciente.responsavelTelefone),
      };
      const r = await fetch(`${API_URL}/pacientes`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: tk || "" },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erro || "Não foi possível cadastrar o paciente.");
      const nid = d?.id || d?.paciente?.id;
      await carregarPacientes();
      if (nid) setFormData((p) => ({ ...p, paciente_id: String(nid) }));
      setBuscaPaciente(payload.nome);
      setMostrarSugestoesPaciente(false);
      setModalPacienteAberto(false);
    } catch (err) { setErroPaciente(err.message || "Não foi possível cadastrar."); }
    finally { setSalvandoPaciente(false); }
  }

  function selecionarPaciente(p) {
    setFormData((prev) => ({ ...prev, paciente_id: String(p.id) }));
    setBuscaPaciente(p.nome || p.nome_paciente || `Paciente ${p.id}`);
    setMostrarSugestoesPaciente(false);
  }

  const minAgora = agora.getHours()*60+agora.getMinutes();
  const pMin = obterMinutos(horarios[0]);
  const uMin = obterMinutos(horarios[horarios.length-1])+30;
  const agoraNaAgenda = minAgora >= pMin && minAgora <= uMin;
  function posLinha(h) { const i = obterMinutos(h); if (minAgora < i || minAgora >= i+30) return null; return ((minAgora-i)/30)*100; }
  const horariosOpts = horarios.map((h) => {
    const ini = obterMinutos(h); const fim = ini + (Number(formData.duracao) || SLOT_MIN);
    const ocupado = Boolean(formData.profissional_id) && consultas.some((c) =>
      c.id !== agendamentoEditando?.id && c.data === formData.data && c.profissional_id === formData.profissional_id &&
      !STATUS_LIVRES.includes(c.status) && sobrepoe(c, ini, fim));
    return { value: h, label: ocupado ? `${h} · ocupado` : h, disabled: (horarioPassado(formData.data, h) && !agendamentoEditando) || ocupado };
  });

  const modalStyle = isMobile ? { ...S.modal, padding: "20px" } : S.modal;

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div style={S.page}>

      {/* ── Header ────────────────────────────────────────── */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerTitleRow}>
            <h1 style={S.headerTitle}>Agenda</h1>
          </div>
          <p style={S.headerSub}>Organize atendimentos e acompanhe os horários</p>
        </div>
        <div style={S.headerActions}>
          <button style={S.btnConfirmacoes} onClick={() => { setDataConfirmacoes(formatarDataISO(adicionarDias(new Date(), 1))); setPainelConfirmacoesAberto(true); }}>
            {Icons.bell}
            <span>Confirmações</span>
            {pendentesAmanha > 0 && <span style={S.badgeCount}>{pendentesAmanha}</span>}
          </button>
          <button style={S.btnPrimary} onClick={() => abrirModal()}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(37,99,235,0.2)"; }}>
            {Icons.plus}
            <span>Novo agendamento</span>
          </button>
        </div>
      </div>

      {/* ── Stats pills ───────────────────────────────────── */}
      <div style={S.statsRow}>
        {[
          { label: "Agendados", value: weekStats.agendado, ...STATUS_STYLE.agendado },
          { label: "Confirmados", value: weekStats.confirmado, ...STATUS_STYLE.confirmado },
          { label: "Concluídos", value: weekStats.concluido, ...STATUS_STYLE.concluido },
          { label: "Faltas", value: weekStats.faltou, ...STATUS_STYLE.faltou },
          { label: "Cancelados", value: weekStats.cancelado, ...STATUS_STYLE.cancelado },
        ].map((st) => (
          <div key={st.label} style={{ ...S.statPill, background: st.bg, borderColor: st.border }}>
            <span style={{ ...S.statDot, background: st.dot }} />
            <span style={{ ...S.statValue, color: st.color }}>{st.value}</span>
            <span style={S.statLabel}>{st.label}</span>
          </div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div style={S.toolbar}>
        <div style={S.navGroup}>
          <button style={S.navBtn} onClick={voltarSemana}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>{Icons.chevronLeft}</button>
          <button style={S.navBtnToday} onClick={irParaHoje}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#dbeafe")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#eff6ff")}>Hoje</button>
          <button style={S.navBtn} onClick={avancarSemana}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>{Icons.chevronRight}</button>
          <span style={S.periodTitle}>
            {isMobile ? `${diasVisiveis[0].numero} de ${nomesMeses[diasVisiveis[0].data.getMonth()]}` : tituloPeriodo}
          </span>
        </div>

        <div style={S.filters}>
          <div style={{ minWidth: "190px", position: "relative" }}>
            <CustomDropdown value={filtroProfissional} options={profissionaisOptions} onChange={setFiltroProfissional}
              placeholder="Profissional" triggerStyle={S.filterTrigger} menuStyle={{ zIndex: 3000 }} />
          </div>
          <div style={{ ...S.searchWrap, borderColor: searchFocused ? "#2563eb" : "#e2e8f0", boxShadow: searchFocused ? "0 0 0 3px rgba(37,99,235,0.1)" : "none" }}>
            <span style={{ display: "flex", color: searchFocused ? "#2563eb" : "#94a3b8", transition: "color 0.2s" }}>{Icons.search}</span>
            <input type="text" placeholder="Buscar paciente, procedimento..." value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
              style={S.searchInput} />
            {busca && <button style={S.searchClear} onClick={() => setBusca("")}>✕</button>}
          </div>
          <button style={S.btnRefresh} onClick={carregarConsultas}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
            {Icons.refresh}<span>Atualizar</span>
          </button>
          <button type="button" style={mostrarGerenciador ? S.btnManageActive : S.btnRefresh}
            onClick={() => setMostrarGerenciador((v) => !v)}>
            <span>{mostrarGerenciador ? "Ocultar consultas" : "Gerenciar consultas"}</span>
            <span style={S.manageCount}>{consultas.length}</span>
          </button>
        </div>
      </div>

      {/* ── Gerenciador de consultas em modal ── */}
      {mostrarGerenciador && (
        <div style={{ ...S.overlay, zIndex: 1100, alignItems: "center" }} onClick={() => setMostrarGerenciador(false)}>
        <section style={S.managePanel} onClick={(e) => e.stopPropagation()}>
          <div style={S.manageHeader}>
            <div>
              <h2 style={S.manageTitle}>Todas as consultas</h2>
              <p style={S.manageSubtitle}>Pesquise por paciente, procedimento, profissional, data ou horário. Edite ou exclua qualquer consulta sem navegar até a semana correspondente.</p>
            </div>
            <div style={S.manageHeaderActions}>
              <span style={S.manageTotal}>{consultasGerenciadas.length} resultado(s)</span>
              <button type="button" aria-label="Fechar gerenciador de consultas" style={S.closeBtn}
                onClick={() => setMostrarGerenciador(false)}>{Icons.close}</button>
            </div>
          </div>
          <div style={S.manageFilters}>
            <div style={S.manageSearchWrap}>
              <span style={{ display: "flex", color: "#94a3b8" }}>{Icons.search}</span>
              <input
                type="search"
                value={buscaGerenciador}
                onChange={(e) => setBuscaGerenciador(e.target.value)}
                placeholder="Buscar paciente, procedimento, data..."
                aria-label="Buscar consultas"
                style={S.manageSearchInput}
              />
              {buscaGerenciador && <button type="button" style={S.searchClear} onClick={() => setBuscaGerenciador("")}>✕</button>}
            </div>
            <div style={{ flex: "0 0 190px", minWidth: "170px" }}>
              <CustomDropdown
                value={statusGerenciador}
                onChange={setStatusGerenciador}
                options={[{ value: "todos", label: "Todos os status" }, ...statusOptions]}
                placeholder="Todos os status"
                triggerStyle={S.manageStatusTrigger}
                menuStyle={{ zIndex: 1300 }}
                maxHeight="240px"
              />
            </div>
          </div>
          {consultasGerenciadas.length === 0 ? (
            <div style={S.manageEmpty}>Nenhuma consulta encontrada com esses filtros.</div>
          ) : (
            <div style={S.manageTableWrap}>
              <table style={S.manageTable}>
                <thead>
                  <tr>
                    <th style={S.manageTh}>Paciente / procedimento</th>
                    <th style={S.manageTh}>Data e horário</th>
                    <th style={S.manageTh}>Profissional</th>
                    <th style={S.manageTh}>Status</th>
                    <th style={{ ...S.manageTh, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {consultasGerenciadas.map((consulta) => {
                    const cfg = STATUS_STYLE[consulta.status] || STATUS_STYLE.agendado;
                    const dataFormatada = consulta.data && /^\d{4}-\d{2}-\d{2}/.test(consulta.data)
                      ? consulta.data.slice(8, 10) + "/" + consulta.data.slice(5, 7) + "/" + consulta.data.slice(0, 4)
                      : consulta.data || "—";
                    return (
                      <tr key={consulta.id}>
                        <td style={S.manageTd}>
                          <div style={S.managePatientName}>{consulta.paciente}</div>
                          <div style={S.manageMuted}>{consulta.procedimento || "Consulta"}</div>
                        </td>
                        <td style={S.manageTd}>
                          <div style={S.manageDate}>{dataFormatada}</div>
                          <div style={S.manageMuted}>{consulta.inicio || "—"}</div>
                        </td>
                        <td style={S.manageTd}>{consulta.dentista || "—"}</td>
                        <td style={S.manageTd}>
                          <span style={{ ...S.manageStatus, background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                            <span style={{ ...S.statDot, width: "6px", height: "6px", background: cfg.dot }} />
                            {obterLabelStatus(consulta.status)}
                          </span>
                        </td>
                        <td style={{ ...S.manageTd, textAlign: "right", whiteSpace: "nowrap" }}>
                          <button type="button" style={S.manageEditButton} onClick={() => abrirModal(consulta)}>Editar</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        </div>
      )}

      {/* ── Loading / Erro ────────────────────────────────── */}
      {carregando && (
        <div style={S.loadingWrap}>
          <div style={S.loadingPulse}><div style={S.dot1}/><div style={S.dot2}/><div style={S.dot3}/></div>
          <span style={S.loadingText}>Carregando consultas</span>
        </div>
      )}
      {erro && <div style={S.errorCard}>{erro}</div>}

      {/* ── Calendário ────────────────────────────────────── */}
      {!carregando && !erro && (
        <div style={S.calWrap}>
          {/* Head */}
          {isMobile ? (
            /* Celular: faixa com os 6 dias; toque escolhe o dia exibido */
            <div style={S.calHeadMobile}>
              {diasSemana.map((dia, i) => {
                const hoje = dia.iso === hojeIso;
                const ativo = i === diaSelecionado;
                const qtd = (eventosPorDia[dia.iso] || []).length;
                return (
                  <button key={dia.iso} type="button" onClick={() => setDiaSelecionado(i)} aria-pressed={ativo}
                    style={{ ...S.dayHead, ...S.dayHeadMobile, ...(hoje ? S.dayHeadToday : {}), ...(ativo ? S.dayHeadAtivo : {}) }}>
                    <span style={{ ...S.dayLabel, ...(ativo ? { color: "#2563eb" } : {}) }}>{dia.label}</span>
                    <span style={{ ...S.dayNum, ...(hoje || ativo ? S.dayNumToday : {}) }}>{dia.numero}</span>
                    <span style={{ ...S.dayQtd, ...(qtd ? {} : { visibility: "hidden" }) }}>{qtd}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={S.calHead}>
              <div style={S.timeColHead} />
              {diasSemana.map((dia) => {
                const hoje = dia.iso === hojeIso;
                return (
                  <div key={dia.iso} style={{ ...S.dayHead, ...(hoje ? S.dayHeadToday : {}) }}>
                    <span style={S.dayLabel}>{dia.label}</span>
                    <span style={{ ...S.dayNum, ...(hoje ? S.dayNumToday : {}) }}>{dia.numero}</span>
                    {hoje && <span style={S.todayDot} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Body */}
          <div style={S.calBody}>
            {horarios.map((hora) => (
              <div key={hora} style={{ ...S.calRow, gridTemplateColumns: colunasGrade }}>
                <div style={{ ...S.timeCell, ...(isMobile ? { padding: "10px 6px 0" } : {}) }}><span>{hora}</span></div>
                {diasVisiveis.map((dia) => {
                  const hoje = dia.iso === hojeIso;
                  const eventos = eventosQueIniciamNoSlot(dia.iso, hora);
                  const ocupado = slotOcupado(dia.iso, hora);
                  const bloq = horarioPassado(dia.iso, hora);
                  const pl = hoje && agoraNaAgenda ? posLinha(hora) : null;

                  return (
                    <div key={`${dia.iso}-${hora}`}
                      style={{ ...S.dayCell, ...(hoje ? S.dayCellToday : {}), ...(bloq && !ocupado ? S.dayCellBlocked : {}), ...(ocupado ? { cursor: "default" } : {}) }}
                      onClick={() => { if (!ocupado && !bloq) abrirModal(null, dia.iso, hora); }}>

                      {eventos.map((ag) => {
                        const stCfg = STATUS_STYLE[ag.status] || STATUS_STYLE.agendado;
                        const deslocamento = ((obterMinutos(ag.inicio) - obterMinutos(hora)) / SLOT_MIN) * SLOT_ALTURA;
                        const altura = (ag.duracao / SLOT_MIN) * SLOT_ALTURA - 8;
                        const compacto = altura < 52;
                        const mostrarProc = altura >= 90;
                        const estreito = ag.colunas > 1;
                        const podeWhats = ag.status === "agendado" && telefoneWhatsApp(ag.telefone);
                        return (
                          <div key={ag.id} role="button" tabIndex={0} title={`${ag.inicio} – ${ag.fim} · ${ag.paciente}${ag.dentista ? ` · ${ag.dentista}` : ""}`}
                            onClick={(e) => { e.stopPropagation(); abrirModal(ag); }}
                            onKeyDown={(e) => { if (e.key === "Enter") abrirModal(ag); }}
                            style={{ ...S.eventCard, background: stCfg.bg, borderColor: stCfg.border,
                              top: `${4 + deslocamento}px`, height: `${altura}px`,
                              left: `calc(4px + (100% - 8px) * ${ag.coluna / ag.colunas})`,
                              width: `calc((100% - 8px) / ${ag.colunas} - ${ag.colunas > 1 ? 2 : 0}px)`,
                              ...(STATUS_LIVRES.includes(ag.status) ? { opacity: 0.7 } : {}),
                              ...(agendamentoEditando?.id === ag.id ? S.eventActive : {}) }}>
                            <div style={S.eventTime}>
                              <span>{ag.inicio} – {ag.fim}</span>
                              {ag.lembrete_enviado_em && ag.status === "agendado" && <span title="Lembrete enviado" style={S.eventSent}>{Icons.whatsapp}</span>}
                            </div>
                            <div style={S.eventName}>{ag.paciente}</div>
                            {mostrarProc && <div style={S.eventProc}>{ag.procedimento}{ag.dentista ? ` · ${ag.dentista}` : ""}</div>}
                            {!compacto && (
                              <div style={S.eventFooter}>
                                <span title={obterLabelStatus(ag.status)} style={{ ...S.eventBadge, background: stCfg.bg, color: stCfg.color, borderColor: stCfg.border }}>
                                  <span style={{ ...S.eventDot, background: stCfg.dot }} />
                                  {!estreito && obterLabelStatus(ag.status)}
                                </span>
                                {podeWhats && (
                                  <button type="button" title="Enviar confirmação por WhatsApp" style={S.eventWhats}
                                    onClick={(e) => { e.stopPropagation(); abrirWhatsApp(ag); }}>{Icons.whatsapp}</button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {ocupado ? null : bloq ? (
                        <div style={S.slotBlocked} />
                      ) : (
                        <div style={S.slotEmpty}>
                          <span style={S.slotPlus}>+</span>
                        </div>
                      )}

                      {pl !== null && (
                        <div style={{ ...S.nowLine, top: `${pl}%` }}>
                          <span style={S.nowDot} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal Agendamento ─────────────────────────────── */}
      {modalAberto && (
        <div style={S.overlay} onClick={fecharModal}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <h2 style={S.modalTitle}>{agendamentoEditando ? "Editar agendamento" : "Novo agendamento"}</h2>
                <p style={S.modalSub}>{agendamentoEditando ? "Altere os dados e salve." : "Preencha os dados para agendar."}</p>
              </div>
              <button style={S.closeBtn} onClick={fecharModal}>{Icons.close}</button>
            </div>

            <form onSubmit={handleSalvar} style={S.form}>
              <div style={S.fieldGroup}>
                <div style={S.patientLabelRow}>
                  <label style={S.label}>Paciente</label>
                  <button type="button" style={S.btnNewPatient} onClick={abrirModalPaciente}>
                    {Icons.userPlus}<span>Novo paciente</span>
                  </button>
                </div>
                <div style={{ position: "relative" }} ref={patientSearchRef}>
                  <input type="text" placeholder="Buscar por nome ou telefone..." value={buscaPaciente}
                    onChange={(e) => { const v = e.target.value; setBuscaPaciente(v); setMostrarSugestoesPaciente(Boolean(v.trim())); if (!v.trim()) setFormData((p) => ({ ...p, paciente_id: "" })); }}
                    onFocus={() => { if (buscaPaciente.trim()) setMostrarSugestoesPaciente(true); }}
                    style={S.input} />
                  {mostrarSugestoesPaciente && (
                    <div style={S.patientDrop}>
                      {pacientesFiltrados.length === 0
                        ? <div style={S.patientEmpty}>Nenhum paciente encontrado</div>
                        : pacientesFiltrados.slice(0, 6).map((p) => {
                          const nome = p.nome || p.nome_paciente || `Paciente ${p.id}`;
                          return (
                            <button key={p.id} type="button" onClick={() => selecionarPaciente(p)}
                              style={{ ...S.patientOpt, ...(String(formData.paciente_id) === String(p.id) ? S.patientOptActive : {}) }}>
                              <span style={S.patientOptNome}>{nome}</span>
                              {p.telefone && <span style={S.patientOptTel}>{p.telefone}</span>}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>

              <div style={S.fieldGroup}>
                <label style={S.label}>Profissional</label>
                <CustomDropdown value={formData.profissional_id} options={profissionaisFormOptions}
                  onChange={(v) => setFormData((p) => ({ ...p, profissional_id: v }))}
                  placeholder="Sem profissional" triggerStyle={S.input} menuStyle={{ zIndex: 3000 }} />
                {profissionais.length === 0 && (
                  <span style={S.fieldHint}>Nenhum profissional cadastrado. Cadastre em Financeiro › Comissões.</span>
                )}
              </div>

              <div style={{ ...S.formGrid3, ...(isMobile ? { gridTemplateColumns: "1fr 1fr" } : {}) }}>
                <div style={{ ...S.fieldGroup, ...(isMobile ? { gridColumn: "1 / -1" } : {}) }}><label style={S.label}>Data</label>
                  <input type="date" name="data" min={agendamentoEditando ? undefined : formatarDataISO(new Date())} value={formData.data} onChange={handleInput} style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Horário</label>
                  <CustomDropdown value={formData.horario} options={horariosOpts}
                    onChange={(h) => setFormData((p) => ({ ...p, horario: h }))}
                    placeholder="Selecione" triggerStyle={S.input} menuStyle={{ zIndex: 3000 }} maxHeight="260px" /></div>
                <div style={S.fieldGroup}><label style={S.label}>Duração</label>
                  <CustomDropdown value={Number(formData.duracao)} options={duracaoOptions}
                    onChange={(v) => setFormData((p) => ({ ...p, duracao: v }))}
                    placeholder="30 min" triggerStyle={S.input} menuStyle={{ zIndex: 3000 }} /></div>
              </div>

              {agendamentoEditando && (
                <div style={S.fieldGroup}>
                  <label style={S.label}>Agendar retorno</label>
                  <CustomDropdown
                    value=""
                    options={[
                      { value: "7", label: "1 semana" },
                      { value: "14", label: "2 semanas" },
                      { value: "21", label: "3 semanas" },
                      { value: "30", label: "1 mês" },
                      { value: "personalizado", label: "Escolher quantidade de dias" },
                    ]}
                    onChange={(valor) => {
                      if (valor === "personalizado") {
                        setDiasRetornoPersonalizado("10");
                        setRetornoPersonalizado(true);
                        setErroFormulario("");
                        return;
                      }
                      definirRetorno(Number(valor));
                    }}
                    placeholder="Selecione quando retornar..."
                    triggerStyle={S.input}
                    menuStyle={{ zIndex: 3000 }}
                  />
                </div>
              )}

              <div style={S.formGrid}>
                <div style={S.fieldGroup}><label style={S.label}>Procedimento</label>
                  <input type="text" name="procedimento" placeholder="Ex: Avaliação, limpeza, retorno..."
                    value={formData.procedimento} onChange={handleInput} style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Status</label>
                  <CustomDropdown value={formData.status} options={statusOptions}
                    onChange={(v) => setFormData((p) => ({ ...p, status: v }))}
                    placeholder="Selecione" triggerStyle={S.input} menuStyle={{ zIndex: 3000 }} /></div>
              </div>

              <div style={S.fieldGroup}><label style={S.label}>Observações</label>
                <textarea name="observacoes" rows={2} placeholder="Informações para a equipe (opcional)"
                  value={formData.observacoes} onChange={handleInput} style={S.textarea} /></div>

              {agendamentoEditando && ["agendado", "confirmado"].includes(agendamentoEditando.status) && ["agendado", "confirmado"].includes(formData.status) && (
                <div style={S.confirmBox}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                    <span style={S.confirmBoxTitle}>Confirmação do paciente</span>
                    <span style={S.confirmBoxText}>
                      {agendamentoEditando.status === "confirmado"
                        ? `Confirmado${agendamentoEditando.confirmado_em ? ` em ${formatarDataHoraBR(agendamentoEditando.confirmado_em)}` : ""}`
                        : agendamentoEditando.lembrete_enviado_em
                          ? `Lembrete enviado em ${formatarDataHoraBR(agendamentoEditando.lembrete_enviado_em)}`
                          : "Lembrete ainda não enviado"}
                    </span>
                  </div>
                  {agendamentoEditando.status === "agendado" && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button type="button" style={{ ...S.btnWhats, ...(!telefoneWhatsApp(agendamentoEditando.telefone) ? S.btnDisabled : {}) }} disabled={!telefoneWhatsApp(agendamentoEditando.telefone)}
                        title={telefoneWhatsApp(agendamentoEditando.telefone) ? "" : "Paciente sem telefone válido"}
                        onClick={() => abrirWhatsApp(agendamentoEditando)}>
                        {Icons.whatsapp}<span>WhatsApp</span>
                      </button>
                      <button type="button" style={S.btnConfirmar} disabled={acaoRapida !== null}
                        onClick={() => alterarStatusRapido(agendamentoEditando, "confirmado").then(() => setAgendamentoEditando((p) => p && ({ ...p, status: "confirmado" })))}>
                        {Icons.check}<span>Confirmar</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {retornoVinculado && !agendamentoEditando && (
                <div style={S.retornoAviso}>Este agendamento vai marcar o retorno pendente do paciente como agendado.</div>
              )}

              {formData.status === "concluido" && (
                <div style={S.confirmBox}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                    <span style={S.confirmBoxTitle}>Programar retorno</span>
                    <span style={S.confirmBoxText}>O paciente aparecerá em Relacionamento › Retornos na data prevista.</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    {[["", "Sem retorno"], [3, "3 meses"], [6, "6 meses"], [12, "1 ano"]].map(([v, l]) => (
                      <button key={l} type="button" onClick={() => setProgramarRetorno((p) => ({ ...p, meses: v }))}
                        style={{ ...S.chip, ...(programarRetorno.meses === v ? S.chipAtivo : {}) }}>{l}</button>
                    ))}
                  </div>
                  {programarRetorno.meses !== "" && (
                    <input type="text" placeholder={`Motivo (padrão: ${formData.procedimento.replace(/^retorno:\s*/i, "") || "Retorno"})`} value={programarRetorno.motivo}
                      onChange={(e) => setProgramarRetorno((p) => ({ ...p, motivo: e.target.value }))} style={{ ...S.input, height: "36px" }} />
                  )}
                </div>
              )}

              {erroFormulario && <div style={S.formError}>{erroFormulario}</div>}

              <div style={S.formActions}>
                {agendamentoEditando && (
                  <button type="button" style={S.btnDanger} onClick={() => setConfirmarExclusaoAberto(true)} disabled={salvando || excluindo}>Excluir</button>
                )}
                <div style={{ flex: 1 }} />
                <button type="button" style={S.btnSecondary} onClick={fecharModal} disabled={salvando || excluindo}>Cancelar</button>
                <button type="submit" style={S.btnPrimary} disabled={salvando || excluindo || (!agendamentoEditando && !formData.horario)}>
                  {salvando ? "Salvando..." : agendamentoEditando ? "Salvar alterações" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal quantidade personalizada de dias do retorno ── */}
      {retornoPersonalizado && (
        <div style={{ ...S.overlay, zIndex: 1200 }} onClick={() => setRetornoPersonalizado(false)}>
          <div style={{ ...S.modal, maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <h2 style={S.modalTitle}>Personalizar retorno</h2>
                <p style={S.modalSub}>Informe em quantos dias deseja agendar o retorno.</p>
              </div>
              <button type="button" style={S.closeBtn} onClick={() => setRetornoPersonalizado(false)} aria-label="Fechar">
                {Icons.close}
              </button>
            </div>
            <form
              style={S.form}
              onSubmit={(e) => {
                e.preventDefault();
                definirRetorno(Number(diasRetornoPersonalizado));
              }}
            >
              <div style={S.fieldGroup}>
                <label style={S.label}>Quantidade de dias (1 a 365)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  step="1"
                  required
                  value={diasRetornoPersonalizado}
                  onChange={(e) => setDiasRetornoPersonalizado(e.target.value)}
                  style={S.input}
                  placeholder="Ex.: 45"
                  autoFocus
                />
              </div>
              {erroFormulario && <div style={S.formError}>{erroFormulario}</div>}
              <div style={S.formActions}>
                <div style={{ flex: 1 }} />
                <button type="button" style={S.btnSecondary} onClick={() => setRetornoPersonalizado(false)}>
                  Cancelar
                </button>
                <button type="submit" style={S.btnPrimary}>
                  Definir retorno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Novo Paciente ───────────────────────────── */}
      {modalPacienteAberto && (
        <div style={{ ...S.overlay, alignItems: "flex-start", overflowY: "auto" }} onClick={fecharModalPaciente}>
          <div style={{ ...modalStyle, maxWidth: "820px", maxHeight: "calc(100vh - 40px)", overflowY: "auto", margin: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <h2 style={S.modalTitle}>Novo paciente</h2>
                <p style={S.modalSub}>Preencha os mesmos dados disponíveis no cadastro de pacientes.</p>
              </div>
              <button type="button" style={S.closeBtn} onClick={fecharModalPaciente}>{Icons.close}</button>
            </div>
            <form onSubmit={handleSalvarPaciente} style={S.form}>
              <h3 style={S.patientSectionTitle}>Dados do paciente</h3>
              <div style={S.patientFormGrid}>
                <div style={S.patientFieldFull}><label style={S.label}>Nome Completo *</label>
                  <input required value={formPaciente.nome} onChange={(e) => atualizarCampoPaciente("nome", e.target.value)} placeholder="Digite o nome completo" style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Telefone Celular *</label>
                  <input required value={formPaciente.telefone} onChange={(e) => atualizarCampoPaciente("telefone", formatarTelefonePaciente(e.target.value))} placeholder="(00) 00000-0000" style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>CPF *</label>
                  <input required value={formPaciente.cpf} onChange={(e) => atualizarCampoPaciente("cpf", formatarCpfPaciente(e.target.value))} placeholder="000.000.000-00" style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Email</label>
                  <input type="email" value={formPaciente.email} onChange={(e) => atualizarCampoPaciente("email", e.target.value)} placeholder="email@exemplo.com" style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Como conheceu a clínica</label>
                  <input value={formPaciente.comoConheceu} onChange={(e) => atualizarCampoPaciente("comoConheceu", e.target.value)} placeholder="Indicação, Instagram, Google..." style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Profissão</label>
                  <input value={formPaciente.profissao} onChange={(e) => atualizarCampoPaciente("profissao", e.target.value)} placeholder="Digite a profissão" style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Gênero *</label>
                  <select required value={formPaciente.genero} onChange={(e) => atualizarCampoPaciente("genero", e.target.value)} style={S.input}>
                    <option value="">Selecione</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Outro">Outro</option><option value="Prefiro não informar">Prefiro não informar</option>
                  </select></div>
                <div style={S.fieldGroup}><label style={S.label}>Data de Nascimento *</label>
                  <input required type="date" value={formPaciente.dataNascimento} onChange={(e) => atualizarCampoPaciente("dataNascimento", e.target.value)} style={S.input} /></div>
                <div style={S.patientFieldFull}><label style={S.label}>Observações</label>
                  <textarea value={formPaciente.observacoes} onChange={(e) => atualizarCampoPaciente("observacoes", e.target.value)} placeholder="Digite observações importantes sobre o paciente" style={S.patientTextarea} /></div>
              </div>
              <h3 style={S.patientSectionTitle}>Endereço</h3>
              <div style={S.patientFormGrid}>
                <div style={S.fieldGroup}><label style={S.label}>CEP</label>
                  <input value={formPaciente.cep} onChange={(e) => atualizarCampoPaciente("cep", numeros(e.target.value).slice(0,8).replace(/^(\\d{5})(\\d)/, "$1-$2"))} onBlur={(e) => buscarCepPaciente(e.target.value)} placeholder="00000-000" style={S.input} />
                  {buscandoCepPaciente && <span style={S.patientHelper}>Buscando CEP...</span>}</div>
                <div style={S.patientFieldFull}><label style={S.label}>Rua</label>
                  <input value={formPaciente.rua} onChange={(e) => atualizarCampoPaciente("rua", e.target.value)} placeholder="Rua / Avenida" style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Número</label>
                  <input value={formPaciente.numero} onChange={(e) => atualizarCampoPaciente("numero", e.target.value)} placeholder="Número" style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Complemento</label>
                  <input value={formPaciente.complemento} onChange={(e) => atualizarCampoPaciente("complemento", e.target.value)} placeholder="Apartamento, casa, sala..." style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Bairro</label>
                  <input value={formPaciente.bairro} onChange={(e) => atualizarCampoPaciente("bairro", e.target.value)} placeholder="Bairro" style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Cidade</label>
                  <input value={formPaciente.cidade} onChange={(e) => atualizarCampoPaciente("cidade", e.target.value)} placeholder="Cidade" style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Estado</label>
                  <input value={formPaciente.estado} onChange={(e) => atualizarCampoPaciente("estado", e.target.value.toUpperCase().slice(0,2))} placeholder="UF" style={S.input} /></div>
              </div>
              <h3 style={S.patientSectionTitle}>Dados do responsável</h3>
              <div style={S.patientFormGrid}>
                <div style={S.patientFieldFull}><label style={S.label}>Nome Completo</label>
                  <input value={formPaciente.responsavelNome} onChange={(e) => atualizarCampoPaciente("responsavelNome", e.target.value)} placeholder="Digite o nome do responsável" style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>CPF</label>
                  <input value={formPaciente.responsavelCpf} onChange={(e) => atualizarCampoPaciente("responsavelCpf", formatarCpfPaciente(e.target.value))} placeholder="000.000.000-00" style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Data de Nascimento</label>
                  <input type="date" value={formPaciente.responsavelDataNascimento} onChange={(e) => atualizarCampoPaciente("responsavelDataNascimento", e.target.value)} style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Telefone Celular</label>
                  <input value={formPaciente.responsavelTelefone} onChange={(e) => atualizarCampoPaciente("responsavelTelefone", formatarTelefonePaciente(e.target.value))} placeholder="(00) 00000-0000" style={S.input} /></div>
              </div>
              {erroPaciente && <div style={S.formError}>{erroPaciente}</div>}
              <div style={S.formActions}>
                <div style={{ flex: 1 }} />
                <button type="button" style={S.btnSecondary} onClick={fecharModalPaciente} disabled={salvandoPaciente}>Cancelar</button>
                <button type="submit" style={S.btnPrimary} disabled={salvandoPaciente || buscandoCepPaciente}>{salvandoPaciente ? "Salvando..." : "Cadastrar paciente"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmar Exclusão ─────────────────────────────── */}
      {confirmarExclusaoAberto && (
        <div style={S.overlay}>
          <div style={{ ...modalStyle, maxWidth: "400px", textAlign: "center", padding: "32px" }}>
            {Icons.trash}
            <h3 style={S.confirmTitle}>Excluir agendamento?</h3>
            <p style={S.confirmText}>Esta ação não poderá ser desfeita.</p>
            <div style={{ ...S.formActions, justifyContent: "center", marginTop: "16px" }}>
              <button type="button" style={S.btnSecondary} onClick={() => setConfirmarExclusaoAberto(false)} disabled={excluindo}>Cancelar</button>
              <button type="button" style={S.btnDanger} onClick={handleExcluir} disabled={excluindo}>{excluindo ? "Excluindo..." : "Confirmar exclusão"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Painel de Confirmações ────────────────────────── */}
      {painelConfirmacoesAberto && (
        <div style={S.overlay} onClick={() => setPainelConfirmacoesAberto(false)}>
          <div style={{ ...modalStyle, maxWidth: "640px" }} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <h2 style={S.modalTitle}>Confirmações de consulta</h2>
                <p style={S.modalSub}>Envie lembretes por WhatsApp e registre as confirmações.</p>
              </div>
              <button style={S.closeBtn} onClick={() => setPainelConfirmacoesAberto(false)}>{Icons.close}</button>
            </div>

            <div style={S.confirmToolbar}>
              <input type="date" value={dataConfirmacoes} onChange={(e) => setDataConfirmacoes(e.target.value)} style={{ ...S.input, width: "170px" }} />
              <span style={S.confirmResumo}>
                {confirmacoesDoDia.filter((c) => c.status === "confirmado").length} de {confirmacoesDoDia.length} confirmados
              </span>
            </div>

            <div style={S.confirmList}>
              {confirmacoesDoDia.length === 0 ? (
                <div style={S.patientEmpty}>Nenhum agendamento ativo nesta data.</div>
              ) : confirmacoesDoDia.map((c) => {
                const stCfg = STATUS_STYLE[c.status] || STATUS_STYLE.agendado;
                const temTel = Boolean(telefoneWhatsApp(c.telefone));
                return (
                  <div key={c.id} style={S.confirmRow}>
                    <div style={S.confirmHora}>{c.inicio}</div>
                    {/* base de 160px: em telas estreitas os botões quebram para a linha de baixo */}
                    <div style={{ flex: "1 1 160px", minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={S.patientOptNome}>{c.paciente}</span>
                      <span style={S.patientOptTel}>
                        {[c.procedimento, c.dentista, c.telefone || "sem telefone"].filter(Boolean).join(" · ")}
                      </span>
                      {c.status === "agendado" && c.lembrete_enviado_em && (
                        <span style={S.confirmSentText}>Lembrete enviado em {formatarDataHoraBR(c.lembrete_enviado_em)}</span>
                      )}
                    </div>
                    {c.status === "confirmado" ? (
                      <span style={{ ...S.eventBadge, background: stCfg.bg, color: stCfg.color, borderColor: stCfg.border, alignSelf: "center", ...(isMobile ? { marginLeft: "60px" } : {}) }}>
                        <span style={{ ...S.eventDot, background: stCfg.dot }} />Confirmado
                      </span>
                    ) : (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", ...(isMobile ? { marginLeft: "60px" } : {}) }}>
                        <button type="button" style={{ ...S.btnWhats, ...(!temTel ? S.btnDisabled : {}) }} disabled={!temTel} title={temTel ? "" : "Paciente sem telefone válido"}
                          onClick={() => abrirWhatsApp(c)}>
                          {Icons.whatsapp}<span>{c.lembrete_enviado_em ? "Reenviar" : "Enviar"}</span>
                        </button>
                        <button type="button" style={S.btnConfirmar} disabled={acaoRapida !== null}
                          onClick={() => alterarStatusRapido(c, "confirmado")}>
                          {Icons.check}<span>{acaoRapida === `${c.id}-confirmado` ? "..." : "Confirmar"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal WhatsApp ────────────────────────────────── */}
      {whatsAppAg && (
        <ModalWhatsApp titulo="Confirmar por WhatsApp" paciente={whatsAppAg.paciente} telefone={whatsAppAg.telefone}
          mensagemInicial={mensagemConfirmacao({ paciente: whatsAppAg.paciente, data: whatsAppAg.data, horario: whatsAppAg.inicio,
            procedimento: whatsAppAg.procedimento, profissional: whatsAppAg.dentista, clinica: nomeClinica })}
          dica="O WhatsApp abrirá com a mensagem pronta. Depois que o paciente responder, marque a consulta como confirmada."
          onEnviado={() => registrarLembrete(whatsAppAg)} onFechar={() => setWhatsAppAg(null)} />
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes pulse-dot { 0%, 80%, 100% { transform: scale(0); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   ═══════════════════════════════════════════════════════════ */
const S = {
  page: { display: "flex", flexDirection: "column", gap: "24px" },

  /* ── Header ──────────────────────────────── */
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" },
  headerLeft: { display: "flex", flexDirection: "column", gap: "4px" },
  headerTitleRow: { display: "flex", alignItems: "center", gap: "12px" },
  headerTitle: { margin: 0, fontSize: "28px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.025em", lineHeight: 1.2 },
  headerCount: { display: "inline-flex", alignItems: "center", background: "#f1f5f9", color: "#475569", borderRadius: "8px", fontSize: "13px", fontWeight: "600", padding: "4px 10px", lineHeight: 1 },
  headerSub: { margin: 0, fontSize: "14px", color: "#94a3b8", fontWeight: "400" },
  headerActions: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  btnConfirmacoes: { display: "inline-flex", alignItems: "center", gap: "8px", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 16px", background: "#fff", color: "#334155", fontWeight: "600", fontSize: "14px", cursor: "pointer", height: "40px", boxSizing: "border-box" },
  badgeCount: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "20px", height: "20px", padding: "0 6px", borderRadius: "10px", background: "#f97316", color: "#fff", fontSize: "11px", fontWeight: "700", boxSizing: "border-box" },

  /* ── Buttons ─────────────────────────────── */
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: "8px", border: "none", borderRadius: "10px", padding: "10px 20px", background: "#2563eb", color: "#fff", fontWeight: "600", fontSize: "14px", cursor: "pointer", boxShadow: "0 1px 3px rgba(37,99,235,0.2)", transition: "all 0.2s ease", whiteSpace: "nowrap", height: "40px", boxSizing: "border-box" },
  btnSecondary: { display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 16px", background: "#fff", color: "#475569", fontWeight: "500", fontSize: "13px", cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap", height: "40px", boxSizing: "border-box" },
  btnDanger: { display: "inline-flex", alignItems: "center", gap: "6px", border: "none", borderRadius: "10px", padding: "0 16px", background: "#ef4444", color: "#fff", fontWeight: "600", fontSize: "13px", cursor: "pointer", height: "40px", boxSizing: "border-box" },
  btnRefresh: { display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 14px", background: "#fff", color: "#475569", fontWeight: "500", fontSize: "13px", cursor: "pointer", transition: "all 0.15s ease", height: "36px", boxSizing: "border-box" },

  /* ── Consulta management ───────────────────── */
  btnManageActive: { display: "inline-flex", alignItems: "center", gap: "8px", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "0 14px", background: "#eff6ff", color: "#1d4ed8", fontWeight: "600", fontSize: "13px", cursor: "pointer", height: "36px", boxSizing: "border-box" },
  manageCount: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "22px", height: "22px", padding: "0 5px", borderRadius: "7px", background: "#dbeafe", color: "#1d4ed8", fontSize: "11px", fontWeight: "700" },
  managePanel: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", boxShadow: "0 24px 64px rgba(15,23,42,0.18)", width: "100%", maxWidth: "1200px", maxHeight: "min(94vh, 1000px)", overflowY: "visible", minWidth: 0, boxSizing: "border-box" },
  manageHeaderActions: { display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 },
  manageHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" },
  manageTitle: { margin: 0, color: "#0f172a", fontSize: "17px", fontWeight: "700" },
  manageSubtitle: { margin: "5px 0 0", color: "#64748b", fontSize: "13px", lineHeight: 1.5, maxWidth: "700px" },
  manageTotal: { borderRadius: "8px", background: "#f1f5f9", color: "#475569", padding: "6px 9px", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" },
  manageFilters: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "nowrap", marginBottom: "14px" },
  manageSearchWrap: { display: "flex", alignItems: "center", gap: "8px", height: "40px", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 12px", flex: "1 1 260px", minWidth: "180px", boxSizing: "border-box" },
  manageSearchInput: { flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: "13px", color: "#0f172a", background: "transparent", height: "100%" },
  manageStatusTrigger: { height: "40px", minWidth: "170px", fontSize: "13px", color: "#334155" },
  manageTableWrap: { width: "100%", overflowX: "auto", border: "1px solid #f1f5f9", borderRadius: "12px" },
  manageTable: { width: "100%", borderCollapse: "collapse", minWidth: "680px", fontSize: "13px" },
  manageTh: { padding: "12px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", textAlign: "left", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: "700", whiteSpace: "nowrap" },
  manageTd: { padding: "13px 14px", borderBottom: "1px solid #f1f5f9", color: "#334155", verticalAlign: "middle" },
  managePatientName: { color: "#0f172a", fontWeight: "700", marginBottom: "3px" },
  manageMuted: { color: "#94a3b8", fontSize: "12px" },
  manageDate: { color: "#0f172a", fontWeight: "600" },
  manageStatus: { display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid", borderRadius: "7px", padding: "5px 8px", fontSize: "11px", fontWeight: "600", whiteSpace: "nowrap" },
  manageEditButton: { height: "32px", padding: "0 12px", borderRadius: "8px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontSize: "12px", fontWeight: "700", cursor: "pointer" },
  manageEmpty: { padding: "28px 16px", textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: "12px", fontSize: "13px" },

  /* ── Stats ────────────────────────────────── */
  statsRow: { display: "flex", gap: "10px", flexWrap: "wrap" },
  statPill: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "10px", border: "1px solid", fontSize: "13px" },
  statDot: { width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0 },
  statValue: { fontWeight: "700", fontSize: "15px" },
  statLabel: { fontWeight: "500", color: "#64748b", fontSize: "13px" },

  /* ── Toolbar ──────────────────────────────── */
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", position: "relative", zIndex: 20 },
  navGroup: { display: "flex", alignItems: "center", gap: "6px" },
  navBtn: { border: "1px solid #e2e8f0", background: "#fff", borderRadius: "8px", width: "36px", height: "36px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", transition: "all 0.15s ease" },
  navBtnToday: { border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", borderRadius: "8px", padding: "0 14px", height: "36px", cursor: "pointer", fontWeight: "600", fontSize: "13px", transition: "all 0.15s ease" },
  periodTitle: { fontSize: "15px", fontWeight: "600", color: "#0f172a", marginLeft: "8px" },
  filters: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  filterTrigger: { height: "36px", borderRadius: "10px", border: "1px solid #e2e8f0", background: "#fff", padding: "0 12px", fontSize: "13px", minWidth: "150px" },

  /* ── Search ──────────────────────────────── */
  searchWrap: { display: "flex", alignItems: "center", gap: "8px", height: "36px", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "0 12px", background: "#fff", transition: "all 0.2s ease", minWidth: "200px", boxSizing: "border-box" },
  searchInput: { flex: 1, border: "none", outline: "none", fontSize: "13px", color: "#0f172a", background: "transparent", fontWeight: "400", height: "100%" },
  searchClear: { display: "flex", alignItems: "center", justifyContent: "center", width: "18px", height: "18px", borderRadius: "50%", border: "none", background: "#f1f5f9", color: "#94a3b8", fontSize: "9px", cursor: "pointer", flexShrink: 0, lineHeight: 1 },

  /* ── Loading ─────────────────────────────── */
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", minHeight: "300px" },
  loadingPulse: { display: "flex", gap: "8px", alignItems: "center" },
  dot1: { width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb", animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0s" },
  dot2: { width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb", animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.2s" },
  dot3: { width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb", animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.4s" },
  loadingText: { fontSize: "14px", fontWeight: "500", color: "#94a3b8", letterSpacing: "0.02em" },
  errorCard: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "12px", padding: "14px 18px", fontSize: "14px", fontWeight: "500" },

  /* ── Calendar ────────────────────────────── */
  calWrap: { background: "#fff", border: "1px solid #f1f5f9", borderRadius: "16px", overflow: "hidden" },
  calHead: { display: "grid", gridTemplateColumns: "68px repeat(6, 1fr)", borderBottom: "1px solid #f1f5f9", background: "#fafbfc" },
  calHeadMobile: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", borderBottom: "1px solid #f1f5f9", background: "#fafbfc" },
  dayHeadMobile: { padding: "8px 2px", border: "none", borderRight: "1px solid #f1f5f9", borderBottom: "2px solid transparent", background: "transparent", cursor: "pointer", fontFamily: "inherit", minWidth: 0 },
  dayHeadAtivo: { background: "#eff6ff", borderBottomColor: "#2563eb" },
  dayQtd: { fontSize: "10px", fontWeight: "700", color: "#2563eb", background: "#dbeafe", borderRadius: "6px", padding: "0 5px", lineHeight: "15px" },
  timeColHead: { padding: "14px 8px", borderRight: "1px solid #f1f5f9" },
  dayHead: { padding: "12px 6px", display: "flex", flexDirection: "column", gap: "2px", alignItems: "center", justifyContent: "center", borderRight: "1px solid #f1f5f9", position: "relative" },
  dayHeadToday: { background: "#fafcff" },
  dayLabel: { fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  dayNum: { fontSize: "18px", fontWeight: "700", color: "#0f172a", lineHeight: 1.2 },
  dayNumToday: { color: "#2563eb" },
  todayDot: { width: "5px", height: "5px", borderRadius: "50%", background: "#2563eb" },

  calBody: { display: "flex", flexDirection: "column" },
  // Altura fixa (SLOT_ALTURA, incluindo a borda) para posicionar agendamentos com duração variável
  calRow: { display: "grid", height: `${SLOT_ALTURA}px`, borderBottom: "1px solid #f8fafc" },
  timeCell: { padding: "8px 8px", borderRight: "1px solid #f1f5f9", fontSize: "11px", fontWeight: "600", color: "#c1c9d4", background: "#fafbfc", display: "flex", alignItems: "flex-start", paddingTop: "10px" },
  dayCell: { padding: "4px", borderRight: "1px solid #f8fafc", position: "relative", cursor: "pointer", background: "#fff", display: "flex", alignItems: "stretch" },
  dayCellToday: { background: "#fafcff" },
  dayCellBlocked: { background: "#fafbfc", cursor: "not-allowed" },

  /* ── Slots ───────────────────────────────── */
  slotEmpty: { width: "100%", minHeight: "58px", border: "1px dashed #e8eef5", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" },
  slotPlus: { color: "#d1d5db", fontSize: "18px", fontWeight: "300", transition: "color 0.15s" },
  slotBlocked: { width: "100%", minHeight: "58px", borderRadius: "10px", background: "#f8fafc", opacity: 0.4 },

  /* ── Event Card ──────────────────────────── */
  eventCard: { position: "absolute", boxSizing: "border-box", borderRadius: "10px", border: "1px solid", padding: "6px 9px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden", zIndex: 10, transition: "box-shadow 0.15s ease" },
  eventActive: { outline: "2px solid #2563eb", outlineOffset: "1px" },
  eventTime: { fontSize: "10px", fontWeight: "600", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px", whiteSpace: "nowrap", overflow: "hidden", flexShrink: 0 },
  eventSent: { display: "inline-flex", color: "#16a34a", transform: "scale(0.85)" },
  eventFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4px", marginTop: "auto" },
  eventWhats: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px", borderRadius: "6px", border: "1px solid #bbf7d0", background: "#fff", color: "#16a34a", cursor: "pointer", padding: 0, flexShrink: 0 },
  eventName: { fontSize: "12px", fontWeight: "700", color: "#0f172a", lineHeight: 1.2, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventProc: { fontSize: "11px", color: "#64748b", fontWeight: "400", marginBottom: "2px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventBadge: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 7px", borderRadius: "6px", fontSize: "10px", fontWeight: "600", alignSelf: "flex-start", border: "1px solid" },
  eventDot: { width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0 },

  /* ── Now line ────────────────────────────── */
  nowLine: { position: "absolute", left: 0, right: 0, height: "2px", background: "#ef4444", zIndex: 30, pointerEvents: "none" },
  nowDot: { position: "absolute", left: "-1px", top: "-3px", width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", zIndex: 31 },

  /* ── Modal ───────────────────────────────── */
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 999, overflowY: "auto" },
  // margin auto: centraliza, e se o modal for mais alto que a tela ele começa no topo e o overlay rola
  modal: { width: "100%", maxWidth: "520px", background: "#fff", borderRadius: "16px", padding: "28px", boxShadow: "0 24px 64px rgba(15,23,42,0.18)", overflow: "visible", margin: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "22px" },
  modalTitle: { margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.02em" },
  modalSub: { margin: "4px 0 0", color: "#94a3b8", fontSize: "14px", fontWeight: "400" },
  closeBtn: { border: "1px solid #f1f5f9", background: "#fafbfc", width: "34px", height: "34px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexShrink: 0, transition: "all 0.15s ease" },

  /* ── Form ─────────────────────────────────── */
  form: { display: "flex", flexDirection: "column", gap: "16px", overflow: "visible" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  formGrid3: { display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: "12px" },
  textarea: { width: "100%", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "10px 12px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5 },
  fieldHint: { fontSize: "12px", color: "#94a3b8" },

  /* ── Confirmações ────────────────────────── */
  confirmBox: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: "12px", padding: "12px 14px" },
  confirmBoxTitle: { fontSize: "13px", fontWeight: "700", color: "#0f172a" },
  confirmBoxText: { fontSize: "12px", color: "#64748b" },
  btnWhats: { display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "0 12px", background: "#f0fdf4", color: "#15803d", fontWeight: "600", fontSize: "12px", cursor: "pointer", height: "32px" },
  btnConfirmar: { display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0 12px", background: "#eff6ff", color: "#1d4ed8", fontWeight: "600", fontSize: "12px", cursor: "pointer", height: "32px" },
  confirmToolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "14px", flexWrap: "wrap" },
  confirmResumo: { fontSize: "13px", fontWeight: "600", color: "#475569" },
  confirmList: { display: "flex", flexDirection: "column", border: "1px solid #f1f5f9", borderRadius: "12px", maxHeight: "420px", overflowY: "auto" },
  confirmRow: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderBottom: "1px solid #f8fafc", flexWrap: "wrap" },
  confirmHora: { fontSize: "14px", fontWeight: "700", color: "#2563eb", width: "48px", flexShrink: 0 },
  btnDisabled: { opacity: 0.45, cursor: "not-allowed" },
  chip: { border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0 10px", height: "30px", background: "#fff", color: "#475569", fontSize: "12px", fontWeight: "600", cursor: "pointer" },
  chipAtivo: { borderColor: "#2563eb", background: "#eff6ff", color: "#1d4ed8" },
  retornoAviso: { background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: "500" },
  confirmSentText: { fontSize: "11px", color: "#16a34a", fontWeight: "600" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px", overflow: "visible" },
  label: { fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  input: { width: "100%", height: "40px", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "0 12px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a", transition: "border-color 0.2s, box-shadow 0.2s" },
  formError: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", fontWeight: "500" },
  formActions: { display: "flex", alignItems: "center", gap: "10px", marginTop: "8px", flexWrap: "wrap" },

  patientSectionTitle: { margin: "8px 0 0", paddingBottom: "8px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", fontWeight: "700", color: "#334155" },
  patientFormGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px 12px" },
  patientFieldFull: { gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 },
  patientTextarea: { width: "100%", minHeight: "86px", resize: "vertical", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "10px 12px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a", fontFamily: "inherit" },
  patientHelper: { color: "#64748b", fontSize: "12px" },

  /* ── Patient dropdown ────────────────────── */
  patientLabelRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
  btnNewPatient: { display: "inline-flex", alignItems: "center", gap: "4px", height: "28px", borderRadius: "8px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", padding: "0 10px", cursor: "pointer", fontWeight: "600", fontSize: "12px" },
  patientDrop: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, border: "1px solid #f1f5f9", borderRadius: "12px", background: "#fff", maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "0 12px 32px rgba(15,23,42,0.1)", zIndex: 2000 },
  patientOpt: { border: "none", borderBottom: "1px solid #f8fafc", background: "#fff", padding: "10px 14px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: "2px", width: "100%", transition: "background 0.1s" },
  patientOptActive: { background: "#eff6ff" },
  patientOptNome: { fontSize: "14px", fontWeight: "600", color: "#0f172a" },
  patientOptTel: { fontSize: "12px", color: "#94a3b8" },
  patientEmpty: { padding: "14px", color: "#94a3b8", fontSize: "13px" },

  /* ── Confirm delete ──────────────────────── */
  confirmTitle: { margin: "12px 0 0", fontSize: "18px", fontWeight: "700", color: "#0f172a" },
  confirmText: { margin: "6px 0 0", color: "#94a3b8", fontSize: "14px", lineHeight: 1.5 },

  /* ── Dropdown ────────────────────────────── */
  dropWrap: { position: "relative", width: "100%" },
  dropTrigger: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", border: "1px solid #e2e8f0", background: "#fff", borderRadius: "10px", cursor: "pointer", boxSizing: "border-box", fontSize: "14px", color: "#0f172a", height: "40px", padding: "0 12px" },
  dropTriggerDisabled: { cursor: "not-allowed", opacity: 0.6, background: "#fafbfc" },
  dropText: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  dropArrow: { display: "flex", alignItems: "center", color: "#94a3b8", transition: "transform 0.2s ease", flexShrink: 0 },
  dropArrowOpen: { transform: "rotate(180deg)" },
  dropMenu: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, border: "1px solid #f1f5f9", borderRadius: "12px", background: "#fff", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "0 12px 32px rgba(15,23,42,0.1)", zIndex: 2000 },
  dropOption: { border: "none", borderBottom: "1px solid #f8fafc", background: "#fff", padding: "10px 14px", textAlign: "left", cursor: "pointer", width: "100%", fontSize: "14px", color: "#0f172a", fontWeight: "400", transition: "background 0.1s" },
  dropOptionLast: { borderBottom: "none" },
  dropOptionActive: { background: "#eff6ff", color: "#2563eb", fontWeight: "600" },
  dropOptionDisabled: { color: "#d1d5db", background: "#fafbfc", cursor: "not-allowed" },
  dropEmpty: { padding: "14px", color: "#94a3b8", fontSize: "13px" },
};

export default Agenda;
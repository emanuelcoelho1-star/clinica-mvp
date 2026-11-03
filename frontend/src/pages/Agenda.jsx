import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../api";

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════════════ */
function gerarHorarios(abertura, fechamento) {
  const inicio = obterMinutos(abertura);
  const fim = obterMinutos(fechamento);
  if (!abertura || !fechamento || fim <= inicio) return [];
  const lista = [];
  for (let minuto = inicio; minuto + 30 <= fim; minuto += 30) {
    lista.push(`${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")}`);
  }
  return lista;
}

const nomesDias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const nomesMeses = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const statusOptions = [
  { value: "agendado",   label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "concluido",  label: "Concluído" },
  { value: "cancelado",  label: "Cancelado" },
];

const STATUS_STYLE = {
  agendado:   { bg: "#eff6ff", color: "#1d4ed8", dot: "#60a5fa", border: "#bfdbfe" },
  confirmado: { bg: "#f0fdf4", color: "#15803d", dot: "#4ade80", border: "#bbf7d0" },
  concluido:  { bg: "#faf5ff", color: "#7c3aed", dot: "#a78bfa", border: "#ddd6fe" },
  cancelado:  { bg: "#fef2f2", color: "#dc2626", dot: "#f87171", border: "#fecaca" },
};

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
function formatarTelefoneBR(valor) {
  const original = String(valor || "").trim();
  let numeros = original.replace(/\D/g, "");
  if (numeros.startsWith("55") && (numeros.length === 12 || numeros.length === 13)) {
    numeros = numeros.slice(2);
  }
  if (numeros.length === 11) return numeros.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (numeros.length === 10) return numeros.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return original;
}

function formatarDataISO}

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
  return {
    id: c.id, data: c.data, inicio: c.horario, duracao: Number(c.duracao) || 30, fim: calcularFim(c.horario, Number(c.duracao) || 30),
    paciente: c.paciente_nome || c.paciente || c.nome_paciente || "Paciente",
    procedimento: c.procedimento || "Consulta",
    dentista: c.dentista || c.profissional || c.nome_profissional || c.responsavel_tecnico || "Não informado",
    telefone: c.paciente_telefone || c.telefone || "", fotoPaciente: c.paciente_foto || c.foto_url || "", logoClinica: c.logo_url || "",
    status: c.status || "agendado", paciente_id: c.paciente_id,
  };
}
function obterMinutos(horario) {
  if (!horario || !horario.includes(":")) return 0;
  const [h, m] = horario.split(":").map(Number); return h*60+m;
}
function obterLabelStatus(status) { return statusOptions.find((o) => o.value === status)?.label || "Agendado"; }

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
};

/* ═══════════════════════════════════════════════════════════
   CUSTOM DROPDOWN
   ═══════════════════════════════════════════════════════════ */
function CustomDropdown({ value, options, onChange, placeholder = "Selecione", disabled = false, triggerStyle = {}, menuStyle = {}, maxHeight = "220px" }) {
  const [aberto, setAberto] = useState(false);
  const [abrirParaCima, setAbrirParaCima] = useState(false);
  const ref = useRef(null);
  const sel = options.find((o) => o.value === value);

  function alternarDropdown() {
    if (disabled) return;
    if (!aberto) {
      const gatilho = ref.current?.getBoundingClientRect();
      if (gatilho) {
        const alturaMaxima = Number.parseInt(maxHeight, 10) || 220;
        const alturaEstimada = Math.min(alturaMaxima, options.length * 42 + 2);
        const espacoAbaixo = window.innerHeight - gatilho.bottom - 12;
        const espacoAcima = gatilho.top - 12;
        setAbrirParaCima(espacoAbaixo < alturaEstimada && espacoAcima > espacoAbaixo);
      } else {
        setAbrirParaCima(false);
      }
    }
    setAberto((p) => !p);
  }

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div style={S.dropWrap} ref={ref}>
      <button type="button" onClick={alternarDropdown} disabled={disabled}
        style={{ ...S.dropTrigger, ...(disabled ? S.dropTriggerDisabled : {}), ...triggerStyle }}>
        <span style={S.dropText}>{sel?.label || placeholder}</span>
        <span style={{ ...S.dropArrow, ...(aberto ? S.dropArrowOpen : {}) }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </span>
      </button>
      {aberto && (
        <div style={{ ...S.dropMenu, maxHeight, ...(abrirParaCima ? { top: "auto", bottom: "calc(100% + 6px)" } : {}), ...menuStyle }}>
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
  const navigate = useNavigate();
  const [filtroProfissional, setFiltroProfissional] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [mostrarGerenciador, setMostrarGerenciador] = useState(false);
  const [modalFuncionamentoAberto, setModalFuncionamentoAberto] = useState(false);
  const [salvandoFuncionamento, setSalvandoFuncionamento] = useState(false);
  const [erroFuncionamento, setErroFuncionamento] = useState("");
  const [funcionamento, setFuncionamento] = useState({ dias: [1,2,3,4,5,6], abertura: "08:00", fechamento: "18:30" });
  const [buscaGerenciador, setBuscaGerenciador] = useState("");
  const [statusGerenciador, setStatusGerenciador] = useState("todos");
  const [inicioSemana, setInicioSemana] = useState(obterInicioAgenda(new Date()));
  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [consultaPreview, setConsultaPreview] = useState(null);
  const [consultaPreviewPos, setConsultaPreviewPos] = useState({ top: 16, left: 16 });
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
  const [formData, setFormData] = useState({
    paciente_id: "", data: formatarDataISO(new Date()), horario: "08:00", duracao: 30, procedimento: "", status: "agendado",
  });
  const patientSearchRef = useRef(null);

  useEffect(() => { const i = setInterval(() => setAgora(new Date()), 30000); return () => clearInterval(i); }, []);
  useEffect(() => {
    function h(e) { if (patientSearchRef.current && !patientSearchRef.current.contains(e.target)) setMostrarSugestoesPaciente(false); }
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  const horarios = useMemo(
    () => gerarHorarios(funcionamento.abertura, funcionamento.fechamento),
    [funcionamento.abertura, funcionamento.fechamento]
  );

  const diasSemana = useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => adicionarDias(inicioSemana, i))
      .filter((d) => funcionamento.dias.includes(d.getDay()))
      .map((d) => ({ data: d, label: nomesDias[d.getDay()], numero: String(d.getDate()).padStart(2,"0"), iso: formatarDataISO(d) })),
    [inicioSemana, funcionamento.dias]
  );

  const hojeIso = formatarDataISO(agora);
  useEffect(() => { carregarDadosIniciais(); carregarFuncionamento(); }, []);
  async function carregarDadosIniciais() { await Promise.all([carregarConsultas(), carregarPacientes()]); }


  async function carregarFuncionamento() {
    try {
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/consultas/horarios-funcionamento`, { headers: { Authorization: tk || "" } });
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d && Array.isArray(d.dias)) setFuncionamento({ dias: d.dias, abertura: d.abertura || "08:00", fechamento: d.fechamento || "18:30" });
    } catch { setErroFuncionamento("Não foi possível carregar as configurações."); }
  }
  async function salvarFuncionamento(e) {
    e.preventDefault();
    if (!funcionamento.dias.length) { setErroFuncionamento("Selecione pelo menos um dia de funcionamento."); return; }
    if (funcionamento.abertura >= funcionamento.fechamento) { setErroFuncionamento("O horário de fechamento deve ser posterior à abertura."); return; }
    try {
      setSalvandoFuncionamento(true); setErroFuncionamento("");
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/consultas/horarios-funcionamento`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: tk || "" },
        body: JSON.stringify(funcionamento),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.erro || "Não foi possível salvar as configurações.");
      setModalFuncionamentoAberto(false);
    } catch (err) { setErroFuncionamento(err.message || "Não foi possível salvar as configurações."); }
    finally { setSalvandoFuncionamento(false); }
  }

  async function carregarConsultas() {
    try { setCarregando(true); setErro(""); const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/consultas`, { headers: { Authorization: tk || "" } });
      if (!r.ok) throw new Error(); const d = await r.json();
      setConsultas(Array.isArray(d) ? d.map(normalizarConsulta) : []);
    } catch { setErro("Erro ao carregar consultas."); setConsultas([]); }
    finally { setCarregando(false); }
  }
  async function carregarPacientes() {
    try { const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/pacientes?limit=100`, { headers: { Authorization: tk || "" } });
      if (!r.ok) throw new Error();
      const d = await r.json();
      // A API de pacientes usa paginação e retorna { dados, paginacao }.
      // Também aceitamos os formatos antigos para manter compatibilidade.
      const lista = Array.isArray(d) ? d
        : Array.isArray(d.dados) ? d.dados
        : Array.isArray(d.pacientes) ? d.pacientes
        : [];
      setPacientes(lista);
    } catch { setPacientes([]); }
  }

  const profissionaisOptions = useMemo(() => {
    const l = consultas.map((i) => i.dentista).filter(Boolean);
    return ["Todos", ...new Set(l)].map((p) => ({ value: p, label: p }));
  }, [consultas]);

  const pacientesFiltrados = useMemo(() => {
    const t = buscaPaciente.toLowerCase().trim(); if (!t) return [];
    return pacientes.filter((p) => {
      const n = String(p.nome || p.nome_paciente || "").toLowerCase();
      const tel = String(p.telefone || "").toLowerCase();
      return n.includes(t) || tel.includes(t);
    });
  }, [pacientes, buscaPaciente]);

  const agendamentosFiltrados = useMemo(() => {
    return consultas.filter((item) => {
      const pp = filtroProfissional === "Todos" || item.dentista === filtroProfissional;
      const t = busca.toLowerCase();
      const pb = item.paciente.toLowerCase().includes(t) || item.procedimento.toLowerCase().includes(t) || item.dentista.toLowerCase().includes(t);
      return pp && pb && diasSemana.map((d) => d.iso).includes(item.data);
    });
  }, [consultas, filtroProfissional, busca, diasSemana]);

  const weekStats = useMemo(() => {
    // Os indicadores mostram o total geral de consultas cadastradas, não apenas a semana visível.
    const s = { total: consultas.length, agendado: 0, confirmado: 0, concluido: 0, cancelado: 0 };
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

  function voltarSemana() { setInicioSemana((p) => adicionarDias(p, -7)); }
  function avancarSemana() { setInicioSemana((p) => adicionarDias(p, 7)); }
  function irParaHoje() { setInicioSemana(obterInicioAgenda(new Date())); }
  function obterAgendamento(iso, h) { return agendamentosFiltrados.find((i) => i.data === iso && i.inicio === h); }
  function obterAgendamentoSobreposto(iso, h) { const minuto = obterMinutos(h); return agendamentosFiltrados.find((i) => i.data === iso && i.status !== "cancelado" && minuto > obterMinutos(i.inicio) && minuto < obterMinutos(i.fim)); }

  function horarioPassado(iso, h) {
    if (!iso || !h) return false;
    const [a, m, d] = iso.split("-").map(Number); const [hr, mn] = h.split(":").map(Number);
    return new Date(a, m-1, d, hr, mn).getTime() + 30*60*1000 <= agora.getTime();
  }

  function ajustarHorario(novaData) {
    const diaPermitido = funcionamento.dias.includes(new Date(`${novaData}T12:00:00`).getDay());
    const disp = diaPermitido ? horarios.filter((h) => !horarioPassado(novaData, h)) : [];
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
      duracao: 30,
      procedimento: "Retorno",
      status: "agendado",
    }));
    setRetornoPersonalizado(false);
    setErroFormulario("");
  }

  function abrirModal(ag = null, dataPad = null, horPad = "08:00") {
    setConsultaPreview(null);
    setErroFormulario(""); setConfirmarExclusaoAberto(false); setMostrarSugestoesPaciente(false);
    if (ag) {
      setAgendamentoEditando(ag);
      setRetornoPersonalizado(false);
      setFormData({ paciente_id: String(ag.paciente_id||""), data: ag.data||formatarDataISO(new Date()), horario: ag.inicio||"08:00", duracao: Number(ag.duracao)||30, procedimento: ag.procedimento||"", status: ag.status||"agendado" });
      setBuscaPaciente(ag.paciente||"");
    } else {
      const di = dataPad || diasSemana[0]?.iso || formatarDataISO(new Date());
      const diaPermitido = funcionamento.dias.includes(new Date(`${di}T12:00:00`).getDay());
      let hi = diaPermitido && horarios.includes(horPad) && !horarioPassado(di, horPad)
        ? horPad
        : (diaPermitido ? horarios.find((h) => !horarioPassado(di, h)) || "" : "");
      setAgendamentoEditando(null);
      setRetornoPersonalizado(false);
      setFormData({ paciente_id: "", data: di, horario: hi, duracao: 30, procedimento: "", status: "agendado" });
      setBuscaPaciente("");
    }
    setModalAberto(true);
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

  function confirmarConsultaWhatsApp() {
    if (!consultaPreview?.telefone) {
      alert("Este paciente não possui telefone cadastrado.");
      return;
    }
    let telefone = String(consultaPreview.telefone).replace(/\\D/g, "");
    if (telefone.length === 10 || telefone.length === 11) telefone = "55" + telefone;
    if (telefone.length < 12 || telefone.length > 13 || !telefone.startsWith("55")) {
      alert("O telefone cadastrado não parece ser um número válido para WhatsApp.");
      return;
    }
    const dataConsulta = new Date(consultaPreview.data + "T12:00:00").toLocaleDateString("pt-BR");
    const mensagem = `Olá, ${consultaPreview.paciente}! Tudo bem? Gostaríamos de confirmar sua consulta na data ${dataConsulta}, às ${consultaPreview.inicio}. Podemos confirmar sua presença?`;
    window.open(`https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener,noreferrer");
  }

  async function alterarStatusRapido(novoStatus) {
    if (!consultaPreview?.id || !novoStatus || novoStatus === consultaPreview.status) return;
    try {
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/consultas/${consultaPreview.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: tk || "" },
        body: JSON.stringify({
          paciente_id: Number(consultaPreview.paciente_id),
          data: consultaPreview.data,
          horario: consultaPreview.inicio,
          duracao: Number(consultaPreview.duracao) || 30,
          procedimento: consultaPreview.procedimento,
          status: novoStatus,
        }),
      });
      const resposta = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(resposta.erro || "Não foi possível alterar o status.");
      setConsultaPreview((atual) => atual ? { ...atual, status: novoStatus } : atual);
      await carregarConsultas();
    } catch (err) {
      alert(err.message || "Não foi possível alterar o status.");
    }
  }

  async function handleSalvar(e) {
    e.preventDefault();
    if (!formData.paciente_id || !formData.data || !formData.horario || !formData.duracao) { setErroFormulario("Preencha paciente, data, horário e duração."); return; }
    const diaSelecionado = new Date(`${formData.data}T12:00:00`).getDay();
    if (!funcionamento.dias.includes(diaSelecionado)) { setErroFormulario("A clínica não funciona no dia selecionado."); return; }
    if (!horarios.includes(formData.horario)) { setErroFormulario("Selecione um horário dentro do funcionamento da clínica."); return; }
    if (obterMinutos(formData.horario) + Number(formData.duracao) > obterMinutos(funcionamento.fechamento)) { setErroFormulario("A duração escolhida ultrapassa o horário de funcionamento da clínica."); return; }
    if (!agendamentoEditando && horarioPassado(formData.data, formData.horario)) { setErroFormulario("Não é possível agendar em horários passados."); return; }

    const conflito = consultas.find((item) =>
      item.data === formData.data &&
      obterMinutos(formData.horario) < obterMinutos(item.fim) &&
      obterMinutos(formData.horario) + Number(formData.duracao) > obterMinutos(item.inicio) &&
      item.status !== "cancelado" &&
      String(item.id) !== String(agendamentoEditando?.id || "") &&
      formData.status !== "cancelado"
    );
    if (conflito) {
      setErroFormulario(`Este horário já está ocupado por ${conflito.paciente}. Escolha outro horário.`);
      return;
    }

    try {
      setSalvando(true);
      setErroFormulario("");
      const tk = localStorage.getItem("token");
      const ed = Boolean(agendamentoEditando);
      const r = await fetch(ed ? `${API_URL}/consultas/${agendamentoEditando.id}` : `${API_URL}/consultas`, {
        method: ed ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: tk || "" },
        body: JSON.stringify({ paciente_id: Number(formData.paciente_id), data: formData.data, horario: formData.horario, duracao: Number(formData.duracao), procedimento: formData.procedimento, status: formData.status }),
      });
      if (!r.ok) {
        const resposta = await r.json().catch(() => ({}));
        throw new Error(resposta.erro || "Não foi possível salvar o agendamento.");
      }
      await carregarConsultas();
      fecharModal();
    } catch (err) {
      setErroFormulario(err.message || "Não foi possível salvar o agendamento.");
    } finally {
      setSalvando(false);
    }
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
  const pMin = horarios.length ? obterMinutos(horarios[0]) : 0;
  const uMin = horarios.length ? obterMinutos(horarios[horarios.length-1])+30 : 0;
  const agoraNaAgenda = horarios.length > 0 && minAgora >= pMin && minAgora <= uMin;
  function posLinha(h) { const i = obterMinutos(h); if (minAgora < i || minAgora >= i+30) return null; return ((minAgora-i)/30)*100; }
  const horariosOpts = horarios.map((h) => ({ value: h, label: h, disabled: horarioPassado(formData.data, h) && !agendamentoEditando }));

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
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" style={S.btnRefresh} onClick={() => { setErroFuncionamento(""); setModalFuncionamentoAberto(true); }}>
            <span>⚙</span><span>Configurações</span>
          </button>
          <button style={S.btnPrimary} onClick={() => abrirModal()}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(37,99,235,0.2)"; }}>
            {Icons.plus}<span>Novo agendamento</span>
          </button>
        </div>
      </div>


      {modalFuncionamentoAberto && (
        <div style={{ ...S.overlay, zIndex: 1300 }} onClick={() => !salvandoFuncionamento && setModalFuncionamentoAberto(false)}>
          <div style={{ ...S.modal, maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div><h2 style={S.modalTitle}>Funcionamento da clínica</h2><p style={S.modalSub}>Defina os dias e horários em que a clínica recebe pacientes.</p></div>
              <button type="button" style={S.closeBtn} onClick={() => setModalFuncionamentoAberto(false)} aria-label="Fechar">{Icons.close}</button>
            </div>
            <form onSubmit={salvarFuncionamento} style={S.form}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Dias de funcionamento</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "8px" }}>
                  {[{id:1,n:"Segunda"},{id:2,n:"Terça"},{id:3,n:"Quarta"},{id:4,n:"Quinta"},{id:5,n:"Sexta"},{id:6,n:"Sábado"},{id:0,n:"Domingo"}].map((dia) => {
                    const ativo = funcionamento.dias.includes(dia.id);
                    return <button key={dia.id} type="button" onClick={() => setFuncionamento((p) => ({ ...p, dias: ativo ? p.dias.filter((d) => d !== dia.id) : [...p.dias, dia.id] }))}
                      style={{ padding: "10px 8px", borderRadius: "9px", border: ativo ? "1px solid #2563eb" : "1px solid #e2e8f0", background: ativo ? "#eff6ff" : "#fff", color: ativo ? "#1d4ed8" : "#475569", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>{dia.n}</button>;
                  })}
                </div>
              </div>
              <div style={S.formGrid}>
                <div style={S.fieldGroup}><label style={S.label}>Horário de abertura</label><input required type="time" value={funcionamento.abertura} onChange={(e) => setFuncionamento((p) => ({ ...p, abertura: e.target.value }))} style={S.input} /></div>
                <div style={S.fieldGroup}><label style={S.label}>Horário de fechamento</label><input required type="time" value={funcionamento.fechamento} onChange={(e) => setFuncionamento((p) => ({ ...p, fechamento: e.target.value }))} style={S.input} /></div>
              </div>
              {erroFuncionamento && <div style={S.formError}>{erroFuncionamento}</div>}
              <div style={S.formActions}><div style={{ flex: 1 }} /><button type="button" style={S.btnSecondary} onClick={() => setModalFuncionamentoAberto(false)} disabled={salvandoFuncionamento}>Cancelar</button><button type="submit" style={S.btnPrimary} disabled={salvandoFuncionamento}>{salvandoFuncionamento ? "Salvando..." : "Salvar configurações"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ── Stats pills ───────────────────────────────────── */}
      <div style={S.statsRow}>
        {[
          { label: "Agendados", value: weekStats.agendado, ...STATUS_STYLE.agendado },
          { label: "Confirmados", value: weekStats.confirmado, ...STATUS_STYLE.confirmado },
          { label: "Concluídos", value: weekStats.concluido, ...STATUS_STYLE.concluido },
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
          <span style={S.periodTitle}>{tituloPeriodo}</span>
        </div>

        <div style={S.filters}>
          <div style={{ minWidth: "150px", position: "relative" }}>
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
          <div style={{ ...S.calHead, gridTemplateColumns: `68px repeat(${Math.max(diasSemana.length, 1)}, minmax(0, 1fr))` }}>
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

          {/* Body */}
          <div style={S.calBody}>
            {diasSemana.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>Não há dias de funcionamento configurados para esta semana.</div>
            ) : horarios.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>Configure um intervalo de pelo menos 30 minutos para exibir os horários.</div>
            ) : horarios.map((hora) => (
              <div key={hora} style={{ ...S.calRow, gridTemplateColumns: `68px repeat(${Math.max(diasSemana.length, 1)}, minmax(0, 1fr))` }}>
                <div style={S.timeCell}><span>{hora}</span></div>
                {diasSemana.map((dia) => {
                  const hoje = dia.iso === hojeIso;
                  const ag = obterAgendamento(dia.iso, hora);
                  const agSobreposto = obterAgendamentoSobreposto(dia.iso, hora);
                  const bloq = horarioPassado(dia.iso, hora);
                  const pl = hoje && agoraNaAgenda ? posLinha(hora) : null;
                  const stCfg = ag ? (STATUS_STYLE[ag.status] || STATUS_STYLE.agendado) : null;

                  return (
                    <div key={`${dia.iso}-${hora}`}
                      style={{ ...S.dayCell, ...(hoje ? S.dayCellToday : {}), ...(bloq && !ag ? S.dayCellBlocked : {}) }}
                      onClick={() => { if (!ag && !bloq) abrirModal(null, dia.iso, hora); }}>

                      {ag ? (
                        <button type="button" onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); const largura = 392; const altura = 420; const left = rect.right + largura + 12 <= window.innerWidth ? rect.right + 8 : Math.max(8, rect.left - largura - 8); const top = Math.min(Math.max(8, rect.top), Math.max(8, window.innerHeight - altura - 8)); setConsultaPreviewPos({ top, left }); setConsultaPreview(ag); }}
                          style={{ ...S.eventCard, ...(Number(ag.duracao) > 30 ? { position: "absolute", top: "4px", left: "4px", right: "4px", width: "auto", zIndex: 12, overflow: "hidden", height: `${(Number(ag.duracao) / 30) * 68 - 8}px` } : {}), background: stCfg.bg, borderColor: stCfg.border, ...(agendamentoEditando?.id === ag.id ? S.eventActive : {}) }}>
                          <div style={S.eventTime}>{ag.inicio} – {ag.fim}</div>
                          <div style={S.eventName}>{ag.paciente}</div>
                          <div style={S.eventProc}>{ag.procedimento}</div>
                          <span style={{ ...S.eventBadge, background: stCfg.bg, color: stCfg.color, borderColor: stCfg.border }}>
                            <span style={{ ...S.eventDot, background: stCfg.dot }} />
                            {obterLabelStatus(ag.status)}
                          </span>
                        </button>
                      ) : agSobreposto ? (
                        <div style={{ width: "100%", minHeight: "58px", pointerEvents: "none" }} />
                      ) : bloq ? (
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


      {/* Prévia do agendamento: mantém o design original em formato flutuante */}
      {consultaPreview && (
        <div onClick={() => setConsultaPreview(null)} style={{ position: "fixed", inset: 0, zIndex: 1500, background: "transparent" }}>
          <section onClick={(e) => e.stopPropagation()} style={{ ...S.modal, position: "fixed", top: consultaPreviewPos.top, left: consultaPreviewPos.left, width: "min(480px, calc(100vw - 16px))", maxWidth: "480px", overflow: "visible", margin: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "4px 0 20px", borderBottom: "1px solid #e2e8f0" }}>
              {(consultaPreview.fotoPaciente || consultaPreview.logoClinica) ? (
                <img src={consultaPreview.fotoPaciente || consultaPreview.logoClinica} alt={consultaPreview.fotoPaciente ? "Foto do paciente" : "Logo da clínica"}
                  style={{ width: "76px", height: "76px", borderRadius: "50%", objectFit: "cover", border: "1px solid #e2e8f0", background: "#f8fafc", flexShrink: 0 }} />
              ) : (
                <div style={{ width: "76px", height: "76px", borderRadius: "50%", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "700", flexShrink: 0 }}>
                  {String(consultaPreview.paciente || "P").trim().charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <button type="button" onClick={() => { if (consultaPreview.paciente_id) { setConsultaPreview(null); navigate(`/pacientes/${consultaPreview.paciente_id}`); } }} disabled={!consultaPreview.paciente_id} title={consultaPreview.paciente_id ? "Abrir prontuário do paciente" : "Paciente sem cadastro vinculado"} style={{ margin: 0, padding: 0, border: 0, background: "transparent", color: "var(--text-primary, #0f172a)", fontSize: "18px", fontWeight: "700", textAlign: "left", cursor: consultaPreview.paciente_id ? "pointer" : "default", textDecoration: "none" }}>{consultaPreview.paciente}</button>
                <p style={{ margin: "6px 0 0", color: "var(--text-secondary, #64748b)", fontSize: "13px" }}>{formatarTelefoneBR(consultaPreview.telefone) || "Telefone não informado"}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button type="button" style={S.closeBtn} onClick={() => abrirModal(consultaPreview)} aria-label="Editar agendamento" title="Editar agendamento">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m16 4 4 4"/><path d="M4 20l4.5-1 11-11a2.12 2.12 0 0 0-3-3l-11 11L4 20z"/>
                  </svg>
                </button>
                <button type="button" style={S.closeBtn} onClick={() => setConsultaPreview(null)} aria-label="Fechar">{Icons.close}</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", padding: "20px 0" }}>
              <div style={S.fieldGroup}>
                <div style={S.label}>Data da consulta</div>
                <div style={{ marginTop: "7px", color: "var(--text-primary, #0f172a)", fontSize: "14px", fontWeight: "600" }}>
                  {new Date(consultaPreview.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
              <div style={S.fieldGroup}>
                <div style={S.label}>Horário</div>
                <div style={{ marginTop: "7px", color: "var(--text-primary, #0f172a)", fontSize: "14px", fontWeight: "600" }}>{consultaPreview.inicio} – {consultaPreview.fim}</div>
              </div>
              <div style={S.fieldGroup}>
                <div style={S.label}>Dentista responsável</div>
                <div style={{ marginTop: "7px", color: "var(--text-primary, #0f172a)", fontSize: "14px", fontWeight: "600" }}>{consultaPreview.dentista}</div>
              </div>
              <div style={S.fieldGroup}>
                <div style={S.label}>Procedimento</div>
                <div style={{ marginTop: "6px", color: "var(--text-secondary, #334155)", fontSize: "14px" }}>{consultaPreview.procedimento}</div>
              </div>
              <div style={{ ...S.fieldGroup, gridColumn: "1 / -1" }}>
                <button type="button" onClick={confirmarConsultaWhatsApp}
                  style={{ width: "100%", minHeight: "40px", margin: "0 0 12px", padding: "10px 14px", border: "1px solid #16a34a", borderRadius: "10px", background: "#16a34a", color: "#fff", fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.5 0 .15 5.35.15 11.93c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.64a11.9 11.9 0 0 0 5.8 1.48h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.19-1.24-6.19-3.49-8.43ZM12.08 21.8a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.97.99-3.63-.24-.37a9.85 9.85 0 0 1-1.51-5.25c0-5.45 4.44-9.89 9.9-9.89a9.82 9.82 0 0 1 7 2.9 9.82 9.82 0 0 1 2.9 7c0 5.45-4.45 9.86-9.92 9.86Zm5.43-7.4c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.5 1.69.64.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/>
                  </svg>
                  Confirmar consulta pelo WhatsApp
                </button>
                <div style={S.label}>Status</div>
                <CustomDropdown
                  value={consultaPreview.status}
                  options={statusOptions}
                  onChange={alterarStatusRapido}
                  placeholder="Selecione"
                  triggerStyle={S.input}
                  menuStyle={{ zIndex: 3000 }}
                />
              </div>
            </div>
          </section>
        </div>
      )}
      {/* ── Modal Agendamento ─────────────────────────────── */}
      {modalAberto && (
        <div style={S.overlay} onClick={fecharModal}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
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

              <div style={S.formGrid}>
                <div style={S.fieldGroup}><label style={S.label}>Data do atendimento / retorno</label>
                  <input type="date" name="data" min={formatarDataISO(new Date())} value={formData.data} onChange={handleInput} style={S.input} />
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
              </div>

              <div style={S.formGrid}>
                <div style={S.fieldGroup}><label style={S.label}>Horário</label>
                  <CustomDropdown value={formData.horario} options={horariosOpts}
                    onChange={(h) => setFormData((p) => ({ ...p, horario: h }))}
                    placeholder="Selecione" triggerStyle={S.input} menuStyle={{ zIndex: 3000 }} maxHeight="260px" /></div>
                <div style={S.fieldGroup}><label style={S.label}>Duração do atendimento</label>
                  <CustomDropdown value={String(formData.duracao)} options={[30,60,90,120,150,180].map((min) => ({ value: String(min), label: min < 60 ? `${min} minutos` : `${min/60} hora${min > 60 ? "s" : ""}` }))}
                    onChange={(v) => setFormData((p) => ({ ...p, duracao: Number(v) }))}
                    placeholder="Selecione a duração" triggerStyle={S.input} menuStyle={{ zIndex: 3000 }} /></div>
              </div>

              <div style={S.fieldGroup}><label style={S.label}>Procedimento</label>
                <input type="text" name="procedimento" placeholder="Ex: Avaliação, limpeza, retorno..."
                  value={formData.procedimento} onChange={handleInput} style={S.input} /></div>

              <div style={S.fieldGroup}><label style={S.label}>Status</label>
                <CustomDropdown value={formData.status} options={statusOptions}
                  onChange={(v) => setFormData((p) => ({ ...p, status: v }))}
                  placeholder="Selecione" triggerStyle={S.input} menuStyle={{ zIndex: 3000 }} /></div>

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
          <div style={{ ...S.modal, maxWidth: "820px", maxHeight: "calc(100vh - 40px)", overflowY: "auto", margin: "auto" }} onClick={(e) => e.stopPropagation()}>
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
          <div style={{ ...S.modal, maxWidth: "400px", textAlign: "center", padding: "32px" }}>
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
  timeColHead: { padding: "14px 8px", borderRight: "1px solid #f1f5f9" },
  dayHead: { padding: "12px 6px", display: "flex", flexDirection: "column", gap: "2px", alignItems: "center", justifyContent: "center", borderRight: "1px solid #f1f5f9", position: "relative" },
  dayHeadToday: { background: "#fafcff" },
  dayLabel: { fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  dayNum: { fontSize: "18px", fontWeight: "700", color: "#0f172a", lineHeight: 1.2 },
  dayNumToday: { color: "#2563eb" },
  todayDot: { width: "5px", height: "5px", borderRadius: "50%", background: "#2563eb" },

  calBody: { display: "flex", flexDirection: "column" },
  calRow: { display: "grid", gridTemplateColumns: "68px repeat(6, 1fr)", minHeight: "68px", borderBottom: "1px solid #f8fafc" },
  timeCell: { padding: "8px 8px", borderRight: "1px solid #f1f5f9", fontSize: "11px", fontWeight: "600", color: "#c1c9d4", background: "#fafbfc", display: "flex", alignItems: "flex-start", paddingTop: "10px" },
  dayCell: { padding: "4px", borderRight: "1px solid #f8fafc", position: "relative", cursor: "pointer", background: "#fff", display: "flex", alignItems: "stretch", minHeight: "68px" },
  dayCellToday: { background: "#fafcff" },
  dayCellBlocked: { background: "#fafbfc", cursor: "not-allowed" },

  /* ── Slots ───────────────────────────────── */
  slotEmpty: { width: "100%", minHeight: "58px", border: "1px dashed #e8eef5", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease" },
  slotPlus: { color: "#d1d5db", fontSize: "18px", fontWeight: "300", transition: "color 0.15s" },
  slotBlocked: { width: "100%", minHeight: "58px", borderRadius: "10px", background: "#f8fafc", opacity: 0.4 },

  /* ── Event Card ──────────────────────────── */
  eventCard: { width: "100%", borderRadius: "10px", border: "1px solid", padding: "7px 9px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: "2px", position: "relative", zIndex: 10, transition: "all 0.15s ease" },
  eventActive: { outline: "2px solid #2563eb", outlineOffset: "1px" },
  eventTime: { fontSize: "10px", fontWeight: "600", color: "#94a3b8" },
  eventName: { fontSize: "12px", fontWeight: "700", color: "#0f172a", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventProc: { fontSize: "11px", color: "#64748b", fontWeight: "400", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventBadge: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 7px", borderRadius: "6px", fontSize: "10px", fontWeight: "600", alignSelf: "flex-start", border: "1px solid" },
  eventDot: { width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0 },

  /* ── Now line ────────────────────────────── */
  nowLine: { position: "absolute", left: 0, right: 0, height: "2px", background: "#ef4444", zIndex: 30, pointerEvents: "none" },
  nowDot: { position: "absolute", left: "-1px", top: "-3px", width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", zIndex: 31 },

  /* ── Modal ───────────────────────────────── */
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 999 },
  modal: { width: "100%", maxWidth: "520px", background: "#fff", borderRadius: "16px", padding: "28px", boxShadow: "0 24px 64px rgba(15,23,42,0.18)", overflow: "visible" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "22px" },
  modalTitle: { margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.02em" },
  modalSub: { margin: "4px 0 0", color: "#94a3b8", fontSize: "14px", fontWeight: "400" },
  closeBtn: { border: "1px solid #f1f5f9", background: "#fafbfc", width: "34px", height: "34px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexShrink: 0, transition: "all 0.15s ease" },

  /* ── Form ─────────────────────────────────── */
  form: { display: "flex", flexDirection: "column", gap: "16px", overflow: "visible" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
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
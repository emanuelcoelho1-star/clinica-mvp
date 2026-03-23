import { useEffect, useMemo, useRef, useState } from "react";

const horarios = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30",
];

const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
  agendado:   { bg: "#eff6ff", color: "#1d4ed8", dot: "#60a5fa", cardBg: "#eff6ff", border: "#bfdbfe" },
  confirmado: { bg: "#f0fdf4", color: "#15803d", dot: "#4ade80", cardBg: "#f0fdf4", border: "#bbf7d0" },
  concluido:  { bg: "#f5f3ff", color: "#6d28d9", dot: "#a78bfa", cardBg: "#f5f3ff", border: "#ddd6fe" },
  cancelado:  { bg: "#fef2f2", color: "#dc2626", dot: "#f87171", cardBg: "#fef2f2", border: "#fecaca" },
};

// ---- Helpers ----
function zerarHora(data) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}
function obterInicioAgenda(data) { return zerarHora(data); }
function formatarDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}
function adicionarDias(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}
function calcularFim(horario, duracaoMinutos = 30) {
  if (!horario || !horario.includes(":")) return horario;
  const [hora, minuto] = horario.split(":").map(Number);
  const total = hora * 60 + minuto + duracaoMinutos;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function normalizarConsulta(consulta) {
  return {
    id: consulta.id,
    data: consulta.data,
    inicio: consulta.horario,
    fim: calcularFim(consulta.horario, 30),
    paciente: consulta.paciente_nome || consulta.paciente || consulta.nome_paciente || "Paciente",
    procedimento: consulta.procedimento || "Consulta",
    dentista: consulta.dentista || consulta.profissional || consulta.nome_profissional || "Profissional",
    status: consulta.status || "agendado",
    paciente_id: consulta.paciente_id,
  };
}
function obterMinutosDoHorario(horario) {
  if (!horario || !horario.includes(":")) return 0;
  const [hora, minuto] = horario.split(":").map(Number);
  return hora * 60 + minuto;
}
function obterLabelStatus(status) {
  return statusOptions.find((o) => o.value === status)?.label || "Agendado";
}

// ---- CustomDropdown ----
function CustomDropdown({ value, options, onChange, placeholder = "Selecione", disabled = false, triggerStyle = {}, menuStyle = {}, maxHeight = "220px" }) {
  const [aberto, setAberto] = useState(false);
  const wrapperRef = useRef(null);
  const opcaoSelecionada = options.find((item) => item.value === value);

  useEffect(() => {
    function handleClickFora(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setAberto(false);
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  return (
    <div style={S.dropWrap} ref={wrapperRef}>
      <button type="button" onClick={() => { if (!disabled) setAberto((p) => !p); }} disabled={disabled}
        style={{ ...S.dropTrigger, ...(disabled ? S.dropTriggerDisabled : {}), ...triggerStyle }}>
        <span style={S.dropText}>{opcaoSelecionada?.label || placeholder}</span>
        <span style={{ ...S.dropArrow, ...(aberto ? S.dropArrowOpen : {}) }}>▾</span>
      </button>
      {aberto && (
        <div style={{ ...S.dropMenu, maxHeight, ...menuStyle }}>
          {options.length === 0
            ? <div style={S.dropEmpty}>Nenhuma opção</div>
            : options.map((option, i) => (
              <button key={`${option.value}-${i}`} type="button" disabled={option.disabled}
                onClick={() => { if (!option.disabled) { onChange(option.value); setAberto(false); } }}
                style={{ ...S.dropOption, ...(i === options.length - 1 ? S.dropOptionLast : {}), ...(option.value === value ? S.dropOptionActive : {}), ...(option.disabled ? S.dropOptionDisabled : {}) }}>
                {option.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ---- Agenda ----
function Agenda() {
  const [filtroProfissional, setFiltroProfissional] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [inicioSemana, setInicioSemana] = useState(obterInicioAgenda(new Date()));
  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroFormulario, setErroFormulario] = useState("");
  const [agendamentoEditando, setAgendamentoEditando] = useState(null);
  const [confirmarExclusaoAberto, setConfirmarExclusaoAberto] = useState(false);
  const [agora, setAgora] = useState(new Date());
  const [buscaPaciente, setBuscaPaciente] = useState("");
  const [mostrarSugestoesPaciente, setMostrarSugestoesPaciente] = useState(false);
  const [modalPacienteAberto, setModalPacienteAberto] = useState(false);
  const [salvandoPaciente, setSalvandoPaciente] = useState(false);
  const [erroPaciente, setErroPaciente] = useState("");
  const [formPaciente, setFormPaciente] = useState({ nome: "", telefone: "", observacoes: "" });
  const [formData, setFormData] = useState({
    paciente_id: "", data: formatarDataISO(new Date()), horario: "08:00", procedimento: "", status: "agendado",
  });
  const patientSearchRef = useRef(null);

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    function handleClickFora(event) {
      if (patientSearchRef.current && !patientSearchRef.current.contains(event.target))
        setMostrarSugestoesPaciente(false);
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  const diasSemana = useMemo(() =>
    Array.from({ length: 6 }).map((_, i) => {
      const data = adicionarDias(inicioSemana, i);
      return { data, label: nomesDias[data.getDay()], numero: String(data.getDate()).padStart(2, "0"), iso: formatarDataISO(data) };
    }), [inicioSemana]);

  const hojeIso = formatarDataISO(agora);

  useEffect(() => { carregarDadosIniciais(); }, []);

  async function carregarDadosIniciais() { await Promise.all([carregarConsultas(), carregarPacientes()]); }

  async function carregarConsultas() {
    try {
      setCarregando(true); setErro("");
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/consultas", { headers: { Authorization: token || "" } });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setConsultas(Array.isArray(data) ? data.map(normalizarConsulta) : []);
    } catch { setErro("Erro ao carregar consultas do backend."); setConsultas([]); }
    finally { setCarregando(false); }
  }

  async function carregarPacientes() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/pacientes", { headers: { Authorization: token || "" } });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setPacientes(Array.isArray(data) ? data : Array.isArray(data.pacientes) ? data.pacientes : []);
    } catch { setPacientes([]); }
  }

  const profissionaisOptions = useMemo(() => {
    const lista = consultas.map((i) => i.dentista).filter(Boolean);
    return ["Todos", ...new Set(lista)].map((p) => ({ value: p, label: p }));
  }, [consultas]);

  const pacientesFiltrados = useMemo(() => {
    const termo = buscaPaciente.toLowerCase().trim();
    if (!termo) return [];
    return pacientes.filter((p) => {
      const nome = String(p.nome || p.nome_paciente || "").toLowerCase();
      const tel = String(p.telefone || "").toLowerCase();
      return nome.includes(termo) || tel.includes(termo);
    });
  }, [pacientes, buscaPaciente]);

  const agendamentosFiltrados = useMemo(() => {
    return consultas.filter((item) => {
      const passaProf = filtroProfissional === "Todos" || item.dentista === filtroProfissional;
      const termo = busca.toLowerCase();
      const passaBusca = item.paciente.toLowerCase().includes(termo) || item.procedimento.toLowerCase().includes(termo) || item.dentista.toLowerCase().includes(termo);
      return passaProf && passaBusca && diasSemana.map((d) => d.iso).includes(item.data);
    });
  }, [consultas, filtroProfissional, busca, diasSemana]);

  const tituloPeriodo = useMemo(() => {
    const p = diasSemana[0]?.data;
    const u = diasSemana[diasSemana.length - 1]?.data;
    if (!p || !u) return "";
    if (p.getMonth() === u.getMonth() && p.getFullYear() === u.getFullYear())
      return `${nomesMeses[p.getMonth()]} ${p.getFullYear()}`;
    return `${nomesMeses[p.getMonth()]} ${p.getFullYear()} — ${nomesMeses[u.getMonth()]} ${u.getFullYear()}`;
  }, [diasSemana]);

  function voltarSemana() { setInicioSemana((p) => adicionarDias(p, -6)); }
  function avancarSemana() { setInicioSemana((p) => adicionarDias(p, 6)); }
  function irParaHoje() { setInicioSemana(obterInicioAgenda(new Date())); }
  function obterAgendamento(dataIso, hora) { return agendamentosFiltrados.find((i) => i.data === dataIso && i.inicio === hora); }

  function horarioEstaNoPassado(dataIso, horario) {
    if (!dataIso || !horario) return false;
    const [ano, mes, dia] = dataIso.split("-").map(Number);
    const [hora, minuto] = horario.split(":").map(Number);
    return new Date(ano, mes - 1, dia, hora, minuto, 0, 0).getTime() + 30 * 60 * 1000 <= agora.getTime();
  }

  function ajustarHorarioFormularioSeNecessario(novaData) {
    const disponiveis = horarios.filter((h) => !horarioEstaNoPassado(novaData, h));
    setFormData((prev) => ({
      ...prev, data: novaData,
      horario: disponiveis.length === 0 ? "" : disponiveis.includes(prev.horario) ? prev.horario : disponiveis[0],
    }));
  }

  function abrirModal(agendamento = null, dataPadrao = null, horarioPadrao = "08:00") {
    setErroFormulario(""); setConfirmarExclusaoAberto(false); setMostrarSugestoesPaciente(false);
    if (agendamento) {
      setAgendamentoEditando(agendamento);
      setFormData({ paciente_id: String(agendamento.paciente_id || ""), data: agendamento.data || formatarDataISO(new Date()), horario: agendamento.inicio || "08:00", procedimento: agendamento.procedimento || "", status: agendamento.status || "agendado" });
      setBuscaPaciente(agendamento.paciente || "");
    } else {
      const dataInicial = dataPadrao || diasSemana[0]?.iso || formatarDataISO(new Date());
      let horarioInicial = horarioPadrao;
      if (horarioEstaNoPassado(dataInicial, horarioInicial))
        horarioInicial = horarios.find((h) => !horarioEstaNoPassado(dataInicial, h)) || "";
      setAgendamentoEditando(null);
      setFormData({ paciente_id: "", data: dataInicial, horario: horarioInicial, procedimento: "", status: "agendado" });
      setBuscaPaciente("");
    }
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando || excluindo) return;
    setModalAberto(false); setErroFormulario(""); setAgendamentoEditando(null);
    setConfirmarExclusaoAberto(false); setBuscaPaciente(""); setMostrarSugestoesPaciente(false);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    if (name === "data") { ajustarHorarioFormularioSeNecessario(value); return; }
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSalvarAgendamento(event) {
    event.preventDefault();
    if (!formData.paciente_id || !formData.data || !formData.horario) { setErroFormulario("Preencha paciente, data e horário."); return; }
    if (!agendamentoEditando && horarioEstaNoPassado(formData.data, formData.horario)) { setErroFormulario("Não é possível agendar em horários que já passaram."); return; }
    try {
      setSalvando(true); setErroFormulario("");
      const token = localStorage.getItem("token");
      const editando = Boolean(agendamentoEditando);
      const response = await fetch(editando ? `http://localhost:3001/consultas/${agendamentoEditando.id}` : "http://localhost:3001/consultas", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: token || "" },
        body: JSON.stringify({ paciente_id: Number(formData.paciente_id), data: formData.data, horario: formData.horario, procedimento: formData.procedimento, status: formData.status }),
      });
      if (!response.ok) throw new Error();
      await carregarConsultas(); fecharModal();
      setInicioSemana(obterInicioAgenda(new Date(`${formData.data}T00:00:00`)));
    } catch { setErroFormulario("Não foi possível salvar o agendamento."); }
    finally { setSalvando(false); }
  }

  async function handleExcluirAgendamento() {
    if (!agendamentoEditando?.id) return;
    try {
      setExcluindo(true); setErroFormulario("");
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3001/consultas/${agendamentoEditando.id}`, { method: "DELETE", headers: { Authorization: token || "" } });
      if (!response.ok) throw new Error();
      setConfirmarExclusaoAberto(false); await carregarConsultas(); fecharModal();
    } catch { setErroFormulario("Não foi possível excluir o agendamento."); }
    finally { setExcluindo(false); }
  }

  function abrirModalNovoPaciente() { setErroPaciente(""); setFormPaciente({ nome: "", telefone: "", observacoes: "" }); setModalPacienteAberto(true); }
  function fecharModalNovoPaciente() { if (salvandoPaciente) return; setModalPacienteAberto(false); setErroPaciente(""); }

  async function handleSalvarPaciente(event) {
    event.preventDefault();
    if (!formPaciente.nome.trim()) { setErroPaciente("Digite o nome do paciente."); return; }
    try {
      setSalvandoPaciente(true); setErroPaciente("");
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/pacientes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token || "" },
        body: JSON.stringify({ nome: formPaciente.nome, telefone: formPaciente.telefone, observacoes: formPaciente.observacoes }),
      });
      if (!response.ok) throw new Error();
      const pacienteCriado = await response.json();
      await carregarPacientes();
      const novoId = pacienteCriado?.id || pacienteCriado?.paciente?.id;
      if (novoId) setFormData((prev) => ({ ...prev, paciente_id: String(novoId) }));
      setBuscaPaciente(formPaciente.nome); setMostrarSugestoesPaciente(false); fecharModalNovoPaciente();
    } catch { setErroPaciente("Não foi possível cadastrar o paciente."); }
    finally { setSalvandoPaciente(false); }
  }

  function selecionarPaciente(paciente) {
    setFormData((prev) => ({ ...prev, paciente_id: String(paciente.id) }));
    setBuscaPaciente(paciente.nome || paciente.nome_paciente || `Paciente ${paciente.id}`);
    setMostrarSugestoesPaciente(false);
  }

  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const primeiroMin = obterMinutosDoHorario(horarios[0]);
  const ultimoMin = obterMinutosDoHorario(horarios[horarios.length - 1]) + 30;
  const agoraNaAgenda = minutosAgora >= primeiroMin && minutosAgora <= ultimoMin;

  function obterPosicaoLinha(horario) {
    const inicio = obterMinutosDoHorario(horario);
    if (minutosAgora < inicio || minutosAgora >= inicio + 30) return null;
    return ((minutosAgora - inicio) / 30) * 100;
  }

  const horariosOptions = horarios.map((h) => ({
    value: h, label: h, disabled: horarioEstaNoPassado(formData.data, h) && !agendamentoEditando,
  }));

  // ---- Render ----
  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <div>
          <span style={S.headerBadge}>Agenda da clínica</span>
          <h1 style={S.headerTitle}>Agenda semanal</h1>
          <p style={S.headerSub}>Organize atendimentos e acompanhe os horários da semana.</p>
        </div>
        <button style={S.btnPrimary} onClick={() => abrirModal()}>+ Novo agendamento</button>
      </div>

      {/* Toolbar */}
      <div style={S.toolbar}>
        <div style={S.navGroup}>
          <button style={S.navBtn} onClick={voltarSemana}>←</button>
          <button style={S.navBtnToday} onClick={irParaHoje}>Hoje</button>
          <button style={S.navBtn} onClick={avancarSemana}>→</button>
        </div>

        <div style={S.periodBox}>
          <strong style={S.periodTitle}>{tituloPeriodo}</strong>
          <span style={S.periodSub}>Período exibido</span>
        </div>

        <div style={S.filters}>
          <div style={{ minWidth: "160px", position: "relative" }}>
            <CustomDropdown
              value={filtroProfissional} options={profissionaisOptions} onChange={setFiltroProfissional}
              placeholder="Profissional" triggerStyle={S.filterDropTrigger} menuStyle={{ zIndex: 3000 }}
            />
          </div>
          <input type="text" placeholder="Buscar paciente, procedimento..." value={busca}
            onChange={(e) => setBusca(e.target.value)} style={S.searchInput} />
          <button style={S.btnRefresh} onClick={carregarConsultas}>↻ Atualizar</button>
        </div>
      </div>

      {carregando && (
        <div style={S.feedbackCard}>
          <div style={S.spinner} />
          <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "600" }}>Carregando consultas...</span>
        </div>
      )}
      {erro && <div style={S.errorCard}>{erro}</div>}

      {!carregando && !erro && (
        <div style={S.calendarWrap}>
          {/* Cabeçalho dos dias */}
          <div style={S.calHead}>
            <div style={S.timeColHead}>Horário</div>
            {diasSemana.map((dia) => {
              const ehHoje = dia.iso === hojeIso;
              return (
                <div key={dia.iso} style={{ ...S.dayHead, ...(ehHoje ? S.dayHeadToday : {}) }}>
                  <span style={S.dayLabel}>{dia.label}</span>
                  <span style={{ ...S.dayNum, ...(ehHoje ? S.dayNumToday : {}) }}>{dia.numero}</span>
                  {ehHoje && <span style={S.todayPill}>Hoje</span>}
                </div>
              );
            })}
          </div>

          {/* Grade de horários */}
          <div style={S.calBody}>
            {horarios.map((hora) => (
              <div key={hora} style={S.calRow}>
                <div style={S.timeCell}>{hora}</div>
                {diasSemana.map((dia) => {
                  const ehHoje = dia.iso === hojeIso;
                  const agendamento = obterAgendamento(dia.iso, hora);
                  const bloqueado = horarioEstaNoPassado(dia.iso, hora);
                  const posLinha = ehHoje && agoraNaAgenda ? obterPosicaoLinha(hora) : null;
                  const stCfg = agendamento ? (STATUS_STYLE[agendamento.status] || STATUS_STYLE.agendado) : null;

                  return (
                    <div key={`${dia.iso}-${hora}`}
                      style={{ ...S.dayCell, ...(ehHoje ? S.dayCellToday : {}), ...(bloqueado && !agendamento ? S.dayCellBlocked : {}) }}
                      onClick={() => { if (!agendamento && !bloqueado) abrirModal(null, dia.iso, hora); }}>

                      {agendamento ? (
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); abrirModal(agendamento); }}
                          style={{ ...S.eventCard, background: stCfg.cardBg, borderColor: stCfg.border, ...(agendamentoEditando?.id === agendamento.id ? S.eventCardActive : {}) }}>
                          <div style={S.eventHora}>{agendamento.inicio} – {agendamento.fim}</div>
                          <div style={S.eventNome}>{agendamento.paciente}</div>
                          <div style={S.eventProc}>{agendamento.procedimento}</div>
                          <span style={{ ...S.eventBadge, background: stCfg.bg, color: stCfg.color }}>
                            <span style={{ ...S.eventBadgeDot, background: stCfg.dot }} />
                            {obterLabelStatus(agendamento.status)}
                          </span>
                        </button>
                      ) : bloqueado ? (
                        <div style={S.slotBloqueado} />
                      ) : (
                        <div style={S.slotVazio}>+</div>
                      )}

                      {posLinha !== null && (
                        <div style={{ ...S.nowLine, top: `${posLinha}%` }}>
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

      {/* Modal agendamento */}
      {modalAberto && (
        <div style={S.overlay} onClick={fecharModal}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <h2 style={S.modalTitle}>{agendamentoEditando ? "Editar agendamento" : "Novo agendamento"}</h2>
                <p style={S.modalSub}>{agendamentoEditando ? "Altere os dados, salve ou exclua." : "Preencha os dados para salvar a consulta."}</p>
              </div>
              <button style={S.closeBtn} onClick={fecharModal}>✕</button>
            </div>

            <form onSubmit={handleSalvarAgendamento} style={S.form}>
              <div style={S.fieldGroup}>
                <div style={S.patientLabelRow}>
                  <label style={S.label}>Paciente</label>
                  <button type="button" style={S.btnNewPatient} onClick={abrirModalNovoPaciente}>+ Novo paciente</button>
                </div>
                <div style={{ position: "relative" }} ref={patientSearchRef}>
                  <input type="text" placeholder="Buscar por nome ou telefone..."
                    value={buscaPaciente}
                    onChange={(e) => { const v = e.target.value; setBuscaPaciente(v); setMostrarSugestoesPaciente(Boolean(v.trim())); if (!v.trim()) setFormData((p) => ({ ...p, paciente_id: "" })); }}
                    onFocus={() => { if (buscaPaciente.trim()) setMostrarSugestoesPaciente(true); }}
                    style={S.input} />
                  {mostrarSugestoesPaciente && (
                    <div style={S.patientDropdown}>
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
                <div style={S.fieldGroup}>
                  <label style={S.label}>Data</label>
                  <input type="date" name="data" value={formData.data} onChange={handleInputChange} style={S.input} />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Horário</label>
                  <CustomDropdown value={formData.horario} options={horariosOptions}
                    onChange={(h) => setFormData((p) => ({ ...p, horario: h }))}
                    placeholder="Selecione" triggerStyle={S.input} menuStyle={{ zIndex: 3000 }} maxHeight="260px" />
                </div>
              </div>

              <div style={S.fieldGroup}>
                <label style={S.label}>Procedimento</label>
                <input type="text" name="procedimento" placeholder="Ex: Avaliação, limpeza, retorno..."
                  value={formData.procedimento} onChange={handleInputChange} style={S.input} />
              </div>

              <div style={S.fieldGroup}>
                <label style={S.label}>Status</label>
                <CustomDropdown value={formData.status} options={statusOptions}
                  onChange={(s) => setFormData((p) => ({ ...p, status: s }))}
                  placeholder="Selecione" triggerStyle={S.input} menuStyle={{ zIndex: 3000 }} />
              </div>

              {erroFormulario && <div style={S.formError}>{erroFormulario}</div>}

              <div style={S.formActions}>
                {agendamentoEditando && (
                  <button type="button" style={S.btnDelete} onClick={() => setConfirmarExclusaoAberto(true)} disabled={salvando || excluindo}>Excluir</button>
                )}
                <button type="button" style={S.btnSecondary} onClick={fecharModal} disabled={salvando || excluindo}>Cancelar</button>
                <button type="submit" style={S.btnPrimary} disabled={salvando || excluindo || (!agendamentoEditando && !formData.horario)}>
                  {salvando ? "Salvando..." : agendamentoEditando ? "Salvar alterações" : "Salvar agendamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal novo paciente */}
      {modalPacienteAberto && (
        <div style={S.overlay} onClick={fecharModalNovoPaciente}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <h2 style={S.modalTitle}>Novo paciente</h2>
                <p style={S.modalSub}>Cadastre um paciente sem sair da agenda.</p>
              </div>
              <button style={S.closeBtn} onClick={fecharModalNovoPaciente}>✕</button>
            </div>
            <form onSubmit={handleSalvarPaciente} style={S.form}>
              <div style={S.fieldGroup}><label style={S.label}>Nome</label><input type="text" name="nome" value={formPaciente.nome} onChange={(e) => setFormPaciente((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome do paciente" style={S.input} /></div>
              <div style={S.fieldGroup}><label style={S.label}>Telefone</label><input type="text" name="telefone" value={formPaciente.telefone} onChange={(e) => setFormPaciente((p) => ({ ...p, telefone: e.target.value }))} placeholder="Telefone" style={S.input} /></div>
              <div style={S.fieldGroup}><label style={S.label}>Observações</label><input type="text" name="observacoes" value={formPaciente.observacoes} onChange={(e) => setFormPaciente((p) => ({ ...p, observacoes: e.target.value }))} placeholder="Observações" style={S.input} /></div>
              {erroPaciente && <div style={S.formError}>{erroPaciente}</div>}
              <div style={S.formActions}>
                <button type="button" style={S.btnSecondary} onClick={fecharModalNovoPaciente} disabled={salvandoPaciente}>Cancelar</button>
                <button type="submit" style={S.btnPrimary} disabled={salvandoPaciente}>{salvandoPaciente ? "Salvando..." : "Cadastrar paciente"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {confirmarExclusaoAberto && (
        <div style={S.overlay}>
          <div style={{ ...S.modal, maxWidth: "420px" }}>
            <div style={S.confirmIcon}>🗑️</div>
            <h3 style={S.confirmTitle}>Excluir agendamento?</h3>
            <p style={S.confirmText}>Esta ação não poderá ser desfeita.</p>
            <div style={S.formActions}>
              <button type="button" style={S.btnSecondary} onClick={() => setConfirmarExclusaoAberto(false)} disabled={excluindo}>Cancelar</button>
              <button type="button" style={S.btnDelete} onClick={handleExcluirAgendamento} disabled={excluindo}>{excluindo ? "Excluindo..." : "Confirmar exclusão"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Estilos ----
const S = {
  page: { display: "flex", flexDirection: "column", gap: "20px" },

  // Header
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexWrap: "wrap" },
  headerBadge: { display: "inline-block", padding: "5px 12px", borderRadius: "999px", background: "#eff6ff", color: "#1d4ed8", fontSize: "11px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "10px", border: "1px solid #bfdbfe" },
  headerTitle: { margin: 0, fontSize: "30px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.02em" },
  headerSub: { margin: "6px 0 0", color: "#64748b", fontSize: "14px" },

  // Buttons
  btnPrimary: { height: "44px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", padding: "0 20px", cursor: "pointer", fontWeight: "700", fontSize: "14px", boxShadow: "0 6px 16px rgba(37,99,235,0.2)", whiteSpace: "nowrap" },
  btnSecondary: { height: "44px", borderRadius: "12px", border: "1px solid #dbe4f0", background: "#fff", color: "#334155", padding: "0 18px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
  btnDelete: { height: "44px", borderRadius: "12px", border: "none", background: "#ef4444", color: "#fff", padding: "0 18px", cursor: "pointer", fontWeight: "700", fontSize: "14px" },
  btnRefresh: { height: "40px", borderRadius: "11px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", padding: "0 14px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },

  // Toolbar
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "14px", flexWrap: "wrap", background: "#ffffff", border: "1px solid #eef2f7", borderRadius: "20px", padding: "14px 20px", boxShadow: "0 4px 16px rgba(15,23,42,0.05)", position: "relative", zIndex: 20 },
  navGroup: { display: "flex", alignItems: "center", gap: "6px" },
  navBtn: { border: "1px solid #e2e8f0", background: "#fff", borderRadius: "10px", padding: "9px 14px", cursor: "pointer", fontSize: "15px", color: "#475569", fontWeight: "700" },
  navBtnToday: { border: "1px solid #dbeafe", background: "#eff6ff", color: "#2563eb", borderRadius: "10px", padding: "9px 16px", cursor: "pointer", fontWeight: "700", fontSize: "13px" },
  periodBox: { display: "flex", flexDirection: "column", gap: "2px" },
  periodTitle: { fontSize: "17px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.01em" },
  periodSub: { fontSize: "12px", color: "#94a3b8", fontWeight: "500" },
  filters: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  filterDropTrigger: { height: "40px", borderRadius: "11px", border: "1px solid #e2e8f0", background: "#fff", padding: "0 12px", fontSize: "13px", minWidth: "160px" },
  searchInput: { height: "40px", borderRadius: "11px", border: "1px solid #e2e8f0", padding: "0 12px", outline: "none", fontSize: "13px", minWidth: "220px", color: "#0f172a", background: "#fff" },

  // Feedback
  feedbackCard: { display: "flex", alignItems: "center", gap: "12px", background: "#fff", border: "1px solid #eef2f7", borderRadius: "16px", padding: "18px 20px" },
  spinner: { width: "20px", height: "20px", border: "2px solid #dbeafe", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 },
  errorCard: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "16px", padding: "16px 20px", fontSize: "14px", fontWeight: "600" },

  // Calendar
  calendarWrap: { background: "#ffffff", border: "1px solid #eef2f7", borderRadius: "22px", overflow: "hidden", boxShadow: "0 4px 20px rgba(15,23,42,0.05)" },
  calHead: { display: "grid", gridTemplateColumns: "80px repeat(6, 1fr)", borderBottom: "1px solid #eef2f7", background: "#f8fafc" },
  timeColHead: { padding: "14px 12px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", borderRight: "1px solid #eef2f7", textTransform: "uppercase", letterSpacing: "0.05em" },
  dayHead: { padding: "12px 8px", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center", justifyContent: "center", borderRight: "1px solid #eef2f7" },
  dayHeadToday: { background: "#eff6ff" },
  dayLabel: { fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  dayNum: { fontSize: "20px", fontWeight: "800", color: "#0f172a" },
  dayNumToday: { color: "#2563eb" },
  todayPill: { fontSize: "10px", fontWeight: "700", background: "#2563eb", color: "#fff", borderRadius: "999px", padding: "2px 7px", letterSpacing: "0.04em" },
  calBody: { display: "flex", flexDirection: "column" },
  calRow: { display: "grid", gridTemplateColumns: "80px repeat(6, 1fr)", minHeight: "72px", borderBottom: "1px solid #f1f5f9" },
  timeCell: { padding: "10px 10px", borderRight: "1px solid #eef2f7", fontSize: "12px", fontWeight: "700", color: "#94a3b8", background: "#fafbfc", display: "flex", alignItems: "flex-start", paddingTop: "10px" },
  dayCell: { padding: "6px", borderRight: "1px solid #f1f5f9", position: "relative", cursor: "pointer", background: "#fff", display: "flex", alignItems: "stretch", minHeight: "72px" },
  dayCellToday: { background: "#fafcff" },
  dayCellBlocked: { background: "#f8fafc", cursor: "not-allowed" },

  // Slots
  slotVazio: { width: "100%", minHeight: "58px", border: "1.5px dashed #dbeafe", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#93c5fd", fontSize: "20px", fontWeight: "300", transition: "background 0.15s" },
  slotBloqueado: { width: "100%", minHeight: "58px", borderRadius: "12px", background: "#f1f5f9", opacity: 0.5 },

  // Event card
  eventCard: { width: "100%", borderRadius: "12px", border: "1px solid", padding: "8px 10px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: "3px", position: "relative", zIndex: 10 },
  eventCardActive: { outline: "2px solid #2563eb", outlineOffset: "1px" },
  eventHora: { fontSize: "10px", fontWeight: "700", color: "#64748b" },
  eventNome: { fontSize: "12px", fontWeight: "800", color: "#0f172a", lineHeight: 1.2 },
  eventProc: { fontSize: "11px", color: "#475569", marginBottom: "2px" },
  eventBadge: { display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 7px", borderRadius: "999px", fontSize: "10px", fontWeight: "700", alignSelf: "flex-start" },
  eventBadgeDot: { width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0 },

  // Now line
  nowLine: { position: "absolute", left: 0, right: 0, height: "2px", background: "#ef4444", zIndex: 30, pointerEvents: "none" },
  nowDot: { position: "absolute", left: "-1px", top: "-4px", width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", zIndex: 31 },

  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 999 },
  modal: { width: "100%", maxWidth: "560px", background: "#fff", borderRadius: "24px", padding: "28px", boxShadow: "0 24px 64px rgba(15,23,42,0.22)", overflow: "visible" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "22px" },
  modalTitle: { margin: 0, fontSize: "24px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.02em" },
  modalSub: { margin: "6px 0 0", color: "#64748b", fontSize: "14px" },
  closeBtn: { border: "1px solid #e2e8f0", background: "#fff", width: "38px", height: "38px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },

  // Form
  form: { display: "flex", flexDirection: "column", gap: "16px", overflow: "visible" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "7px", overflow: "visible" },
  label: { fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" },
  input: { width: "100%", height: "44px", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "0 12px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a" },
  formError: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "12px", padding: "12px 14px", fontSize: "13px", fontWeight: "600" },
  formActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px", flexWrap: "wrap" },

  // Patient dropdown
  patientLabelRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
  btnNewPatient: { height: "30px", borderRadius: "9px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", padding: "0 12px", cursor: "pointer", fontWeight: "700", fontSize: "12px" },
  patientDropdown: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, border: "1px solid #e2e8f0", borderRadius: "14px", background: "#fff", maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "0 16px 40px rgba(15,23,42,0.12)", zIndex: 2000 },
  patientOpt: { border: "none", borderBottom: "1px solid #f1f5f9", background: "#fff", padding: "11px 14px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: "3px", width: "100%" },
  patientOptActive: { background: "#eff6ff" },
  patientOptNome: { fontSize: "14px", fontWeight: "700", color: "#0f172a" },
  patientOptTel: { fontSize: "12px", color: "#94a3b8" },
  patientEmpty: { padding: "14px", color: "#94a3b8", fontSize: "13px" },

  // Confirm delete
  confirmIcon: { fontSize: "28px", marginBottom: "10px" },
  confirmTitle: { margin: 0, fontSize: "20px", fontWeight: "800", color: "#0f172a" },
  confirmText: { margin: "8px 0 0", color: "#64748b", fontSize: "14px", lineHeight: 1.5 },

  // Dropdown
  dropWrap: { position: "relative", width: "100%" },
  dropTrigger: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", border: "1px solid #e2e8f0", background: "#fff", borderRadius: "12px", cursor: "pointer", boxSizing: "border-box", fontSize: "14px", color: "#0f172a", height: "44px", padding: "0 12px" },
  dropTriggerDisabled: { cursor: "not-allowed", opacity: 0.6, background: "#f8fafc" },
  dropText: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  dropArrow: { fontSize: "13px", color: "#94a3b8", transition: "transform 0.2s ease", flexShrink: 0 },
  dropArrowOpen: { transform: "rotate(180deg)" },
  dropMenu: { position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, border: "1px solid #e2e8f0", borderRadius: "14px", background: "#fff", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "0 16px 40px rgba(15,23,42,0.12)", zIndex: 2000 },
  dropOption: { border: "none", borderBottom: "1px solid #f1f5f9", background: "#fff", padding: "11px 14px", textAlign: "left", cursor: "pointer", width: "100%", fontSize: "14px", color: "#0f172a", fontWeight: "500" },
  dropOptionLast: { borderBottom: "none" },
  dropOptionActive: { background: "#eff6ff", color: "#1d4ed8", fontWeight: "700" },
  dropOptionDisabled: { color: "#cbd5e1", background: "#f8fafc", cursor: "not-allowed" },
  dropEmpty: { padding: "14px", color: "#94a3b8", fontSize: "13px" },
};

export default Agenda;

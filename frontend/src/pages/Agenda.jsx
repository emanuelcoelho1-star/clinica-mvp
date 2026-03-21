import { useEffect, useMemo, useRef, useState } from "react";

const horarios = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
];

const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const nomesMeses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const statusOptions = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

function zerarHora(data) {
  const novaData = new Date(data);
  novaData.setHours(0, 0, 0, 0);
  return novaData;
}

function obterInicioAgenda(data) {
  return zerarHora(data);
}

function formatarDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function adicionarDias(data, dias) {
  const novaData = new Date(data);
  novaData.setDate(novaData.getDate() + dias);
  return novaData;
}

function calcularFim(horario, duracaoMinutos = 30) {
  if (!horario || !horario.includes(":")) return horario;

  const [hora, minuto] = horario.split(":").map(Number);
  const total = hora * 60 + minuto + duracaoMinutos;
  const novaHora = Math.floor(total / 60);
  const novoMinuto = total % 60;

  return `${String(novaHora).padStart(2, "0")}:${String(novoMinuto).padStart(
    2,
    "0"
  )}`;
}

function normalizarConsulta(consulta) {
  return {
    id: consulta.id,
    data: consulta.data,
    inicio: consulta.horario,
    fim: calcularFim(consulta.horario, 30),
    paciente:
      consulta.paciente_nome ||
      consulta.paciente ||
      consulta.nome_paciente ||
      "Paciente",
    procedimento: consulta.procedimento || "Consulta",
    dentista:
      consulta.dentista ||
      consulta.profissional ||
      consulta.nome_profissional ||
      "Profissional",
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
  const item = statusOptions.find((opcao) => opcao.value === status);
  return item ? item.label : "Agendado";
}

function CustomDropdown({
  value,
  options,
  onChange,
  placeholder = "Selecione",
  disabled = false,
  triggerStyle = {},
  menuStyle = {},
  optionStyle = {},
  maxHeight = "220px",
}) {
  const [aberto, setAberto] = useState(false);
  const wrapperRef = useRef(null);

  const opcaoSelecionada = options.find((item) => item.value === value);

  useEffect(() => {
    function handleClickFora(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", handleClickFora);
    return () => {
      document.removeEventListener("mousedown", handleClickFora);
    };
  }, []);

  function alternar() {
    if (disabled) return;
    setAberto((prev) => !prev);
  }

  return (
    <div style={styles.customDropdownWrapper} ref={wrapperRef}>
      <button
        type="button"
        onClick={alternar}
        disabled={disabled}
        style={{
          ...styles.customDropdownTrigger,
          ...(disabled ? styles.customDropdownTriggerDisabled : {}),
          ...triggerStyle,
        }}
      >
        <span style={styles.customDropdownText}>
          {opcaoSelecionada?.label || placeholder}
        </span>

        <span
          style={{
            ...styles.customDropdownArrow,
            ...(aberto ? styles.customDropdownArrowOpen : {}),
          }}
        >
          ▾
        </span>
      </button>

      {aberto && (
        <div
          style={{
            ...styles.customDropdownMenu,
            maxHeight,
            ...menuStyle,
          }}
        >
          {options.length === 0 ? (
            <div style={styles.customDropdownEmpty}>Nenhuma opção</div>
          ) : (
            options.map((option, index) => {
              const selecionado = option.value === value;

              return (
                <button
                  key={`${option.value}-${index}`}
                  type="button"
                  onClick={() => {
                    if (option.disabled) return;
                    onChange(option.value);
                    setAberto(false);
                  }}
                  disabled={option.disabled}
                  style={{
                    ...styles.customDropdownOption,
                    ...(index === options.length - 1
                      ? styles.customDropdownOptionLast
                      : {}),
                    ...(selecionado ? styles.customDropdownOptionActive : {}),
                    ...(option.disabled
                      ? styles.customDropdownOptionDisabled
                      : {}),
                    ...optionStyle,
                  }}
                >
                  <span style={styles.customDropdownOptionLabel}>
                    {option.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function Agenda() {
  const [filtroProfissional, setFiltroProfissional] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [inicioSemana, setInicioSemana] = useState(
    obterInicioAgenda(new Date())
  );
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
  const [mostrarSugestoesPaciente, setMostrarSugestoesPaciente] =
    useState(false);
  const [modalPacienteAberto, setModalPacienteAberto] = useState(false);
  const [salvandoPaciente, setSalvandoPaciente] = useState(false);
  const [erroPaciente, setErroPaciente] = useState("");

  const [formPaciente, setFormPaciente] = useState({
    nome: "",
    telefone: "",
    observacoes: "",
  });

  const [formData, setFormData] = useState({
    paciente_id: "",
    data: formatarDataISO(new Date()),
    horario: "08:00",
    procedimento: "",
    status: "agendado",
  });

  const patientSearchRef = useRef(null);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setAgora(new Date());
    }, 30000);

    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    function handleClickFora(event) {
      if (
        patientSearchRef.current &&
        !patientSearchRef.current.contains(event.target)
      ) {
        setMostrarSugestoesPaciente(false);
      }
    }

    document.addEventListener("mousedown", handleClickFora);
    return () => {
      document.removeEventListener("mousedown", handleClickFora);
    };
  }, []);

  const diasSemana = useMemo(() => {
    return Array.from({ length: 6 }).map((_, index) => {
      const data = adicionarDias(inicioSemana, index);

      return {
        data,
        label: nomesDias[data.getDay()],
        numero: String(data.getDate()).padStart(2, "0"),
        iso: formatarDataISO(data),
      };
    });
  }, [inicioSemana]);

  const hojeIso = formatarDataISO(agora);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  async function carregarDadosIniciais() {
    await Promise.all([carregarConsultas(), carregarPacientes()]);
  }

  async function carregarConsultas() {
    try {
      setCarregando(true);
      setErro("");

      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:3001/consultas", {
        headers: {
          Authorization: token || "",
        },
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar as consultas.");
      }

      const data = await response.json();
      const consultasNormalizadas = Array.isArray(data)
        ? data.map(normalizarConsulta)
        : [];

      setConsultas(consultasNormalizadas);
    } catch (error) {
      console.error("Erro ao carregar consultas:", error);
      setErro("Erro ao carregar consultas do backend.");
      setConsultas([]);
    } finally {
      setCarregando(false);
    }
  }

  async function carregarPacientes() {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:3001/pacientes", {
        headers: {
          Authorization: token || "",
        },
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar os pacientes.");
      }

      const data = await response.json();
      let lista = [];

      if (Array.isArray(data)) {
        lista = data;
      } else if (Array.isArray(data.pacientes)) {
        lista = data.pacientes;
      } else if (Array.isArray(data.data)) {
        lista = data.data;
      }

      setPacientes(lista);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
      setPacientes([]);
    }
  }

  const profissionais = useMemo(() => {
    const lista = consultas.map((item) => item.dentista).filter(Boolean);
    return ["Todos", ...new Set(lista)];
  }, [consultas]);

  const profissionaisOptions = useMemo(() => {
    return profissionais.map((profissional) => ({
      value: profissional,
      label: profissional,
    }));
  }, [profissionais]);

  const pacientesFiltrados = useMemo(() => {
    const termo = buscaPaciente.toLowerCase().trim();

    if (!termo) return [];

    return pacientes.filter((paciente) => {
      const nome = String(
        paciente.nome ||
          paciente.nome_paciente ||
          paciente.paciente_nome ||
          ""
      ).toLowerCase();

      const telefone = String(paciente.telefone || "").toLowerCase();

      return nome.includes(termo) || telefone.includes(termo);
    });
  }, [pacientes, buscaPaciente]);

  const agendamentosFiltrados = useMemo(() => {
    return consultas.filter((item) => {
      const passaProfissional =
        filtroProfissional === "Todos" || item.dentista === filtroProfissional;

      const termo = busca.toLowerCase();

      const passaBusca =
        item.paciente.toLowerCase().includes(termo) ||
        item.procedimento.toLowerCase().includes(termo) ||
        item.dentista.toLowerCase().includes(termo);

      const datasDaSemana = diasSemana.map((dia) => dia.iso);
      const passaSemana = datasDaSemana.includes(item.data);

      return passaProfissional && passaBusca && passaSemana;
    });
  }, [consultas, filtroProfissional, busca, diasSemana]);

  const tituloPeriodo = useMemo(() => {
    const primeiroDia = diasSemana[0]?.data;
    const ultimoDia = diasSemana[diasSemana.length - 1]?.data;

    if (!primeiroDia || !ultimoDia) return "";

    const mesmoMes = primeiroDia.getMonth() === ultimoDia.getMonth();
    const mesmoAno = primeiroDia.getFullYear() === ultimoDia.getFullYear();

    if (mesmoMes && mesmoAno) {
      return `${nomesMeses[primeiroDia.getMonth()]} ${primeiroDia.getFullYear()}`;
    }

    return `${nomesMeses[primeiroDia.getMonth()]} ${primeiroDia.getFullYear()} - ${nomesMeses[ultimoDia.getMonth()]} ${ultimoDia.getFullYear()}`;
  }, [diasSemana]);

  function voltarSemana() {
    setInicioSemana((prev) => adicionarDias(prev, -6));
  }

  function avancarSemana() {
    setInicioSemana((prev) => adicionarDias(prev, 6));
  }

  function irParaHoje() {
    setInicioSemana(obterInicioAgenda(new Date()));
  }

  function obterAgendamento(dataIso, hora) {
    return agendamentosFiltrados.find(
      (item) => item.data === dataIso && item.inicio === hora
    );
  }

  function obterEstiloStatus(status) {
    switch (status) {
      case "confirmado":
        return styles.eventCardConfirmado;
      case "concluido":
        return styles.eventCardConcluido;
      case "cancelado":
        return styles.eventCardCancelado;
      default:
        return styles.eventCardAgendado;
    }
  }

  function horarioEstaNoPassado(dataIso, horario) {
    if (!dataIso || !horario) return false;

    const [ano, mes, dia] = dataIso.split("-").map(Number);
    const [hora, minuto] = horario.split(":").map(Number);

    const inicioBloco = new Date(ano, mes - 1, dia, hora, minuto, 0, 0);
    const fimBloco = new Date(inicioBloco.getTime() + 30 * 60 * 1000);

    return fimBloco.getTime() <= agora.getTime();
  }

  function horariosDisponiveisNoFormulario() {
    if (!formData.data) return horarios;

    return horarios.filter(
      (hora) => !horarioEstaNoPassado(formData.data, hora)
    );
  }

  function ajustarHorarioFormularioSeNecessario(novaData) {
    const horariosDisponiveis = horarios.filter(
      (hora) => !horarioEstaNoPassado(novaData, hora)
    );

    if (horariosDisponiveis.length === 0) {
      setFormData((prev) => ({
        ...prev,
        data: novaData,
        horario: "",
      }));
      return;
    }

    setFormData((prev) => {
      const horarioAtualAindaValido = horariosDisponiveis.includes(prev.horario);

      return {
        ...prev,
        data: novaData,
        horario: horarioAtualAindaValido
          ? prev.horario
          : horariosDisponiveis[0],
      };
    });
  }

  function abrirModal(
    agendamento = null,
    dataPadrao = null,
    horarioPadrao = "08:00"
  ) {
    setErroFormulario("");
    setConfirmarExclusaoAberto(false);
    setMostrarSugestoesPaciente(false);

    if (agendamento) {
      setAgendamentoEditando(agendamento);
      setFormData({
        paciente_id: String(agendamento.paciente_id || ""),
        data: agendamento.data || formatarDataISO(new Date()),
        horario: agendamento.inicio || "08:00",
        procedimento: agendamento.procedimento || "",
        status: agendamento.status || "agendado",
      });

      setBuscaPaciente(agendamento.paciente || "");
    } else {
      const dataInicial =
        dataPadrao || diasSemana[0]?.iso || formatarDataISO(new Date());

      let horarioInicial = horarioPadrao;

      if (horarioEstaNoPassado(dataInicial, horarioInicial)) {
        const proximoHorarioDisponivel = horarios.find(
          (hora) => !horarioEstaNoPassado(dataInicial, hora)
        );

        horarioInicial = proximoHorarioDisponivel || "";
      }

      setAgendamentoEditando(null);
      setFormData({
        paciente_id: "",
        data: dataInicial,
        horario: horarioInicial,
        procedimento: "",
        status: "agendado",
      });

      setBuscaPaciente("");
    }

    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando || excluindo) return;
    setModalAberto(false);
    setErroFormulario("");
    setAgendamentoEditando(null);
    setConfirmarExclusaoAberto(false);
    setBuscaPaciente("");
    setMostrarSugestoesPaciente(false);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    if (name === "data") {
      ajustarHorarioFormularioSeNecessario(value);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSalvarAgendamento(event) {
    event.preventDefault();

    if (!formData.paciente_id || !formData.data || !formData.horario) {
      setErroFormulario("Preencha paciente, data e horário.");
      return;
    }

    if (
      !agendamentoEditando &&
      horarioEstaNoPassado(formData.data, formData.horario)
    ) {
      setErroFormulario("Não é possível agendar em horários que já passaram.");
      return;
    }

    try {
      setSalvando(true);
      setErroFormulario("");

      const token = localStorage.getItem("token");
      const editando = Boolean(agendamentoEditando);

      const response = await fetch(
        editando
          ? `http://localhost:3001/consultas/${agendamentoEditando.id}`
          : "http://localhost:3001/consultas",
        {
          method: editando ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token || "",
          },
          body: JSON.stringify({
            paciente_id: Number(formData.paciente_id),
            data: formData.data,
            horario: formData.horario,
            procedimento: formData.procedimento,
            status: formData.status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao salvar agendamento.");
      }

      await carregarConsultas();
      fecharModal();

      const dataSelecionada = new Date(`${formData.data}T00:00:00`);
      setInicioSemana(obterInicioAgenda(dataSelecionada));
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      setErroFormulario("Não foi possível salvar o agendamento.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirAgendamento() {
    if (!agendamentoEditando?.id) return;

    try {
      setExcluindo(true);
      setErroFormulario("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:3001/consultas/${agendamentoEditando.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: token || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao excluir agendamento.");
      }

      setConfirmarExclusaoAberto(false);
      await carregarConsultas();
      fecharModal();
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      setErroFormulario("Não foi possível excluir o agendamento.");
    } finally {
      setExcluindo(false);
    }
  }

  function abrirModalNovoPaciente() {
    setErroPaciente("");
    setFormPaciente({
      nome: "",
      telefone: "",
      observacoes: "",
    });
    setModalPacienteAberto(true);
  }

  function fecharModalNovoPaciente() {
    if (salvandoPaciente) return;
    setModalPacienteAberto(false);
    setErroPaciente("");
  }

  function handlePacienteInputChange(event) {
    const { name, value } = event.target;

    setFormPaciente((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSalvarPaciente(event) {
    event.preventDefault();

    if (!formPaciente.nome.trim()) {
      setErroPaciente("Digite o nome do paciente.");
      return;
    }

    try {
      setSalvandoPaciente(true);
      setErroPaciente("");

      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:3001/pacientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token || "",
        },
        body: JSON.stringify({
          nome: formPaciente.nome,
          telefone: formPaciente.telefone,
          observacoes: formPaciente.observacoes,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao cadastrar paciente.");
      }

      const pacienteCriado = await response.json();

      await carregarPacientes();

      const novoId =
        pacienteCriado?.id ||
        pacienteCriado?.paciente?.id ||
        pacienteCriado?.data?.id;

      if (novoId) {
        setFormData((prev) => ({
          ...prev,
          paciente_id: String(novoId),
        }));
      }

      setBuscaPaciente(formPaciente.nome);
      setMostrarSugestoesPaciente(false);
      fecharModalNovoPaciente();
    } catch (error) {
      console.error("Erro ao cadastrar paciente:", error);
      setErroPaciente("Não foi possível cadastrar o paciente.");
    } finally {
      setSalvandoPaciente(false);
    }
  }

  function selecionarPaciente(paciente) {
    setFormData((prev) => ({
      ...prev,
      paciente_id: String(paciente.id),
    }));

    const nomeSelecionado =
      paciente.nome ||
      paciente.nome_paciente ||
      paciente.paciente_nome ||
      `Paciente ${paciente.id}`;

    setBuscaPaciente(nomeSelecionado);
    setMostrarSugestoesPaciente(false);
  }

  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const primeiroMinutoAgenda = obterMinutosDoHorario(horarios[0]);
  const ultimoMinutoAgenda =
    obterMinutosDoHorario(horarios[horarios.length - 1]) + 30;

  const agoraDentroDaAgenda =
    minutosAgora >= primeiroMinutoAgenda && minutosAgora <= ultimoMinutoAgenda;

  function obterPosicaoLinhaAtual(horario) {
    const inicioBloco = obterMinutosDoHorario(horario);
    const fimBloco = inicioBloco + 30;

    if (minutosAgora < inicioBloco || minutosAgora >= fimBloco) {
      return null;
    }

    const minutosPassados = minutosAgora - inicioBloco;
    return (minutosPassados / 30) * 100;
  }

  function linhaAtualPassaNesteHorario(horario) {
    return obterPosicaoLinhaAtual(horario) !== null;
  }

  const horariosDisponiveisForm = horariosDisponiveisNoFormulario();

  const horariosOptions = horarios.map((hora) => {
    const bloqueado = horarioEstaNoPassado(formData.data, hora);

    return {
      value: hora,
      label: hora,
      disabled: bloqueado && !agendamentoEditando,
    };
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <span style={styles.badge}>Agenda da clínica</span>
          <h1 style={styles.title}>Agenda semanal</h1>
          <p style={styles.subtitle}>
            Organize atendimentos e acompanhe os horários da semana.
          </p>
        </div>

        <button style={styles.primaryButton} onClick={() => abrirModal()}>
          + Novo agendamento
        </button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.navigation}>
          <button style={styles.navButton} onClick={voltarSemana}>
            ←
          </button>
          <button style={styles.todayButton} onClick={irParaHoje}>
            Hoje
          </button>
          <button style={styles.navButton} onClick={avancarSemana}>
            →
          </button>
        </div>

        <div style={styles.periodBox}>
          <strong style={styles.periodTitle}>{tituloPeriodo}</strong>
          <span style={styles.periodSubtitle}>Período exibido na agenda</span>
        </div>

        <div style={styles.filters}>
          <div style={styles.toolbarDropdown}>
            <CustomDropdown
              value={filtroProfissional}
              options={profissionaisOptions}
              onChange={setFiltroProfissional}
              placeholder="Profissional"
              triggerStyle={styles.selectLike}
              menuStyle={styles.selectLikeMenu}
            />
          </div>

          <input
            type="text"
            placeholder="Buscar paciente, procedimento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={styles.search}
          />

          <button style={styles.refreshButton} onClick={carregarConsultas}>
            Atualizar
          </button>
        </div>
      </div>

      {carregando && <div style={styles.feedback}>Carregando consultas...</div>}
      {erro && <div style={styles.errorBox}>{erro}</div>}

      {!carregando && !erro && (
        <div style={styles.calendarWrapper}>
          <div style={styles.calendarHeader}>
            <div style={styles.timeColumnHeader}>Horário</div>

            {diasSemana.map((dia) => {
              const ehHoje = dia.iso === hojeIso;

              return (
                <div
                  key={dia.iso}
                  style={{
                    ...styles.dayHeader,
                    ...(ehHoje ? styles.dayHeaderToday : {}),
                  }}
                >
                  <span style={styles.dayLabel}>{dia.label}</span>
                  <span style={styles.dayNumber}>{dia.numero}</span>
                </div>
              );
            })}
          </div>

          <div style={styles.calendarBody}>
            {horarios.map((hora) => (
              <div
                key={hora}
                style={{
                  ...styles.row,
                  ...(linhaAtualPassaNesteHorario(hora) ? styles.rowCurrent : {}),
                }}
              >
                <div
                  style={{
                    ...styles.timeCell,
                    ...(linhaAtualPassaNesteHorario(hora)
                      ? styles.timeCellCurrent
                      : {}),
                  }}
                >
                  {hora}
                </div>

                {diasSemana.map((dia) => {
                  const ehHoje = dia.iso === hojeIso;
                  const agendamento = obterAgendamento(dia.iso, hora);
                  const slotBloqueado = horarioEstaNoPassado(dia.iso, hora);
                  const posicaoLinha =
                    ehHoje && agoraDentroDaAgenda
                      ? obterPosicaoLinhaAtual(hora)
                      : null;

                  return (
                    <div
                      key={`${dia.iso}-${hora}`}
                      style={{
                        ...styles.dayCell,
                        ...(ehHoje ? styles.dayCellToday : {}),
                        ...(linhaAtualPassaNesteHorario(hora) && ehHoje
                          ? styles.dayCellCurrent
                          : {}),
                        ...(slotBloqueado && !agendamento
                          ? styles.dayCellBlocked
                          : {}),
                      }}
                      onClick={() => {
                        if (!agendamento && !slotBloqueado) {
                          abrirModal(null, dia.iso, hora);
                        }
                      }}
                    >
                      {agendamento ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModal(agendamento);
                          }}
                          style={{
                            ...styles.eventCard,
                            ...obterEstiloStatus(agendamento.status),
                            ...(agendamentoEditando?.id === agendamento.id
                              ? styles.eventCardActive
                              : {}),
                          }}
                        >
                          <div style={styles.eventHour}>
                            {agendamento.inicio} - {agendamento.fim}
                          </div>

                          <div style={styles.eventPatient}>
                            {agendamento.paciente}
                          </div>

                          <div style={styles.eventProcedure}>
                            {agendamento.procedimento}
                          </div>

                          <div style={styles.eventProfessional}>
                            {agendamento.dentista}
                          </div>

                          <div style={styles.eventStatus}>
                            {obterLabelStatus(agendamento.status)}
                          </div>
                        </button>
                      ) : slotBloqueado ? (
                        <div style={styles.blockedSlot}></div>
                      ) : (
                        <div style={styles.emptySlot}>+</div>
                      )}

                      {posicaoLinha !== null && (
                        <div
                          style={{
                            ...styles.nowLine,
                            top: `${posicaoLinha}%`,
                          }}
                        >
                          <span style={styles.nowDot}></span>
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

      {modalAberto && (
        <div style={styles.modalOverlay} onClick={fecharModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  {agendamentoEditando
                    ? "Editar agendamento"
                    : "Novo agendamento"}
                </h2>
                <p style={styles.modalSubtitle}>
                  {agendamentoEditando
                    ? "Altere os dados, salve ou exclua o agendamento."
                    : "Preencha os dados para salvar a consulta."}
                </p>
              </div>

              <button style={styles.closeButton} onClick={fecharModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarAgendamento} style={styles.form}>
              <div style={styles.fieldGroup}>
                <div style={styles.patientLabelRow}>
                  <label style={styles.label}>Paciente</label>

                  <button
                    type="button"
                    style={styles.newPatientButton}
                    onClick={abrirModalNovoPaciente}
                  >
                    + Novo paciente
                  </button>
                </div>

                <div style={styles.patientSearchWrapper} ref={patientSearchRef}>
                  <input
                    type="text"
                    placeholder="Buscar paciente por nome ou telefone..."
                    value={buscaPaciente}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setBuscaPaciente(valor);
                      setMostrarSugestoesPaciente(Boolean(valor.trim()));

                      if (!valor.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          paciente_id: "",
                        }));
                      }
                    }}
                    onFocus={() => {
                      if (buscaPaciente.trim()) {
                        setMostrarSugestoesPaciente(true);
                      }
                    }}
                    style={styles.input}
                  />

                  {mostrarSugestoesPaciente && (
                    <div style={styles.patientDropdown}>
                      {pacientesFiltrados.length === 0 ? (
                        <div style={styles.patientEmpty}>
                          Nenhum paciente encontrado
                        </div>
                      ) : (
                        pacientesFiltrados.slice(0, 6).map((paciente) => {
                          const nome =
                            paciente.nome ||
                            paciente.nome_paciente ||
                            paciente.paciente_nome ||
                            `Paciente ${paciente.id}`;

                          const selecionado =
                            String(formData.paciente_id) === String(paciente.id);

                          return (
                            <button
                              key={paciente.id}
                              type="button"
                              onClick={() => selecionarPaciente(paciente)}
                              style={{
                                ...styles.patientOption,
                                ...(selecionado
                                  ? styles.patientOptionActive
                                  : {}),
                              }}
                            >
                              <span style={styles.patientOptionName}>
                                {nome}
                              </span>

                              {paciente.telefone ? (
                                <span style={styles.patientOptionPhone}>
                                  {paciente.telefone}
                                </span>
                              ) : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Data</label>
                  <input
                    type="date"
                    name="data"
                    value={formData.data}
                    onChange={handleInputChange}
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Horário</label>

                  <CustomDropdown
                    value={formData.horario}
                    options={horariosOptions}
                    onChange={(novoHorario) =>
                      setFormData((prev) => ({
                        ...prev,
                        horario: novoHorario,
                      }))
                    }
                    placeholder="Selecione o horário"
                    triggerStyle={styles.inputLikeDropdown}
                    menuStyle={styles.inputLikeDropdownMenu}
                    maxHeight="260px"
                  />

                  {!agendamentoEditando && horariosDisponiveisForm.length === 0 && (
                    <div style={styles.formInfo}>
                      Não há mais horários disponíveis para esta data.
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Procedimento</label>
                <input
                  type="text"
                  name="procedimento"
                  placeholder="Ex: Avaliação, limpeza, retorno..."
                  value={formData.procedimento}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Status</label>

                <CustomDropdown
                  value={formData.status}
                  options={statusOptions}
                  onChange={(novoStatus) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: novoStatus,
                    }))
                  }
                  placeholder="Selecione o status"
                  triggerStyle={styles.inputLikeDropdown}
                  menuStyle={styles.inputLikeDropdownMenu}
                />
              </div>

              {erroFormulario && (
                <div style={styles.formError}>{erroFormulario}</div>
              )}

              <div style={styles.formActions}>
                {agendamentoEditando && (
                  <button
                    type="button"
                    style={styles.deleteButton}
                    onClick={() => setConfirmarExclusaoAberto(true)}
                    disabled={salvando || excluindo}
                  >
                    Excluir
                  </button>
                )}

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={fecharModal}
                  disabled={salvando || excluindo}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={
                    salvando ||
                    excluindo ||
                    (!agendamentoEditando && !formData.horario)
                  }
                >
                  {salvando
                    ? "Salvando..."
                    : agendamentoEditando
                    ? "Salvar alterações"
                    : "Salvar agendamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalPacienteAberto && (
        <div style={styles.modalOverlay} onClick={fecharModalNovoPaciente}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>Novo paciente</h2>
                <p style={styles.modalSubtitle}>
                  Cadastre um paciente sem sair da agenda.
                </p>
              </div>

              <button
                type="button"
                style={styles.closeButton}
                onClick={fecharModalNovoPaciente}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarPaciente} style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Nome</label>
                <input
                  type="text"
                  name="nome"
                  value={formPaciente.nome}
                  onChange={handlePacienteInputChange}
                  placeholder="Nome do paciente"
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Telefone</label>
                <input
                  type="text"
                  name="telefone"
                  value={formPaciente.telefone}
                  onChange={handlePacienteInputChange}
                  placeholder="Telefone"
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>Observações</label>
                <input
                  type="text"
                  name="observacoes"
                  value={formPaciente.observacoes}
                  onChange={handlePacienteInputChange}
                  placeholder="Observações do paciente"
                  style={styles.input}
                />
              </div>

              {erroPaciente && (
                <div style={styles.formError}>{erroPaciente}</div>
              )}

              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={fecharModalNovoPaciente}
                  disabled={salvandoPaciente}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={salvandoPaciente}
                >
                  {salvandoPaciente ? "Salvando..." : "Cadastrar paciente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmarExclusaoAberto && (
        <div style={styles.confirmOverlay}>
          <div style={styles.confirmBox}>
            <h3 style={styles.confirmTitle}>Excluir agendamento?</h3>
            <p style={styles.confirmText}>
              Essa ação não poderá ser desfeita.
            </p>

            <div style={styles.confirmActions}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setConfirmarExclusaoAberto(false)}
                disabled={excluindo}
              >
                Cancelar
              </button>

              <button
                type="button"
                style={styles.deleteButton}
                onClick={handleExcluirAgendamento}
                disabled={excluindo}
              >
                {excluindo ? "Excluindo..." : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: "700",
    marginBottom: "12px",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    color: "#0f172a",
  },
  subtitle: {
    margin: "8px 0 0 0",
    color: "#475569",
    fontSize: "15px",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "16px",
    marginBottom: "20px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
    position: "relative",
    zIndex: 20,
  },
  navigation: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  navButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    borderRadius: "12px",
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "16px",
  },
  todayButton: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "10px 16px",
    cursor: "pointer",
    fontWeight: "600",
  },
  periodBox: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  periodTitle: {
    fontSize: "18px",
    color: "#0f172a",
  },
  periodSubtitle: {
    fontSize: "13px",
    color: "#64748b",
  },
  filters: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  toolbarDropdown: {
    minWidth: "160px",
    position: "relative",
  },
  selectLike: {
    minWidth: "160px",
    height: "42px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    padding: "0 12px",
  },
  selectLikeMenu: {
    zIndex: 3000,
  },
  search: {
    minWidth: "240px",
    height: "42px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    outline: "none",
  },
  refreshButton: {
    height: "42px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    padding: "0 16px",
    cursor: "pointer",
    fontWeight: "600",
  },
  primaryButton: {
    height: "44px",
    borderRadius: "12px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    padding: "0 18px",
    cursor: "pointer",
    fontWeight: "700",
  },
  secondaryButton: {
    height: "44px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    padding: "0 18px",
    cursor: "pointer",
    fontWeight: "700",
  },
  deleteButton: {
    height: "44px",
    borderRadius: "12px",
    border: "none",
    background: "#ef4444",
    color: "#fff",
    padding: "0 18px",
    cursor: "pointer",
    fontWeight: "700",
  },
  feedback: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "20px",
    color: "#475569",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: "16px",
    padding: "16px",
  },
  calendarWrapper: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  },
  calendarHeader: {
    display: "grid",
    gridTemplateColumns: "90px repeat(6, 1fr)",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  timeColumnHeader: {
    padding: "16px",
    fontSize: "13px",
    fontWeight: "700",
    color: "#64748b",
    borderRight: "1px solid #e2e8f0",
  },
  dayHeader: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    alignItems: "center",
    justifyContent: "center",
    borderRight: "1px solid #e2e8f0",
    color: "#334155",
  },
  dayHeaderToday: {
    background: "#eff6ff",
  },
  dayLabel: {
    fontSize: "13px",
    fontWeight: "700",
  },
  dayNumber: {
    fontSize: "20px",
    fontWeight: "800",
  },
  calendarBody: {
    display: "flex",
    flexDirection: "column",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "90px repeat(6, 1fr)",
    minHeight: "78px",
    borderBottom: "1px solid #e2e8f0",
  },
  rowCurrent: {
    background: "#fffdfd",
  },
  timeCell: {
    padding: "12px 10px",
    borderRight: "1px solid #e2e8f0",
    fontSize: "13px",
    fontWeight: "700",
    color: "#64748b",
    background: "#fcfdff",
  },
  timeCellCurrent: {
    color: "#dc2626",
    background: "#fff1f2",
  },
  dayCell: {
    padding: "8px",
    borderRight: "1px solid #e2e8f0",
    position: "relative",
    cursor: "pointer",
    background: "#fff",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "stretch",
    minHeight: "78px",
    overflow: "visible",
  },
  dayCellToday: {
    background: "#fafcff",
  },
  dayCellCurrent: {
    background: "#fffdfd",
  },
  dayCellBlocked: {
    background: "#f8fafc",
    cursor: "not-allowed",
  },
  emptySlot: {
    width: "100%",
    minHeight: "60px",
    border: "1px dashed #dbeafe",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#93c5fd",
    fontSize: "22px",
    fontWeight: "300",
    position: "relative",
    zIndex: 1,
  },
  blockedSlot: {
    width: "100%",
    minHeight: "60px",
    borderRadius: "14px",
    background: "#f1f5f9",
    opacity: 0.6,
    position: "relative",
    zIndex: 1,
    userSelect: "none",
  },
  nowLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: "2px",
    background: "#ef4444",
    zIndex: 30,
    pointerEvents: "none",
  },
  nowDot: {
    position: "absolute",
    left: "-1px",
    top: "-4px",
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "#ef4444",
    zIndex: 31,
  },
  eventCard: {
    width: "100%",
    borderRadius: "14px",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    padding: "10px",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.06)",
    position: "relative",
    zIndex: 10,
  },
  eventCardActive: {
    outline: "2px solid #2563eb",
    boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.14)",
  },
  eventCardAgendado: {
    background: "#eff6ff",
  },
  eventCardConfirmado: {
    background: "#ecfdf5",
  },
  eventCardConcluido: {
    background: "#f5f3ff",
  },
  eventCardCancelado: {
    background: "#fef2f2",
  },
  eventHour: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#334155",
    marginBottom: "6px",
  },
  eventPatient: {
    fontSize: "13px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "4px",
  },
  eventProcedure: {
    fontSize: "12px",
    color: "#334155",
    marginBottom: "4px",
  },
  eventProfessional: {
    fontSize: "11px",
    color: "#64748b",
    marginBottom: "6px",
  },
  eventStatus: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "capitalize",
    color: "#1e293b",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 999,
  },
  modal: {
    width: "100%",
    maxWidth: "560px",
    background: "#fff",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.25)",
    overflow: "visible",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "20px",
  },
  modalTitle: {
    margin: 0,
    fontSize: "26px",
    color: "#0f172a",
  },
  modalSubtitle: {
    margin: "8px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  closeButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "16px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    overflow: "visible",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    overflow: "visible",
  },
  label: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#334155",
  },
  input: {
    width: "100%",
    height: "46px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    outline: "none",
    fontSize: "14px",
    background: "#fff",
    boxSizing: "border-box",
  },
  inputLikeDropdown: {
    width: "100%",
    height: "46px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    background: "#fff",
  },
  inputLikeDropdownMenu: {
    zIndex: 3000,
  },
  formError: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: "12px",
    padding: "12px",
    fontSize: "14px",
  },
  formInfo: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475569",
    borderRadius: "12px",
    padding: "12px",
    fontSize: "13px",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "8px",
    flexWrap: "wrap",
  },
  confirmOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },
  confirmBox: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.25)",
    border: "1px solid #e2e8f0",
  },
  confirmTitle: {
    margin: 0,
    fontSize: "22px",
    color: "#0f172a",
  },
  confirmText: {
    margin: "10px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  confirmActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "24px",
    flexWrap: "wrap",
  },
  patientLabelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  newPatientButton: {
    height: "32px",
    borderRadius: "10px",
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "12px",
  },
  patientSearchWrapper: {
    position: "relative",
    width: "100%",
  },
  patientDropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "#fff",
    maxHeight: "220px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 16px 34px rgba(15, 23, 42, 0.12)",
    zIndex: 2000,
  },
  patientOption: {
    border: "none",
    borderBottom: "1px solid #e2e8f0",
    background: "#fff",
    padding: "12px",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    width: "100%",
  },
  patientOptionActive: {
    background: "#eff6ff",
  },
  patientOptionName: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
  },
  patientOptionPhone: {
    fontSize: "12px",
    color: "#64748b",
  },
  patientEmpty: {
    padding: "14px",
    color: "#64748b",
    fontSize: "14px",
  },
  customDropdownWrapper: {
    position: "relative",
    width: "100%",
  },
  customDropdownTrigger: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    borderRadius: "12px",
    cursor: "pointer",
    boxSizing: "border-box",
    fontSize: "14px",
    color: "#0f172a",
  },
  customDropdownTriggerDisabled: {
    cursor: "not-allowed",
    opacity: 0.65,
    background: "#f8fafc",
  },
  customDropdownText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  customDropdownArrow: {
    fontSize: "14px",
    color: "#64748b",
    transition: "transform 0.2s ease",
    flexShrink: 0,
  },
  customDropdownArrowOpen: {
    transform: "rotate(180deg)",
  },
  customDropdownMenu: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    right: 0,
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    background: "#fff",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 16px 34px rgba(15, 23, 42, 0.12)",
    zIndex: 2000,
  },
  customDropdownOption: {
    border: "none",
    borderBottom: "1px solid #e2e8f0",
    background: "#fff",
    padding: "12px",
    textAlign: "left",
    cursor: "pointer",
    width: "100%",
    fontSize: "14px",
    color: "#0f172a",
  },
  customDropdownOptionLast: {
    borderBottom: "none",
  },
  customDropdownOptionActive: {
    background: "#eff6ff",
  },
  customDropdownOptionDisabled: {
    color: "#94a3b8",
    background: "#f8fafc",
    cursor: "not-allowed",
  },
  customDropdownOptionLabel: {
    fontSize: "14px",
    fontWeight: "600",
  },
  customDropdownEmpty: {
    padding: "14px",
    color: "#64748b",
    fontSize: "14px",
  },
};

export default Agenda;
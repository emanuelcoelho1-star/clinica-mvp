import { useEffect, useMemo, useState } from "react";

const horarios = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
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

function zerarHora(data) {
  const novaData = new Date(data);
  novaData.setHours(0, 0, 0, 0);
  return novaData;
}

function formatarDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function obterInicioDaSemana(data) {
  const dataBase = zerarHora(data);
  const diaSemana = dataBase.getDay();
  const diferenca = diaSemana === 0 ? -6 : 1 - diaSemana;
  const inicio = new Date(dataBase);
  inicio.setDate(dataBase.getDate() + diferenca);
  return inicio;
}

function adicionarDias(data, dias) {
  const novaData = new Date(data);
  novaData.setDate(novaData.getDate() + dias);
  return novaData;
}

function calcularFim(horario, duracaoMinutos = 60) {
  if (!horario || !horario.includes(":")) return horario;

  const [hora, minuto] = horario.split(":").map(Number);
  const total = hora * 60 + minuto + duracaoMinutos;
  const novaHora = Math.floor(total / 60);
  const novoMinuto = total % 60;

  return `${String(novaHora).padStart(2, "0")}:${String(novoMinuto).padStart(2, "0")}`;
}

function normalizarConsulta(consulta) {
  return {
    id: consulta.id,
    data: consulta.data,
    inicio: consulta.horario,
    fim: calcularFim(consulta.horario, 60),
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

function Agenda() {
  const [filtroProfissional, setFiltroProfissional] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [inicioSemana, setInicioSemana] = useState(obterInicioDaSemana(new Date()));

  const [consultas, setConsultas] = useState([]);
  const [pacientes, setPacientes] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState("");

  const [formData, setFormData] = useState({
    paciente_id: "",
    data: formatarDataISO(new Date()),
    horario: "08:00",
    procedimento: "",
    status: "agendado",
  });

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

  const hojeIso = formatarDataISO(new Date());

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
    if (!primeiroDia) return "";
    return `${nomesMeses[primeiroDia.getMonth()]} ${primeiroDia.getFullYear()}`;
  }, [diasSemana]);

  function voltarSemana() {
    setInicioSemana((prev) => adicionarDias(prev, -7));
  }

  function avancarSemana() {
    setInicioSemana((prev) => adicionarDias(prev, 7));
  }

  function irParaHoje() {
    setInicioSemana(obterInicioDaSemana(new Date()));
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

  function abrirModal() {
    setErroFormulario("");
    setFormData({
      paciente_id: pacientes.length > 0 ? String(pacientes[0].id) : "",
      data: diasSemana[0]?.iso || formatarDataISO(new Date()),
      horario: "08:00",
      procedimento: "",
      status: "agendado",
    });
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) return;
    setModalAberto(false);
    setErroFormulario("");
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
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

    try {
      setSalvando(true);
      setErroFormulario("");

      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:3001/consultas", {
        method: "POST",
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
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar agendamento.");
      }

      await carregarConsultas();
      fecharModal();

      const dataSelecionada = new Date(`${formData.data}T00:00:00`);
      setInicioSemana(obterInicioDaSemana(dataSelecionada));
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      setErroFormulario("Não foi possível salvar o agendamento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Agenda da clínica</p>
          <h1 style={styles.title}>Agenda semanal</h1>
          <p style={styles.subtitle}>
            Organize atendimentos e acompanhe os horários da semana.
          </p>
        </div>

        <button style={styles.primaryButton} onClick={abrirModal}>
          + Novo agendamento
        </button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <button style={styles.navButton} onClick={voltarSemana}>
            ←
          </button>

          <button style={styles.todayButton} onClick={irParaHoje}>
            Hoje
          </button>

          <button style={styles.navButton} onClick={avancarSemana}>
            →
          </button>

          <div style={styles.periodBox}>
            <strong>{tituloPeriodo}</strong>
            <span style={styles.periodSub}>Semana exibida na agenda</span>
          </div>
        </div>

        <div style={styles.toolbarRight}>
          <select
            value={filtroProfissional}
            onChange={(e) => setFiltroProfissional(e.target.value)}
            style={styles.select}
          >
            {profissionais.map((profissional) => (
              <option key={profissional} value={profissional}>
                {profissional}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Buscar paciente ou procedimento"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={styles.search}
          />

          <button style={styles.reloadButton} onClick={carregarConsultas}>
            Atualizar
          </button>
        </div>
      </div>

      {carregando && <div style={styles.infoBox}>Carregando consultas...</div>}
      {erro && <div style={styles.errorBox}>{erro}</div>}

      {!carregando && !erro && (
        <div style={styles.calendarWrapper}>
          <div style={styles.calendarCard}>
            <div style={styles.calendarHeader}>
              <div style={styles.hourHeader}></div>

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
                    <strong style={styles.dayNumber}>{dia.numero}</strong>
                  </div>
                );
              })}
            </div>

            <div style={styles.calendarBody}>
              <div style={styles.hoursColumn}>
                {horarios.map((hora) => (
                  <div key={hora} style={styles.hourCell}>
                    {hora}
                  </div>
                ))}
              </div>

              {diasSemana.map((dia) => {
                const ehHoje = dia.iso === hojeIso;

                return (
                  <div
                    key={dia.iso}
                    style={{
                      ...styles.dayColumn,
                      ...(ehHoje ? styles.dayColumnToday : {}),
                    }}
                  >
                    {horarios.map((hora) => {
                      const agendamento = obterAgendamento(dia.iso, hora);

                      return (
                        <div key={hora} style={styles.slot}>
                          {agendamento && (
                            <div
                              style={{
                                ...styles.eventCard,
                                ...obterEstiloStatus(agendamento.status),
                              }}
                            >
                              <div style={styles.eventTime}>
                                {agendamento.inicio} - {agendamento.fim}
                              </div>
                              <div style={styles.eventPatient}>
                                {agendamento.paciente}
                              </div>
                              <div style={styles.eventProcedure}>
                                {agendamento.procedimento}
                              </div>
                              <div style={styles.eventDentist}>
                                {agendamento.dentista}
                              </div>
                              <div style={styles.eventStatus}>
                                {agendamento.status}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div style={styles.modalOverlay} onClick={fecharModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>Novo agendamento</h2>
                <p style={styles.modalSubtitle}>
                  Preencha os dados para salvar a consulta.
                </p>
              </div>

              <button style={styles.modalCloseButton} onClick={fecharModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarAgendamento} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Paciente</label>
                <select
                  name="paciente_id"
                  value={formData.paciente_id}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                >
                  {pacientes.length === 0 ? (
                    <option value="">Nenhum paciente encontrado</option>
                  ) : (
                    pacientes.map((paciente) => (
                      <option key={paciente.id} value={paciente.id}>
                        {paciente.nome ||
                          paciente.nome_paciente ||
                          paciente.paciente_nome ||
                          `Paciente ${paciente.id}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data</label>
                  <input
                    type="date"
                    name="data"
                    value={formData.data}
                    onChange={handleInputChange}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Horário</label>
                  <select
                    name="horario"
                    value={formData.horario}
                    onChange={handleInputChange}
                    style={styles.input}
                    required
                  >
                    {horarios.map((hora) => (
                      <option key={hora} value={hora}>
                        {hora}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Procedimento</label>
                <input
                  type="text"
                  name="procedimento"
                  value={formData.procedimento}
                  onChange={handleInputChange}
                  placeholder="Ex: Limpeza, Avaliação, Retorno..."
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  style={styles.input}
                >
                  <option value="agendado">Agendado</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              {erroFormulario && (
                <div style={styles.formError}>{erroFormulario}</div>
              )}

              <div style={styles.formActions}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={fecharModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={styles.submitButton}
                  disabled={salvando || pacientes.length === 0}
                >
                  {salvando ? "Salvando..." : "Salvar agendamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "24px",
  },
  eyebrow: {
    margin: 0,
    color: "#2563eb",
    fontWeight: "800",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  title: {
    margin: "8px 0 8px 0",
    fontSize: "34px",
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "15px",
  },
  primaryButton: {
    border: "none",
    borderRadius: "14px",
    padding: "14px 20px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(37, 99, 235, 0.22)",
  },
  toolbar: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "18px",
    marginBottom: "20px",
    border: "1px solid #e8eef6",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  toolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  toolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  navButton: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    border: "1px solid #dbe3ee",
    background: "#fff",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "700",
  },
  todayButton: {
    height: "42px",
    borderRadius: "12px",
    border: "1px solid #dbe3ee",
    background: "#f8fafc",
    padding: "0 16px",
    fontWeight: "700",
    cursor: "pointer",
  },
  reloadButton: {
    height: "42px",
    borderRadius: "12px",
    border: "1px solid #dbe3ee",
    background: "#fff",
    padding: "0 16px",
    fontWeight: "700",
    cursor: "pointer",
  },
  periodBox: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "0 8px",
    minWidth: "140px",
  },
  periodSub: {
    color: "#64748b",
    fontSize: "13px",
    marginTop: "4px",
  },
  select: {
    height: "42px",
    borderRadius: "12px",
    border: "1px solid #dbe3ee",
    padding: "0 14px",
    background: "#fff",
    fontSize: "14px",
  },
  search: {
    height: "42px",
    borderRadius: "12px",
    border: "1px solid #dbe3ee",
    padding: "0 14px",
    minWidth: "260px",
    background: "#fff",
    fontSize: "14px",
    outline: "none",
  },
  infoBox: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: "16px",
    padding: "14px 16px",
    marginBottom: "16px",
    fontWeight: "600",
  },
  errorBox: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: "16px",
    padding: "14px 16px",
    marginBottom: "16px",
    fontWeight: "600",
  },
  calendarWrapper: {
    width: "100%",
    overflowX: "auto",
  },
  calendarCard: {
    background: "#ffffff",
    borderRadius: "24px",
    border: "1px solid #e8eef6",
    boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
    overflow: "hidden",
    minWidth: "1100px",
  },
  calendarHeader: {
    display: "grid",
    gridTemplateColumns: "90px repeat(6, 1fr)",
    borderBottom: "1px solid #edf2f7",
    background: "#f8fbff",
  },
  hourHeader: {
    borderRight: "1px solid #edf2f7",
  },
  dayHeader: {
    padding: "18px 12px",
    textAlign: "center",
    borderRight: "1px solid #edf2f7",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  dayHeaderToday: {
    background: "#eef4ff",
  },
  dayLabel: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "700",
  },
  dayNumber: {
    color: "#0f172a",
    fontSize: "20px",
  },
  calendarBody: {
    display: "grid",
    gridTemplateColumns: "90px repeat(6, 1fr)",
  },
  hoursColumn: {
    borderRight: "1px solid #edf2f7",
    background: "#fbfdff",
  },
  hourCell: {
    height: "86px",
    padding: "10px 12px",
    boxSizing: "border-box",
    borderBottom: "1px solid #edf2f7",
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "700",
  },
  dayColumn: {
    borderRight: "1px solid #edf2f7",
  },
  dayColumnToday: {
    background: "rgba(37, 99, 235, 0.03)",
  },
  slot: {
    height: "86px",
    borderBottom: "1px solid #edf2f7",
    padding: "8px",
    boxSizing: "border-box",
  },
  eventCard: {
    height: "100%",
    borderRadius: "16px",
    padding: "10px 12px",
    overflow: "hidden",
    border: "1px solid transparent",
  },
  eventCardAgendado: {
    background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
    border: "1px solid #93c5fd",
  },
  eventCardConfirmado: {
    background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
    border: "1px solid #86efac",
  },
  eventCardConcluido: {
    background: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
    border: "1px solid #c4b5fd",
  },
  eventCardCancelado: {
    background: "linear-gradient(135deg, #fee2e2, #fecaca)",
    border: "1px solid #fca5a5",
  },
  eventTime: {
    fontSize: "12px",
    fontWeight: "800",
    color: "#1d4ed8",
    marginBottom: "6px",
  },
  eventPatient: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: "4px",
  },
  eventProcedure: {
    fontSize: "13px",
    color: "#334155",
    marginBottom: "4px",
  },
  eventDentist: {
    fontSize: "12px",
    color: "#475569",
    marginBottom: "4px",
  },
  eventStatus: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#334155",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },
  modal: {
    width: "100%",
    maxWidth: "560px",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: "0 30px 60px rgba(15, 23, 42, 0.25)",
    border: "1px solid #e8eef6",
  },
  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "20px",
  },
  modalTitle: {
    margin: 0,
    fontSize: "24px",
    color: "#0f172a",
  },
  modalSubtitle: {
    margin: "6px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
  },
  modalCloseButton: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    border: "1px solid #dbe3ee",
    background: "#fff",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "700",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#334155",
  },
  input: {
    height: "46px",
    borderRadius: "14px",
    border: "1px solid #dbe3ee",
    padding: "0 14px",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  },
  formError: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: "14px",
    padding: "12px 14px",
    fontWeight: "600",
    fontSize: "14px",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "8px",
  },
  secondaryButton: {
    height: "46px",
    borderRadius: "14px",
    border: "1px solid #dbe3ee",
    background: "#fff",
    padding: "0 18px",
    fontWeight: "700",
    cursor: "pointer",
  },
  submitButton: {
    height: "46px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    padding: "0 18px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(37, 99, 235, 0.22)",
  },
};

export default Agenda;
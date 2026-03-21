import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function CadastroPaciente() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [carregando, setCarregando] = useState(!!id);
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    comoConheceu: "",
    profissao: "",
    genero: "",
    dataNascimento: "",
    cpf: "",
    observacoes: "",

    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",

    responsavelNome: "",
    responsavelCpf: "",
    responsavelDataNascimento: "",
    responsavelTelefone: "",
  });

  useEffect(() => {
    if (!id) return;

    const token = localStorage.getItem("token");

    fetch("http://localhost:3001/pacientes", {
      headers: {
        Authorization: token,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const paciente = data.find((item) => String(item.id) === String(id));

        if (!paciente) {
          setErroModal("Paciente não encontrado.");
          navigate("/pacientes");
          return;
        }

        setForm({
          nome: paciente.nome || "",
          telefone: paciente.telefone || "",
          email: paciente.email || "",
          comoConheceu: paciente.como_conheceu || "",
          profissao: paciente.profissao || "",
          genero: paciente.genero || "",
          dataNascimento: paciente.data_nascimento || "",
          cpf: paciente.cpf || "",
          observacoes: paciente.observacoes || "",

          cep: paciente.cep || "",
          rua: paciente.rua || "",
          numero: paciente.numero || "",
          complemento: paciente.complemento || "",
          bairro: paciente.bairro || "",
          cidade: paciente.cidade || "",
          estado: paciente.estado || "",

          responsavelNome: paciente.responsavel_nome || "",
          responsavelCpf: paciente.responsavel_cpf || "",
          responsavelDataNascimento: paciente.responsavel_data_nascimento || "",
          responsavelTelefone: paciente.responsavel_telefone || "",
        });
      })
      .catch((err) => {
        console.error("Erro ao carregar paciente:", err);
        setErroModal("Não foi possível carregar o paciente.");
      })
      .finally(() => setCarregando(false));
  }, [id, navigate]);

  const atualizarCampo = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const somenteNumeros = (valor) => valor.replace(/\D/g, "");

  const formatarCpf = (valor) => {
    const numeros = somenteNumeros(valor).slice(0, 11);

    return numeros
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  };

  const formatarTelefone = (valor) => {
    const numeros = somenteNumeros(valor).slice(0, 11);

    if (numeros.length <= 10) {
      return numeros
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return numeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  };

  const formatarCep = (valor) => {
    const numeros = somenteNumeros(valor).slice(0, 8);
    return numeros.replace(/^(\d{5})(\d)/, "$1-$2");
  };

  const buscarCep = async (cepDigitado) => {
    const cepLimpo = somenteNumeros(cepDigitado);

    if (cepLimpo.length !== 8) return;

    try {
      setBuscandoCep(true);

      const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await resposta.json();

      if (data.erro) {
        setErroModal("CEP não encontrado.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        cidade: data.localidade || "",
        estado: data.uf || "",
      }));
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      setErroModal("Não foi possível buscar o CEP.");
    } finally {
      setBuscandoCep(false);
    }
  };

  const validarFormulario = () => {
    if (!form.nome.trim()) {
      setErroModal("Preencha o Nome Completo.");
      return false;
    }

    if (!somenteNumeros(form.telefone) || somenteNumeros(form.telefone).length < 10) {
      setErroModal("Preencha o Telefone Celular corretamente.");
      return false;
    }

    if (!somenteNumeros(form.cpf) || somenteNumeros(form.cpf).length !== 11) {
      setErroModal("Preencha o CPF corretamente.");
      return false;
    }

    if (!form.genero) {
      setErroModal("Selecione o gênero.");
      return false;
    }

    if (!form.dataNascimento) {
      setErroModal("Preencha a data de nascimento.");
      return false;
    }

    return true;
  };

  const salvarPaciente = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) return;

    const token = localStorage.getItem("token");
    setSalvando(true);

    const payload = {
      nome: form.nome,
      telefone: somenteNumeros(form.telefone),
      email: form.email,
      comoConheceu: form.comoConheceu,
      profissao: form.profissao,
      genero: form.genero,
      dataNascimento: form.dataNascimento,
      cpf: somenteNumeros(form.cpf),
      observacoes: form.observacoes,

      cep: somenteNumeros(form.cep),
      rua: form.rua,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.estado,

      responsavelNome: form.responsavelNome,
      responsavelCpf: somenteNumeros(form.responsavelCpf),
      responsavelDataNascimento: form.responsavelDataNascimento,
      responsavelTelefone: somenteNumeros(form.responsavelTelefone),
    };

    try {
      const resposta = await fetch(
        id
          ? `http://localhost:3001/pacientes/${id}`
          : "http://localhost:3001/pacientes",
        {
          method: id ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await resposta.json();

      if (!resposta.ok) {
        throw new Error(data.erro || "Erro ao salvar paciente");
      }

      navigate("/pacientes");
    } catch (erro) {
      console.error(erro);
      setErroModal(erro.message || "Não foi possível salvar o paciente.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <div style={styles.loading}>Carregando paciente...</div>;
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>{id ? "Editar paciente" : "Cadastrar paciente"}</h1>
        <p style={styles.subtitle}>
          Preencha os dados do paciente para manter o cadastro completo da clínica.
        </p>
      </div>

      <form style={styles.card} onSubmit={salvarPaciente}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Dados do paciente</h2>

          <div style={styles.grid}>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Nome Completo *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => atualizarCampo("nome", e.target.value)}
                placeholder="Digite o nome completo"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Telefone Celular *</label>
              <input
                type="text"
                value={form.telefone}
                onChange={(e) => atualizarCampo("telefone", formatarTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>CPF *</label>
              <input
                type="text"
                value={form.cpf}
                onChange={(e) => atualizarCampo("cpf", formatarCpf(e.target.value))}
                placeholder="000.000.000-00"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => atualizarCampo("email", e.target.value)}
                placeholder="email@exemplo.com"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Como conheceu a clínica</label>
              <input
                type="text"
                value={form.comoConheceu}
                onChange={(e) => atualizarCampo("comoConheceu", e.target.value)}
                placeholder="Indicação, Instagram, Google..."
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Profissão</label>
              <input
                type="text"
                value={form.profissao}
                onChange={(e) => atualizarCampo("profissao", e.target.value)}
                placeholder="Digite a profissão"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Gênero *</label>
              <select
                value={form.genero}
                onChange={(e) => atualizarCampo("genero", e.target.value)}
                style={styles.input}
              >
                <option value="">Selecione</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
                <option value="Prefiro não informar">Prefiro não informar</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Data de Nascimento *</label>
              <input
                type="date"
                value={form.dataNascimento}
                onChange={(e) => atualizarCampo("dataNascimento", e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.fieldFull}>
              <label style={styles.label}>Observações</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => atualizarCampo("observacoes", e.target.value)}
                placeholder="Digite observações importantes sobre o paciente"
                style={styles.textarea}
              />
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Endereço</h2>

          <div style={styles.grid}>
            <div>
              <label style={styles.label}>CEP</label>
              <input
                type="text"
                value={form.cep}
                onChange={(e) => atualizarCampo("cep", formatarCep(e.target.value))}
                onBlur={(e) => buscarCep(e.target.value)}
                placeholder="00000-000"
                style={styles.input}
              />
              {buscandoCep && <span style={styles.helper}>Buscando CEP...</span>}
            </div>

            <div style={styles.fieldFull}>
              <label style={styles.label}>Rua</label>
              <input
                type="text"
                value={form.rua}
                onChange={(e) => atualizarCampo("rua", e.target.value)}
                placeholder="Rua / Avenida"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Número</label>
              <input
                type="text"
                value={form.numero}
                onChange={(e) => atualizarCampo("numero", e.target.value)}
                placeholder="Número"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Complemento</label>
              <input
                type="text"
                value={form.complemento}
                onChange={(e) => atualizarCampo("complemento", e.target.value)}
                placeholder="Apartamento, casa, sala..."
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Bairro</label>
              <input
                type="text"
                value={form.bairro}
                onChange={(e) => atualizarCampo("bairro", e.target.value)}
                placeholder="Bairro"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Cidade</label>
              <input
                type="text"
                value={form.cidade}
                onChange={(e) => atualizarCampo("cidade", e.target.value)}
                placeholder="Cidade"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Estado</label>
              <input
                type="text"
                value={form.estado}
                onChange={(e) => atualizarCampo("estado", e.target.value)}
                placeholder="UF"
                style={styles.input}
              />
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Dados do responsável</h2>

          <div style={styles.grid}>
            <div style={styles.fieldFull}>
              <label style={styles.label}>Nome Completo</label>
              <input
                type="text"
                value={form.responsavelNome}
                onChange={(e) => atualizarCampo("responsavelNome", e.target.value)}
                placeholder="Digite o nome do responsável"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>CPF</label>
              <input
                type="text"
                value={form.responsavelCpf}
                onChange={(e) =>
                  atualizarCampo("responsavelCpf", formatarCpf(e.target.value))
                }
                placeholder="000.000.000-00"
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Data de Nascimento</label>
              <input
                type="date"
                value={form.responsavelDataNascimento}
                onChange={(e) =>
                  atualizarCampo("responsavelDataNascimento", e.target.value)
                }
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Telefone Celular</label>
              <input
                type="text"
                value={form.responsavelTelefone}
                onChange={(e) =>
                  atualizarCampo("responsavelTelefone", formatarTelefone(e.target.value))
                }
                placeholder="(00) 00000-0000"
                style={styles.input}
              />
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigate("/pacientes")}
          >
            Cancelar
          </button>

          <button type="submit" style={styles.primaryButton} disabled={salvando}>
            {salvando ? "Salvando..." : id ? "Atualizar paciente" : "Cadastrar paciente"}
          </button>
        </div>
      </form>

      {erroModal && (
        <div style={styles.modalOverlay} onClick={() => setErroModal("")}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Atenção</h3>
            <p style={styles.modalText}>{erroModal}</p>
            <button style={styles.modalButton} onClick={() => setErroModal("")}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  header: {
    marginBottom: "22px",
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
  section: {
    marginBottom: "28px",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "16px",
    fontSize: "20px",
    color: "#0f172a",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },
  fieldFull: {
    gridColumn: "1 / -1",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    color: "#334155",
    fontWeight: "600",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #dbe3ee",
    backgroundColor: "#f8fafc",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: "130px",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #dbe3ee",
    backgroundColor: "#f8fafc",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  helper: {
    display: "block",
    marginTop: "6px",
    fontSize: "12px",
    color: "#64748b",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "24px",
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "none",
    borderRadius: "14px",
    padding: "13px 20px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.22)",
  },
  secondaryButton: {
    border: "none",
    borderRadius: "14px",
    padding: "13px 20px",
    backgroundColor: "#e2e8f0",
    color: "#0f172a",
    fontWeight: "700",
    cursor: "pointer",
  },
  loading: {
    color: "#64748b",
    fontSize: "16px",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modalBox: {
    width: "100%",
    maxWidth: "420px",
    backgroundColor: "#fff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
  },
  modalTitle: {
    marginTop: 0,
    marginBottom: "10px",
    color: "#0f172a",
  },
  modalText: {
    margin: 0,
    color: "#475569",
    lineHeight: 1.5,
  },
  modalButton: {
    marginTop: "18px",
    border: "none",
    borderRadius: "12px",
    padding: "12px 18px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer",
  },
};

export default CadastroPaciente;
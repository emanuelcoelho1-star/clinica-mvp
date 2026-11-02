import { useCallback, useEffect, useMemo, useState } from "react";
import API_URL from "../api";

const TIPOS = [
  { value: "convenio", label: "Pago pelo convênio" },
  { value: "padrao", label: "Plano padrão" },
];

const ESPECIALIDADES = [
  "Cirurgia",
  "Dentística",
  "Disfunção Temporomandibular (DTM)",
  "Endodontia",
  "Estética",
  "Harmonização facial",
  "Implantodontia",
  "Odontopediatria",
  "Ortodontia",
  "Ortopedia Funcional",
  "Outros",
  "Periodontia",
  "Prevenção",
  "Prótese",
  "Radiologia",
  "Testes e exames laboratoriais",
  "Urgência"
];

const tokenHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

function Planos() {
  const [planos, setPlanos] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);
  const [planoSelecionado, setPlanoSelecionado] = useState(null);
  const [valores, setValores] = useState({});
  const [nomePlano, setNomePlano] = useState("");
  const [tipoPlano, setTipoPlano] = useState([]);
  const [descricaoPlano, setDescricaoPlano] = useState("");
  const [nomeProcedimento, setNomeProcedimento] = useState("");
  const [codigoProcedimento, setCodigoProcedimento] = useState("");
  const [categoriaProcedimento, setCategoriaProcedimento] = useState("");
  const [especialidadeAberta, setEspecialidadeAberta] = useState("Cirurgia");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [mostrarFormPlano, setMostrarFormPlano] = useState(false);
  const [mostrarFormProcedimento, setMostrarFormProcedimento] = useState(false);

  const requisicao = useCallback(async (url, options = {}) => {
    const response = await fetch(`${API_URL}/planos${url}`, {
      ...options,
      headers: { ...tokenHeaders(), ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.erro || "Não foi possível concluir a operação.");
    return data;
  }, []);

  const carregar = useCallback(async (selecionarId = null) => {
    setCarregando(true);
    setErro("");
    try {
      const [listaPlanos, listaProcedimentos] = await Promise.all([
        requisicao(""),
        requisicao("/procedimentos"),
      ]);
      setPlanos(listaPlanos);
      setProcedimentos(listaProcedimentos);
      const atual = listaPlanos.find((item) => item.id === selecionarId) || listaPlanos[0] || null;
      setPlanoSelecionado(atual?.id || null);
      setValores(atual?.valores || {});
    } catch (error) {
      setErro(error.message || "Erro ao carregar planos.");
    } finally {
      setCarregando(false);
    }
  }, [requisicao]);

  useEffect(() => { carregar(); }, [carregar]);

  const planoAtual = useMemo(
    () => planos.find((item) => item.id === planoSelecionado) || null,
    [planos, planoSelecionado]
  );

  const procedimentosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return procedimentos.filter((item) =>
      item.ativo && (!termo || item.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
        String(item.codigo || "").toLocaleLowerCase("pt-BR").includes(termo))
    );
  }, [procedimentos, busca]);

  const procedimentosPorEspecialidade = useMemo(() => {
    const grupos = Object.fromEntries(ESPECIALIDADES.map((nome) => [nome, []]));
    procedimentosFiltrados.forEach((item) => {
      const especialidade = ESPECIALIDADES.includes(item.categoria) ? item.categoria : "Outros";
      grupos[especialidade].push(item);
    });
    return grupos;
  }, [procedimentosFiltrados]);

  function selecionarPlano(plano) {
    setPlanoSelecionado(plano.id);
    setValores(plano.valores || {});
    setMensagem("");
    setErro("");
  }

  async function criarPlano(evento) {
    evento.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      const resultado = await requisicao("", {
        method: "POST",
        body: JSON.stringify({ nome: nomePlano, tipo: tipoPlano, descricao: descricaoPlano }),
      });
      setNomePlano("");
      setDescricaoPlano("");
      setTipoPlano([]);
      setMostrarFormPlano(false);
      setMensagem("Plano criado com sucesso.");
      await carregar(resultado.id);
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  async function criarProcedimento(evento) {
    evento.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await requisicao("/procedimentos", {
        method: "POST",
        body: JSON.stringify({ nome: nomeProcedimento, codigo: codigoProcedimento, categoria: categoriaProcedimento }),
      });
      setNomeProcedimento("");
      setCodigoProcedimento("");
      setCategoriaProcedimento("");
      setMostrarFormProcedimento(false);
      setMensagem("Procedimento adicionado ao catálogo.");
      await carregar(planoSelecionado);
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarValores() {
    if (!planoAtual) return;
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const lista = procedimentos
        .filter((item) => item.ativo)
        .map((item) => ({
          procedimento_id: item.id,
          valor: valores[item.id] === undefined || valores[item.id] === "" ? null : Number(String(valores[item.id]).replace(",", ".")),
        }));
      await requisicao(`/${planoAtual.id}/valores`, {
        method: "PUT",
        body: JSON.stringify({ valores: lista }),
      });
      setMensagem("Tabela de preços salva com sucesso.");
      await carregar(planoAtual.id);
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirPlano() {
    if (!planoAtual || !window.confirm(`Deseja excluir o plano "${planoAtual.nome}"? Os preços vinculados a ele também serão excluídos.`)) return;
    setSalvando(true);
    try {
      await requisicao(`/${planoAtual.id}`, { method: "DELETE" });
      setMensagem("Plano excluído.");
      await carregar();
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluirProcedimento(item) {
    if (!window.confirm(`Excluir "${item.nome}" do catálogo? Os preços desse procedimento serão removidos de todos os planos.`)) return;
    setSalvando(true);
    try {
      await requisicao(`/procedimentos/${item.id}`, { method: "DELETE" });
      setMensagem("Procedimento removido do catálogo.");
      await carregar(planoSelecionado);
    } catch (error) {
      setErro(error.message);
    } finally {
      setSalvando(false);
    }
  }

  const campo = {
    width: "100%", boxSizing: "border-box", padding: "11px 13px",
    border: "1px solid #e2e8f0", borderRadius: "9px", background: "#fff",
    color: "#0f172a", fontSize: "14px", outline: "none", fontFamily: "inherit",
  };
  const botaoPrimario = {
    border: "none", borderRadius: "9px", padding: "10px 16px",
    background: "#2563eb", color: "#fff", fontSize: "13px",
    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  };
  const botaoSecundario = {
    border: "1px solid #e2e8f0", borderRadius: "9px", padding: "10px 14px",
    background: "#fff", color: "#475569", fontSize: "13px",
    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: "18px", fontWeight: 700 }}>Planos e tabelas de preços</h2>
          <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "13px" }}>Cadastre planos e defina quanto cada procedimento custa em cada um.</p>
        </div>
        <button type="button" style={botaoPrimario} onClick={() => { setMostrarFormPlano((v) => !v); setMostrarFormProcedimento(false); }}>
          + Novo plano
        </button>
      </div>

      {erro && <div style={{ padding: "11px 14px", borderRadius: "9px", background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontSize: "13px" }}>{erro}</div>}
      {mensagem && <div style={{ padding: "11px 14px", borderRadius: "9px", background: "#f0fdf4", border: "1px solid #dcfce7", color: "#15803d", fontSize: "13px" }}>{mensagem}</div>}

      {mostrarFormPlano && (
        <div
          onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !salvando) setMostrarFormPlano(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "rgba(15, 23, 42, .55)", backdropFilter: "blur(3px)" }}
        >
          <form onSubmit={criarPlano} role="dialog" aria-modal="true" aria-labelledby="titulo-modal-plano" style={{ width: "100%", maxWidth: "480px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "15px", padding: "22px", boxShadow: "0 20px 60px rgba(15, 23, 42, .22)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <h3 id="titulo-modal-plano" style={{ margin: 0, color: "#0f172a", fontSize: "17px", fontWeight: 700 }}>Criar novo plano</h3>
                <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "12px" }}>Informe os dados para cadastrar uma nova tabela de preços.</p>
              </div>
              <button type="button" aria-label="Fechar" disabled={salvando} onClick={() => setMostrarFormPlano(false)} style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: "22px", lineHeight: 1 }}>×</button>
            </div>
            <label style={labelStyle}>Nome do plano<input autoFocus style={campo} value={nomePlano} onChange={(e) => setNomePlano(e.target.value)} placeholder="Ex.: Convênio Hapvida" required maxLength={120} /></label>
            <fieldset style={{ border: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "9px" }}>
              <legend style={{ ...labelStyle, marginBottom: "9px" }}>Tipo de plano</legend>
              <span style={{ color: "#64748b", fontSize: "11px" }}>Somente um plano pode ser o padrão da clínica. Ao marcar esta opção em outro plano, o anterior deixará de ser o padrão.</span>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "22px" }}>
                {TIPOS.map((tipo) => {
                  const marcado = tipoPlano.includes(tipo.value);
                  return (
                    <label key={tipo.value} style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#334155", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        name="tipoPlano"
                        value={tipo.value}
                        checked={marcado}
                        onChange={() => setTipoPlano((atual) => {
                          if (marcado) return atual.filter((valor) => valor !== tipo.value);
                          if (tipo.value === "padrao") return [...atual.filter((valor) => valor !== "padrao"), "padrao"];
                          return [...atual, tipo.value];
                        })}
                        style={{ appearance: "none", width: "17px", height: "17px", flex: "0 0 17px", margin: 0, border: marcado ? "5px solid #2563eb" : "1.5px solid #cbd5e1", borderRadius: "50%", background: "#fff", cursor: "pointer", boxSizing: "border-box" }}
                      />
                      {tipo.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <label style={labelStyle}>Descrição (opcional)<input style={campo} value={descricaoPlano} onChange={(e) => setDescricaoPlano(e.target.value)} placeholder="Informações sobre o plano" /></label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "5px" }}>
              <button type="button" style={botaoSecundario} disabled={salvando} onClick={() => setMostrarFormPlano(false)}>Cancelar</button>
              <button type="submit" style={botaoPrimario} disabled={salvando}>{salvando ? "Salvando..." : "Criar plano"}</button>
            </div>
          </form>
        </div>
      )}

      {mostrarFormProcedimento && (
        <div
          onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !salvando) setMostrarFormProcedimento(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "rgba(15, 23, 42, .55)", backdropFilter: "blur(3px)" }}
        >
          <form onSubmit={criarProcedimento} role="dialog" aria-modal="true" aria-labelledby="titulo-modal-procedimento" style={{ width: "100%", maxWidth: "460px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "15px", padding: "22px", boxShadow: "0 20px 60px rgba(15, 23, 42, .22)", display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div>
                <h3 id="titulo-modal-procedimento" style={{ margin: 0, color: "#0f172a", fontSize: "17px", fontWeight: 700 }}>Novo procedimento</h3>
                <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: "12px" }}>Cadastre um procedimento em {categoriaProcedimento}.</p>
              </div>
              <button type="button" aria-label="Fechar" disabled={salvando} onClick={() => setMostrarFormProcedimento(false)} style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: "22px", lineHeight: 1 }}>×</button>
            </div>
            <label style={labelStyle}>Nome do procedimento<input autoFocus style={campo} value={nomeProcedimento} onChange={(e) => setNomeProcedimento(e.target.value)} placeholder="Ex.: Restauração em resina" required /></label>
            <label style={labelStyle}>Código (opcional)<input style={campo} value={codigoProcedimento} onChange={(e) => setCodigoProcedimento(e.target.value)} placeholder="Código do procedimento" /></label>
            <div style={{ padding: "10px 12px", borderRadius: "9px", background: "#f8fafc", color: "#64748b", fontSize: "12px" }}>Especialidade: <strong style={{ color: "#334155" }}>{categoriaProcedimento}</strong></div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "4px" }}>
              <button type="button" style={botaoSecundario} disabled={salvando} onClick={() => setMostrarFormProcedimento(false)}>Cancelar</button>
              <button type="submit" style={botaoPrimario} disabled={salvando}>{salvando ? "Salvando..." : "Adicionar procedimento"}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 0.75fr) minmax(0, 2fr)", gap: "18px", alignItems: "start" }}>
        <section style={cardStyle}>
          <div style={{ padding: "17px 18px", borderBottom: "1px solid #f1f5f9" }}>
            <strong style={{ fontSize: "14px", color: "#0f172a" }}>Planos cadastrados</strong>
            <span style={{ display: "block", marginTop: "3px", color: "#94a3b8", fontSize: "12px" }}>{planos.length} {planos.length === 1 ? "plano" : "planos"}</span>
          </div>
          {carregando ? <p style={emptyStyle}>Carregando planos...</p> : planos.length === 0 ? (
            <p style={emptyStyle}>Nenhum plano cadastrado. Crie o primeiro para começar.</p>
          ) : planos.map((plano) => (
            <button key={plano.id} type="button" onClick={() => selecionarPlano(plano)} style={{
              display: "block", width: "100%", padding: "14px 17px", textAlign: "left",
              border: "none", borderBottom: "1px solid #f1f5f9",
              borderLeft: planoSelecionado === plano.id ? "3px solid #2563eb" : "3px solid transparent",
              background: planoSelecionado === plano.id ? "#eff6ff" : "#fff",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              <strong style={{ display: "block", color: "#1e293b", fontSize: "13px" }}>{plano.nome}</strong>
              <span style={{ display: "block", marginTop: "4px", color: "#94a3b8", fontSize: "11px" }}>{(() => { let tipos = []; try { tipos = Array.isArray(plano.tipo) ? plano.tipo : JSON.parse(plano.tipo || "[]"); } catch { tipos = plano.tipo ? [plano.tipo] : []; } return TIPOS.filter((tipo) => tipos.includes(tipo.value)).map((tipo) => tipo.label).join(" · ") || "Sem classificação"; })()}</span>
            </button>
          ))}
        </section>

        <section style={cardStyle}>
          {!planoAtual ? (
            <div style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>▤</div>
              <strong style={{ display: "block", color: "#475569", fontSize: "14px" }}>Selecione um plano</strong>
              <span style={{ fontSize: "12px" }}>A tabela de preços será exibida aqui.</span>
            </div>
          ) : (
            <>
              <div style={{ padding: "17px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <strong style={{ color: "#0f172a", fontSize: "15px" }}>{planoAtual.nome}</strong>
                  <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "12px" }}>Defina o valor de cada procedimento neste plano.</p>
                </div>
                <button type="button" onClick={excluirPlano} style={{ ...botaoSecundario, color: "#b91c1c" }} disabled={salvando}>Excluir plano</button>
              </div>

              <div style={{ padding: "16px 20px" }}>
                <input style={{ ...campo, width: "100%" }} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar procedimento..." />
              </div>

              <div style={{ padding: "0 20px 16px", display: "flex", flexDirection: "column", gap: "9px" }}>
                {ESPECIALIDADES.map((especialidade, indice) => {
                  const lista = procedimentosPorEspecialidade[especialidade] || [];
                  const aberta = especialidadeAberta === especialidade;
                  return (
                    <section key={especialidade} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: aberta ? "#f8fafc" : "#fff" }}>
                        <button type="button" onClick={() => setEspecialidadeAberta(aberta ? "" : especialidade)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "5px 3px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <strong style={{ color: "#334155", fontSize: "13px" }}>{indice + 1}. {especialidade}</strong>
                            <span style={{ color: "#94a3b8", fontSize: "11px" }}>{lista.length} {lista.length === 1 ? "procedimento" : "procedimentos"}</span>
                          </span>
                          <span style={{ color: "#64748b", fontSize: "16px" }}>{aberta ? "−" : "+"}</span>
                        </button>
                        {aberta && (
                          <button type="button" style={{ ...botaoPrimario, padding: "8px 11px", whiteSpace: "nowrap", flexShrink: 0 }} onClick={() => {
                            setCategoriaProcedimento(especialidade);
                            setNomeProcedimento("");
                            setCodigoProcedimento("");
                            setMostrarFormProcedimento(true);
                            setErro("");
                          }}>+ Novo procedimento</button>
                        )}
                      </div>
                      {aberta && (
                        <div style={{ borderTop: "1px solid #f1f5f9" }}>
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "440px" }}>
                            <thead><tr style={{ background: "#f8fafc" }}>
                              <th style={thStyle}>Procedimento</th>
                              <th style={{ ...thStyle, width: "170px" }}>Valor neste plano</th>
                              <th style={{ ...thStyle, width: "90px" }}>Ação</th>
                            </tr></thead>
                            <tbody>
                              {lista.length === 0 ? (
                                <tr><td colSpan="3" style={{ padding: "20px 14px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>Nenhum procedimento cadastrado nesta especialidade.</td></tr>
                              ) : lista.map((item) => (
                                <tr key={item.id}>
                                  <td style={tdStyle}>
                                    <strong style={{ display: "block", color: "#334155", fontSize: "13px", fontWeight: 600 }}>{item.nome}</strong>
                                    {item.codigo && <span style={{ display: "block", color: "#94a3b8", fontSize: "11px", marginTop: "3px" }}>Código: {item.codigo}</span>}
                                  </td>
                                  <td style={tdStyle}>
                                    <div style={{ position: "relative" }}>
                                      <span style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8", fontSize: "12px" }}>R$</span>
                                      <input aria-label={`Valor de ${item.nome}`} style={{ ...campo, padding: "9px 9px 9px 34px", fontSize: "13px" }} type="number" min="0" step="0.01" placeholder="Não definido" value={valores[item.id] ?? ""} onChange={(e) => setValores((atual) => ({ ...atual, [item.id]: e.target.value }))} />
                                    </div>
                                  </td>
                                  <td style={tdStyle}>
                                    <button type="button" title="Excluir do catálogo" onClick={() => excluirProcedimento(item)} style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: "12px" }}>Excluir</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>

              <div style={{ padding: "15px 20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ color: "#94a3b8", fontSize: "11px" }}>Campos vazios significam que o procedimento não está disponível neste plano.</span>
                <button type="button" style={botaoPrimario} onClick={salvarValores} disabled={salvando}>{salvando ? "Salvando..." : "Salvar tabela de preços"}</button>
              </div>
            </>
          )}
        </section>
      </div>

      <section style={{ ...cardStyle, padding: "16px 18px" }}>
        <strong style={{ display: "block", color: "#334155", fontSize: "13px", marginBottom: "5px" }}>Catálogo da clínica</strong>
        <span style={{ color: "#64748b", fontSize: "12px" }}>As 17 especialidades já ficam disponíveis em todos os planos. O cadastro de procedimentos é compartilhado entre os planos da clínica; os valores são definidos separadamente em cada tabela. Os dados permanecem isolados das demais clínicas.</span>
      </section>
    </div>
  );
}

const labelStyle = { display: "flex", flexDirection: "column", gap: "7px", color: "#475569", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" };
const cardStyle = { background: "#fff", border: "1px solid #f1f5f9", borderRadius: "13px", overflow: "hidden" };
const emptyStyle = { padding: "24px 18px", margin: 0, color: "#94a3b8", fontSize: "12px", lineHeight: 1.6 };
const thStyle = { padding: "11px 14px", textAlign: "left", color: "#64748b", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: "1px solid #e2e8f0" };
const tdStyle = { padding: "10px 14px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };

export default Planos;

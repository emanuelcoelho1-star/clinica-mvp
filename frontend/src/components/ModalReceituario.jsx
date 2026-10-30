import { useEffect, useRef, useState } from "react";
import API_URL from "../api";

function dataHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const UNIDADES = ["Ampola(s)", "Caixa(s)", "Comprimido(s)", "Frasco(s)", "Pacote(s)", "Tubo(s)", "Cápsula(s)"];
const IconClose = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;

function ModalReceituario({ aberto, onFechar }) {
  const [etapa, setEtapa] = useState("tipo");
  const [form, setForm] = useState({ profissional: "", data: dataHojeISO(), medicamentos: [] });
  const [busca, setBusca] = useState("");
  const [medicamentos, setMedicamentos] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);
  const [modalCadastro, setModalCadastro] = useState(false);
  const [salvandoMedicamento, setSalvandoMedicamento] = useState(false);
  const [erroCadastro, setErroCadastro] = useState("");
  const [novoMedicamento, setNovoMedicamento] = useState({
    tipo_uso: "interno", nome: "", quantidade: "", unidade: "Comprimido(s)",
    posologia: "", receita_controlada: false,
  });
  const buscaRef = useRef(null);
  const buscaContainerRef = useRef(null);

  useEffect(() => {
    if (!listaAberta) return;
    function fecharAoClicarFora(evento) {
      if (buscaContainerRef.current && !buscaContainerRef.current.contains(evento.target)) {
        setListaAberta(false);
      }
    }
    function fecharComEscape(evento) {
      if (evento.key === "Escape") setListaAberta(false);
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    document.addEventListener("touchstart", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
      document.removeEventListener("touchstart", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [listaAberta]);

  useEffect(() => {
    if (!aberto || etapa !== "impresso") return;
    const token = localStorage.getItem("token");
    let ativo = true;
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const resposta = await fetch(`${API_URL}/medicamentos?busca=${encodeURIComponent(busca)}`, {
          headers: { Authorization: token || "" },
        });
        if (!resposta.ok) throw new Error("Não foi possível carregar os medicamentos.");
        const dados = await resposta.json();
        if (ativo) setMedicamentos(Array.isArray(dados) ? dados : []);
      } catch (erro) {
        if (ativo) setMedicamentos([]);
      } finally {
        if (ativo) setBuscando(false);
      }
    }, 250);
    return () => { ativo = false; clearTimeout(timer); };
  }, [aberto, etapa, busca]);

  if (!aberto) return null;

  function fechar() {
    setEtapa("tipo");
    setForm({ profissional: "", data: dataHojeISO(), medicamentos: [] });
    setBusca("");
    setListaAberta(false);
    setModalCadastro(false);
    setErroCadastro("");
    onFechar();
  }

  function voltar() {
    setEtapa("tipo");
    setForm((atual) => ({ ...atual, medicamentos: [] }));
    setBusca("");
  }

  function handleInput(e) {
    const { name, value } = e.target;
    setForm((atual) => ({ ...atual, [name]: value }));
  }

  function selecionarMedicamento(medicamento) {
    setForm((atual) => {
      const jaAdicionado = atual.medicamentos.some((item) =>
        item.id != null && medicamento.id != null
          ? String(item.id) === String(medicamento.id)
          : item.nome.toLocaleLowerCase() === medicamento.nome.toLocaleLowerCase()
      );
      if (jaAdicionado) return atual;
      return { ...atual, medicamentos: [...atual.medicamentos, medicamento] };
    });
    setBusca("");
    setListaAberta(false);
  }

  function removerMedicamento(medicamento) {
    setForm((atual) => ({
      ...atual,
      medicamentos: atual.medicamentos.filter((item) =>
        medicamento.id != null && item.id != null
          ? String(item.id) !== String(medicamento.id)
          : item.nome !== medicamento.nome
      ),
    }));
  }

  function atualizarNovoMedicamento(e) {
    const { name, value, type, checked } = e.target;
    setNovoMedicamento((atual) => ({ ...atual, [name]: type === "checkbox" ? checked : value }));
  }

  async function cadastrarMedicamento(e) {
    e.preventDefault();
    setErroCadastro("");
    const token = localStorage.getItem("token");
    try {
      setSalvandoMedicamento(true);
      const resposta = await fetch(`${API_URL}/medicamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token || "" },
        body: JSON.stringify(novoMedicamento),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível cadastrar o medicamento.");
      selecionarMedicamento(dados);
      setBusca(dados.nome);
      setModalCadastro(false);
      setNovoMedicamento({
        tipo_uso: "interno", nome: "", quantidade: "", unidade: "Comprimido(s)",
        posologia: "", receita_controlada: false,
      });
    } catch (erro) {
      setErroCadastro(erro.message);
    } finally {
      setSalvandoMedicamento(false);
    }
  }

  const semResultado = !buscando && medicamentos.length === 0;

  return (
    <div style={M.overlay} onClick={fechar}>
      <div style={M.modal} onClick={(e) => e.stopPropagation()}>
        <div style={M.header}>
          <div>
            <h3 style={M.title}>{etapa === "tipo" ? "Novo receituário" : etapa === "impresso" ? "Receituário impresso" : "Receituário digital"}</h3>
            <p style={M.subtitle}>
              {etapa === "tipo" ? "Escolha como deseja emitir o receituário."
                : etapa === "impresso" ? "Informe os dados para o receituário impresso."
                : "O fluxo do receituário digital será configurado na próxima etapa."}
            </p>
          </div>
          <button type="button" style={M.closeBtn} onClick={fechar} aria-label="Fechar">{IconClose}</button>
        </div>

        {etapa === "tipo" && (
          <div style={M.options}>
            <button type="button" style={M.optionCard} onClick={() => setEtapa("impresso")}>
              <span style={{ ...M.optionIcon, background: "#eff6ff", color: "#2563eb" }}>
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></svg>
              </span>
              <strong style={M.optionTitle}>Receituário impresso</strong>
              <span style={M.optionDescription}>Gerar uma receita para impressão em papel.</span>
            </button>
            <button type="button" style={M.optionCard} onClick={() => setEtapa("digital")}>
              <span style={{ ...M.optionIcon, background: "#f0fdf4", color: "#16a34a" }}>
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M9 6h6M8 11h8M8 15h5" /><path d="m14 18 2 2 4-4" /></svg>
              </span>
              <strong style={M.optionTitle}>Receituário digital</strong>
              <span style={M.optionDescription}>Preparar uma receita em formato digital.</span>
            </button>
          </div>
        )}

        {etapa === "impresso" && (
          <>
            <div style={M.fields}>
              <div style={M.field}>
                <label style={M.label}>Profissional</label>
                <input type="text" name="profissional" value={form.profissional} onChange={handleInput} placeholder="Nome do profissional responsável" style={M.input} />
              </div>
              <div style={M.field}>
                <label style={M.label}>Data</label>
                <input type="date" name="data" value={form.data} onChange={handleInput} style={M.input} />
              </div>
              <div style={M.field}>
                <label style={M.label}>Buscar medicamento</label>
                <div ref={buscaContainerRef} style={M.searchWrap}>
                  <input
                    ref={buscaRef} type="text" value={busca}
                    onChange={(e) => { setBusca(e.target.value); setListaAberta(true); }}
                    onFocus={() => setListaAberta(true)}
                    placeholder="Digite o nome do medicamento..."
                    style={M.input}
                    autoComplete="off"
                  />
                  {listaAberta && (
                    <div style={M.dropdown}>
                      {buscando && <div style={M.dropdownHint}>Buscando medicamentos...</div>}
                      {!buscando && medicamentos.map((medicamento) => (
                        <button type="button" key={medicamento.id} style={M.dropdownItem} onClick={() => selecionarMedicamento(medicamento)}>
                          <span><strong>{medicamento.nome}</strong><small>{medicamento.tipo_uso === "interno" ? "Uso interno" : "Uso externo"} · {medicamento.quantidade} {medicamento.unidade}</small></span>
                          <span style={M.selectHint}>Selecionar</span>
                        </button>
                      ))}
                      {semResultado && <div style={M.dropdownHint}>Nenhum medicamento encontrado.</div>}
                      <button type="button" style={M.addMedicine} onClick={() => { setListaAberta(false); setErroCadastro(""); setModalCadastro(true); }}>
                        <span style={M.plus}>+</span>
                        <span><strong>Cadastrar medicamento</strong><small>Adicionar ao catálogo desta clínica</small></span>
                      </button>
                    </div>
                  )}
                </div>
                {form.medicamentos.map((medicamento) => (
                  <div key={medicamento.id ?? medicamento.nome} style={M.selectedMedicine}>
                    <div style={M.selectedHeader}>
                      <div style={M.selectedIdentity}>
                        <span style={M.selectedEyebrow}>MEDICAMENTO ADICIONADO</span>
                        <strong style={M.selectedName}>{medicamento.nome}</strong>
                        <span style={M.selectedMeta}>
                          {medicamento.tipo_uso === "interno" ? "Uso interno" : "Uso externo"}
                          {medicamento.quantidade ? ` · ${medicamento.quantidade} ${medicamento.unidade || ""}` : ""}
                        </span>
                      </div>
                      <div style={M.selectedActions}>
                        {Number(medicamento.receita_controlada) === 1 && <span style={M.controlledTag}>Receita controlada</span>}
                        <button type="button" aria-label={`Remover ${medicamento.nome}`} title="Remover medicamento" onClick={() => removerMedicamento(medicamento)} style={M.removeSelection}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v5M14 11v5" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div style={M.posologyBlock}>
                      <span style={M.posologyLabel}>POSOLOGIA</span>
                      <p style={M.posologyText}>{medicamento.posologia}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={M.footer}>
              <button type="button" style={M.secondary} onClick={voltar}>Voltar</button>
              <button type="button" style={M.primary} onClick={fechar}>Fechar</button>
            </div>
          </>
        )}

        {etapa === "digital" && (
          <div style={M.digitalInfo}><p>Esta opção ficará disponível quando definirmos o fluxo do receituário digital.</p><button type="button" style={M.secondary} onClick={voltar}>Voltar</button></div>
        )}
      </div>

      {modalCadastro && (
        <div style={M.overlayNested} onClick={() => setModalCadastro(false)}>
          <form style={M.modalCadastro} onClick={(e) => e.stopPropagation()} onSubmit={cadastrarMedicamento}>
            <div style={M.header}>
              <div><h3 style={M.title}>Cadastrar medicamento</h3><p style={M.subtitle}>Este cadastro ficará disponível para todos os profissionais da clínica.</p></div>
              <button type="button" style={M.closeBtn} onClick={() => setModalCadastro(false)} aria-label="Fechar">{IconClose}</button>
            </div>

            <div style={M.field}>
              <label style={M.label}>Tipo de uso</label>
              <div style={M.radioGroup}>
                <label style={M.radioOption}><input type="radio" name="tipo_uso" value="interno" checked={novoMedicamento.tipo_uso === "interno"} onChange={atualizarNovoMedicamento} /> Uso interno</label>
                <label style={M.radioOption}><input type="radio" name="tipo_uso" value="externo" checked={novoMedicamento.tipo_uso === "externo"} onChange={atualizarNovoMedicamento} /> Uso externo</label>
              </div>
            </div>

            <div style={M.field}><label style={M.label}>Nome do medicamento</label><input name="nome" value={novoMedicamento.nome} onChange={atualizarNovoMedicamento} placeholder="Nome do medicamento" style={M.input} maxLength={160} required /></div>

            <div style={M.gridTwo}>
              <div style={M.field}><label style={M.label}>Quantidade</label><input name="quantidade" value={novoMedicamento.quantidade} onChange={atualizarNovoMedicamento} placeholder="Ex.: 1" style={M.input} required /></div>
              <div style={M.field}><label style={M.label}>Unidade de medida</label><select name="unidade" value={novoMedicamento.unidade} onChange={atualizarNovoMedicamento} style={M.input}>{UNIDADES.map((unidade) => <option key={unidade} value={unidade}>{unidade}</option>)}</select></div>
            </div>

            <div style={M.field}><label style={M.label}>Posologia</label><textarea name="posologia" value={novoMedicamento.posologia} onChange={atualizarNovoMedicamento} placeholder="Escreva a posologia do medicamento..." style={M.textarea} rows={3} required /></div>

            <label style={M.checkboxOption}><input type="checkbox" name="receita_controlada" checked={novoMedicamento.receita_controlada} onChange={atualizarNovoMedicamento} /> Esse medicamento exige receita controlada</label>
            {erroCadastro && <div style={M.error}>{erroCadastro}</div>}
            <div style={M.footer}><button type="button" style={M.secondary} onClick={() => setModalCadastro(false)}>Cancelar</button><button type="submit" style={M.primary} disabled={salvandoMedicamento}>{salvandoMedicamento ? "Salvando..." : "Salvar medicamento"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

const M = {
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1000 },
  overlayNested: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 1010 },
  modal: { width: "100%", maxWidth: "560px", background: "#fff", borderRadius: "16px", padding: "28px", boxShadow: "0 24px 64px rgba(15,23,42,0.18)", animation: "documento-fade-in 0.2s ease", display: "flex", flexDirection: "column", gap: "22px", maxHeight: "90vh", overflowY: "auto" },
  modalCadastro: { width: "100%", maxWidth: "540px", background: "#fff", borderRadius: "16px", padding: "26px", boxShadow: "0 24px 64px rgba(15,23,42,0.22)", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "90vh", overflowY: "auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" },
  title: { margin: 0, fontSize: "18px", fontWeight: "700", color: "#0f172a" },
  subtitle: { margin: "6px 0 0", fontSize: "13px", color: "#94a3b8", lineHeight: 1.5 },
  closeBtn: { width: "34px", height: "34px", borderRadius: "8px", border: "1px solid #f1f5f9", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  options: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  optionCard: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "12px", padding: "22px", border: "1px solid #e2e8f0", borderRadius: "14px", background: "#fff", cursor: "pointer", textAlign: "left", transition: "all 0.18s ease" },
  optionIcon: { width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" },
  optionTitle: { fontSize: "14px", color: "#0f172a", fontWeight: "700" },
  optionDescription: { fontSize: "12px", color: "#64748b", lineHeight: 1.5 },
  fields: { display: "flex", flexDirection: "column", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "7px", minWidth: 0 },
  label: { fontSize: "12px", fontWeight: "600", color: "#64748b" },
  input: { width: "100%", minHeight: "42px", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "0 14px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a" },
  textarea: { width: "100%", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "12px 14px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a", resize: "vertical", fontFamily: "inherit" },
  footer: { display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" },
  primary: { border: "none", borderRadius: "10px", padding: "0 18px", minHeight: "40px", background: "#2563eb", color: "#fff", fontWeight: "600", cursor: "pointer" },
  secondary: { border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 16px", minHeight: "40px", background: "#fff", color: "#475569", fontWeight: "500", cursor: "pointer" },
  digitalInfo: { display: "flex", flexDirection: "column", gap: "14px", alignItems: "flex-start", color: "#64748b", fontSize: "13px" },
  searchWrap: { position: "relative" },
  dropdown: { position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "11px", boxShadow: "0 14px 35px rgba(15,23,42,0.13)", zIndex: 5, maxHeight: "260px", overflowY: "auto" },
  dropdownItem: { width: "100%", border: 0, borderBottom: "1px solid #f1f5f9", background: "#fff", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", textAlign: "left", cursor: "pointer", color: "#0f172a" },
  dropdownHint: { padding: "12px 14px", color: "#64748b", fontSize: "12px" },
  selectHint: { color: "#2563eb", fontSize: "11px", fontWeight: "600", whiteSpace: "nowrap" },
  addMedicine: { width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", border: 0, background: "#f8fafc", color: "#1d4ed8", cursor: "pointer", textAlign: "left" },
  plus: { width: "28px", height: "28px", borderRadius: "8px", background: "#dbeafe", display: "grid", placeItems: "center", fontSize: "20px", fontWeight: "500" },
  selectedMedicine: { marginTop: "10px", padding: "15px", border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: "12px", color: "#0f172a", display: "flex", flexDirection: "column", gap: "13px" },
  selectedHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" },
  selectedIdentity: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "4px", minWidth: 0 },
  selectedEyebrow: { color: "#64748b", fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em" },
  selectedName: { color: "#0f172a", fontSize: "15px", fontWeight: "700", lineHeight: 1.4, overflowWrap: "anywhere" },
  selectedMeta: { color: "#64748b", fontSize: "11px" },
  selectedActions: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 },
  posologyBlock: { borderTop: "1px solid #e2e8f0", paddingTop: "11px", display: "flex", flexDirection: "column", gap: "5px" },
  posologyLabel: { color: "#64748b", fontSize: "9px", fontWeight: "700", letterSpacing: "0.08em" },
  posologyText: { margin: 0, color: "#334155", fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
  controlledTag: { fontSize: "10px", fontWeight: "700", color: "#92400e", background: "#fef3c7", borderRadius: "6px", padding: "5px 7px", whiteSpace: "nowrap" },
  removeSelection: { border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", width: "30px", height: "30px", borderRadius: "8px", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 },
  gridTwo: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  radioGroup: { display: "flex", flexWrap: "wrap", gap: "18px" },
  radioOption: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155", cursor: "pointer" },
  checkboxOption: { display: "flex", alignItems: "center", gap: "9px", fontSize: "13px", color: "#334155", cursor: "pointer" },
  error: { color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "9px", padding: "10px 12px", fontSize: "12px" },
};

export default ModalReceituario;

import { useState, useEffect, useCallback } from "react";
import {
  api, formatMoney, formatDate, exportarCSV, hoje,
  Icons, S, Modal, CardKPI, Badge,
} from "./FinanceiroHelpers";

export default function ContasReceber({ mes, ano }) {
  const [contas, setContas] = useState([]);
  const [resumo, setResumo] = useState({});
  const [pacientes, setPacientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [modalAberto, setModalAberto] = useState(false);
  const [modalRecebimento, setModalRecebimento] = useState(false);
  const [form, setForm] = useState({});
  const [formReceb, setFormReceb] = useState({});
  const [salvando, setSalvando] = useState(false);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca, setBusca] = useState("");

  /* ── Carregar dados ────────────────────────── */
  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ mes, ano });
      if (filtroStatus) params.set("status", filtroStatus);

      const [data, pacs, profs, formas] = await Promise.all([
        api(`/contas-receber?${params}`),
        fetch("http://localhost:3001/pacientes", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then((r) => r.json()).catch(() => []),
        api("/profissionais"),
        api("/formas-pagamento"),
      ]);

      setContas(data.contas || []);
      setResumo(data.resumo || {});
      setPacientes(Array.isArray(pacs) ? pacs : []);
      setProfissionais(profs || []);
      setFormasPagamento(formas || []);
    } catch (e) {
      console.error("Erro ao carregar contas a receber:", e);
    } finally {
      setLoading(false);
    }
  }, [mes, ano, filtroStatus]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* ── Filtro local ──────────────────────────── */
  const contasFiltradas = contas.filter((c) => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      (c.descricao || "").toLowerCase().includes(termo) ||
      (c.paciente_nome || "").toLowerCase().includes(termo) ||
      (c.procedimento || "").toLowerCase().includes(termo) ||
      (c.profissional_nome || "").toLowerCase().includes(termo)
    );
  });

  /* ── Ações ─────────────────────────────────── */
  async function salvar() {
    try {
      setSalvando(true);
      if (form.id) {
        await api(`/contas-receber/${form.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await api("/contas-receber", {
          method: "POST",
          body: JSON.stringify(form),
        });
      }
      setModalAberto(false);
      setForm({});
      carregar();
    } catch (e) {
      alert(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function registrarRecebimento() {
    try {
      setSalvando(true);
      await api(`/contas-receber/${formReceb.id}/receber`, {
        method: "PUT",
        body: JSON.stringify({
          valor_recebido: formReceb.valor_recebido,
          data_recebimento: formReceb.data_recebimento || hoje(),
          forma_pagamento: formReceb.forma_pagamento,
        }),
      });
      setModalRecebimento(false);
      setFormReceb({});
      carregar();
    } catch (e) {
      alert(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;
    try {
      await api(`/contas-receber/${id}`, { method: "DELETE" });
      carregar();
    } catch (e) {
      alert(e.message);
    }
  }

  function abrirEditar(conta) {
    setForm({ ...conta });
    setModalAberto(true);
  }

  function abrirReceber(conta) {
    setFormReceb({
      id: conta.id,
      descricao: conta.descricao,
      paciente_nome: conta.paciente_nome,
      valor_total: conta.valor,
      valor_restante: conta.valor - (conta.valor_recebido || 0),
      valor_recebido: conta.valor - (conta.valor_recebido || 0),
      data_recebimento: hoje(),
      forma_pagamento: conta.forma_pagamento || "",
    });
    setModalRecebimento(true);
  }

  /* ── Render ────────────────────────────────── */
  if (loading) {
    return <div style={S.loadingBox}>Carregando contas a receber...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── KPI Cards ────��───────────────────── */}
      <div style={S.kpiGrid4}>
        <CardKPI
          titulo="Total Pendente"
          valor={formatMoney(resumo.total_pendente)}
          cor="#f97316"
          icone={Icons.money}
        />
        <CardKPI
          titulo="Total Recebido (Geral)"
          valor={formatMoney(resumo.total_recebido)}
          cor="#16a34a"
          icone={Icons.check}
        />
        <CardKPI
          titulo="Total Vencido"
          valor={formatMoney(resumo.total_vencido)}
          cor="#dc2626"
          icone={Icons.inadimplencia}
          subtitulo={`${resumo.qtd_vencidas || 0} conta(s)`}
          trend="down"
        />
        <CardKPI
          titulo="Contas no Mês"
          valor={contasFiltradas.length}
          cor="#2563eb"
          icone={Icons.receber}
        />
      </div>

      {/* ── Toolbar ──────────────────────────── */}
      <div style={S.toolbar}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 10, top: "50%",
              transform: "translateY(-50%)", color: "#94a3b8", display: "flex",
            }}>
              {Icons.search}
            </span>
            <input
              style={{ ...S.input, paddingLeft: 32, width: 220 }}
              placeholder="Buscar paciente, procedimento..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <span style={{ color: "#94a3b8", display: "flex" }}>{Icons.filter}</span>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={S.select}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="parcial">Parcial</option>
            <option value="pago">Pago</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={S.btnOutline}
            onClick={() => exportarCSV("/exportar/contas-receber", "contas_receber.csv", { mes, ano, status: filtroStatus })}
          >
            {Icons.download} <span>Exportar</span>
          </button>
          <button
            style={S.btnPrimary}
            onClick={() => {
              setForm({
                data_emissao: hoje(),
                total_parcelas: 1,
                forma_pagamento: "dinheiro",
              });
              setModalAberto(true);
            }}
          >
            {Icons.plus} <span>Nova Conta</span>
          </button>
        </div>
      </div>

      {/* ── Tabela ───────────────────────────── */}
      <div style={S.card}>
        {contasFiltradas.length === 0 ? (
          <div style={S.emptyState}>
            {busca || filtroStatus
              ? "Nenhuma conta encontrada com os filtros aplicados."
              : "Nenhuma conta a receber registrada neste período."
            }
          </div>
        ) : (
          <div style={S.tableWrapper}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Paciente</th>
                  <th style={S.th}>Descrição</th>
                  <th style={S.th}>Procedimento</th>
                  <th style={S.th}>Profissional</th>
                  <th style={S.th}>Valor</th>
                  <th style={S.th}>Vencimento</th>
                  <th style={S.th}>Forma Pgto</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Parcela</th>
                  <th style={{ ...S.th, textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contasFiltradas.map((c) => {
                  const vencida = c.status !== "pago" && c.data_vencimento < hoje();
                  const proximaVencer = !vencida && c.status !== "pago" && (() => {
                    const diff = (new Date(c.data_vencimento) - new Date()) / (1000 * 60 * 60 * 24);
                    return diff <= 5 && diff >= 0;
                  })();

                  return (
                    <tr
                      key={c.id}
                      style={{
                        background: vencida ? "#fef2f2" : proximaVencer ? "#fffbeb" : "transparent",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={S.td}>
                        {c.paciente_nome ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={estilos.avatarPaciente}>
                              {c.paciente_nome.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 500, color: "#0f172a", fontSize: 13 }}>
                              {c.paciente_nome}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={S.td}>
                        <span style={{ fontWeight: 500, color: "#334155" }}>{c.descricao}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{ color: "#64748b", fontSize: 12 }}>{c.procedimento || "—"}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{ color: "#64748b", fontSize: 12 }}>{c.profissional_nome || "—"}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontWeight: 600, color: "#16a34a" }}>
                          {formatMoney(c.valor)}
                        </span>
                        {c.desconto > 0 && (
                          <span style={{ display: "block", fontSize: 10, color: "#8b5cf6" }}>
                            Desc: {formatMoney(c.desconto)}
                          </span>
                        )}
                        {c.valor_recebido > 0 && c.valor_recebido < c.valor && (
                          <>
                            <span style={{ display: "block", fontSize: 11, color: "#16a34a" }}>
                              Recebido: {formatMoney(c.valor_recebido)}
                            </span>
                            <span style={{ display: "block", fontSize: 10, color: "#f97316" }}>
                              Restante: {formatMoney(c.valor - c.valor_recebido)}
                            </span>
                          </>
                        )}
                      </td>
                      <td style={S.td}>
                        <span style={{
                          color: vencida ? "#dc2626" : proximaVencer ? "#d97706" : "#334155",
                          fontWeight: vencida || proximaVencer ? 600 : 400,
                        }}>
                          {formatDate(c.data_vencimento)}
                        </span>
                        {vencida && (
                          <span style={{ display: "block", fontSize: 10, color: "#dc2626", fontWeight: 700 }}>
                            VENCIDA
                          </span>
                        )}
                        {proximaVencer && (
                          <span style={{ display: "block", fontSize: 10, color: "#d97706", fontWeight: 600 }}>
                            VENCE EM BREVE
                          </span>
                        )}
                      </td>
                      <td style={S.td}>
                        <span style={{
                          fontSize: 12, color: "#64748b",
                          textTransform: "capitalize",
                        }}>
                          {c.forma_pagamento || "—"}
                        </span>
                      </td>
                      <td style={S.td}>
                        <Badge status={c.status} />
                      </td>
                      <td style={S.td}>
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>
                          {c.parcela_atual}/{c.total_parcelas}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          {c.status !== "pago" && (
                            <button
                              style={S.btnIconSuccess}
                              onClick={() => abrirReceber(c)}
                              title="Registrar Recebimento"
                            >
                              {Icons.check}
                            </button>
                          )}
                          <button
                            style={S.btnIcon}
                            onClick={() => abrirEditar(c)}
                            title="Editar"
                          >
                            {Icons.edit}
                          </button>
                          {c.status !== "pago" && (
                            <button
                              style={S.btnIconDanger}
                              onClick={() => excluir(c.id)}
                              title="Excluir"
                            >
                              {Icons.trash}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Nova/Editar Conta ──────────── */}
      <Modal
        aberto={modalAberto}
        onFechar={() => { setModalAberto(false); setForm({}); }}
        titulo={form.id ? "Editar Conta a Receber" : "Nova Conta a Receber"}
        largura={660}
      >
        <div style={S.formGrid}>
          <div style={S.formGroup}>
            <label style={S.label}>Paciente</label>
            <select
              style={S.input}
              value={form.paciente_id || ""}
              onChange={(e) => setForm({ ...form, paciente_id: e.target.value })}
            >
              <option value="">Selecione o paciente</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Profissional</label>
            <select
              style={S.input}
              value={form.profissional_id || ""}
              onChange={(e) => setForm({ ...form, profissional_id: e.target.value })}
            >
              <option value="">Selecione</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>{p.nome} {p.cro ? `(CRO: ${p.cro})` : ""}</option>
              ))}
            </select>
          </div>
          <div style={S.formGroup2}>
            <label style={S.label}>Descrição *</label>
            <input
              style={S.input}
              value={form.descricao || ""}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Tratamento de canal"
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Procedimento</label>
            <input
              style={S.input}
              value={form.procedimento || ""}
              onChange={(e) => setForm({ ...form, procedimento: e.target.value })}
              placeholder="Ex: Endodontia"
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Valor (R$) *</label>
            <input
              style={S.input}
              type="number"
              step="0.01"
              min="0"
              value={form.valor || ""}
              onChange={(e) => setForm({ ...form, valor: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Desconto (R$)</label>
            <input
              style={S.input}
              type="number"
              step="0.01"
              min="0"
              value={form.desconto || ""}
              onChange={(e) => setForm({ ...form, desconto: parseFloat(e.target.value) || 0 })}
              placeholder="0,00"
            />
            {form.valor > 0 && form.desconto > 0 && (
              <span style={{ fontSize: 11, color: "#16a34a", marginTop: 2 }}>
                Valor final: {formatMoney(form.valor - form.desconto)}
              </span>
            )}
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Data Vencimento *</label>
            <input
              style={S.input}
              type="date"
              value={form.data_vencimento || ""}
              onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Data Emissão</label>
            <input
              style={S.input}
              type="date"
              value={form.data_emissao || ""}
              onChange={(e) => setForm({ ...form, data_emissao: e.target.value })}
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Forma de Pagamento</label>
            <select
              style={S.input}
              value={form.forma_pagamento || ""}
              onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}
            >
              <option value="">Selecione</option>
              {formasPagamento.map((f) => (
                <option key={f.id} value={f.tipo}>{f.nome}</option>
              ))}
            </select>
          </div>
          {!form.id && (
            <div style={S.formGroup}>
              <label style={S.label}>Nº Parcelas</label>
              <input
                style={S.input}
                type="number"
                min="1"
                max="48"
                value={form.total_parcelas || 1}
                onChange={(e) => setForm({ ...form, total_parcelas: parseInt(e.target.value) || 1 })}
              />
              {(form.total_parcelas || 1) > 1 && form.valor > 0 && (
                <span style={{ fontSize: 11, color: "#2563eb", marginTop: 2 }}>
                  {form.total_parcelas}x de {formatMoney((form.valor - (form.desconto || 0)) / form.total_parcelas)}
                </span>
              )}
            </div>
          )}
          <div style={S.formGroup}>
            <label style={S.label}>Nº Nota</label>
            <input
              style={S.input}
              value={form.numero_nota || ""}
              onChange={(e) => setForm({ ...form, numero_nota: e.target.value })}
              placeholder="Número da nota fiscal"
            />
          </div>
          <div style={S.formGroup2}>
            <label style={S.label}>Observações</label>
            <textarea
              style={{ ...S.input, minHeight: 60, resize: "vertical" }}
              value={form.observacoes || ""}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Anotações adicionais..."
            />
          </div>
        </div>
        <div style={S.formActions}>
          <button style={S.btnOutline} onClick={() => { setModalAberto(false); setForm({}); }}>
            Cancelar
          </button>
          <button
            style={{
              ...S.btnPrimary,
              opacity: salvando || !form.descricao || !form.valor || !form.data_vencimento ? 0.6 : 1,
            }}
            onClick={salvar}
            disabled={salvando || !form.descricao || !form.valor || !form.data_vencimento}
          >
            {salvando ? "Salvando..." : form.id ? "Salvar Alterações" : "Criar Conta"}
          </button>
        </div>
      </Modal>

      {/* ── Modal Registrar Recebimento ──────── */}
      <Modal
        aberto={modalRecebimento}
        onFechar={() => { setModalRecebimento(false); setFormReceb({}); }}
        titulo="Registrar Recebimento"
        largura={460}
      >
        <div style={{
          padding: 16, background: "#f0fdf4",
          borderRadius: 10, marginBottom: 16,
          border: "1px solid #bbf7d0",
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            Conta: <strong style={{ color: "#0f172a" }}>{formReceb.descricao}</strong>
          </p>
          {formReceb.paciente_nome && (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
              Paciente: <strong style={{ color: "#334155" }}>{formReceb.paciente_nome}</strong>
            </p>
          )}
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Valor total: <strong style={{ color: "#16a34a" }}>{formatMoney(formReceb.valor_total)}</strong>
            {" • "}
            Restante: <strong style={{ color: "#f97316" }}>{formatMoney(formReceb.valor_restante)}</strong>
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={S.formGroup}>
            <label style={S.label}>Valor Recebido (R$) *</label>
            <input
              style={S.input}
              type="number"
              step="0.01"
              min="0"
              max={formReceb.valor_restante}
              value={formReceb.valor_recebido || ""}
              onChange={(e) => setFormReceb({ ...formReceb, valor_recebido: parseFloat(e.target.value) || 0 })}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <button
                style={{ ...S.btnOutline, padding: "4px 10px", fontSize: 11 }}
                onClick={() => setFormReceb({ ...formReceb, valor_recebido: formReceb.valor_restante })}
              >
                Valor total
              </button>
              <button
                style={{ ...S.btnOutline, padding: "4px 10px", fontSize: 11 }}
                onClick={() => setFormReceb({ ...formReceb, valor_recebido: formReceb.valor_restante / 2 })}
              >
                Metade
              </button>
            </div>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Data do Recebimento *</label>
            <input
              style={S.input}
              type="date"
              value={formReceb.data_recebimento || ""}
              onChange={(e) => setFormReceb({ ...formReceb, data_recebimento: e.target.value })}
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Forma de Pagamento</label>
            <select
              style={S.input}
              value={formReceb.forma_pagamento || ""}
              onChange={(e) => setFormReceb({ ...formReceb, forma_pagamento: e.target.value })}
            >
              <option value="">Selecione</option>
              {formasPagamento.map((f) => (
                <option key={f.id} value={f.tipo}>{f.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Info sobre comissão automática */}
        <div style={{
          marginTop: 14, padding: 12,
          background: "#eff6ff", borderRadius: 8,
          border: "1px solid #bfdbfe",
        }}>
          <p style={{ margin: 0, fontSize: 11, color: "#2563eb" }}>
            💡 Se esta conta estiver vinculada a um profissional com comissão configurada,
            a comissão será calculada automaticamente ao confirmar o recebimento total.
          </p>
        </div>

        <div style={S.formActions}>
          <button style={S.btnOutline} onClick={() => { setModalRecebimento(false); setFormReceb({}); }}>
            Cancelar
          </button>
          <button
            style={{
              ...S.btnPrimary,
              background: "#16a34a",
              opacity: salvando || !formReceb.valor_recebido ? 0.6 : 1,
            }}
            onClick={registrarRecebimento}
            disabled={salvando || !formReceb.valor_recebido}
          >
            {salvando ? "Processando..." : `Receber ${formatMoney(formReceb.valor_recebido || 0)}`}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS LOCAIS
   ══════════════════════════════════════════════════════════════ */
const estilos = {
  avatarPaciente: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
};
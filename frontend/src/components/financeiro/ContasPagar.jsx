import { useState, useEffect, useCallback } from "react";
import {
  api, formatMoney, formatDate, exportarCSV, hoje,
  Icons, S, Modal, CardKPI, Badge,
} from "./FinanceiroHelpers";

export default function ContasPagar({ mes, ano }) {
  const [contas, setContas] = useState([]);
  const [resumo, setResumo] = useState({});
  const [categorias, setCategorias] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modalPgto, setModalPgto] = useState(false);
  const [form, setForm] = useState({});
  const [formPgto, setFormPgto] = useState({});
  const [salvando, setSalvando] = useState(false);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [busca, setBusca] = useState("");

  /* ── Carregar dados ────────────────────────── */
  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ mes, ano });
      if (filtroStatus) params.set("status", filtroStatus);
      if (filtroCategoria) params.set("categoria_id", filtroCategoria);

      const [data, cats, formas] = await Promise.all([
        api(`/contas-pagar?${params}`),
        api("/categorias?tipo=despesa"),
        api("/formas-pagamento"),
      ]);

      setContas(data.contas || []);
      setResumo(data.resumo || {});
      setCategorias(cats || []);
      setFormasPagamento(formas || []);
    } catch (e) {
      console.error("Erro ao carregar contas a pagar:", e);
    } finally {
      setLoading(false);
    }
  }, [mes, ano, filtroStatus, filtroCategoria]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* ── Filtro local por busca ────────────────── */
  const contasFiltradas = contas.filter((c) => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      (c.descricao || "").toLowerCase().includes(termo) ||
      (c.fornecedor || "").toLowerCase().includes(termo) ||
      (c.categoria_nome || "").toLowerCase().includes(termo)
    );
  });

  /* ── Ações ─────────────────────────────────── */
  async function salvar() {
    try {
      setSalvando(true);
      if (form.id) {
        await api(`/contas-pagar/${form.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await api("/contas-pagar", {
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

  async function registrarPagamento() {
    try {
      setSalvando(true);
      await api(`/contas-pagar/${formPgto.id}/pagar`, {
        method: "PUT",
        body: JSON.stringify({
          valor_pago: formPgto.valor_pago,
          data_pagamento: formPgto.data_pagamento || hoje(),
          forma_pagamento: formPgto.forma_pagamento,
        }),
      });
      setModalPgto(false);
      setFormPgto({});
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
      await api(`/contas-pagar/${id}`, { method: "DELETE" });
      carregar();
    } catch (e) {
      alert(e.message);
    }
  }

  function abrirEditar(conta) {
    setForm({ ...conta });
    setModalAberto(true);
  }

  function abrirPagar(conta) {
    setFormPgto({
      id: conta.id,
      descricao: conta.descricao,
      valor_total: conta.valor,
      valor_restante: conta.valor - (conta.valor_pago || 0),
      valor_pago: conta.valor - (conta.valor_pago || 0),
      data_pagamento: hoje(),
      forma_pagamento: conta.forma_pagamento || "",
    });
    setModalPgto(true);
  }

  /* ── Render ────────────────────────────────── */
  if (loading) {
    return <div style={S.loadingBox}>Carregando contas a pagar...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── KPI Cards ────────────────────────── */}
      <div style={S.kpiGrid4}>
        <CardKPI
          titulo="Total Pendente"
          valor={formatMoney(resumo.total_pendente)}
          cor="#f97316"
          icone={Icons.money}
        />
        <CardKPI
          titulo="Total Pago (Geral)"
          valor={formatMoney(resumo.total_pago)}
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
          icone={Icons.pagar}
        />
      </div>

      {/* ── Toolbar ──────────────────────────── */}
      <div style={S.toolbar}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Busca */}
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 10, top: "50%",
              transform: "translateY(-50%)", color: "#94a3b8",
              display: "flex",
            }}>
              {Icons.search}
            </span>
            <input
              style={{ ...S.input, paddingLeft: 32, width: 200 }}
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {/* Filtro Status */}
          <span style={{ color: "#94a3b8", display: "flex" }}>{Icons.filter}</span>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={S.select}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="parcial">Parcial</option>
            <option value="pago">Pago</option>
          </select>

          {/* Filtro Categoria */}
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={S.select}>
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={S.btnOutline}
            onClick={() => exportarCSV("/exportar/contas-pagar", "contas_pagar.csv", { mes, ano, status: filtroStatus })}
          >
            {Icons.download} <span>Exportar</span>
          </button>
          <button
            style={S.btnPrimary}
            onClick={() => { setForm({ data_emissao: hoje(), total_parcelas: 1 }); setModalAberto(true); }}
          >
            {Icons.plus} <span>Nova Conta</span>
          </button>
        </div>
      </div>

      {/* ── Tabela ───────────────────────────── */}
      <div style={S.card}>
        {contasFiltradas.length === 0 ? (
          <div style={S.emptyState}>
            {busca || filtroStatus || filtroCategoria
              ? "Nenhuma conta encontrada com os filtros aplicados."
              : "Nenhuma conta a pagar registrada neste período."
            }
          </div>
        ) : (
          <div style={S.tableWrapper}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Descrição</th>
                  <th style={S.th}>Categoria</th>
                  <th style={S.th}>Fornecedor</th>
                  <th style={S.th}>Valor</th>
                  <th style={S.th}>Vencimento</th>
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
                        <span style={{ fontWeight: 500, color: "#0f172a", display: "block" }}>
                          {c.descricao}
                        </span>
                        {c.numero_documento && (
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            Doc: {c.numero_documento}
                          </span>
                        )}
                      </td>
                      <td style={S.td}>
                        {c.categoria_nome ? (
                          <span style={{
                            ...S.tagCategoria,
                            borderColor: c.categoria_cor || "#94a3b8",
                            color: c.categoria_cor || "#64748b",
                          }}>
                            {c.categoria_nome}
                          </span>
                        ) : (
                          <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={S.td}>
                        <span style={{ color: "#64748b" }}>{c.fornecedor || "—"}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontWeight: 600, color: "#dc2626" }}>
                          {formatMoney(c.valor)}
                        </span>
                        {c.valor_pago > 0 && c.valor_pago < c.valor && (
                          <span style={{ display: "block", fontSize: 11, color: "#16a34a" }}>
                            Pago: {formatMoney(c.valor_pago)}
                          </span>
                        )}
                        {c.valor_pago > 0 && c.valor_pago < c.valor && (
                          <span style={{ display: "block", fontSize: 10, color: "#f97316" }}>
                            Restante: {formatMoney(c.valor - c.valor_pago)}
                          </span>
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
                              onClick={() => abrirPagar(c)}
                              title="Registrar Pagamento"
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
        titulo={form.id ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
        largura={620}
      >
        <div style={S.formGrid}>
          <div style={S.formGroup2}>
            <label style={S.label}>Descrição *</label>
            <input
              style={S.input}
              value={form.descricao || ""}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Aluguel do consultório"
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Categoria</label>
            <select
              style={S.input}
              value={form.categoria_id || ""}
              onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
            >
              <option value="">Selecione</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Fornecedor</label>
            <input
              style={S.input}
              value={form.fornecedor || ""}
              onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
              placeholder="Nome do fornecedor"
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Valor Total (R$) *</label>
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
                  {form.total_parcelas}x de {formatMoney(form.valor / form.total_parcelas)}
                </span>
              )}
            </div>
          )}
          <div style={S.formGroup}>
            <label style={S.label}>Nº Documento</label>
            <input
              style={S.input}
              value={form.numero_documento || ""}
              onChange={(e) => setForm({ ...form, numero_documento: e.target.value })}
              placeholder="Nota fiscal, boleto..."
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Código de Barras</label>
            <input
              style={S.input}
              value={form.codigo_barras || ""}
              onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
              placeholder="Código de barras do boleto"
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

      {/* ── Modal Registrar Pagamento ────────── */}
      <Modal
        aberto={modalPgto}
        onFechar={() => { setModalPgto(false); setFormPgto({}); }}
        titulo="Registrar Pagamento"
        largura={460}
      >
        <div style={{
          padding: 16, background: "#f8fafc",
          borderRadius: 10, marginBottom: 16,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            Conta: <strong style={{ color: "#0f172a" }}>{formPgto.descricao}</strong>
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
            Valor total: <strong style={{ color: "#dc2626" }}>{formatMoney(formPgto.valor_total)}</strong>
            {" • "}
            Restante: <strong style={{ color: "#f97316" }}>{formatMoney(formPgto.valor_restante)}</strong>
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={S.formGroup}>
            <label style={S.label}>Valor do Pagamento (R$) *</label>
            <input
              style={S.input}
              type="number"
              step="0.01"
              min="0"
              max={formPgto.valor_restante}
              value={formPgto.valor_pago || ""}
              onChange={(e) => setFormPgto({ ...formPgto, valor_pago: parseFloat(e.target.value) || 0 })}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <button
                style={{ ...S.btnOutline, padding: "4px 10px", fontSize: 11 }}
                onClick={() => setFormPgto({ ...formPgto, valor_pago: formPgto.valor_restante })}
              >
                Valor total
              </button>
              <button
                style={{ ...S.btnOutline, padding: "4px 10px", fontSize: 11 }}
                onClick={() => setFormPgto({ ...formPgto, valor_pago: formPgto.valor_restante / 2 })}
              >
                Metade
              </button>
            </div>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Data do Pagamento *</label>
            <input
              style={S.input}
              type="date"
              value={formPgto.data_pagamento || ""}
              onChange={(e) => setFormPgto({ ...formPgto, data_pagamento: e.target.value })}
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Forma de Pagamento</label>
            <select
              style={S.input}
              value={formPgto.forma_pagamento || ""}
              onChange={(e) => setFormPgto({ ...formPgto, forma_pagamento: e.target.value })}
            >
              <option value="">Selecione</option>
              {formasPagamento.map((f) => (
                <option key={f.id} value={f.tipo}>{f.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={S.formActions}>
          <button style={S.btnOutline} onClick={() => { setModalPgto(false); setFormPgto({}); }}>
            Cancelar
          </button>
          <button
            style={{
              ...S.btnPrimary,
              background: "#16a34a",
              opacity: salvando || !formPgto.valor_pago ? 0.6 : 1,
            }}
            onClick={registrarPagamento}
            disabled={salvando || !formPgto.valor_pago}
          >
            {salvando ? "Processando..." : `Pagar ${formatMoney(formPgto.valor_pago || 0)}`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
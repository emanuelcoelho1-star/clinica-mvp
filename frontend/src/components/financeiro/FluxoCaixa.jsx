import { useState, useEffect, useCallback } from "react";
import {
  api, formatMoney, formatDate, exportarCSV, hoje,
  Icons, S, Modal, CardKPI,
} from "./FinanceiroHelpers";

export default function FluxoCaixa({ mes, ano }) {
  const [dados, setDados] = useState({ movimentacoes: [], por_dia: [], totais: {}, projecao: {} });
  const [categorias, setCategorias] = useState([]);
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ tipo: "entrada" });
  const [salvando, setSalvando] = useState(false);

  // Visualização
  const [periodo, setPeriodo] = useState("mensal");
  const [viewMode, setViewMode] = useState("lista"); // lista | agrupado

  /* ── Carregar dados ────────────────────────── */
  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const [fluxo, cats, formas] = await Promise.all([
        api(`/fluxo-caixa?mes=${mes}&ano=${ano}&periodo=${periodo}`),
        api("/categorias"),
        api("/formas-pagamento"),
      ]);
      setDados(fluxo);
      setCategorias(cats || []);
      setFormasPagamento(formas || []);
    } catch (e) {
      console.error("Erro ao carregar fluxo de caixa:", e);
    } finally {
      setLoading(false);
    }
  }, [mes, ano, periodo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* ── Ações ─────────────────────────────────── */
  async function salvar() {
    try {
      setSalvando(true);
      await api("/fluxo-caixa", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setModalAberto(false);
      setForm({ tipo: "entrada" });
      carregar();
    } catch (e) {
      alert(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      await api(`/fluxo-caixa/${id}`, { method: "DELETE" });
      carregar();
    } catch (e) {
      alert(e.message);
    }
  }

  /* ── Gráfico Fluxo por Dia (SVG) ──────────── */
  function GraficoFluxoDiario() {
    const dias = dados.por_dia || [];
    if (!dias.length) {
      return <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Sem movimentações no período</div>;
    }

    const maxVal = Math.max(...dias.flatMap((d) => [d.entradas, d.saidas]), 1);
    const w = 700;
    const h = 220;
    const padding = { top: 15, right: 15, bottom: 35, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const barGroupW = chartW / dias.length;
    const barW = Math.min(barGroupW * 0.35, 24);
    const gap = (barGroupW - barW * 2) / 3;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: 700, height: "auto" }}>
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <line
            key={i}
            x1={padding.left} x2={w - padding.right}
            y1={padding.top + chartH * (1 - pct)}
            y2={padding.top + chartH * (1 - pct)}
            stroke="#f1f5f9" strokeWidth="1"
          />
        ))}
        {/* Barras por dia */}
        {dias.map((d, i) => {
          const x = padding.left + i * barGroupW;
          const hEnt = (d.entradas / maxVal) * chartH;
          const hSai = (d.saidas / maxVal) * chartH;
          const labelDia = d.data ? d.data.split("-")[2] : "";
          return (
            <g key={i}>
              <rect
                x={x + gap} y={padding.top + chartH - hEnt}
                width={barW} height={hEnt}
                rx="2" fill="#22c55e" opacity="0.8"
              />
              <rect
                x={x + gap + barW + 2} y={padding.top + chartH - hSai}
                width={barW} height={hSai}
                rx="2" fill="#ef4444" opacity="0.8"
              />
              <text
                x={x + barGroupW / 2} y={h - 10}
                textAnchor="middle" fontSize="10" fill="#94a3b8"
              >
                {labelDia}
              </text>
            </g>
          );
        })}
        {/* Legenda */}
        <rect x={padding.left} y={h - 18} width="7" height="7" rx="2" fill="#22c55e" />
        <text x={padding.left + 10} y={h - 11} fontSize="9" fill="#64748b">Entradas</text>
        <rect x={padding.left + 65} y={h - 18} width="7" height="7" rx="2" fill="#ef4444" />
        <text x={padding.left + 75} y={h - 11} fontSize="9" fill="#64748b">Saídas</text>
      </svg>
    );
  }

  /* ── Gráfico Saldo Acumulado (linha SVG) ──── */
  function GraficoSaldoAcumulado() {
    const movs = dados.movimentacoes || [];
    if (!movs.length) {
      return <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Sem dados</div>;
    }

    const saldos = movs.map((m) => m.saldo_acumulado);
    const maxSaldo = Math.max(...saldos.map(Math.abs), 1);
    const minSaldo = Math.min(...saldos, 0);
    const range = maxSaldo - minSaldo || 1;

    const w = 700;
    const h = 180;
    const padding = { top: 15, right: 15, bottom: 25, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const points = movs.map((m, i) => {
      const x = padding.left + (i / (movs.length - 1 || 1)) * chartW;
      const y = padding.top + chartH - ((m.saldo_acumulado - minSaldo) / range) * chartH;
      return `${x},${y}`;
    });

    const polyline = points.join(" ");

    // Área preenchida
    const firstX = padding.left;
    const lastX = padding.left + chartW;
    const bottomY = padding.top + chartH;
    const areaPoints = `${firstX},${bottomY} ${polyline} ${lastX},${bottomY}`;

    const ultimoSaldo = saldos[saldos.length - 1] || 0;
    const corLinha = ultimoSaldo >= 0 ? "#22c55e" : "#ef4444";

    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: 700, height: "auto" }}>
        {/* Linha zero */}
        {minSaldo < 0 && (
          <line
            x1={padding.left} x2={w - padding.right}
            y1={padding.top + chartH - ((0 - minSaldo) / range) * chartH}
            y2={padding.top + chartH - ((0 - minSaldo) / range) * chartH}
            stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4"
          />
        )}
        {/* Área */}
        <polygon points={areaPoints} fill={corLinha} opacity="0.08" />
        {/* Linha */}
        <polyline
          points={polyline}
          fill="none" stroke={corLinha} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        />
        {/* Ponto final */}
        {movs.length > 0 && (() => {
          const lastPt = points[points.length - 1].split(",");
          return (
            <circle cx={parseFloat(lastPt[0])} cy={parseFloat(lastPt[1])} r="4" fill={corLinha} stroke="#fff" strokeWidth="2" />
          );
        })()}
        {/* Label saldo final */}
        <text
          x={w - padding.right} y={padding.top + 12}
          textAnchor="end" fontSize="11" fill={corLinha} fontWeight="700"
        >
          Saldo: {formatMoney(ultimoSaldo)}
        </text>
      </svg>
    );
  }

  /* ── Render ────────────────────────────────── */
  if (loading) {
    return <div style={S.loadingBox}>Carregando fluxo de caixa...</div>;
  }

  const t = dados.totais || {};
  const p = dados.projecao || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── KPI Cards ────────────────────────── */}
      <div style={S.kpiGrid}>
        <CardKPI
          titulo="Total Entradas"
          valor={formatMoney(t.entradas)}
          cor="#16a34a"
          icone={Icons.receber}
        />
        <CardKPI
          titulo="Total Saídas"
          valor={formatMoney(t.saidas)}
          cor="#dc2626"
          icone={Icons.pagar}
        />
        <CardKPI
          titulo="Saldo do Período"
          valor={formatMoney(t.saldo)}
          cor={t.saldo >= 0 ? "#16a34a" : "#dc2626"}
          icone={Icons.money}
          trend={t.saldo >= 0 ? "up" : "down"}
        />
        <CardKPI
          titulo="Projeção (A Receber)"
          valor={formatMoney(p.a_receber)}
          cor="#2563eb"
          icone={Icons.trendUp}
          subtitulo="Pendente no mês"
        />
        <CardKPI
          titulo="Projeção (A Pagar)"
          valor={formatMoney(p.a_pagar)}
          cor="#f97316"
          icone={Icons.trendDown}
          subtitulo="Pendente no mês"
        />
        <CardKPI
          titulo="Saldo Projetado"
          valor={formatMoney(p.saldo_projetado)}
          cor={p.saldo_projetado >= 0 ? "#16a34a" : "#dc2626"}
          icone={Icons.fluxo}
          trend={p.saldo_projetado >= 0 ? "up" : "down"}
          subtitulo="Realizado + pendente"
        />
      </div>

      {/* ── Toolbar ──────────────────────────── */}
      <div style={S.toolbar}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Período */}
          <div style={{
            display: "flex", background: "#f1f5f9",
            borderRadius: 8, padding: 2, gap: 2,
          }}>
            <button
              onClick={() => setPeriodo("mensal")}
              style={{
                ...estilos.toggleBtn,
                ...(periodo === "mensal" ? estilos.toggleBtnActive : {}),
              }}
            >
              Mensal
            </button>
            <button
              onClick={() => setPeriodo("semanal")}
              style={{
                ...estilos.toggleBtn,
                ...(periodo === "semanal" ? estilos.toggleBtnActive : {}),
              }}
            >
              Semanal
            </button>
          </div>

          {/* View mode */}
          <div style={{
            display: "flex", background: "#f1f5f9",
            borderRadius: 8, padding: 2, gap: 2,
          }}>
            <button
              onClick={() => setViewMode("lista")}
              style={{
                ...estilos.toggleBtn,
                ...(viewMode === "lista" ? estilos.toggleBtnActive : {}),
              }}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode("agrupado")}
              style={{
                ...estilos.toggleBtn,
                ...(viewMode === "agrupado" ? estilos.toggleBtnActive : {}),
              }}
            >
              Por Dia
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={S.btnOutline}
            onClick={() => exportarCSV("/exportar/fluxo-caixa", "fluxo_caixa.csv", { mes, ano })}
          >
            {Icons.download} <span>Exportar</span>
          </button>
          <button
            style={S.btnPrimary}
            onClick={() => { setForm({ tipo: "entrada", data: hoje() }); setModalAberto(true); }}
          >
            {Icons.plus} <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* ── Gráficos ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={S.card}>
          <h4 style={S.cardTitle}>📊 Entradas vs Saídas por Dia</h4>
          <GraficoFluxoDiario />
        </div>
        <div style={S.card}>
          <h4 style={S.cardTitle}>📈 Saldo Acumulado</h4>
          <GraficoSaldoAcumulado />
        </div>
      </div>

      {/* ── Movimentações ────────────────────── */}
      <div style={S.card}>
        <h4 style={S.cardTitle}>
          📋 Movimentações
          <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8", marginLeft: 8 }}>
            ({dados.movimentacoes?.length || 0} lançamento(s))
          </span>
        </h4>

        {viewMode === "lista" ? (
          /* ── Vista Lista ──────────────────── */
          dados.movimentacoes?.length === 0 ? (
            <div style={S.emptyState}>Nenhuma movimentação registrada neste período.</div>
          ) : (
            <div style={S.tableWrapper}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Tipo</th>
                    <th style={S.th}>Descrição</th>
                    <th style={S.th}>Valor</th>
                    <th style={S.th}>Data</th>
                    <th style={S.th}>Forma Pgto</th>
                    <th style={S.th}>Saldo</th>
                    <th style={{ ...S.th, textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.movimentacoes.map((m) => (
                    <tr key={m.id}>
                      <td style={S.td}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: m.tipo === "entrada" ? "#dcfce7" : "#fee2e2",
                          color: m.tipo === "entrada" ? "#16a34a" : "#dc2626",
                        }}>
                          {m.tipo === "entrada" ? "↓ Entrada" : "↑ Saída"}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontWeight: 500, color: "#0f172a" }}>{m.descricao}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{
                          fontWeight: 600,
                          color: m.tipo === "entrada" ? "#16a34a" : "#dc2626",
                        }}>
                          {m.tipo === "entrada" ? "+" : "−"} {formatMoney(m.valor)}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ color: "#64748b" }}>{formatDate(m.data)}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{ color: "#64748b", fontSize: 12, textTransform: "capitalize" }}>
                          {m.forma_pagamento || "—"}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{
                          fontWeight: 600,
                          color: m.saldo_acumulado >= 0 ? "#16a34a" : "#dc2626",
                        }}>
                          {formatMoney(m.saldo_acumulado)}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        {!m.conta_pagar_id && !m.conta_receber_id && (
                          <button
                            style={S.btnIconDanger}
                            onClick={() => excluir(m.id)}
                            title="Excluir lançamento manual"
                          >
                            {Icons.trash}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ── Vista Agrupada por Dia ────────── */
          dados.por_dia?.length === 0 ? (
            <div style={S.emptyState}>Nenhuma movimentação registrada neste período.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {dados.por_dia.map((dia) => {
                const saldoDia = dia.entradas - dia.saidas;
                return (
                  <div key={dia.data} style={estilos.diaGroup}>
                    {/* Header do dia */}
                    <div style={estilos.diaHeader}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={estilos.diaData}>{formatDate(dia.data)}</span>
                        <span style={estilos.diaDiaSemana}>
                          {new Date(dia.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long" })}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                          ↓ {formatMoney(dia.entradas)}
                        </span>
                        <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
                          ↑ {formatMoney(dia.saidas)}
                        </span>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: saldoDia >= 0 ? "#16a34a" : "#dc2626",
                          padding: "2px 8px",
                          background: saldoDia >= 0 ? "#f0fdf4" : "#fef2f2",
                          borderRadius: 6,
                        }}>
                          {saldoDia >= 0 ? "+" : ""}{formatMoney(saldoDia)}
                        </span>
                      </div>
                    </div>
                    {/* Itens do dia */}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {dia.movimentacoes.map((m) => (
                        <div key={m.id} style={estilos.diaItem}>
                          <span style={{
                            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                            background: m.tipo === "entrada" ? "#22c55e" : "#ef4444",
                          }} />
                          <span style={{ flex: 1, fontSize: 13, color: "#334155" }}>{m.descricao}</span>
                          <span style={{
                            fontSize: 12, color: "#94a3b8",
                            textTransform: "capitalize",
                          }}>
                            {m.forma_pagamento || ""}
                          </span>
                          <span style={{
                            fontSize: 13, fontWeight: 600, minWidth: 90, textAlign: "right",
                            color: m.tipo === "entrada" ? "#16a34a" : "#dc2626",
                          }}>
                            {m.tipo === "entrada" ? "+" : "−"} {formatMoney(m.valor)}
                          </span>
                          {!m.conta_pagar_id && !m.conta_receber_id && (
                            <button
                              style={{ ...S.btnIconDanger, width: 24, height: 24 }}
                              onClick={() => excluir(m.id)}
                            >
                              {Icons.trash}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ── Modal Novo Lançamento ────────────── */}
      <Modal
        aberto={modalAberto}
        onFechar={() => { setModalAberto(false); setForm({ tipo: "entrada" }); }}
        titulo="Novo Lançamento Manual"
        largura={500}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Tipo (toggle) */}
          <div style={S.formGroup}>
            <label style={S.label}>Tipo *</label>
            <div style={{
              display: "flex", background: "#f1f5f9",
              borderRadius: 10, padding: 3, gap: 3,
            }}>
              <button
                type="button"
                onClick={() => setForm({ ...form, tipo: "entrada" })}
                style={{
                  flex: 1, padding: "8px 0", border: "none",
                  borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  background: form.tipo === "entrada" ? "#dcfce7" : "transparent",
                  color: form.tipo === "entrada" ? "#16a34a" : "#94a3b8",
                }}
              >
                ↓ Entrada
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, tipo: "saida" })}
                style={{
                  flex: 1, padding: "8px 0", border: "none",
                  borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                  background: form.tipo === "saida" ? "#fee2e2" : "transparent",
                  color: form.tipo === "saida" ? "#dc2626" : "#94a3b8",
                }}
              >
                ↑ Saída
              </button>
            </div>
          </div>

          <div style={S.formGroup}>
            <label style={S.label}>Descrição *</label>
            <input
              style={S.input}
              value={form.descricao || ""}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Recebimento avulso, ajuste de caixa..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
              <label style={S.label}>Data *</label>
              <input
                style={S.input}
                type="date"
                value={form.data || ""}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={S.formGroup}>
              <label style={S.label}>Categoria</label>
              <select
                style={S.input}
                value={form.categoria_id || ""}
                onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
              >
                <option value="">Selecione</option>
                {categorias
                  .filter((c) => form.tipo === "entrada" ? c.tipo === "receita" : c.tipo === "despesa")
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))
                }
              </select>
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
          </div>

          <div style={S.formGroup}>
            <label style={S.label}>Observações</label>
            <textarea
              style={{ ...S.input, minHeight: 55, resize: "vertical" }}
              value={form.observacoes || ""}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Anotações..."
            />
          </div>
        </div>

        <div style={S.formActions}>
          <button style={S.btnOutline} onClick={() => { setModalAberto(false); setForm({ tipo: "entrada" }); }}>
            Cancelar
          </button>
          <button
            style={{
              ...S.btnPrimary,
              background: form.tipo === "entrada" ? "#16a34a" : "#dc2626",
              opacity: salvando || !form.descricao || !form.valor || !form.data ? 0.6 : 1,
            }}
            onClick={salvar}
            disabled={salvando || !form.descricao || !form.valor || !form.data}
          >
            {salvando ? "Salvando..." : form.tipo === "entrada" ? "Registrar Entrada" : "Registrar Saída"}
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
  toggleBtn: {
    padding: "6px 14px",
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    background: "transparent",
    color: "#64748b",
    transition: "all 0.15s",
  },
  toggleBtnActive: {
    background: "#fff",
    color: "#0f172a",
    fontWeight: 600,
    boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
  },
  diaGroup: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #f1f5f9",
    overflow: "hidden",
  },
  diaHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    background: "#f8fafc",
    borderBottom: "1px solid #f1f5f9",
    flexWrap: "wrap",
    gap: 8,
  },
  diaData: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
  },
  diaDiaSemana: {
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "capitalize",
  },
  diaItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    borderBottom: "1px solid #f8fafc",
  },
};
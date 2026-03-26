import { useState, useEffect, useCallback } from "react";
import {
  api, formatMoney, Icons, S,
  CardKPI, GraficoBarras, GraficoPizza,
} from "./FinanceiroHelpers";

export default function FinanceiroDashboard({ mes, ano }) {
  const [dashboard, setDashboard] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, kpiData] = await Promise.all([
        api(`/dashboard?mes=${mes}&ano=${ano}`),
        api(`/kpis?mes=${mes}&ano=${ano}`),
      ]);
      setDashboard(dash);
      setKpis(kpiData);
    } catch (e) {
      console.error("Erro ao carregar dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, [mes, ano]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (loading) {
    return <div style={S.loadingBox}>Carregando dashboard financeiro...</div>;
  }

  if (!dashboard) {
    return <div style={S.emptyState}>Não foi possível carregar o dashboard.</div>;
  }

  const d = dashboard;
  const k = kpis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── KPI Cards Principais ──────────────── */}
      <div style={S.kpiGrid}>
        <CardKPI
          titulo="Receitas do Mês"
          valor={formatMoney(d.resumo.receitas)}
          cor="#16a34a"
          icone={Icons.trendUp}
          subtitulo={`Margem: ${d.resumo.margem}%`}
          trend="up"
        />
        <CardKPI
          titulo="Despesas do Mês"
          valor={formatMoney(d.resumo.despesas)}
          cor="#dc2626"
          icone={Icons.trendDown}
        />
        <CardKPI
          titulo="Lucro Líquido"
          valor={formatMoney(d.resumo.lucro)}
          cor={d.resumo.lucro >= 0 ? "#16a34a" : "#dc2626"}
          icone={Icons.money}
          trend={d.resumo.lucro >= 0 ? "up" : "down"}
        />
        <CardKPI
          titulo="A Receber (Pendente)"
          valor={formatMoney(d.pendentes.a_receber.total)}
          cor="#2563eb"
          icone={Icons.receber}
          subtitulo={`${d.pendentes.a_receber.quantidade} conta(s)`}
        />
        <CardKPI
          titulo="A Pagar (Pendente)"
          valor={formatMoney(d.pendentes.a_pagar.total)}
          cor="#f97316"
          icone={Icons.pagar}
          subtitulo={`${d.pendentes.a_pagar.quantidade} conta(s)`}
        />
        <CardKPI
          titulo="Vencidos (Receber)"
          valor={formatMoney(d.vencidos.a_receber.total)}
          cor="#dc2626"
          icone={Icons.inadimplencia}
          subtitulo={`${d.vencidos.a_receber.quantidade} conta(s)`}
          trend="down"
        />
      </div>

      {/* ── Gráficos ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
        <div style={S.card}>
          <h4 style={S.cardTitle}>📊 Receitas vs Despesas (últimos 6 meses)</h4>
          <GraficoBarras dados={d.grafico_mensal} />
        </div>
        <div style={S.card}>
          <h4 style={S.cardTitle}>💳 Receitas por Forma de Pagamento</h4>
          <GraficoPizza dados={d.formas_pagamento} />
        </div>
      </div>

      {/* ── KPIs Detalhados ───────────────────── */}
      {k && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>

          {/* Ticket Médio e Conversão */}
          <div style={S.card}>
            <h4 style={S.cardTitle}>📈 Indicadores</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={estilos.indicadorRow}>
                <span style={estilos.indicadorLabel}>Ticket Médio</span>
                <span style={estilos.indicadorValor}>{formatMoney(k.ticket_medio)}</span>
              </div>
              <div style={estilos.indicadorRow}>
                <span style={estilos.indicadorLabel}>Total Recebimentos</span>
                <span style={estilos.indicadorValor}>{k.total_recebimentos}</span>
              </div>
              <div style={estilos.indicadorRow}>
                <span style={estilos.indicadorLabel}>Taxa Conversão Orçamentos</span>
                <span style={{ ...estilos.indicadorValor, color: "#2563eb" }}>{k.taxa_conversao}%</span>
              </div>
              <div style={estilos.indicadorRow}>
                <span style={estilos.indicadorLabel}>Orçamentos (Aprovados/Total)</span>
                <span style={estilos.indicadorValor}>
                  {k.orcamentos?.aprovados || 0}/{k.orcamentos?.total || 0}
                </span>
              </div>
              <div style={estilos.indicadorRow}>
                <span style={estilos.indicadorLabel}>Taxa Inadimplência</span>
                <span style={{
                  ...estilos.indicadorValor,
                  color: parseFloat(k.taxa_inadimplencia) > 10 ? "#dc2626" : "#16a34a",
                }}>
                  {k.taxa_inadimplencia}%
                </span>
              </div>
              {k.variacao_receita && (
                <div style={estilos.indicadorRow}>
                  <span style={estilos.indicadorLabel}>Variação vs Mês Anterior</span>
                  <span style={{
                    ...estilos.indicadorValor,
                    color: parseFloat(k.variacao_receita.percentual) >= 0 ? "#16a34a" : "#dc2626",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    {parseFloat(k.variacao_receita.percentual) >= 0 ? (
                      <span style={{ display: "inline-flex" }}>{Icons.trendUp}</span>
                    ) : (
                      <span style={{ display: "inline-flex" }}>{Icons.trendDown}</span>
                    )}
                    {k.variacao_receita.percentual}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Top 5 Procedimentos */}
          <div style={S.card}>
            <h4 style={S.cardTitle}>🏆 Top Procedimentos</h4>
            {k.top_procedimentos && k.top_procedimentos.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {k.top_procedimentos.map((p, i) => {
                  const maxReceita = k.top_procedimentos[0]?.receita_total || 1;
                  const pct = (p.receita_total / maxReceita) * 100;
                  return (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#334155" }}>
                          {i + 1}. {p.procedimento}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>
                          {formatMoney(p.receita_total)}
                        </span>
                      </div>
                      <div style={S.progressBar}>
                        <div style={{
                          ...S.progressFill,
                          width: `${pct}%`,
                          background: ["#2563eb", "#22c55e", "#f97316", "#8b5cf6", "#ec4899"][i] || "#64748b",
                        }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>{p.quantidade} atendimento(s)</span>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>Média: {formatMoney(p.valor_medio)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={S.emptyState}>Nenhum procedimento registrado neste mês.</div>
            )}
          </div>

          {/* Receita por Profissional */}
          <div style={S.card}>
            <h4 style={S.cardTitle}>👨‍⚕️ Receita por Profissional</h4>
            {k.receita_por_profissional && k.receita_por_profissional.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {k.receita_por_profissional.map((p, i) => (
                  <div key={i} style={estilos.profissionalRow}>
                    <div style={estilos.profissionalAvatar}>
                      {p.profissional?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                        {p.profissional}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                        {p.atendimentos} atendimento(s)
                      </p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>
                      {formatMoney(p.receita_total)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={S.emptyState}>Nenhum profissional com receita neste mês.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Meta do Mês ───────────────────────── */}
      {d.meta && (
        <div style={S.card}>
          <h4 style={S.cardTitle}>🎯 Meta do Mês</h4>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>{d.meta.titulo}</span>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: d.resumo.receitas >= d.meta.valor_meta ? "#16a34a" : "#f97316",
                }}>
                  {((d.resumo.receitas / d.meta.valor_meta) * 100).toFixed(0)}%
                </span>
              </div>
              <div style={S.progressBar}>
                <div style={{
                  ...S.progressFill,
                  width: `${Math.min((d.resumo.receitas / d.meta.valor_meta) * 100, 100)}%`,
                  background: d.resumo.receitas >= d.meta.valor_meta
                    ? "linear-gradient(90deg, #22c55e, #16a34a)"
                    : "linear-gradient(90deg, #3b82f6, #2563eb)",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  Atual: {formatMoney(d.resumo.receitas)}
                </span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  Meta: {formatMoney(d.meta.valor_meta)}
                </span>
              </div>
            </div>
            {d.resumo.receitas >= d.meta.valor_meta && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", background: "#f0fdf4",
                borderRadius: 10, border: "1px solid #bbf7d0",
              }}>
                <span style={{ fontSize: 20 }}>🎉</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>Meta atingida!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Vencimentos Próximos ──────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* A Pagar Vencendo */}
        <div style={S.card}>
          <h4 style={S.cardTitle}>
            ⚠️ Contas a Pagar Vencidas
            {d.vencidos.a_pagar.quantidade > 0 && (
              <span style={{
                marginLeft: 8, background: "#fef2f2",
                color: "#dc2626", padding: "2px 8px",
                borderRadius: 10, fontSize: 11, fontWeight: 700,
              }}>
                {d.vencidos.a_pagar.quantidade}
              </span>
            )}
          </h4>
          {d.vencidos.a_pagar.quantidade > 0 ? (
            <div style={estilos.alertBox}>
              <p style={{ margin: 0, fontSize: 13, color: "#dc2626", fontWeight: 500 }}>
                Você tem <strong>{d.vencidos.a_pagar.quantidade}</strong> conta(s) vencida(s) totalizando{" "}
                <strong>{formatMoney(d.vencidos.a_pagar.total)}</strong>
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8" }}>
                Acesse a aba "Contas a Pagar" para regularizar.
              </p>
            </div>
          ) : (
            <div style={estilos.okBox}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 500 }}>
                Nenhuma conta a pagar vencida!
              </span>
            </div>
          )}
        </div>

        {/* A Receber Vencendo */}
        <div style={S.card}>
          <h4 style={S.cardTitle}>
            ⚠️ Contas a Receber Vencidas
            {d.vencidos.a_receber.quantidade > 0 && (
              <span style={{
                marginLeft: 8, background: "#fef2f2",
                color: "#dc2626", padding: "2px 8px",
                borderRadius: 10, fontSize: 11, fontWeight: 700,
              }}>
                {d.vencidos.a_receber.quantidade}
              </span>
            )}
          </h4>
          {d.vencidos.a_receber.quantidade > 0 ? (
            <div style={estilos.alertBox}>
              <p style={{ margin: 0, fontSize: 13, color: "#dc2626", fontWeight: 500 }}>
                Você tem <strong>{d.vencidos.a_receber.quantidade}</strong> conta(s) vencida(s) totalizando{" "}
                <strong>{formatMoney(d.vencidos.a_receber.total)}</strong>
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8" }}>
                Acesse a aba "Inadimplência" para detalhes.
              </p>
            </div>
          ) : (
            <div style={estilos.okBox}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 500 }}>
                Nenhuma conta a receber vencida!
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS LOCAIS (só deste componente)
   ══════════════════════════════════════════════════════════════ */
const estilos = {
  indicadorRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottom: "1px solid #f8fafc",
  },
  indicadorLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 500,
  },
  indicadorValor: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: 700,
  },
  profissionalRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 0",
    borderBottom: "1px solid #f8fafc",
  },
  profissionalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  alertBox: {
    padding: 16,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
  },
  okBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 16,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
  },
};
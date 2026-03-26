import { useState, useEffect, useCallback } from "react";
import {
  api, formatMoney, formatDate, exportarCSV,
  Icons, S, CardKPI, Badge,
} from "./FinanceiroHelpers";

export default function Inadimplencia({ mes, ano }) {
  const [dados, setDados] = useState({ inadimplentes: [], resumo: {} });
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroGravidade, setFiltroGravidade] = useState("");
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState(null); // id do paciente expandido

  /* ── Carregar dados ────────────────────────── */
  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api("/inadimplencia");
      setDados(data);
    } catch (e) {
      console.error("Erro ao carregar inadimplência:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* ── Filtros ───────────────────────────────── */
  const inadimplentes = (dados.inadimplentes || []).filter((i) => {
    if (filtroGravidade && i.gravidade !== filtroGravidade) return false;
    if (busca) {
      const termo = busca.toLowerCase();
      return (
        (i.paciente_nome || "").toLowerCase().includes(termo) ||
        (i.paciente_telefone || "").toLowerCase().includes(termo) ||
        (i.paciente_email || "").toLowerCase().includes(termo)
      );
    }
    return true;
  });

  /* ── Render ────────────────────────────────── */
  if (loading) {
    return <div style={S.loadingBox}>Carregando relatório de inadimplência...</div>;
  }

  const r = dados.resumo || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── KPI Cards ────────────────────────── */}
      <div style={S.kpiGrid}>
        <CardKPI
          titulo="Total Inadimplente"
          valor={formatMoney(r.valor_total)}
          cor="#dc2626"
          icone={Icons.money}
          subtitulo={`${r.total_inadimplentes || 0} paciente(s)`}
          trend="down"
        />
        <CardKPI
          titulo="Críticos (+90 dias)"
          valor={r.criticos || 0}
          cor="#dc2626"
          icone={Icons.inadimplencia}
        />
        <CardKPI
          titulo="Moderados (31–90 dias)"
          valor={r.moderados || 0}
          cor="#f97316"
          icone={Icons.inadimplencia}
        />
        <CardKPI
          titulo="Leves (1–30 dias)"
          valor={r.leves || 0}
          cor="#eab308"
          icone={Icons.inadimplencia}
        />
      </div>

      {/* ── Barra de gravidade visual ────────── */}
      {r.total_inadimplentes > 0 && (
        <div style={S.card}>
          <h4 style={S.cardTitle}>📊 Distribuição por Gravidade</h4>
          <div style={{ display: "flex", gap: 4, height: 32, borderRadius: 8, overflow: "hidden" }}>
            {r.criticos > 0 && (
              <div
                style={{
                  flex: r.criticos,
                  background: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                }}
                title={`Críticos: ${r.criticos}`}
              >
                {r.criticos} Crítico{r.criticos > 1 ? "s" : ""}
              </div>
            )}
            {r.moderados > 0 && (
              <div
                style={{
                  flex: r.moderados,
                  background: "#f97316",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                }}
                title={`Moderados: ${r.moderados}`}
              >
                {r.moderados} Moderado{r.moderados > 1 ? "s" : ""}
              </div>
            )}
            {r.leves > 0 && (
              <div
                style={{
                  flex: r.leves,
                  background: "#eab308",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                }}
                title={`Leves: ${r.leves}`}
              >
                {r.leves} Leve{r.leves > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      )}

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
              placeholder="Buscar paciente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <span style={{ color: "#94a3b8", display: "flex" }}>{Icons.filter}</span>
          <select
            value={filtroGravidade}
            onChange={(e) => setFiltroGravidade(e.target.value)}
            style={S.select}
          >
            <option value="">Todas as gravidades</option>
            <option value="critico">🔴 Crítico (+90 dias)</option>
            <option value="moderado">🟠 Moderado (31–90 dias)</option>
            <option value="leve">🟡 Leve (1–30 dias)</option>
          </select>
        </div>
        <button
          style={S.btnOutline}
          onClick={() => exportarCSV("/exportar/inadimplencia", "inadimplencia.csv")}
        >
          {Icons.download} <span>Exportar</span>
        </button>
      </div>

      {/* ── Lista de Inadimplentes ───────────── */}
      {inadimplentes.length === 0 ? (
        <div style={S.card}>
          <div style={estilos.emptyOk}>
            <span style={{ fontSize: 40 }}>🎉</span>
            <h3 style={{ margin: "10px 0 4px", color: "#16a34a", fontSize: 16 }}>
              {busca || filtroGravidade
                ? "Nenhum resultado encontrado"
                : "Nenhum paciente inadimplente!"}
            </h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>
              {busca || filtroGravidade
                ? "Tente ajustar os filtros de busca."
                : "Todas as contas a receber estão em dia."}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {inadimplentes.map((inad) => {
            const isExpandido = expandido === inad.paciente_id;
            return (
              <div key={inad.paciente_id} style={estilos.pacienteCard}>
                {/* ── Header do paciente ─────── */}
                <div
                  style={estilos.pacienteHeader}
                  onClick={() => setExpandido(isExpandido ? null : inad.paciente_id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                    {/* Avatar com cor de gravidade */}
                    <div style={{
                      ...estilos.avatar,
                      background: inad.gravidade === "critico"
                        ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                        : inad.gravidade === "moderado"
                          ? "linear-gradient(135deg, #f97316, #ea580c)"
                          : "linear-gradient(135deg, #eab308, #ca8a04)",
                    }}>
                      {inad.paciente_nome?.charAt(0)?.toUpperCase() || "?"}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                          {inad.paciente_nome}
                        </span>
                        <Badge status={inad.gravidade} />
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
                        {inad.paciente_telefone && (
                          <span style={{ fontSize: 12, color: "#64748b" }}>
                            📱 {inad.paciente_telefone}
                          </span>
                        )}
                        {inad.paciente_email && (
                          <span style={{ fontSize: 12, color: "#64748b" }}>
                            ✉️ {inad.paciente_email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#dc2626" }}>
                        {formatMoney(inad.valor_total_devido)}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                        {inad.total_contas} conta(s) • Até {inad.dias_atraso_max} dias de atraso
                      </p>
                    </div>
                    <span style={{
                      display: "flex",
                      transform: isExpandido ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      color: "#94a3b8",
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* ── Detalhes expandidos ─────── */}
                {isExpandido && (
                  <div style={estilos.pacienteDetalhes}>
                    {/* Timeline de vencimentos */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        Primeiro vencimento: <strong>{formatDate(inad.vencimento_mais_antigo)}</strong>
                      </span>
                      <span style={{ color: "#e2e8f0" }}>→</span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        Último vencimento: <strong>{formatDate(inad.vencimento_mais_recente)}</strong>
                      </span>
                    </div>

                    {/* Tabela de contas */}
                    <div style={S.tableWrapper}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={S.th}>Descrição</th>
                            <th style={S.th}>Procedimento</th>
                            <th style={S.th}>Valor</th>
                            <th style={S.th}>Recebido</th>
                            <th style={S.th}>Restante</th>
                            <th style={S.th}>Vencimento</th>
                            <th style={S.th}>Dias Atraso</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(inad.contas || []).map((conta) => {
                            let corAtraso = "#eab308";
                            if (conta.dias_atraso > 90) corAtraso = "#dc2626";
                            else if (conta.dias_atraso > 30) corAtraso = "#f97316";

                            return (
                              <tr key={conta.id}>
                                <td style={S.td}>
                                  <span style={{ fontWeight: 500, color: "#334155" }}>
                                    {conta.descricao}
                                  </span>
                                </td>
                                <td style={S.td}>
                                  <span style={{ color: "#64748b", fontSize: 12 }}>
                                    {conta.procedimento || "—"}
                                  </span>
                                </td>
                                <td style={S.td}>
                                  <span style={{ fontWeight: 500, color: "#0f172a" }}>
                                    {formatMoney(conta.valor)}
                                  </span>
                                </td>
                                <td style={S.td}>
                                  <span style={{ color: "#16a34a", fontSize: 12 }}>
                                    {formatMoney(conta.valor_recebido)}
                                  </span>
                                </td>
                                <td style={S.td}>
                                  <span style={{ fontWeight: 600, color: "#dc2626" }}>
                                    {formatMoney(conta.valor_restante)}
                                  </span>
                                </td>
                                <td style={S.td}>
                                  <span style={{ color: "#dc2626", fontWeight: 500 }}>
                                    {formatDate(conta.data_vencimento)}
                                  </span>
                                </td>
                                <td style={S.td}>
                                  <span style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: `${corAtraso}15`,
                                    color: corAtraso,
                                  }}>
                                    {conta.dias_atraso} dias
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Ações rápidas */}
                    <div style={estilos.acoesRapidas}>
                      {inad.paciente_telefone && (
                        <a
                          href={`https://wa.me/55${inad.paciente_telefone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={estilos.btnWhatsapp}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          WhatsApp
                        </a>
                      )}
                      {inad.paciente_email && (
                        <a
                          href={`mailto:${inad.paciente_email}?subject=Cobrança - Contas em aberto&body=Olá ${inad.paciente_nome}, verificamos que existem valores pendentes no valor de ${formatMoney(inad.valor_total_devido)}. Entre em contato para regularizar.`}
                          style={estilos.btnEmail}
                        >
                          ✉️ E-mail
                        </a>
                      )}
                      {inad.paciente_telefone && (
                        <a
                          href={`tel:${inad.paciente_telefone.replace(/\D/g, "")}`}
                          style={estilos.btnTelefone}
                        >
                          📞 Ligar
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS LOCAIS
   ══════════════════════════════════════════════════════════════ */
const estilos = {
  emptyOk: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "50px 20px",
    textAlign: "center",
  },
  pacienteCard: {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #f1f5f9",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
  },
  pacienteHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    cursor: "pointer",
    transition: "background 0.15s ease",
    gap: 12,
    flexWrap: "wrap",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 700,
    flexShrink: 0,
  },
  pacienteDetalhes: {
    padding: "0 20px 20px",
    borderTop: "1px solid #f1f5f9",
    paddingTop: 16,
  },
  acoesRapidas: {
    display: "flex",
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTop: "1px solid #f1f5f9",
    flexWrap: "wrap",
  },
  btnWhatsapp: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    background: "#25D366",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  btnEmail: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    background: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
  },
  btnTelefone: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    background: "#f0fdf4",
    color: "#16a34a",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    textDecoration: "none",
    cursor: "pointer",
  },
};
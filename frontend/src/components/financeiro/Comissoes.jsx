import { useState, useEffect, useCallback } from "react";
import {
  api, formatMoney, formatDate, exportarCSV, hoje,
  Icons, S, Modal, CardKPI, Badge,
} from "./FinanceiroHelpers";

export default function Comissoes({ mes, ano }) {
  const [comissoes, setComissoes] = useState([]);
  const [resumoProfissionais, setResumoProfissionais] = useState([]);
  const [totais, setTotais] = useState({ total_geral: 0, total_pendente: 0, total_pago: 0 });
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [modalProfissional, setModalProfissional] = useState(false);
  const [formProf, setFormProf] = useState({ tipo: "dentista", tipo_comissao: "percentual" });
  const [salvando, setSalvando] = useState(false);

  // Filtros
  const [filtroProfissional, setFiltroProfissional] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [viewMode, setViewMode] = useState("resumo"); // resumo | detalhado

  // Seleção para pagamento em lote
  const [selecionados, setSelecionados] = useState([]);

  /* ── Carregar dados ────────────────────────── */
  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ mes, ano });
      if (filtroProfissional) params.set("profissional_id", filtroProfissional);
      if (filtroStatus) params.set("status", filtroStatus);

      const [comData, profsData] = await Promise.all([
        api(`/comissoes?${params}`),
        api("/profissionais"),
      ]);

      setComissoes(comData.comissoes || []);
      setResumoProfissionais(comData.resumo_profissionais || []);
      setTotais({
        total_geral: comData.total_geral || 0,
        total_pendente: comData.total_pendente || 0,
        total_pago: comData.total_pago || 0,
      });
      setProfissionais(profsData || []);
    } catch (e) {
      console.error("Erro ao carregar comissões:", e);
    } finally {
      setLoading(false);
    }
  }, [mes, ano, filtroProfissional, filtroStatus]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* ── Ações: Profissional ──────────────────── */
  async function salvarProfissional() {
    try {
      setSalvando(true);
      if (formProf.id) {
        await api(`/profissionais/${formProf.id}`, {
          method: "PUT",
          body: JSON.stringify(formProf),
        });
      } else {
        await api("/profissionais", {
          method: "POST",
          body: JSON.stringify(formProf),
        });
      }
      setModalProfissional(false);
      setFormProf({ tipo: "dentista", tipo_comissao: "percentual" });
      carregar();
    } catch (e) {
      alert(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function desativarProfissional(id) {
    if (!confirm("Desativar este profissional?")) return;
    try {
      await api(`/profissionais/${id}`, { method: "DELETE" });
      carregar();
    } catch (e) {
      alert(e.message);
    }
  }

  /* ── Ações: Comissões ─────────────────────── */
  async function pagarComissao(id) {
    if (!confirm("Confirmar pagamento desta comissão?")) return;
    try {
      await api(`/comissoes/${id}/pagar`, {
        method: "PUT",
        body: JSON.stringify({ data_pagamento: hoje() }),
      });
      carregar();
    } catch (e) {
      alert(e.message);
    }
  }

  async function pagarLote() {
    if (!selecionados.length) return alert("Selecione pelo menos uma comissão.");
    if (!confirm(`Pagar ${selecionados.length} comissão(ões) selecionada(s)?`)) return;
    try {
      await api("/comissoes/pagar-lote", {
        method: "PUT",
        body: JSON.stringify({ ids: selecionados, data_pagamento: hoje() }),
      });
      setSelecionados([]);
      carregar();
    } catch (e) {
      alert(e.message);
    }
  }

  function toggleSelecionado(id) {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleTodos() {
    const pendentes = comissoes.filter((c) => c.status === "pendente").map((c) => c.id);
    if (selecionados.length === pendentes.length) {
      setSelecionados([]);
    } else {
      setSelecionados(pendentes);
    }
  }

  /* ── Render ────────────────────────────────── */
  if (loading) {
    return <div style={S.loadingBox}>Carregando comissões...</div>;
  }

  const pendentesCount = comissoes.filter((c) => c.status === "pendente").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── KPI Cards ────────────────────────── */}
      <div style={S.kpiGrid4}>
        <CardKPI
          titulo="Total Comissões"
          valor={formatMoney(totais.total_geral)}
          cor="#8b5cf6"
          icone={Icons.comissoes}
        />
        <CardKPI
          titulo="Pendente de Pagamento"
          valor={formatMoney(totais.total_pendente)}
          cor="#f97316"
          icone={Icons.money}
          subtitulo={`${pendentesCount} comissão(ões)`}
        />
        <CardKPI
          titulo="Pago no Período"
          valor={formatMoney(totais.total_pago)}
          cor="#16a34a"
          icone={Icons.check}
        />
        <CardKPI
          titulo="Profissionais Ativos"
          valor={profissionais.length}
          cor="#2563eb"
          icone={Icons.comissoes}
        />
      </div>

      {/* ── Toolbar ───────────��──────────────── */}
      <div style={S.toolbar}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* View mode toggle */}
          <div style={{
            display: "flex", background: "#f1f5f9",
            borderRadius: 8, padding: 2, gap: 2,
          }}>
            <button
              onClick={() => setViewMode("resumo")}
              style={{
                ...estilos.toggleBtn,
                ...(viewMode === "resumo" ? estilos.toggleBtnActive : {}),
              }}
            >
              Por Profissional
            </button>
            <button
              onClick={() => setViewMode("detalhado")}
              style={{
                ...estilos.toggleBtn,
                ...(viewMode === "detalhado" ? estilos.toggleBtnActive : {}),
              }}
            >
              Detalhado
            </button>
          </div>

          <span style={{ color: "#94a3b8", display: "flex" }}>{Icons.filter}</span>
          <select
            value={filtroProfissional}
            onChange={(e) => setFiltroProfissional(e.target.value)}
            style={S.select}
          >
            <option value="">Todos os profissionais</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={S.select}
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={S.btnOutline}
            onClick={() => exportarCSV("/exportar/comissoes", "comissoes.csv", {
              mes, ano, profissional_id: filtroProfissional,
            })}
          >
            {Icons.download} <span>Exportar</span>
          </button>
          <button
            style={S.btnPrimary}
            onClick={() => {
              setFormProf({ tipo: "dentista", tipo_comissao: "percentual" });
              setModalProfissional(true);
            }}
          >
            {Icons.plus} <span>Novo Profissional</span>
          </button>
        </div>
      </div>

      {/* ── Profissionais Cadastrados ─────────── */}
      <div style={S.card}>
        <h4 style={S.cardTitle}>
          👨‍⚕️ Profissionais Cadastrados
          <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8", marginLeft: 8 }}>
            ({profissionais.length})
          </span>
        </h4>
        {profissionais.length === 0 ? (
          <div style={S.emptyState}>
            Nenhum profissional cadastrado. Cadastre um profissional para começar a calcular comissões.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {profissionais.map((p) => (
              <div key={p.id} style={estilos.profCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={estilos.profAvatar}>
                    {p.nome?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                      {p.nome}
                    </p>
                    {p.cro && (
                      <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>CRO: {p.cro}</p>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  {p.especialidade && (
                    <div style={estilos.profInfo}>
                      <span style={estilos.profInfoLabel}>Especialidade</span>
                      <span style={estilos.profInfoValue}>{p.especialidade}</span>
                    </div>
                  )}
                  <div style={estilos.profInfo}>
                    <span style={estilos.profInfoLabel}>Tipo Comissão</span>
                    <span style={estilos.profInfoValue}>
                      {p.tipo_comissao === "percentual"
                        ? `${p.percentual_comissao}%`
                        : `Fixo: ${formatMoney(p.valor_fixo_comissao)}`
                      }
                    </span>
                  </div>
                  <div style={estilos.profInfo}>
                    <span style={estilos.profInfoLabel}>Tipo</span>
                    <span style={{
                      ...estilos.profInfoValue,
                      textTransform: "capitalize",
                    }}>{p.tipo}</span>
                  </div>
                  {p.telefone && (
                    <div style={estilos.profInfo}>
                      <span style={estilos.profInfoLabel}>Telefone</span>
                      <span style={estilos.profInfoValue}>{p.telefone}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    style={{ ...S.btnIcon, flex: 1 }}
                    onClick={() => { setFormProf({ ...p }); setModalProfissional(true); }}
                    title="Editar"
                  >
                    {Icons.edit}
                  </button>
                  <button
                    style={{ ...S.btnIconDanger, flex: 1 }}
                    onClick={() => desativarProfissional(p.id)}
                    title="Desativar"
                  >
                    {Icons.trash}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Comissões: Vista Resumo por Profissional ── */}
      {viewMode === "resumo" && (
        <div style={S.card}>
          <h4 style={S.cardTitle}>💰 Resumo de Comissões por Profissional</h4>
          {resumoProfissionais.length === 0 ? (
            <div style={S.emptyState}>Nenhuma comissão gerada neste período.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {resumoProfissionais.map((rp) => {
                const pctPago = rp.total_comissao > 0
                  ? (rp.total_pago / rp.total_comissao) * 100
                  : 0;

                return (
                  <div key={rp.profissional_id} style={estilos.resumoCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                      <div style={estilos.profAvatar}>
                        {rp.profissional_nome?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                              {rp.profissional_nome}
                            </span>
                            {rp.profissional_cro && (
                              <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>
                                CRO: {rp.profissional_cro}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            {rp.quantidade} procedimento(s)
                          </span>
                        </div>

                        {/* Barra de progresso */}
                        <div style={S.progressBar}>
                          <div style={{
                            ...S.progressFill,
                            width: `${pctPago}%`,
                            background: pctPago >= 100
                              ? "linear-gradient(90deg, #22c55e, #16a34a)"
                              : "linear-gradient(90deg, #8b5cf6, #6d28d9)",
                          }} />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, gap: 12, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#8b5cf6", fontWeight: 600 }}>
                            Total: {formatMoney(rp.total_comissao)}
                          </span>
                          <span style={{ fontSize: 12, color: "#16a34a" }}>
                            Pago: {formatMoney(rp.total_pago)}
                          </span>
                          <span style={{ fontSize: 12, color: "#f97316" }}>
                            Pendente: {formatMoney(rp.total_pendente)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Comissões: Vista Detalhada ────────── */}
      {viewMode === "detalhado" && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h4 style={{ ...S.cardTitle, marginBottom: 0, paddingBottom: 0 }}>
              📋 Comissões Detalhadas
              <span style={{ fontSize: 12, fontWeight: 400, color: "#94a3b8", marginLeft: 8 }}>
                ({comissoes.length})
              </span>
            </h4>
            {selecionados.length > 0 && (
              <button
                style={{
                  ...S.btnPrimary,
                  background: "#16a34a",
                  fontSize: 12,
                  padding: "6px 14px",
                }}
                onClick={pagarLote}
              >
                {Icons.check}
                Pagar {selecionados.length} selecionada(s) ({formatMoney(
                  comissoes
                    .filter((c) => selecionados.includes(c.id))
                    .reduce((s, c) => s + c.valor_comissao, 0)
                )})
              </button>
            )}
          </div>

          {comissoes.length === 0 ? (
            <div style={S.emptyState}>Nenhuma comissão gerada neste período.</div>
          ) : (
            <div style={S.tableWrapper}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, width: 36 }}>
                      {pendentesCount > 0 && (
                        <input
                          type="checkbox"
                          checked={selecionados.length === pendentesCount && pendentesCount > 0}
                          onChange={toggleTodos}
                          style={{ cursor: "pointer" }}
                        />
                      )}
                    </th>
                    <th style={S.th}>Profissional</th>
                    <th style={S.th}>Paciente</th>
                    <th style={S.th}>Procedimento</th>
                    <th style={S.th}>Valor Proc.</th>
                    <th style={S.th}>%</th>
                    <th style={S.th}>Comissão</th>
                    <th style={S.th}>Data Ref.</th>
                    <th style={S.th}>Status</th>
                    <th style={{ ...S.th, textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {comissoes.map((c) => (
                    <tr key={c.id} style={{
                      background: selecionados.includes(c.id) ? "#f5f3ff" : "transparent",
                    }}>
                      <td style={S.td}>
                        {c.status === "pendente" && (
                          <input
                            type="checkbox"
                            checked={selecionados.includes(c.id)}
                            onChange={() => toggleSelecionado(c.id)}
                            style={{ cursor: "pointer" }}
                          />
                        )}
                      </td>
                      <td style={S.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ ...estilos.miniAvatar }}>
                            {c.profissional_nome?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <span style={{ fontWeight: 500, color: "#0f172a", fontSize: 13 }}>
                            {c.profissional_nome}
                          </span>
                        </div>
                      </td>
                      <td style={S.td}>
                        <span style={{ color: "#64748b", fontSize: 12 }}>
                          {c.paciente_nome || "—"}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ color: "#334155", fontSize: 12 }}>
                          {c.procedimento || "—"}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ color: "#0f172a", fontWeight: 500 }}>
                          {formatMoney(c.valor_procedimento)}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{
                          padding: "2px 6px", borderRadius: 4,
                          background: "#f5f3ff", color: "#7c3aed",
                          fontSize: 11, fontWeight: 600,
                        }}>
                          {c.percentual}%
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontWeight: 700, color: "#8b5cf6" }}>
                          {formatMoney(c.valor_comissao)}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ color: "#64748b", fontSize: 12 }}>
                          {formatDate(c.data_referencia)}
                        </span>
                      </td>
                      <td style={S.td}>
                        <Badge status={c.status} />
                        {c.data_pagamento && (
                          <span style={{ display: "block", fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                            Pago em {formatDate(c.data_pagamento)}
                          </span>
                        )}
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        {c.status === "pendente" && (
                          <button
                            style={S.btnIconSuccess}
                            onClick={() => pagarComissao(c.id)}
                            title="Pagar comissão"
                          >
                            {Icons.check}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Profissional ───────────────── */}
      <Modal
        aberto={modalProfissional}
        onFechar={() => { setModalProfissional(false); setFormProf({ tipo: "dentista", tipo_comissao: "percentual" }); }}
        titulo={formProf.id ? "Editar Profissional" : "Novo Profissional"}
        largura={580}
      >
        <div style={S.formGrid}>
          <div style={S.formGroup2}>
            <label style={S.label}>Nome *</label>
            <input
              style={S.input}
              value={formProf.nome || ""}
              onChange={(e) => setFormProf({ ...formProf, nome: e.target.value })}
              placeholder="Nome completo do profissional"
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>CPF</label>
            <input
              style={S.input}
              value={formProf.cpf || ""}
              onChange={(e) => setFormProf({ ...formProf, cpf: e.target.value })}
              placeholder="000.000.000-00"
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>CRO</label>
            <input
              style={S.input}
              value={formProf.cro || ""}
              onChange={(e) => setFormProf({ ...formProf, cro: e.target.value })}
              placeholder="CRO-XX 00000"
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Especialidade</label>
            <input
              style={S.input}
              value={formProf.especialidade || ""}
              onChange={(e) => setFormProf({ ...formProf, especialidade: e.target.value })}
              placeholder="Ex: Ortodontia, Endodontia..."
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Tipo</label>
            <select
              style={S.input}
              value={formProf.tipo || "dentista"}
              onChange={(e) => setFormProf({ ...formProf, tipo: e.target.value })}
            >
              <option value="dentista">Dentista</option>
              <option value="auxiliar">Auxiliar</option>
              <option value="higienista">Higienista</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Telefone</label>
            <input
              style={S.input}
              value={formProf.telefone || ""}
              onChange={(e) => setFormProf({ ...formProf, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Email</label>
            <input
              style={S.input}
              type="email"
              value={formProf.email || ""}
              onChange={(e) => setFormProf({ ...formProf, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Comissão */}
          <div style={{ ...S.formGroup2, marginTop: 4 }}>
            <div style={{
              padding: 14, background: "#f5f3ff",
              borderRadius: 10, border: "1px solid #e9d5ff",
            }}>
              <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>
                💰 Configuração de Comissão
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={S.formGroup}>
                  <label style={S.label}>Tipo de Comissão</label>
                  <select
                    style={S.input}
                    value={formProf.tipo_comissao || "percentual"}
                    onChange={(e) => setFormProf({ ...formProf, tipo_comissao: e.target.value })}
                  >
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Valor Fixo (R$)</option>
                  </select>
                </div>

                {formProf.tipo_comissao === "percentual" ? (
                  <div style={S.formGroup}>
                    <label style={S.label}>Percentual (%)</label>
                    <input
                      style={S.input}
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={formProf.percentual_comissao || ""}
                      onChange={(e) => setFormProf({
                        ...formProf,
                        percentual_comissao: parseFloat(e.target.value) || 0,
                      })}
                      placeholder="Ex: 30"
                    />
                    {formProf.percentual_comissao > 0 && (
                      <span style={{ fontSize: 11, color: "#7c3aed", marginTop: 2 }}>
                        A cada R$ 1.000, recebe {formatMoney(1000 * formProf.percentual_comissao / 100)}
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={S.formGroup}>
                    <label style={S.label}>Valor Fixo (R$)</label>
                    <input
                      style={S.input}
                      type="number"
                      step="0.01"
                      min="0"
                      value={formProf.valor_fixo_comissao || ""}
                      onChange={(e) => setFormProf({
                        ...formProf,
                        valor_fixo_comissao: parseFloat(e.target.value) || 0,
                      })}
                      placeholder="0,00"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={S.formGroup2}>
            <label style={S.label}>Observações</label>
            <textarea
              style={{ ...S.input, minHeight: 55, resize: "vertical" }}
              value={formProf.observacoes || ""}
              onChange={(e) => setFormProf({ ...formProf, observacoes: e.target.value })}
              placeholder="Anotações sobre o profissional..."
            />
          </div>
        </div>

        <div style={S.formActions}>
          <button
            style={S.btnOutline}
            onClick={() => {
              setModalProfissional(false);
              setFormProf({ tipo: "dentista", tipo_comissao: "percentual" });
            }}
          >
            Cancelar
          </button>
          <button
            style={{
              ...S.btnPrimary,
              background: "#7c3aed",
              opacity: salvando || !formProf.nome ? 0.6 : 1,
            }}
            onClick={salvarProfissional}
            disabled={salvando || !formProf.nome}
          >
            {salvando ? "Salvando..." : formProf.id ? "Salvar Alterações" : "Cadastrar Profissional"}
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
  profCard: {
    padding: 16,
    borderRadius: 12,
    border: "1px solid #f1f5f9",
    background: "#fafafa",
  },
  profAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    fontWeight: 700,
    flexShrink: 0,
  },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 7,
    background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  profInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 12,
  },
  profInfoLabel: {
    color: "#94a3b8",
    fontWeight: 500,
  },
  profInfoValue: {
    color: "#334155",
    fontWeight: 600,
  },
  resumoCard: {
    padding: "16px 20px",
    borderRadius: 12,
    border: "1px solid #f1f5f9",
    background: "#fafafa",
  },
};
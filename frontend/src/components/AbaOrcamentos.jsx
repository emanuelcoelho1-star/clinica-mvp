import { useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function formatarDataBR(iso) {
  if (!iso) return "-";
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function dataHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcularTotalItens(itens) {
  return (itens || []).reduce((acc, i) => acc + (Number(i.valor) || 0) * (Number(i.quantidade) || 1), 0);
}

/* ══════════════════════════════════════════════���════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════════════════ */
const STATUS_MAP = {
  pendente:      { label: "Pendente",      bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  aprovado:      { label: "Aprovado",      bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  recusado:      { label: "Recusado",      bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  em_andamento:  { label: "Em andamento",  bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  concluido:     { label: "Concluído",     bg: "#f8fafc", color: "#334155", border: "#e2e8f0" },
};

const STATUS_OPTIONS = [
  { value: "pendente",     label: "Pendente" },
  { value: "aprovado",     label: "Aprovado" },
  { value: "recusado",     label: "Recusado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido",    label: "Concluído" },
];

const EMPTY_ITEM = { dente: "", procedimento: "", valor: 0, quantidade: 1 };

const EMPTY_FORM = {
  data: dataHojeISO(),
  status: "pendente",
  desconto: 0,
  observacoes: "",
  itens: [{ ...EMPTY_ITEM }],
};

/* ═══════════════════════════════════════════════════════════
   STATUS BADGE
   ═══════════════════════════════════════════════════════════ */
function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.pendente;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 12px",
        borderRadius: "10px",
        fontSize: "12px",
        fontWeight: "700",
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE
   ═══════════════════════════════════════════════════════════ */
function AbaOrcamentos({ pacienteId }) {
  const [orcamentos, setOrcamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [tela, setTela] = useState("lista");
  const [editando, setEditando] = useState(null);
  const [detalhes, setDetalhes] = useState(null);

  const [formData, setFormData] = useState({ ...EMPTY_FORM, itens: [{ ...EMPTY_ITEM }] });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState("");

  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const [hoveredCardId, setHoveredCardId] = useState(null);

  /* ── Carregar ────────────────────────────── */
  useEffect(() => {
    carregarOrcamentos();
  }, [pacienteId]);

  async function carregarOrcamentos() {
    try {
      setCarregando(true);
      setErro("");
      const tk = localStorage.getItem("token");
      const r = await fetch(`http://localhost:3001/orcamentos/paciente/${pacienteId}`, {
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setOrcamentos(Array.isArray(data) ? data : []);
    } catch {
      setErro("Erro ao carregar orçamentos.");
    } finally {
      setCarregando(false);
    }
  }

  /* ── Abrir form ──────────────────────────── */
  function abrirFormNovo() {
    setEditando(null);
    setFormData({ ...EMPTY_FORM, itens: [{ ...EMPTY_ITEM }] });
    setErroForm("");
    setTela("form");
  }

  function abrirFormEditar(item) {
    setEditando(item);
    setFormData({
      data: item.data || dataHojeISO(),
      status: item.status || "pendente",
      desconto: item.desconto || 0,
      observacoes: item.observacoes || "",
      itens:
        item.itens && item.itens.length > 0
          ? item.itens.map((i) => ({
              dente: i.dente || "",
              procedimento: i.procedimento || "",
              valor: i.valor || 0,
              quantidade: i.quantidade || 1,
            }))
          : [{ ...EMPTY_ITEM }],
    });
    setErroForm("");
    setTela("form");
  }

  function abrirDetalhes(item) {
    setDetalhes(item);
    setTela("detalhes");
  }

  function voltarParaLista() {
    setTela("lista");
    setEditando(null);
    setDetalhes(null);
    setErroForm("");
  }

  /* ── Form handlers ───────────────────────── */
  function handleInput(e) {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  }

  function handleItemChange(index, field, value) {
    setFormData((p) => {
      const novosItens = [...p.itens];
      novosItens[index] = { ...novosItens[index], [field]: value };
      return { ...p, itens: novosItens };
    });
  }

  function adicionarItem() {
    setFormData((p) => ({ ...p, itens: [...p.itens, { ...EMPTY_ITEM }] }));
  }

  function removerItem(index) {
    setFormData((p) => {
      if (p.itens.length <= 1) return p;
      const novosItens = p.itens.filter((_, i) => i !== index);
      return { ...p, itens: novosItens };
    });
  }

  /* ── Salvar ──────────────────────────────── */
  async function handleSalvar(e) {
    e.preventDefault();
    if (!formData.data) {
      setErroForm("A data é obrigatória.");
      return;
    }

    const itensValidos = formData.itens.filter((i) => i.procedimento.trim() !== "");
    if (itensValidos.length === 0) {
      setErroForm("Adicione pelo menos um procedimento.");
      return;
    }

    try {
      setSalvando(true);
      setErroForm("");
      const tk = localStorage.getItem("token");
      const ed = Boolean(editando);

      const body = {
        paciente_id: Number(pacienteId),
        data: formData.data,
        status: formData.status || "pendente",
        desconto: Number(formData.desconto) || 0,
        observacoes: formData.observacoes || "",
        itens: itensValidos.map((i) => ({
          dente: i.dente || "",
          procedimento: i.procedimento,
          valor: Number(i.valor) || 0,
          quantidade: Number(i.quantidade) || 1,
        })),
      };

      const r = await fetch(
        ed
          ? `http://localhost:3001/orcamentos/${editando.id}`
          : "http://localhost:3001/orcamentos",
        {
          method: ed ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", Authorization: tk || "" },
          body: JSON.stringify(body),
        }
      );
      if (!r.ok) throw new Error();
      await carregarOrcamentos();
      voltarParaLista();
    } catch {
      setErroForm("Não foi possível salvar o orçamento.");
    } finally {
      setSalvando(false);
    }
  }

  /* ── Excluir ─────────────────────────────── */
  async function handleExcluir() {
    if (!confirmarExclusao?.id) return;
    try {
      setExcluindo(true);
      const tk = localStorage.getItem("token");
      const r = await fetch(`http://localhost:3001/orcamentos/${confirmarExclusao.id}`, {
        method: "DELETE",
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      setConfirmarExclusao(null);
      await carregarOrcamentos();
      if (tela !== "lista") voltarParaLista();
    } catch {
      setErro("Erro ao excluir orçamento.");
    } finally {
      setExcluindo(false);
    }
  }

  /* ── Totais ──────────────────────────────── */
  const totalForm = calcularTotalItens(formData.itens);
  const descontoForm = Number(formData.desconto) || 0;
  const totalFinalForm = Math.max(0, totalForm - descontoForm);

  /* ═══════════════════════════════════════════
     RENDER — LISTA
     ═══════════════════════════════════════════ */
  if (tela === "lista") {
    return (
      <div style={S.wrapper}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <h2 style={S.title}>Orçamentos</h2>
            <p style={S.subtitle}>
              {orcamentos.length} orçamento{orcamentos.length !== 1 ? "s" : ""} registrado
              {orcamentos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button style={S.btnPrimary} onClick={abrirFormNovo}>
            + Novo orçamento
          </button>
        </div>

        {/* Loading */}
        {carregando && (
          <div style={S.feedbackBox}>
            <div style={S.spinner} />
            <span style={S.feedbackText}>Carregando...</span>
          </div>
        )}

        {/* Erro */}
        {erro && <div style={S.errorBox}>{erro}</div>}

        {/* Vazio */}
        {!carregando && !erro && orcamentos.length === 0 && (
          <div style={S.emptyBox}>
            <span style={S.emptyIcon}>💰</span>
            <h3 style={S.emptyTitle}>Nenhum orçamento</h3>
            <p style={S.emptyText}>Crie o primeiro orçamento deste paciente.</p>
            <button style={{ ...S.btnPrimary, marginTop: "8px" }} onClick={abrirFormNovo}>
              + Criar orçamento
            </button>
          </div>
        )}

        {/* Lista de cards */}
        {!carregando && !erro && orcamentos.length > 0 && (
          <div style={S.cardGrid}>
            {orcamentos.map((o) => {
              const hovered = hoveredCardId === o.id;
              const total = calcularTotalItens(o.itens);
              const desconto = Number(o.desconto) || 0;
              const totalFinal = Math.max(0, total - desconto);

              return (
                <div
                  key={o.id}
                  style={{ ...S.card, ...(hovered ? S.cardHover : {}) }}
                  onMouseEnter={() => setHoveredCardId(o.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                >
                  {/* Topo do card */}
                  <div style={S.cardTop}>
                    <div style={S.cardDateBadge}>{formatarDataBR(o.data)}</div>
                    <span style={S.cardId}>#{o.id}</span>
                  </div>

                  {/* Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <StatusBadge status={o.status} />
                  </div>

                  {/* Procedimentos resumidos */}
                  {o.itens && o.itens.length > 0 && (
                    <div style={S.cardSection}>
                      <span style={S.cardSectionLabel}>
                        {o.itens.length} procedimento{o.itens.length !== 1 ? "s" : ""}
                      </span>
                      <p style={S.cardSectionText}>
                        {o.itens
                          .map((i) => i.procedimento)
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}

                  {/* Valores */}
                  <div style={S.pillRow}>
                    <span style={S.pillMoney}>Total: {formatarMoeda(totalFinal)}</span>
                    {desconto > 0 && (
                      <span style={S.pillDiscount}>Desc: {formatarMoeda(desconto)}</span>
                    )}
                  </div>

                  {/* Ações */}
                  <div style={S.cardActions}>
                    <button style={S.cardBtn} onClick={() => abrirDetalhes(o)}>
                      👁️ Ver
                    </button>
                    <button style={S.cardBtn} onClick={() => abrirFormEditar(o)}>
                      ✏️ Editar
                    </button>
                    <button
                      style={{ ...S.cardBtn, ...S.cardBtnDanger }}
                      onClick={() => setConfirmarExclusao(o)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal confirmar exclusão */}
        {confirmarExclusao && (
          <div style={S.overlay} onClick={() => setConfirmarExclusao(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.confirmIcon}>🗑️</div>
              <h3 style={S.confirmTitle}>Excluir orçamento #{confirmarExclusao.id}?</h3>
              <p style={S.confirmText}>Esta ação não poderá ser desfeita.</p>
              <div style={S.modalActions}>
                <button
                  style={S.btnSecondary}
                  onClick={() => setConfirmarExclusao(null)}
                  disabled={excluindo}
                >
                  Cancelar
                </button>
                <button style={S.btnDanger} onClick={handleExcluir} disabled={excluindo}>
                  {excluindo ? "Excluindo..." : "Confirmar exclusão"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER — FORMULÁRIO
     ═══════════════════════════════════════════ */
  if (tela === "form") {
    return (
      <div style={S.wrapper}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <button style={S.backBtn} onClick={voltarParaLista}>
              ← Voltar
            </button>
            <h2 style={S.title}>{editando ? "Editar orçamento" : "Novo orçamento"}</h2>
            <p style={S.subtitle}>
              {editando ? "Altere os dados do orçamento." : "Preencha as informações do orçamento."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSalvar} style={S.formWrap}>
          {/* Dados gerais */}
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>📋</span>
              <span style={S.formCardTitle}>Dados do orçamento</span>
            </div>
            <div style={S.formGrid2}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Data</label>
                <input
                  type="date"
                  name="data"
                  value={formData.data}
                  onChange={handleInput}
                  style={S.input}
                />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInput}
                  style={S.input}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Desconto (R$)</label>
                <input
                  type="number"
                  name="desconto"
                  value={formData.desconto}
                  onChange={handleInput}
                  style={S.input}
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Observações</label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleInput}
                  placeholder="Observações sobre o orçamento..."
                  style={S.textarea}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Itens / Procedimentos */}
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>🦷</span>
              <span style={S.formCardTitle}>Procedimentos</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {formData.itens.map((item, idx) => (
                <div key={idx} style={S.itemRow}>
                  <div style={S.itemFields}>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Dente</label>
                      <input
                        type="text"
                        value={item.dente}
                        onChange={(e) => handleItemChange(idx, "dente", e.target.value)}
                        placeholder="Ex: 11"
                        style={{ ...S.input, maxWidth: "100px" }}
                      />
                    </div>
                    <div style={{ ...S.fieldGroup, flex: 2 }}>
                      <label style={S.label}>Procedimento</label>
                      <input
                        type="text"
                        value={item.procedimento}
                        onChange={(e) => handleItemChange(idx, "procedimento", e.target.value)}
                        placeholder="Ex: Restauração"
                        style={S.input}
                      />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Valor (R$)</label>
                      <input
                        type="number"
                        value={item.valor}
                        onChange={(e) => handleItemChange(idx, "valor", e.target.value)}
                        placeholder="0,00"
                        style={{ ...S.input, maxWidth: "120px" }}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div style={S.fieldGroup}>
                      <label style={S.label}>Qtd</label>
                      <input
                        type="number"
                        value={item.quantidade}
                        onChange={(e) => handleItemChange(idx, "quantidade", e.target.value)}
                        style={{ ...S.input, maxWidth: "70px" }}
                        min="1"
                      />
                    </div>
                    <div style={{ ...S.fieldGroup, justifyContent: "flex-end", minWidth: "90px" }}>
                      <label style={S.label}>Subtotal</label>
                      <span style={S.subtotalText}>
                        {formatarMoeda((Number(item.valor) || 0) * (Number(item.quantidade) || 1))}
                      </span>
                    </div>
                  </div>
                  {formData.itens.length > 1 && (
                    <button
                      type="button"
                      style={S.removeItemBtn}
                      onClick={() => removerItem(idx)}
                      title="Remover item"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="button" style={S.addItemBtn} onClick={adicionarItem}>
              + Adicionar procedimento
            </button>

            {/* Totais */}
            <div style={S.totaisBox}>
              <div style={S.totaisRow}>
                <span style={S.totaisLabel}>Subtotal</span>
                <span style={S.totaisValue}>{formatarMoeda(totalForm)}</span>
              </div>
              {descontoForm > 0 && (
                <div style={S.totaisRow}>
                  <span style={S.totaisLabel}>Desconto</span>
                  <span style={{ ...S.totaisValue, color: "#ef4444" }}>
                    - {formatarMoeda(descontoForm)}
                  </span>
                </div>
              )}
              <div style={{ ...S.totaisRow, borderTop: "2px solid #e2e8f0", paddingTop: "10px" }}>
                <span style={{ ...S.totaisLabel, fontSize: "16px", fontWeight: "800" }}>Total</span>
                <span style={{ ...S.totaisValue, fontSize: "18px", fontWeight: "800", color: "#2563eb" }}>
                  {formatarMoeda(totalFinalForm)}
                </span>
              </div>
            </div>
          </div>

          {/* Erro */}
          {erroForm && <div style={S.errorBox}>{erroForm}</div>}

          {/* Ações */}
          <div style={S.formActions}>
            <button type="button" style={S.btnSecondary} onClick={voltarParaLista} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" style={S.btnPrimary} disabled={salvando}>
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Salvar orçamento"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER — DETALHES
     ═══════════════════════════════════════════ */
  if (tela === "detalhes" && detalhes) {
    const totalDet = calcularTotalItens(detalhes.itens);
    const descontoDet = Number(detalhes.desconto) || 0;
    const totalFinalDet = Math.max(0, totalDet - descontoDet);

    return (
      <div style={S.wrapper}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <button style={S.backBtn} onClick={voltarParaLista}>
              ← Voltar
            </button>
            <h2 style={S.title}>Orçamento #{detalhes.id}</h2>
            <p style={S.subtitle}>Criado em {formatarDataBR(detalhes.data)}</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button style={S.btnSecondary} onClick={() => abrirFormEditar(detalhes)}>
              ✏️ Editar
            </button>
            <button style={S.btnDanger} onClick={() => setConfirmarExclusao(detalhes)}>
              Excluir
            </button>
          </div>
        </div>

        {/* Informações gerais */}
        <div style={S.formCard}>
          <div style={S.formCardHeader}>
            <span style={S.formCardIcon}>📋</span>
            <span style={S.formCardTitle}>Informações gerais</span>
          </div>
          <div style={S.detailItems}>
            <div style={S.detailItem}>
              <span style={S.detailLabel}>Status</span>
              <StatusBadge status={detalhes.status} />
            </div>
            <div style={S.detailItem}>
              <span style={S.detailLabel}>Data</span>
              <span style={S.detailValue}>{formatarDataBR(detalhes.data)}</span>
            </div>
            {detalhes.observacoes && (
              <div style={S.detailItem}>
                <span style={S.detailLabel}>Observações</span>
                <span style={S.detailValue}>{detalhes.observacoes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabela de itens */}
        <div style={S.formCard}>
          <div style={S.formCardHeader}>
            <span style={S.formCardIcon}>🦷</span>
            <span style={S.formCardTitle}>Procedimentos</span>
          </div>

          <div style={S.tableWrapper}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Dente</th>
                  <th style={S.th}>Procedimento</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Valor Unit.</th>
                  <th style={{ ...S.th, textAlign: "center" }}>Qtd</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(detalhes.itens || []).map((item, idx) => (
                  <tr key={idx}>
                    <td style={S.td}>{item.dente || "-"}</td>
                    <td style={S.td}>{item.procedimento || "-"}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>{formatarMoeda(item.valor)}</td>
                    <td style={{ ...S.td, textAlign: "center" }}>{item.quantidade || 1}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: "700" }}>
                      {formatarMoeda((Number(item.valor) || 0) * (Number(item.quantidade) || 1))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totais */}
          <div style={S.totaisBox}>
            <div style={S.totaisRow}>
              <span style={S.totaisLabel}>Subtotal</span>
              <span style={S.totaisValue}>{formatarMoeda(totalDet)}</span>
            </div>
            {descontoDet > 0 && (
              <div style={S.totaisRow}>
                <span style={S.totaisLabel}>Desconto</span>
                <span style={{ ...S.totaisValue, color: "#ef4444" }}>
                  - {formatarMoeda(descontoDet)}
                </span>
              </div>
            )}
            <div style={{ ...S.totaisRow, borderTop: "2px solid #e2e8f0", paddingTop: "10px" }}>
              <span style={{ ...S.totaisLabel, fontSize: "16px", fontWeight: "800" }}>Total Final</span>
              <span style={{ ...S.totaisValue, fontSize: "20px", fontWeight: "800", color: "#2563eb" }}>
                {formatarMoeda(totalFinalDet)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal confirmar exclusão */}
        {confirmarExclusao && (
          <div style={S.overlay} onClick={() => setConfirmarExclusao(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.confirmIcon}>🗑️</div>
              <h3 style={S.confirmTitle}>Excluir orçamento #{confirmarExclusao.id}?</h3>
              <p style={S.confirmText}>Esta ação não poderá ser desfeita.</p>
              <div style={S.modalActions}>
                <button
                  style={S.btnSecondary}
                  onClick={() => setConfirmarExclusao(null)}
                  disabled={excluindo}
                >
                  Cancelar
                </button>
                <button style={S.btnDanger} onClick={handleExcluir} disabled={excluindo}>
                  {excluindo ? "Excluindo..." : "Confirmar exclusão"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const S = {
  wrapper: { display: "flex", flexDirection: "column", gap: "20px" },

  /* Header */
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" },
  title: { margin: 0, fontSize: "22px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.02em" },
  subtitle: { margin: "4px 0 0", fontSize: "14px", color: "#64748b", fontWeight: "500" },
  backBtn: { display: "inline-flex", alignItems: "center", gap: "4px", border: "none", background: "none", color: "#2563eb", fontWeight: "700", fontSize: "13px", cursor: "pointer", padding: "0", marginBottom: "8px" },

  /* Buttons */
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: "6px", border: "none", borderRadius: "12px", padding: "10px 20px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", fontWeight: "700", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.2)", transition: "all 0.2s ease", whiteSpace: "nowrap" },
  btnSecondary: { display: "inline-flex", alignItems: "center", gap: "6px", border: "1px solid #dbe4f0", borderRadius: "12px", padding: "10px 18px", background: "#fff", color: "#475569", fontWeight: "700", fontSize: "13px", cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap" },
  btnDanger: { display: "inline-flex", alignItems: "center", gap: "6px", border: "none", borderRadius: "12px", padding: "10px 18px", background: "#ef4444", color: "#fff", fontWeight: "700", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap" },

  /* Feedback */
  feedbackBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", padding: "40px", background: "#fff", borderRadius: "20px", border: "1px solid #eef2f7" },
  spinner: { width: "32px", height: "32px", border: "3px solid #dbeafe", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  feedbackText: { fontSize: "14px", color: "#64748b", fontWeight: "600" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "14px", padding: "14px 18px", fontSize: "14px", fontWeight: "600" },

  /* Empty */
  emptyBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "48px 24px", background: "#fff", borderRadius: "20px", border: "1px solid #eef2f7", textAlign: "center" },
  emptyIcon: { fontSize: "40px" },
  emptyTitle: { margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" },
  emptyText: { margin: 0, fontSize: "14px", color: "#64748b" },

  /* Card grid */
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" },

  /* Card */
  card: { background: "#fff", borderRadius: "20px", border: "1px solid #eef2f7", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 6px 18px rgba(15,23,42,0.04)", transition: "all 0.2s ease", cursor: "default" },
  cardHover: { boxShadow: "0 12px 28px rgba(15,23,42,0.08)", borderColor: "#dbeafe" },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardDateBadge: { display: "inline-flex", alignItems: "center", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "6px 12px", fontSize: "13px", fontWeight: "700" },
  cardId: { fontSize: "12px", color: "#cbd5e1", fontWeight: "600" },

  cardSection: { display: "flex", flexDirection: "column", gap: "4px", background: "#f8fafc", borderRadius: "12px", padding: "12px 14px", border: "1px solid #f1f5f9" },
  cardSectionLabel: { fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  cardSectionText: { fontSize: "14px", color: "#334155", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },

  pillRow: { display: "flex", gap: "6px", flexWrap: "wrap" },
  pillMoney: { display: "inline-flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "5px 10px", fontSize: "13px", fontWeight: "700" },
  pillDiscount: { display: "inline-flex", alignItems: "center", gap: "4px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: "8px", padding: "5px 10px", fontSize: "12px", fontWeight: "600" },

  cardActions: { display: "flex", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "14px", marginTop: "auto" },
  cardBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", border: "1px solid #eef2f7", background: "#fff", borderRadius: "10px", padding: "8px 0", fontSize: "13px", fontWeight: "600", color: "#475569", cursor: "pointer", transition: "all 0.15s ease" },
  cardBtnDanger: { color: "#ef4444", borderColor: "#fecaca" },

  /* Modal */
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 999 },
  modal: { width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "20px", padding: "32px", textAlign: "center", boxShadow: "0 24px 64px rgba(15,23,42,0.18)" },
  confirmIcon: { fontSize: "36px" },
  confirmTitle: { margin: "12px 0 0", fontSize: "18px", fontWeight: "800", color: "#0f172a" },
  confirmText: { margin: "6px 0 0", color: "#64748b", fontSize: "14px", lineHeight: 1.5 },
  modalActions: { display: "flex", justifyContent: "center", gap: "10px", marginTop: "20px" },

  /* Form */
  formWrap: { display: "flex", flexDirection: "column", gap: "16px" },
  formCard: { background: "#fff", borderRadius: "20px", border: "1px solid #eef2f7", padding: "20px", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" },
  formCardHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" },
  formCardIcon: { fontSize: "16px" },
  formCardTitle: { fontSize: "13px", fontWeight: "700", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em" },

  formGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },

  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" },
  input: { width: "100%", height: "42px", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "0 14px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a", transition: "border-color 0.2s" },
  textarea: { width: "100%", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "12px 14px", outline: "none", fontSize: "14px", background: "#fff", boxSizing: "border-box", color: "#0f172a", resize: "vertical", fontFamily: "inherit", transition: "border-color 0.2s", minHeight: "80px" },

  formActions: { display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" },

  /* Item rows */
  itemRow: { display: "flex", alignItems: "flex-start", gap: "8px", background: "#f8fafc", borderRadius: "14px", padding: "14px", border: "1px solid #f1f5f9" },
  itemFields: { display: "flex", gap: "10px", flex: 1, flexWrap: "wrap", alignItems: "flex-end" },
  subtotalText: { fontSize: "14px", fontWeight: "700", color: "#2563eb", padding: "10px 0" },
  removeItemBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontSize: "14px", fontWeight: "700", cursor: "pointer", flexShrink: 0, marginTop: "24px" },
  addItemBtn: { display: "inline-flex", alignItems: "center", gap: "4px", border: "1px dashed #bfdbfe", borderRadius: "12px", padding: "10px 18px", background: "#eff6ff", color: "#2563eb", fontWeight: "700", fontSize: "13px", cursor: "pointer", marginTop: "12px", transition: "all 0.15s ease" },

  /* Totais */
  totaisBox: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px", padding: "16px", background: "#f8fafc", borderRadius: "14px", border: "1px solid #f1f5f9" },
  totaisRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  totaisLabel: { fontSize: "14px", fontWeight: "600", color: "#64748b" },
  totaisValue: { fontSize: "15px", fontWeight: "700", color: "#0f172a" },

  /* Detail */
  detailItems: { display: "flex", flexDirection: "column", gap: "10px" },
  detailItem: { display: "flex", flexDirection: "column", gap: "4px", background: "#f8fafc", borderRadius: "12px", padding: "12px 14px", border: "1px solid #f1f5f9" },
  detailLabel: { fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" },
  detailValue: { fontSize: "15px", color: "#0f172a", fontWeight: "600", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" },

  /* Table */
  tableWrapper: { overflowX: "auto", borderRadius: "12px", border: "1px solid #f1f5f9" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
  th: { textAlign: "left", padding: "12px 14px", background: "#f8fafc", color: "#64748b", fontWeight: "700", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9" },
  td: { padding: "12px 14px", color: "#334155", borderBottom: "1px solid #f8fafc", fontWeight: "500" },
};

export default AbaOrcamentos;
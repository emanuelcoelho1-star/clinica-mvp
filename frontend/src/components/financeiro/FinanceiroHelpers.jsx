import { useState, useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════
   CONSTANTES
   ══════════════════════════════════════════════════════════════ */
export const API = "http://localhost:3001/financeiro";

export const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/* ══════════════════════════════════════════════════════════════
   FUNÇÕES UTILITÁRIAS
   ══════════════════════════════════════════════════════════════ */
export function getToken() {
  return localStorage.getItem("token");
}

export function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

export async function api(endpoint, options = {}) {
  const res = await fetch(`${API}${endpoint}`, { headers: headers(), ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.erro || "Erro na requisição");
  }
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("text/csv")) {
    return res.blob();
  }
  return res.json();
}

export function formatMoney(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(d) {
  if (!d) return "—";
  const parts = d.split("-");
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function exportarCSV(endpoint, nomeArquivo, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${API}${endpoint}?${query}`;
  fetch(url, { headers: headers() })
    .then((r) => r.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", nomeArquivo);
      link.click();
      URL.revokeObjectURL(blobUrl);
    })
    .catch((err) => console.error("Erro ao exportar:", err));
}

export function hoje() {
  return new Date().toISOString().split("T")[0];
}

/* ══════════════════════════════════════════════════════════════
   ÍCONES SVG
   ══════════════════════════════════════════════════════════════ */
export const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
  pagar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
    </svg>
  ),
  receber: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
    </svg>
  ),
  fluxo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  inadimplencia: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  comissoes: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  ),
  download: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
  money: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  trendUp: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  trendDown: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" />
    </svg>
  ),
  filter: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  calendar: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  ),
};

/* ══════════════════════════════════════════════════════════════
   COMPONENTE — GRÁFICO DE BARRAS (SVG puro)
   ══════════════════════════════════════════════════════════════ */
export function GraficoBarras({ dados }) {
  if (!dados || !dados.length) {
    return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Sem dados para exibir</div>;
  }

  const maxVal = Math.max(...dados.flatMap((d) => [d.receitas, d.despesas]), 1);
  const w = 600;
  const h = 260;
  const padding = { top: 20, right: 20, bottom: 40, left: 10 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const barGroupW = chartW / dados.length;
  const barW = barGroupW * 0.3;
  const gap = barGroupW * 0.1;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: 600, height: "auto" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <g key={i}>
          <line
            x1={padding.left} x2={w - padding.right}
            y1={padding.top + chartH * (1 - pct)} y2={padding.top + chartH * (1 - pct)}
            stroke="#f1f5f9" strokeWidth="1"
          />
          <text
            x={w - padding.right + 5}
            y={padding.top + chartH * (1 - pct) + 4}
            fontSize="9" fill="#94a3b8" textAnchor="start"
          >
            {formatMoney(maxVal * pct).replace("R$\u00a0", "")}
          </text>
        </g>
      ))}
      {dados.map((d, i) => {
        const x = padding.left + i * barGroupW;
        const hRec = (d.receitas / maxVal) * chartH;
        const hDesp = (d.despesas / maxVal) * chartH;
        return (
          <g key={i}>
            <rect x={x + gap} y={padding.top + chartH - hRec} width={barW} height={hRec} rx="3" fill="#22c55e" opacity="0.85" />
            <rect x={x + gap + barW + 2} y={padding.top + chartH - hDesp} width={barW} height={hDesp} rx="3" fill="#ef4444" opacity="0.85" />
            <text x={x + barGroupW / 2} y={h - 10} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="500">
              {d.mesNome}
            </text>
          </g>
        );
      })}
      <rect x={padding.left} y={h - 18} width="8" height="8" rx="2" fill="#22c55e" />
      <text x={padding.left + 12} y={h - 10} fontSize="9" fill="#64748b">Receitas</text>
      <rect x={padding.left + 70} y={h - 18} width="8" height="8" rx="2" fill="#ef4444" />
      <text x={padding.left + 82} y={h - 10} fontSize="9" fill="#64748b">Despesas</text>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTE — GRÁFICO PIZZA (SVG puro)
   ══════════════════════════════════════════════════════════════ */
export function GraficoPizza({ dados }) {
  const entries = Object.entries(dados || {}).filter(([, v]) => v > 0);
  if (!entries.length) {
    return <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Sem dados</div>;
  }

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const cores = ["#2563eb", "#22c55e", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#eab308", "#64748b"];
  const r = 70;
  const cx = 90;
  const cy = 90;
  let acumulado = 0;

  const fatias = entries.map(([label, valor], i) => {
    const pct = valor / total;
    const startAngle = acumulado * 2 * Math.PI;
    acumulado += pct;
    const endAngle = acumulado * 2 * Math.PI;

    const x1 = cx + r * Math.cos(startAngle - Math.PI / 2);
    const y1 = cy + r * Math.sin(startAngle - Math.PI / 2);
    const x2 = cx + r * Math.cos(endAngle - Math.PI / 2);
    const y2 = cy + r * Math.sin(endAngle - Math.PI / 2);
    const largeArc = pct > 0.5 ? 1 : 0;

    const d = pct >= 0.999
      ? `M ${cx},${cy - r} A ${r},${r} 0 1,1 ${cx - 0.01},${cy - r} Z`
      : `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;

    return { d, cor: cores[i % cores.length], label, valor, pct };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg viewBox="0 0 180 180" style={{ width: 140, height: 140, flexShrink: 0 }}>
        {fatias.map((f, i) => (
          <path key={i} d={f.d} fill={f.cor} stroke="#fff" strokeWidth="2" />
        ))}
        <circle cx={cx} cy={cy} r="40" fill="#fff" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="500">Total</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="12" fill="#0f172a" fontWeight="700">
          {formatMoney(total).replace("R$\u00a0", "R$ ")}
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {fatias.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: f.cor, flexShrink: 0 }} />
            <span style={{ color: "#334155", fontWeight: 500, textTransform: "capitalize" }}>{f.label}</span>
            <span style={{ color: "#94a3b8", marginLeft: "auto" }}>{(f.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTE — MODAL GENÉRICO
   ══════════════════════════════════════════════════════════════ */
export function Modal({ aberto, onFechar, titulo, children, largura }) {
  if (!aberto) return null;
  return (
    <div style={S.modalOverlay} onClick={onFechar}>
      <div style={{ ...S.modal, maxWidth: largura || 560 }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <h3 style={S.modalTitulo}>{titulo}</h3>
          <button onClick={onFechar} style={S.modalClose}>{Icons.close}</button>
        </div>
        <div style={S.modalBody}>{children}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTE — CARD KPI
   ══════════════════════════════════════════════════════════════ */
export function CardKPI({ titulo, valor, subtitulo, cor, icone, trend }) {
  return (
    <div style={S.kpiCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={S.kpiLabel}>{titulo}</p>
          <p style={{ ...S.kpiValor, color: cor || "#0f172a" }}>{valor}</p>
          {subtitulo && (
            <p style={{ ...S.kpiSub, color: trend === "up" ? "#16a34a" : trend === "down" ? "#dc2626" : "#94a3b8" }}>
              {trend === "up" && <span style={{ display: "inline-flex", verticalAlign: "middle", marginRight: 4 }}>{Icons.trendUp}</span>}
              {trend === "down" && <span style={{ display: "inline-flex", verticalAlign: "middle", marginRight: 4 }}>{Icons.trendDown}</span>}
              {subtitulo}
            </p>
          )}
        </div>
        <div style={{ ...S.kpiIconBox, background: `${cor || "#2563eb"}15`, color: cor || "#2563eb" }}>
          {icone}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTE — BADGE DE STATUS
   ══════════════════════════════════════════════════════════════ */
export function Badge({ status }) {
  const configs = {
    pendente: { bg: "#fef3c7", color: "#d97706", label: "Pendente" },
    parcial: { bg: "#dbeafe", color: "#2563eb", label: "Parcial" },
    pago: { bg: "#dcfce7", color: "#16a34a", label: "Pago" },
    cancelado: { bg: "#fee2e2", color: "#dc2626", label: "Cancelado" },
    leve: { bg: "#fef9c3", color: "#ca8a04", label: "Leve" },
    moderado: { bg: "#fed7aa", color: "#ea580c", label: "Moderado" },
    critico: { bg: "#fecaca", color: "#dc2626", label: "Crítico" },
  };
  const c = configs[status] || configs.pendente;
  return (
    <span style={{ ...S.badge, background: c.bg, color: c.color }}>{c.label}</span>
  );
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS COMPARTILHADOS
   ══════════════════════════════════════════════════════════════ */
export const S = {
  /* ── Cards ──────────────────────────────────── */
  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #f1f5f9",
    padding: "20px 24px",
    boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: 16,
    margin: 0,
    paddingBottom: 12,
  },

  /* ── KPI ────────────────────────────────────── */
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },
  kpiGrid4: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
  },
  kpiCard: {
    background: "#fff",
    borderRadius: 14,
    border: "1px solid #f1f5f9",
    padding: "18px 20px",
    boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: "#94a3b8",
    margin: "0 0 6px 0",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  kpiValor: {
    fontSize: 22,
    fontWeight: 700,
    margin: "0 0 4px 0",
    letterSpacing: "-0.02em",
  },
  kpiSub: {
    fontSize: 12,
    fontWeight: 500,
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  /* ── Badge ──────────────────────────────────── */
  badge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
  },

  /* ── Toolbar ────────────────────────────────── */
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },

  /* ── Tabela ─────────────────────────────────── */
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    padding: "10px 12px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: "1px solid #f1f5f9",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 12px",
    borderBottom: "1px solid #f8fafc",
    verticalAlign: "middle",
  },

  /* ── Tag Categoria ──────────────────────────── */
  tagCategoria: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    border: "1px solid",
    background: "#fff",
  },

  /* ── Botões ─────────────────────────────────── */
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  btnOutline: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    background: "#fff",
    color: "#334155",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  btnIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    padding: 0,
    background: "#f8fafc",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  btnIconSuccess: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    padding: 0,
    background: "#f0fdf4",
    color: "#16a34a",
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  btnIconDanger: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    padding: 0,
    background: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },

  /* ── Select / Input ─────────────────────────── */
  select: {
    padding: "7px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 13,
    color: "#334155",
    background: "#fff",
    outline: "none",
    cursor: "pointer",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    fontSize: 13,
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    transition: "border 0.15s ease",
    boxSizing: "border-box",
  },

  /* ── Forms ──────────────────────────────────── */
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  formGroup2: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    gridColumn: "1 / -1",
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
    paddingTop: 16,
    borderTop: "1px solid #f1f5f9",
  },

  /* ── Modal ──────────────────────────────────── */
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15,23,42,0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: "#fff",
    borderRadius: 18,
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 25px 60px rgba(15,23,42,0.2)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 24px",
    borderBottom: "1px solid #f1f5f9",
    position: "sticky",
    top: 0,
    background: "#fff",
    borderRadius: "18px 18px 0 0",
    zIndex: 10,
  },
  modalTitulo: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  modalClose: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    border: "none",
    background: "#f1f5f9",
    borderRadius: 8,
    cursor: "pointer",
    color: "#64748b",
    transition: "all 0.15s ease",
  },
  modalBody: {
    padding: "20px 24px",
  },

  /* ── Estados ────────────────────────────────── */
  loadingBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 60,
    color: "#94a3b8",
    fontSize: 14,
  },
  emptyState: {
    padding: "40px 20px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 13,
  },

  /* ── Progress Bar ───────────────────────────── */
  progressBar: {
    width: "100%",
    height: 8,
    background: "#f1f5f9",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
    transition: "width 0.5s ease",
  },

  /* ── Abas (usado no Financeiro.jsx) ─────────── */
  tabsContainer: {
    display: "flex",
    gap: 2,
    background: "#f1f5f9",
    padding: 4,
    borderRadius: 12,
    overflowX: "auto",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    border: "none",
    background: "transparent",
    borderRadius: 9,
    fontSize: 13,
    fontWeight: 500,
    color: "#64748b",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  tabActive: {
    background: "#fff",
    color: "#0f172a",
    fontWeight: 600,
    boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
  },
  tabHover: {
    color: "#334155",
    background: "rgba(255,255,255,0.5)",
  },

  /* ── Header da página ───────────────────────── */
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  periodSelector: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
};
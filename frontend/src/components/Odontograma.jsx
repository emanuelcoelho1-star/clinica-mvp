import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   ODONTOGRAMA PROFISSIONAL — FDI (Permanente + Decíduo)
   ─────────────────────────────────────────────────────────────
   Melhorias vs versão anterior:
   • Notas/observações por dente
   • Painel lateral de detalhes do dente selecionado
   • Resumo/contadores de condições
   • Toggle Adulto / Infantil (decíduo)
   • Aplicar condição em TODAS as faces do dente de uma vez
   • Hover com tooltip visual na face
   • Histórico visual (tabela de dentes alterados)
   • Filtro por condição (destaca dentes com a condição)
   • Dentes com formato anatômico SVG (molar, pré-molar, canino, incisivo)
   • Layout responsivo melhorado
   ═══════════════════════════════════════════════════════════════ */

/* ── Condições e cores ─────────────────────────────────────── */
const CONDICOES = [
  { id: "higido",       label: "Hígido",           cor: "#e2e8f0", corBorda: "#cbd5e1", icone: "○" },
  { id: "carie",        label: "Cárie",            cor: "#fca5a5", corBorda: "#ef4444", icone: "●" },
  { id: "restauracao",  label: "Restauração",      cor: "#93c5fd", corBorda: "#3b82f6", icone: "■" },
  { id: "ausente",      label: "Ausente",          cor: "#d1d5db", corBorda: "#6b7280", icone: "✕" },
  { id: "endodontia",   label: "Endodontia",       cor: "#fde68a", corBorda: "#f59e0b", icone: "▲" },
  { id: "protese",      label: "Prótese",          cor: "#86efac", corBorda: "#22c55e", icone: "◆" },
  { id: "implante",     label: "Implante",         cor: "#c4b5fd", corBorda: "#8b5cf6", icone: "⬟" },
  { id: "selante",      label: "Selante",          cor: "#f9a8d4", corBorda: "#ec4899", icone: "◐" },
  { id: "fratura",      label: "Fratura",          cor: "#fdba74", corBorda: "#f97316", icone: "⚡" },
  { id: "coroa",        label: "Coroa",            cor: "#a5f3fc", corBorda: "#06b6d4", icone: "♛" },
  { id: "provisorio",   label: "Provisório",       cor: "#fef08a", corBorda: "#eab308", icone: "◑" },
  { id: "erupcionando", label: "Em erupção",       cor: "#d9f99d", corBorda: "#84cc16", icone: "↑" },
];

function getCondCor(condId) {
  return CONDICOES.find((c) => c.id === condId) || CONDICOES[0];
}

/* ── Nomes anatômicos dos dentes ─────────────────────────────── */
const NOMES_DENTES = {
  11: "Incisivo central sup. dir.", 12: "Incisivo lateral sup. dir.", 13: "Canino sup. dir.",
  14: "1º Pré-molar sup. dir.", 15: "2º Pré-molar sup. dir.", 16: "1º Molar sup. dir.",
  17: "2º Molar sup. dir.", 18: "3º Molar sup. dir. (siso)",
  21: "Incisivo central sup. esq.", 22: "Incisivo lateral sup. esq.", 23: "Canino sup. esq.",
  24: "1º Pr��-molar sup. esq.", 25: "2º Pré-molar sup. esq.", 26: "1º Molar sup. esq.",
  27: "2º Molar sup. esq.", 28: "3º Molar sup. esq. (siso)",
  31: "Incisivo central inf. esq.", 32: "Incisivo lateral inf. esq.", 33: "Canino inf. esq.",
  34: "1º Pré-molar inf. esq.", 35: "2º Pré-molar inf. esq.", 36: "1º Molar inf. esq.",
  37: "2º Molar inf. esq.", 38: "3º Molar inf. esq. (siso)",
  41: "Incisivo central inf. dir.", 42: "Incisivo lateral inf. dir.", 43: "Canino inf. dir.",
  44: "1º Pré-molar inf. dir.", 45: "2º Pré-molar inf. dir.", 46: "1º Molar inf. dir.",
  47: "2º Molar inf. dir.", 48: "3º Molar inf. dir. (siso)",
  51: "Incisivo central dec. sup. dir.", 52: "Incisivo lateral dec. sup. dir.", 53: "Canino dec. sup. dir.",
  54: "1º Molar dec. sup. dir.", 55: "2º Molar dec. sup. dir.",
  61: "Incisivo central dec. sup. esq.", 62: "Incisivo lateral dec. sup. esq.", 63: "Canino dec. sup. esq.",
  64: "1º Molar dec. sup. esq.", 65: "2º Molar dec. sup. esq.",
  71: "Incisivo central dec. inf. esq.", 72: "Incisivo lateral dec. inf. esq.", 73: "Canino dec. inf. esq.",
  74: "1º Molar dec. inf. esq.", 75: "2º Molar dec. inf. esq.",
  81: "Incisivo central dec. inf. dir.", 82: "Incisivo lateral dec. inf. dir.", 83: "Canino dec. inf. dir.",
  84: "1º Molar dec. inf. dir.", 85: "2º Molar dec. inf. dir.",
};

/* ── Arcadas FDI ───────────────────────────────────────────── */
const ARCADA_SUP_DIR  = [18, 17, 16, 15, 14, 13, 12, 11];
const ARCADA_SUP_ESQ  = [21, 22, 23, 24, 25, 26, 27, 28];
const ARCADA_DEC_SUP_DIR = [55, 54, 53, 52, 51];
const ARCADA_DEC_SUP_ESQ = [61, 62, 63, 64, 65];
const ARCADA_DEC_INF_DIR = [85, 84, 83, 82, 81];
const ARCADA_DEC_INF_ESQ = [71, 72, 73, 74, 75];
const ARCADA_INF_DIR  = [48, 47, 46, 45, 44, 43, 42, 41];
const ARCADA_INF_ESQ  = [31, 32, 33, 34, 35, 36, 37, 38];

const FACES = ["oclusal", "mesial", "distal", "vestibular", "lingual"];
const FACE_LABELS = { oclusal: "Oclusal (O)", mesial: "Mesial (M)", distal: "Distal (D)", vestibular: "Vestibular (V)", lingual: "Lingual (L)" };

/* ── Icons SVG ──────────────────────────────────────────────── */
const Icons = {
  tooth: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5.5c1.5-2 4-2.5 5.5-1s1 4.5-1 7-4.5 5-4.5 7.5c0-2.5-2.5-5-4.5-7.5s-2.5-5.5-1-7 4-1 5.5 1z" />
    </svg>
  ),
  save: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
  ),
  edit: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
    </svg>
  ),
  filter: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  clipboard: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  ),
  chevDown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
};
/* ═══════════════════════════════════════════════════════════════
   DESENHO ANATÔMICO SVG DOS DENTES
   ═══════════════════════════════════════════════════════════════ */
function getToothType(numero) {
  const q = Math.floor(numero / 10);
  const pos = numero % 10;
  if (q >= 5) { if (pos >= 4) return "molar"; if (pos === 3) return "canine"; return "incisor"; }
  if (pos >= 6) return "molar";
  if (pos >= 4) return "premolar";
  if (pos === 3) return "canine";
  return "incisor";
}

function isUpperTooth(numero) {
  const q = Math.floor(numero / 10);
  return q === 1 || q === 2 || q === 5 || q === 6;
}

function getAnatomyPaths(type, upper, w, h) {
  if (type === "molar") {
    if (upper) return {
      crown: `M${w*0.08},${h*0.55} C${w*0.06},${h*0.48},${w*0.10},${h*0.42},${w*0.18},${h*0.40} L${w*0.28},${h*0.38} C${w*0.34},${h*0.34},${w*0.40},${h*0.36},${w*0.44},${h*0.38} L${w*0.50},${h*0.36} C${w*0.56},${h*0.36},${w*0.62},${h*0.34},${w*0.66},${h*0.38} L${w*0.72},${h*0.38} C${w*0.82},${h*0.40},${w*0.90},${h*0.44},${w*0.92},${h*0.55} C${w*0.94},${h*0.66},${w*0.92},${h*0.78},${w*0.86},${h*0.88} C${w*0.78},${h*0.96},${w*0.22},${h*0.96},${w*0.14},${h*0.88} C${w*0.08},${h*0.78},${w*0.06},${h*0.66},${w*0.08},${h*0.55} Z`,
      roots: [
        `M${w*0.24},${h*0.42} Q${w*0.20},${h*0.22} ${w*0.22},${h*0.06}`,
        `M${w*0.50},${h*0.38} Q${w*0.50},${h*0.18} ${w*0.50},${h*0.04}`,
        `M${w*0.76},${h*0.42} Q${w*0.80},${h*0.22} ${w*0.78},${h*0.06}`,
      ],
    };
    return {
      crown: `M${w*0.08},${h*0.45} C${w*0.06},${h*0.34},${w*0.10},${h*0.22},${w*0.14},${h*0.14} C${w*0.22},${h*0.04},${w*0.78},${h*0.04},${w*0.86},${h*0.14} C${w*0.90},${h*0.22},${w*0.94},${h*0.34},${w*0.92},${h*0.45} C${w*0.94},${h*0.52},${w*0.88},${h*0.58},${w*0.82},${h*0.60} L${w*0.62},${h*0.62} C${w*0.56},${h*0.66},${w*0.44},${h*0.66},${w*0.38},${h*0.62} L${w*0.18},${h*0.60} C${w*0.12},${h*0.58},${w*0.06},${h*0.52},${w*0.08},${h*0.45} Z`,
      roots: [
        `M${w*0.30},${h*0.60} Q${w*0.26},${h*0.78} ${w*0.24},${h*0.94}`,
        `M${w*0.70},${h*0.60} Q${w*0.74},${h*0.78} ${w*0.76},${h*0.94}`,
      ],
    };
  }
  if (type === "premolar") {
    if (upper) return {
      crown: `M${w*0.14},${h*0.55} C${w*0.12},${h*0.48},${w*0.16},${h*0.42},${w*0.24},${h*0.40} C${w*0.34},${h*0.36},${w*0.42},${h*0.38},${w*0.46},${h*0.40} L${w*0.54},${h*0.40} C${w*0.58},${h*0.38},${w*0.66},${h*0.36},${w*0.76},${h*0.40} C${w*0.84},${h*0.42},${w*0.88},${h*0.48},${w*0.86},${h*0.55} C${w*0.90},${h*0.68},${w*0.86},${h*0.82},${w*0.78},${h*0.90} C${w*0.68},${h*0.97},${w*0.32},${h*0.97},${w*0.22},${h*0.90} C${w*0.14},${h*0.82},${w*0.10},${h*0.68},${w*0.14},${h*0.55} Z`,
      roots: [
        `M${w*0.36},${h*0.42} Q${w*0.32},${h*0.24} ${w*0.30},${h*0.06}`,
        `M${w*0.64},${h*0.42} Q${w*0.68},${h*0.24} ${w*0.70},${h*0.06}`,
      ],
    };
    return {
      crown: `M${w*0.14},${h*0.45} C${w*0.12},${h*0.34},${w*0.16},${h*0.22},${w*0.22},${h*0.14} C${w*0.32},${h*0.04},${w*0.68},${h*0.04},${w*0.78},${h*0.14} C${w*0.84},${h*0.22},${w*0.88},${h*0.34},${w*0.86},${h*0.45} C${w*0.88},${h*0.52},${w*0.84},${h*0.56},${w*0.76},${h*0.58} L${w*0.54},${h*0.60} C${w*0.48},${h*0.62},${w*0.42},${h*0.62},${w*0.38},${h*0.60} L${w*0.24},${h*0.58} C${w*0.16},${h*0.56},${w*0.12},${h*0.52},${w*0.14},${h*0.45} Z`,
      roots: [
        `M${w*0.50},${h*0.60} Q${w*0.50},${h*0.78} ${w*0.50},${h*0.94}`,
      ],
    };
  }
  if (type === "canine") {
    if (upper) return {
      crown: `M${w*0.20},${h*0.58} C${w*0.18},${h*0.52},${w*0.22},${h*0.44},${w*0.30},${h*0.42} C${w*0.38},${h*0.38},${w*0.44},${h*0.36},${w*0.50},${h*0.34} C${w*0.56},${h*0.36},${w*0.62},${h*0.38},${w*0.70},${h*0.42} C${w*0.78},${h*0.44},${w*0.82},${h*0.52},${w*0.80},${h*0.58} C${w*0.84},${h*0.70},${w*0.80},${h*0.84},${w*0.72},${h*0.92} C${w*0.64},${h*0.98},${w*0.36},${h*0.98},${w*0.28},${h*0.92} C${w*0.20},${h*0.84},${w*0.16},${h*0.70},${w*0.20},${h*0.58} Z`,
      roots: [
        `M${w*0.50},${h*0.36} Q${w*0.50},${h*0.18} ${w*0.50},${h*0.03}`,
      ],
    };
    return {
      crown: `M${w*0.20},${h*0.42} C${w*0.16},${h*0.30},${w*0.20},${h*0.16},${w*0.28},${h*0.08} C${w*0.36},${h*0.02},${w*0.64},${h*0.02},${w*0.72},${h*0.08} C${w*0.80},${h*0.16},${w*0.84},${h*0.30},${w*0.80},${h*0.42} C${w*0.82},${h*0.48},${w*0.78},${h*0.54},${w*0.70},${h*0.58} C${w*0.62},${h*0.64},${w*0.56},${h*0.66},${w*0.50},${h*0.66} C${w*0.44},${h*0.66},${w*0.38},${h*0.64},${w*0.30},${h*0.58} C${w*0.22},${h*0.54},${w*0.18},${h*0.48},${w*0.20},${h*0.42} Z`,
      roots: [
        `M${w*0.50},${h*0.64} Q${w*0.50},${h*0.82} ${w*0.50},${h*0.97}`,
      ],
    };
  }
  // incisor
  if (upper) return {
    crown: `M${w*0.22},${h*0.56} C${w*0.20},${h*0.50},${w*0.24},${h*0.44},${w*0.32},${h*0.42} C${w*0.40},${h*0.40},${w*0.46},${h*0.40},${w*0.50},${h*0.40} C${w*0.54},${h*0.40},${w*0.60},${h*0.40},${w*0.68},${h*0.42} C${w*0.76},${h*0.44},${w*0.80},${h*0.50},${w*0.78},${h*0.56} C${w*0.82},${h*0.68},${w*0.78},${h*0.82},${w*0.72},${h*0.90} C${w*0.64},${h*0.97},${w*0.36},${h*0.97},${w*0.28},${h*0.90} C${w*0.22},${h*0.82},${w*0.18},${h*0.68},${w*0.22},${h*0.56} Z`,
    roots: [
      `M${w*0.50},${h*0.42} Q${w*0.50},${h*0.22} ${w*0.50},${h*0.04}`,
    ],
  };
  return {
    crown: `M${w*0.22},${h*0.44} C${w*0.18},${h*0.32},${w*0.22},${h*0.18},${w*0.28},${h*0.10} C${w*0.36},${h*0.03},${w*0.64},${h*0.03},${w*0.72},${h*0.10} C${w*0.78},${h*0.18},${w*0.82},${h*0.32},${w*0.78},${h*0.44} C${w*0.80},${h*0.50},${w*0.76},${h*0.56},${w*0.68},${h*0.58} C${w*0.60},${h*0.60},${w*0.54},${h*0.60},${w*0.50},${h*0.60} C${w*0.46},${h*0.60},${w*0.40},${h*0.60},${w*0.32},${h*0.58} C${w*0.24},${h*0.56},${w*0.20},${h*0.50},${w*0.22},${h*0.44} Z`,
    roots: [
      `M${w*0.50},${h*0.58} Q${w*0.50},${h*0.78} ${w*0.50},${h*0.96}`,
    ],
  };
}

/* ── Componente SVG anatômico (decorativo) ─────────────────── */
function ToothAnatomySVG({ numero, ausente }) {
  const w = 46, h = 48;
  const type = getToothType(numero);
  const upper = isUpperTooth(numero);
  const { crown, roots } = getAnatomyPaths(type, upper, w, h);

  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{
        display: "block",
        filter: ausente ? "saturate(0.2) opacity(0.35)" : "none",
        pointerEvents: "none",
      }}
    >
      {roots.map((d, i) => (
        <path key={i} d={d} stroke="#b0bec5" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      ))}
      <path d={crown} fill="#f0f4f8" stroke="#90a4ae" strokeWidth="1.3" />
    </svg>
  );
}

/* ── SVG de um dente (5 faces) ─────────────────────────────── */
const DENTE_SIZE = 46;
const SZ = DENTE_SIZE;
const HF = SZ / 2;
const QR = SZ / 4;
const TQ = (SZ * 3) / 4;

function DenteSVG({ numero, faces, onFaceClick, ausente, selected, dimmed, onDenteClick }) {
  const [hoveredFace, setHoveredFace] = useState(null);
  const upper = isUpperTooth(numero);

  const facePaths = {
    oclusal:    { d: `M${QR},${QR} L${TQ},${QR} L${TQ},${TQ} L${QR},${TQ} Z` },
    vestibular: { d: `M0,0 L${SZ},0 L${TQ},${QR} L${QR},${QR} Z` },
    lingual:    { d: `M${QR},${TQ} L${TQ},${TQ} L${SZ},${SZ} L0,${SZ} Z` },
    mesial:     { d: `M0,0 L${QR},${QR} L${QR},${TQ} L0,${SZ} Z` },
    distal:     { d: `M${TQ},${QR} L${SZ},0 L${SZ},${SZ} L${TQ},${TQ} Z` },
  };

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "1px",
        opacity: dimmed ? 0.25 : 1, transition: "opacity 0.2s",
        cursor: "pointer",
      }}
      onClick={() => onDenteClick && onDenteClick(numero)}
    >
      {/* Número */}
      <span style={{
        fontSize: "10px", fontWeight: "700",
        color: selected ? "#2563eb" : ausente ? "#d1d5db" : "#475569",
        fontFamily: "monospace", userSelect: "none",
        transition: "color 0.15s",
      }}>
        {numero}
      </span>

      {/* Anatomia acima das faces para dentes superiores */}
      {upper && <ToothAnatomySVG numero={numero} ausente={ausente} />}

      {/* Faces clicáveis */}
      <svg
        width={SZ} height={SZ}
        viewBox={`0 0 ${SZ} ${SZ}`}
        style={{
          cursor: "pointer",
          filter: ausente ? "saturate(0.3) opacity(0.5)" : "none",
          borderRadius: "4px",
          outline: selected ? "2px solid #2563eb" : "none",
          outlineOffset: "2px",
          transition: "outline 0.15s",
        }}
      >
        {FACES.map((face) => {
          const cond = getCondCor(faces[face]);
          const p = facePaths[face];
          const isHov = hoveredFace === face;
          return (
            <path
              key={face}
              d={p.d}
              fill={isHov ? cond.corBorda : cond.cor}
              stroke={cond.corBorda}
              strokeWidth="1.2"
              style={{ cursor: "pointer", transition: "fill 0.12s" }}
              onClick={(e) => { e.stopPropagation(); onFaceClick(numero, face, e); }}
              onMouseEnter={() => setHoveredFace(face)}
              onMouseLeave={() => setHoveredFace(null)}
            >
              <title>{`${numero} – ${FACE_LABELS[face] || face}`}</title>
            </path>
          );
        })}

        {ausente && (
          <>
            <line x1="3" y1="3" x2={SZ - 3} y2={SZ - 3} stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <line x1={SZ - 3} y1="3" x2="3" y2={SZ - 3} stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}
      </svg>

      {/* Anatomia abaixo das faces para dentes inferiores */}
      {!upper && <ToothAnatomySVG numero={numero} ausente={ausente} />}
    </div>
  );
}

/* ── Fileira de dentes ─────────────────────────────────────── */
function Fileira({ dentes, mapa, onFaceClick, selectedDente, filtroCondicao, onDenteClick, notas }) {
  return (
    <div style={{ display: "flex", gap: "4px", justifyContent: "center", flexWrap: "wrap" }}>
      {dentes.map((num) => {
        const f = mapa[num] || {};
        const ausente = Object.values(f).some((v) => v === "ausente");
        const temNota = notas[num] && notas[num].trim().length > 0;

        let dimmed = false;
        if (filtroCondicao) {
          const temCond = Object.values(f).some((v) => v === filtroCondicao);
          dimmed = !temCond;
        }

        return (
          <div key={num} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
            <DenteSVG
              numero={num}
              faces={{
                oclusal:    f.oclusal    || "higido",
                mesial:     f.mesial     || "higido",
                distal:     f.distal     || "higido",
                vestibular: f.vestibular || "higido",
                lingual:    f.lingual    || "higido",
              }}
              ausente={ausente}
              selected={selectedDente === num}
              dimmed={dimmed}
              onFaceClick={onFaceClick}
              onDenteClick={onDenteClick}
            />
            {temNota && (
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#2563eb", marginTop: "2px",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
/* ── Popup de seleção de condição ──────────────────────────── */
function CondPopup({ pos, denteFace, onSelect, onSelectAll, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  if (!denteFace) return null;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed", top: pos.y, left: pos.x, zIndex: 9999,
        background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px",
        boxShadow: "0 16px 48px rgba(0,0,0,0.18)", padding: "8px",
        display: "flex", flexDirection: "column", gap: "2px",
        minWidth: "200px", maxHeight: "420px", overflowY: "auto",
      }}
    >
      <div style={{
        fontSize: "11px", fontWeight: "700", color: "#94a3b8",
        textTransform: "uppercase", letterSpacing: "0.06em",
        padding: "6px 10px 8px", borderBottom: "1px solid #f1f5f9", marginBottom: "4px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span>Dente {denteFace.dente} — {FACE_LABELS[denteFace.face] || denteFace.face}</span>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#94a3b8", display: "flex", padding: "2px",
        }}>
          {Icons.x}
        </button>
      </div>

      {CONDICOES.map((cond) => (
        <button
          key={cond.id}
          onClick={() => onSelect(cond.id)}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "8px 10px", border: "none", borderRadius: "8px",
            background: "transparent", cursor: "pointer", fontSize: "13px",
            fontWeight: "500", color: "#334155", transition: "background 0.12s",
            textAlign: "left", width: "100%", fontFamily: "inherit",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{
            width: "18px", height: "18px", borderRadius: "5px",
            background: cond.cor, border: `2px solid ${cond.corBorda}`,
            flexShrink: 0,
          }} />
          {cond.label}
        </button>
      ))}

      <div style={{ borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />

      <button
        onClick={() => onSelectAll && onSelectAll(denteFace.dente)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 10px", border: "none", borderRadius: "8px",
          background: "transparent", cursor: "pointer", fontSize: "12px",
          fontWeight: "600", color: "#2563eb", transition: "background 0.12s",
          textAlign: "left", width: "100%", fontFamily: "inherit",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ display: "flex" }}>{Icons.clipboard}</span>
        Aplicar em todas as faces
      </button>
    </div>
  );
}

/* ── Painel lateral de detalhes do dente ──────────────────── */
function PainelDente({ denteNum, mapa, notas, onNotaChange, onClose, onFaceClick }) {
  const nome = NOMES_DENTES[denteNum] || `Dente ${denteNum}`;
  const f = mapa[denteNum] || {};
  const ausente = Object.values(f).some((v) => v === "ausente");

  return (
    <div style={{
      background: "#fff", borderRadius: "14px", border: "1px solid #f1f5f9",
      padding: "20px", display: "flex", flexDirection: "column", gap: "16px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "32px", height: "32px", borderRadius: "8px",
              background: "#eff6ff", color: "#2563eb",
            }}>
              {Icons.tooth}
            </span>
            <div>
              <span style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                {denteNum}
              </span>
              {ausente && (
                <span style={{
                  marginLeft: "8px", fontSize: "11px", fontWeight: "600",
                  color: "#dc2626", background: "#fef2f2", padding: "2px 8px",
                  borderRadius: "6px", border: "1px solid #fecaca",
                }}>
                  Ausente
                </span>
              )}
            </div>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b", fontWeight: "500" }}>
            {nome}
          </p>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#94a3b8", display: "flex", padding: "4px",
          borderRadius: "6px",
        }}>
          {Icons.x}
        </button>
      </div>

      {/* Anatomia decorativa centralizada */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <ToothAnatomySVG numero={denteNum} ausente={ausente} />
      </div>

      {/* Faces */}
      <div>
        <span style={{
          fontSize: "11px", fontWeight: "700", color: "#94a3b8",
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          Faces do dente
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
          {FACES.map((face) => {
            const condId = f[face] || "higido";
            const cond = getCondCor(condId);
            return (
              <div
                key={face}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", borderRadius: "8px", background: "#fafbfc",
                  border: "1px solid #f1f5f9", cursor: "pointer",
                  transition: "background 0.12s",
                }}
                onClick={(e) => onFaceClick(denteNum, face, e)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fafbfc")}
              >
                <span style={{ fontSize: "13px", fontWeight: "500", color: "#334155" }}>
                  {FACE_LABELS[face]}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{
                    width: "14px", height: "14px", borderRadius: "4px",
                    background: cond.cor, border: `1.5px solid ${cond.corBorda}`,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: "12px", fontWeight: "600",
                    color: condId === "higido" ? "#94a3b8" : cond.corBorda,
                  }}>
                    {cond.label}
                  </span>
                  <span style={{ display: "flex", color: "#cbd5e1" }}>{Icons.edit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notas */}
      <div>
        <span style={{
          fontSize: "11px", fontWeight: "700", color: "#94a3b8",
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          Observações do dente
        </span>
        <textarea
          value={notas[denteNum] || ""}
          onChange={(e) => onNotaChange(denteNum, e.target.value)}
          placeholder="Ex: restauração MOD em resina composta, cor A2..."
          style={{
            width: "100%", minHeight: "80px", marginTop: "8px",
            padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0",
            fontSize: "13px", color: "#334155", resize: "vertical",
            fontFamily: "inherit", lineHeight: 1.6, outline: "none",
            transition: "border-color 0.15s", background: "#fafbfc",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
        />
      </div>
    </div>
  );
}

/* ── Legenda ───────────────────────────────────────────────── */
function Legenda({ filtroCondicao, onFiltro }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center",
      padding: "14px 0 4px", borderTop: "1px solid #f1f5f9", marginTop: "8px",
    }}>
      {CONDICOES.map((c) => {
        const ativo = filtroCondicao === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onFiltro(ativo ? null : c.id)}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              padding: "4px 10px", borderRadius: "6px",
              border: ativo ? `2px solid ${c.corBorda}` : "1px solid #f1f5f9",
              background: ativo ? c.cor : "transparent",
              cursor: "pointer", fontSize: "11px", fontWeight: "600",
              color: ativo ? c.corBorda : "#64748b",
              transition: "all 0.15s", fontFamily: "inherit",
            }}
          >
            <span style={{
              width: "10px", height: "10px", borderRadius: "3px",
              background: c.cor, border: `1.5px solid ${c.corBorda}`,
            }} />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Resumo de condições ───────────────────────────────────── */
function Resumo({ mapa }) {
  const contagem = useMemo(() => {
    const c = {};
    CONDICOES.forEach((cond) => { c[cond.id] = 0; });
    Object.values(mapa).forEach((faces) => {
      Object.values(faces).forEach((condId) => {
        if (c[condId] !== undefined) c[condId]++;
      });
    });
    return c;
  }, [mapa]);

  const total = Object.values(contagem).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const ativos = CONDICOES.filter((c) => contagem[c.id] > 0 && c.id !== "higido");
  if (ativos.length === 0) return null;

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px",
    }}>
      {ativos.map((c) => (
        <div key={c.id} style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 14px", borderRadius: "10px",
          background: "#fff", border: "1px solid #f1f5f9",
        }}>
          <span style={{
            width: "14px", height: "14px", borderRadius: "4px",
            background: c.cor, border: `1.5px solid ${c.corBorda}`,
          }} />
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#334155" }}>
            {c.label}
          </span>
          <span style={{
            fontSize: "12px", fontWeight: "800", color: c.corBorda,
            background: c.cor, padding: "1px 8px", borderRadius: "6px",
            minWidth: "20px", textAlign: "center",
          }}>
            {contagem[c.id]}
          </span>
        </div>
      ))}
    </div>
  );
}
/* ═══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════════ */
export default function Odontograma({ pacienteId }) {
  const [mapa, setMapa] = useState({});
  const [notas, setNotas] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [msgSucesso, setMsgSucesso] = useState(false);
  const [alterado, setAlterado] = useState(false);

  const [modoArcada, setModoArcada] = useState("adulto");
  const [filtroCondicao, setFiltroCondicao] = useState(null);
  const [selectedDente, setSelectedDente] = useState(null);

  const [popup, setPopup] = useState(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });
  const [applyAllCond, setApplyAllCond] = useState(null);

  /* ── Carregar ────────────────────────────────────────── */
  useEffect(() => {
    if (!pacienteId) return;
    const token = localStorage.getItem("token");
    setCarregando(true);
    fetch(`http://localhost:3001/pacientes/${pacienteId}/odontograma`, {
      headers: { Authorization: token },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar");
        return r.json();
      })
      .then((data) => {
        if (data && typeof data === "object") {
          if (data.notas) {
            setNotas(data.notas);
            const m = { ...data };
            delete m.notas;
            setMapa(m);
          } else {
            setMapa(data);
          }
        }
      })
      .catch(() => setErro("Não foi possível carregar o odontograma."))
      .finally(() => setCarregando(false));
  }, [pacienteId]);

  /* ── Salvar ──────────────────────────────────────────── */
  const salvar = useCallback(async () => {
    const token = localStorage.getItem("token");
    setSalvando(true);
    setErro(null);
    try {
      const payload = { ...mapa, notas };
      const r = await fetch(`http://localhost:3001/pacientes/${pacienteId}/odontograma`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ mapa: payload }),
      });
      if (!r.ok) throw new Error();
      setMsgSucesso(true);
      setAlterado(false);
      setTimeout(() => setMsgSucesso(false), 2500);
    } catch {
      setErro("Erro ao salvar o odontograma.");
    } finally {
      setSalvando(false);
    }
  }, [mapa, notas, pacienteId]);

  /* ── Clique na face ──────────────────────────────────── */
  const handleFaceClick = useCallback((dente, face, event) => {
    const e = event || window.event;
    const x = e?.clientX || 200;
    const y = e?.clientY || 200;
    const popX = Math.min(x, window.innerWidth - 240);
    const popY = Math.min(y, window.innerHeight - 460);
    setPopup({ dente, face });
    setPopupPos({ x: popX, y: popY });
    setSelectedDente(dente);
  }, []);

  const handleSelectCond = useCallback((condId) => {
    if (!popup) return;

    if (applyAllCond) {
      setMapa((prev) => ({
        ...prev,
        [popup.dente]: {
          oclusal: condId, mesial: condId, distal: condId,
          vestibular: condId, lingual: condId,
        },
      }));
      setApplyAllCond(null);
    } else if (condId === "ausente") {
      setMapa((prev) => ({
        ...prev,
        [popup.dente]: {
          oclusal: "ausente", mesial: "ausente", distal: "ausente",
          vestibular: "ausente", lingual: "ausente",
        },
      }));
    } else {
      setMapa((prev) => {
        const denteAtual = prev[popup.dente] || {};
        const todasAusentes = Object.values(denteAtual).every((v) => v === "ausente");
        if (todasAusentes) {
          return {
            ...prev,
            [popup.dente]: {
              oclusal: "higido", mesial: "higido", distal: "higido",
              vestibular: "higido", lingual: "higido",
              [popup.face]: condId,
            },
          };
        }
        return {
          ...prev,
          [popup.dente]: { ...denteAtual, [popup.face]: condId },
        };
      });
    }
    setAlterado(true);
    setPopup(null);
  }, [popup, applyAllCond]);

  const handleSelectAll = useCallback((dente) => {
    setApplyAllCond(dente);
  }, []);

  const handleNotaChange = useCallback((dente, texto) => {
    setNotas((prev) => ({ ...prev, [dente]: texto }));
    setAlterado(true);
  }, []);

  /* ── Limpar tudo ─────────────────────────────────────── */
  const limparTudo = useCallback(() => {
    if (!window.confirm("Tem certeza que deseja limpar todo o odontograma? Isso removerá todas as condições e notas.")) return;
    setMapa({});
    setNotas({});
    setAlterado(true);
    setSelectedDente(null);
  }, []);

  /* ── Contadores rápidos ──────────────────────────────── */
  const stats = useMemo(() => {
    let alterados = 0;
    let ausentes = 0;
    Object.entries(mapa).forEach(([, faces]) => {
      if (typeof faces !== "object") return;
      const vals = Object.values(faces);
      if (vals.some((v) => v !== "higido")) alterados++;
      if (vals.some((v) => v === "ausente")) ausentes++;
    });
    const comNotas = Object.values(notas).filter((n) => n && n.trim()).length;
    return { alterados, ausentes, comNotas };
  }, [mapa, notas]);

  /* ── Loading ─────────────────────────────────────────── */
  if (carregando) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: "16px", padding: "48px",
      }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb", animation: "pulse-dot 1.4s ease-in-out infinite" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb", animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.2s" }} />
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb", animation: "pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.4s" }} />
        </div>
        <span style={{ fontSize: "14px", fontWeight: "500", color: "#94a3b8" }}>Carregando odontograma</span>
        <style>{`@keyframes pulse-dot { 0%, 80%, 100% { transform: scale(0); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    );
  }

  const fileiraProps = { mapa, onFaceClick: handleFaceClick, selectedDente, filtroCondicao, onDenteClick: setSelectedDente, notas };
    return (
    <div style={{ position: "relative" }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px", marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "36px", height: "36px", borderRadius: "10px",
            background: "#eff6ff", color: "#2563eb",
          }}>
            {Icons.tooth}
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
              Odontograma
            </h3>
            <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>
              {stats.alterados} dente{stats.alterados !== 1 ? "s" : ""} alterado{stats.alterados !== 1 ? "s" : ""}
              {stats.ausentes > 0 && ` · ${stats.ausentes} ausente${stats.ausentes !== 1 ? "s" : ""}`}
              {stats.comNotas > 0 && ` · ${stats.comNotas} com notas`}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {msgSucesso && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              fontSize: "12px", fontWeight: "600", color: "#16a34a",
              background: "#f0fdf4", padding: "6px 14px", borderRadius: "8px",
              border: "1px solid #bbf7d0",
            }}>
              {Icons.check} Salvo com sucesso
            </span>
          )}
          {erro && (
            <span style={{
              fontSize: "12px", fontWeight: "600", color: "#dc2626",
              background: "#fef2f2", padding: "6px 14px", borderRadius: "8px",
              border: "1px solid #fecaca",
            }}>
              {erro}
            </span>
          )}

          {/* Toggle arcada */}
          <div style={{
            display: "flex", borderRadius: "8px", border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}>
            {[
              { id: "adulto", label: "Adulto" },
              { id: "infantil", label: "Infantil" },
              { id: "ambos", label: "Ambos" },
                        ].map((m) => (
              <button
                key={m.id}
                onClick={() => setModoArcada(m.id)}
                style={{
                  padding: "6px 14px", border: "none", cursor: "pointer",
                  fontSize: "12px", fontWeight: "600", fontFamily: "inherit",
                  background: modoArcada === m.id ? "#2563eb" : "transparent",
                  color: modoArcada === m.id ? "#fff" : "#64748b",
                  transition: "all 0.15s",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Filtro */}
          <button
            onClick={() => setFiltroCondicao(null)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: "8px",
              background: filtroCondicao ? "#eff6ff" : "transparent",
              cursor: "pointer", fontSize: "12px", fontWeight: "600",
              color: filtroCondicao ? "#2563eb" : "#64748b",
              fontFamily: "inherit", transition: "all 0.15s",
            }}
          >
            {Icons.filter}
            {filtroCondicao ? `Filtro: ${getCondCor(filtroCondicao).label}` : "Filtrar"}
          </button>

          {/* Limpar */}
          <button
            onClick={limparTudo}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 12px", border: "1px solid #fecaca", borderRadius: "8px",
              background: "#fef2f2", cursor: "pointer", fontSize: "12px",
              fontWeight: "600", color: "#dc2626", fontFamily: "inherit",
            }}
          >
            {Icons.trash} Limpar
          </button>

          {/* Salvar */}
          <button
            onClick={salvar}
            disabled={salvando || !alterado}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 16px", border: "none", borderRadius: "8px",
              background: alterado ? "#2563eb" : "#e2e8f0",
              cursor: alterado ? "pointer" : "default",
              fontSize: "12px", fontWeight: "700", color: alterado ? "#fff" : "#94a3b8",
              fontFamily: "inherit", transition: "all 0.15s",
              opacity: salvando ? 0.6 : 1,
            }}
          >
            {Icons.save} {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* ── Corpo: Arcadas + Painel lateral ─────────────── */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>

        {/* Coluna das arcadas */}
        <div style={{ flex: "1 1 500px", display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Arcada superior adulto */}
          {(modoArcada === "adulto" || modoArcada === "ambos") && (
            <div style={{
              background: "#fff", borderRadius: "12px", border: "1px solid #f1f5f9",
              padding: "16px",
            }}>
              <div style={{
                fontSize: "11px", fontWeight: "700", color: "#94a3b8",
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: "10px", textAlign: "center",
              }}>
                Arcada Superior — Permanente
              </div>
              <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                <Fileira dentes={ARCADA_SUP_DIR} {...fileiraProps} />
                <div style={{ width: "12px" }} />
                <Fileira dentes={ARCADA_SUP_ESQ} {...fileiraProps} />
              </div>
            </div>
          )}

          {/* Arcada superior decídua */}
          {(modoArcada === "infantil" || modoArcada === "ambos") && (
            <div style={{
              background: "#fff", borderRadius: "12px", border: "1px solid #f1f5f9",
              padding: "16px",
            }}>
              <div style={{
                fontSize: "11px", fontWeight: "700", color: "#94a3b8",
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: "10px", textAlign: "center",
              }}>
                Arcada Superior — Decídua
              </div>
              <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                <Fileira dentes={ARCADA_DEC_SUP_DIR} {...fileiraProps} />
                <div style={{ width: "12px" }} />
                <Fileira dentes={ARCADA_DEC_SUP_ESQ} {...fileiraProps} />
              </div>
            </div>
          )}

          {/* Arcada inferior decídua */}
          {(modoArcada === "infantil" || modoArcada === "ambos") && (
            <div style={{
              background: "#fff", borderRadius: "12px", border: "1px solid #f1f5f9",
              padding: "16px",
            }}>
              <div style={{
                fontSize: "11px", fontWeight: "700", color: "#94a3b8",
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: "10px", textAlign: "center",
              }}>
                Arcada Inferior — Decídua
              </div>
              <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                <Fileira dentes={ARCADA_DEC_INF_DIR} {...fileiraProps} />
                <div style={{ width: "12px" }} />
                <Fileira dentes={ARCADA_DEC_INF_ESQ} {...fileiraProps} />
              </div>
            </div>
          )}

          {/* Arcada inferior adulto */}
          {(modoArcada === "adulto" || modoArcada === "ambos") && (
            <div style={{
              background: "#fff", borderRadius: "12px", border: "1px solid #f1f5f9",
              padding: "16px",
            }}>
              <div style={{
                fontSize: "11px", fontWeight: "700", color: "#94a3b8",
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: "10px", textAlign: "center",
              }}>
                Arcada Inferior — Permanente
              </div>
              <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                <Fileira dentes={ARCADA_INF_DIR} {...fileiraProps} />
                <div style={{ width: "12px" }} />
                <Fileira dentes={ARCADA_INF_ESQ} {...fileiraProps} />
              </div>
            </div>
          )}

          {/* Legenda + Resumo */}
          <Legenda filtroCondicao={filtroCondicao} onFiltro={setFiltroCondicao} />
          <Resumo mapa={mapa} />
        </div>

        {/* Painel lateral do dente selecionado */}
        {selectedDente && (
          <div style={{ flex: "0 0 320px", maxWidth: "360px" }}>
            <PainelDente
              denteNum={selectedDente}
              mapa={mapa}
              notas={notas}
              onNotaChange={handleNotaChange}
              onClose={() => setSelectedDente(null)}
              onFaceClick={handleFaceClick}
            />
          </div>
        )}
      </div>

      {/* ── Popup de condição ─────────────────────────────── */}
      {popup && (
        <CondPopup
          pos={popupPos}
          denteFace={popup}
          onSelect={handleSelectCond}
          onSelectAll={handleSelectAll}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
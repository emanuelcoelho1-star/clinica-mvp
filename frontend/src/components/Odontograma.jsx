import { useCallback, useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   ODONTOGRAMA COMPLETO — FDI (Permanente + Decíduo)
   ═══════════════════════════════════════════════════════════════ */

/* ── Condições e cores ─────────────────────────────────────── */
const CONDICOES = [
  { id: "higido",       label: "Hígido",       cor: "#e2e8f0", corBorda: "#cbd5e1" },
  { id: "carie",        label: "Cárie",        cor: "#fca5a5", corBorda: "#ef4444" },
  { id: "restauracao",  label: "Restauração",  cor: "#93c5fd", corBorda: "#3b82f6" },
  { id: "ausente",      label: "Ausente",      cor: "#d1d5db", corBorda: "#6b7280" },
  { id: "endodontia",   label: "Endodontia",   cor: "#fde68a", corBorda: "#f59e0b" },
  { id: "protese",      label: "Prótese",      cor: "#86efac", corBorda: "#22c55e" },
  { id: "implante",     label: "Implante",     cor: "#c4b5fd", corBorda: "#8b5cf6" },
  { id: "selante",      label: "Selante",      cor: "#f9a8d4", corBorda: "#ec4899" },
  { id: "fratura",      label: "Fratura",      cor: "#fdba74", corBorda: "#f97316" },
];

function getCondCor(condId) {
  return CONDICOES.find((c) => c.id === condId) || CONDICOES[0];
}

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

/* ── SVG de um dente (5 faces) ─────────────────────────────── */
const DENTE_SIZE = 44;
const S = DENTE_SIZE;
const H = S / 2;
const Q = S / 4;
const TQ = (S * 3) / 4;

function DenteSVG({ numero, faces, onFaceClick, ausente }) {
  const facePaths = {
    oclusal:    { d: `M${Q},${Q} L${TQ},${Q} L${TQ},${TQ} L${Q},${TQ} Z`, cx: H, cy: H },
    vestibular: { d: `M0,0 L${S},0 L${TQ},${Q} L${Q},${Q} Z`, cx: H, cy: Q / 2 },
    lingual:    { d: `M${Q},${TQ} L${TQ},${TQ} L${S},${S} L0,${S} Z`, cx: H, cy: TQ + Q / 2 },
    mesial:     { d: `M0,0 L${Q},${Q} L${Q},${TQ} L0,${S} Z`, cx: Q / 2, cy: H },
    distal:     { d: `M${TQ},${Q} L${S},0 L${S},${S} L${TQ},${TQ} Z`, cx: TQ + Q / 2, cy: H },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
      <span style={{
        fontSize: "10px", fontWeight: "700", color: ausente ? "#d1d5db" : "#475569",
        fontFamily: "monospace", userSelect: "none",
      }}>
        {numero}
      </span>
      <svg
        width={S} height={S}
        viewBox={`0 0 ${S} ${S}`}
        style={{ cursor: "pointer", filter: ausente ? "saturate(0.3) opacity(0.5)" : "none" }}
      >
        {FACES.map((face) => {
          const cond = getCondCor(faces[face]);
          const p = facePaths[face];
          return (
            <path
              key={face}
              d={p.d}
              fill={cond.cor}
              stroke={cond.corBorda}
              strokeWidth="1.2"
              style={{ cursor: "pointer", transition: "fill 0.15s" }}
              onClick={(e) => { e.stopPropagation(); onFaceClick(numero, face); }}
            >
              <title>{`${numero} – ${face}`}</title>
            </path>
          );
        })}

        {/* X para ausente */}
        {ausente && (
          <>
            <line x1="2" y1="2" x2={S - 2} y2={S - 2} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            <line x1={S - 2} y1="2" x2="2" y2={S - 2} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
}

/* ── Renderiza uma fileira de dentes ───────────────────────── */
function Fileira({ dentes, mapa, onFaceClick }) {
  return (
    <div style={{ display: "flex", gap: "4px", justifyContent: "center", flexWrap: "wrap" }}>
      {dentes.map((num) => {
        const f = mapa[num] || {};
        const ausente = Object.values(f).some((v) => v === "ausente");
        return (
          <DenteSVG
            key={num}
            numero={num}
            faces={{
              oclusal:    f.oclusal    || "higido",
              mesial:     f.mesial     || "higido",
              distal:     f.distal     || "higido",
              vestibular: f.vestibular || "higido",
              lingual:    f.lingual    || "higido",
            }}
            ausente={ausente}
            onFaceClick={onFaceClick}
          />
        );
      })}
    </div>
  );
}

/* ── Popup de seleção de condição ──────────────────────────── */
function CondPopup({ pos, denteFace, onSelect, onClose }) {
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
        position: "fixed",
        top: pos.y,
        left: pos.x,
        zIndex: 9999,
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minWidth: "160px",
        maxHeight: "340px",
        overflowY: "auto",
      }}
    >
      <div style={{
        fontSize: "11px", fontWeight: "700", color: "#94a3b8",
        textTransform: "uppercase", letterSpacing: "0.06em",
        padding: "4px 8px 6px", borderBottom: "1px solid #f1f5f9",
        marginBottom: "2px",
      }}>
        Dente {denteFace.dente} — {denteFace.face}
      </div>
      {CONDICOES.map((cond) => (
        <button
          key={cond.id}
          onClick={() => onSelect(cond.id)}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "7px 10px", border: "none", borderRadius: "8px",
            background: "transparent", cursor: "pointer", fontSize: "13px",
            fontWeight: "500", color: "#334155", transition: "background 0.12s",
            textAlign: "left", width: "100%",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{
            width: "16px", height: "16px", borderRadius: "4px",
            background: cond.cor, border: `2px solid ${cond.corBorda}`,
            flexShrink: 0,
          }} />
          {cond.label}
        </button>
      ))}
    </div>
  );
}

/* ── Legenda ───────────────────────────────────────────────── */
function Legenda() {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center",
      padding: "14px 0 4px", borderTop: "1px solid #f1f5f9", marginTop: "8px",
    }}>
      {CONDICOES.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{
            width: "12px", height: "12px", borderRadius: "3px",
            background: c.cor, border: `1.5px solid ${c.corBorda}`,
          }} />
          <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b" }}>
            {c.label}
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
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [msgSucesso, setMsgSucesso] = useState(false);
  const [alterado, setAlterado] = useState(false);

  // popup
  const [popup, setPopup] = useState(null);   // { dente, face }
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

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
        if (data && typeof data === "object" && Object.keys(data).length > 0) {
          setMapa(data);
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
      const r = await fetch(`http://localhost:3001/pacientes/${pacienteId}/odontograma`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ mapa }),
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
  }, [mapa, pacienteId]);

  /* ── Clique na face ──────────────────────────────────── */
  const handleFaceClick = useCallback((dente, face) => {
    const rect = document.elementFromPoint(
      window.event?.clientX || 0,
      window.event?.clientY || 0
    );
    const x = window.event?.clientX || 200;
    const y = window.event?.clientY || 200;

    // Ajustar popup para não sair da tela
    const popX = Math.min(x, window.innerWidth - 200);
    const popY = Math.min(y, window.innerHeight - 380);

    setPopup({ dente, face });
    setPopupPos({ x: popX, y: popY });
  }, []);

  const handleSelectCond = useCallback((condId) => {
    if (!popup) return;
    setMapa((prev) => {
      const denteAtual = prev[popup.dente] || {};
      // Se selecionar "ausente", marcar TODAS as faces
      if (condId === "ausente") {
        return {
          ...prev,
          [popup.dente]: {
            oclusal: "ausente",
            mesial: "ausente",
            distal: "ausente",
            vestibular: "ausente",
            lingual: "ausente",
          },
        };
      }
      // Se já era ausente e está trocando, limpar as outras faces
      const todasAusentes = Object.values(denteAtual).every((v) => v === "ausente");
      if (todasAusentes && condId !== "ausente") {
        return {
          ...prev,
          [popup.dente]: {
            oclusal: "higido",
            mesial: "higido",
            distal: "higido",
            vestibular: "higido",
            lingual: "higido",
            [popup.face]: condId,
          },
        };
      }
      return {
        ...prev,
        [popup.dente]: {
          ...denteAtual,
          [popup.face]: condId,
        },
      };
    });
    setAlterado(true);
    setPopup(null);
  }, [popup]);

  /* ── Limpar tudo ─────────────────────────────────────── */
  const limparTudo = useCallback(() => {
    if (!window.confirm("Tem certeza que deseja limpar todo o odontograma?")) return;
    setMapa({});
    setAlterado(true);
  }, []);

  /* ── Loading ─────────────────────────────────────────── */
  if (carregando) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
        Carregando odontograma…
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div style={{ position: "relative" }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "10px", marginBottom: "20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5.5c1.5-2 4-2.5 5.5-1s1 4.5-1 7-4.5 5-4.5 7.5c0-2.5-2.5-5-4.5-7.5s-2.5-5.5-1-7 4-1 5.5 1z" />
          </svg>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
            Odontograma
          </h3>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {msgSucesso && (
            <span style={{
              fontSize: "12px", fontWeight: "600", color: "#16a34a",
              background: "#f0fdf4", padding: "5px 12px", borderRadius: "8px",
              border: "1px solid #bbf7d0",
            }}>
              ✓ Salvo com sucesso
            </span>
          )}
          {erro && (
            <span style={{
              fontSize: "12px", fontWeight: "600", color: "#dc2626",
              background: "#fef2f2", padding: "5px 12px", borderRadius: "8px",
              border: "1px solid #fecaca",
            }}>
              {erro}
            </span>
          )}

          <button
            onClick={limparTudo}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: "8px",
              background: "#fff", color: "#64748b", fontSize: "12px", fontWeight: "600",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#64748b"; }}
          >
            Limpar
          </button>

          <button
            onClick={salvar}
            disabled={salvando || !alterado}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "7px 16px", border: "none", borderRadius: "8px",
              background: alterado ? "#2563eb" : "#94a3b8",
              color: "#fff", fontSize: "12px", fontWeight: "700",
              cursor: alterado ? "pointer" : "default",
              opacity: salvando ? 0.6 : 1,
              transition: "all 0.2s",
              boxShadow: alterado ? "0 1px 4px rgba(37,99,235,0.3)" : "none",
            }}
          >
            {salvando ? "Salvando…" : "Salvar Odontograma"}
          </button>
        </div>
      </div>

      {/* ── Arcadas ─────────────────────────────────────── */}
      <div style={{
        display: "flex", flexDirection: "column", gap: "6px",
        background: "#fafbfc", borderRadius: "14px", padding: "20px 12px",
        border: "1px solid #f1f5f9",
      }}>

        {/* Label */}
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          <span style={st.secLabel}>ARCADA SUPERIOR — Permanente</span>
        </div>

        {/* Superior permanente */}
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
          <Fileira dentes={ARCADA_SUP_DIR} mapa={mapa} onFaceClick={handleFaceClick} />
          <div style={st.dividerV} />
          <Fileira dentes={ARCADA_SUP_ESQ} mapa={mapa} onFaceClick={handleFaceClick} />
        </div>

        <div style={st.dividerH} />

        {/* Label decídua superior */}
        <div style={{ textAlign: "center", marginBottom: "2px" }}>
          <span style={st.secLabel}>ARCADA SUPERIOR — Decídua</span>
        </div>

        {/* Superior decídua */}
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
          <Fileira dentes={ARCADA_DEC_SUP_DIR} mapa={mapa} onFaceClick={handleFaceClick} />
          <div style={st.dividerV} />
          <Fileira dentes={ARCADA_DEC_SUP_ESQ} mapa={mapa} onFaceClick={handleFaceClick} />
        </div>

        {/* Separador central grande */}
        <div style={{ borderTop: "2px dashed #cbd5e1", margin: "12px 0" }} />

        {/* Label decídua inferior */}
        <div style={{ textAlign: "center", marginBottom: "2px" }}>
          <span style={st.secLabel}>ARCADA INFERIOR — Decídua</span>
        </div>

        {/* Inferior decídua */}
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
          <Fileira dentes={ARCADA_DEC_INF_DIR} mapa={mapa} onFaceClick={handleFaceClick} />
          <div style={st.dividerV} />
          <Fileira dentes={ARCADA_DEC_INF_ESQ} mapa={mapa} onFaceClick={handleFaceClick} />
        </div>

        <div style={st.dividerH} />

        {/* Label inferior permanente */}
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          <span style={st.secLabel}>ARCADA INFERIOR — Permanente</span>
        </div>

        {/* Inferior permanente */}
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
          <Fileira dentes={ARCADA_INF_DIR} mapa={mapa} onFaceClick={handleFaceClick} />
          <div style={st.dividerV} />
          <Fileira dentes={ARCADA_INF_ESQ} mapa={mapa} onFaceClick={handleFaceClick} />
        </div>
      </div>

      {/* ── Legenda ────────────────────────────────────── */}
      <Legenda />

      {/* ── Popup ──────────────────────────────────────── */}
      <CondPopup
        pos={popupPos}
        denteFace={popup}
        onSelect={handleSelectCond}
        onClose={() => setPopup(null)}
      />
    </div>
  );
}

/* ── Mini‑estilos ──────────────────────────────────────────── */
const st = {
  secLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  dividerV: {
    width: "2px",
    background: "#e2e8f0",
    borderRadius: "2px",
    alignSelf: "stretch",
  },
  dividerH: {
    borderTop: "1px solid #f1f5f9",
    margin: "6px 0",
  },
};
/* ═══════════════════════════════════════════════════════════
   FAIXA DE INDICADORES (DESIGN.md §7)
   Número + rótulo numa faixa única com divisórias, sem ícone.
   Cor só no número que pede ação: tom "perigo" | "alerta" | "ok".
   ═══════════════════════════════════════════════════════════ */
const TONS = {
  perigo: "var(--danger)",
  alerta: "#c2410c",
  ok: "var(--success)",
};

function FaixaIndicadores({ itens, rotulo }) {
  return (
    <section aria-label={rotulo} style={S.faixa}>
      {itens.map((item) => {
        const conteudo = (
          <>
            <span style={{ ...S.valor, color: TONS[item.tom] || "var(--text-primary)" }}>{item.valor}</span>
            <span style={S.rotulo}>{item.rotulo}</span>
            {item.detalhe && <span style={S.detalhe}>{item.detalhe}</span>}
          </>
        );
        return item.onClick ? (
          <button key={item.rotulo} type="button" onClick={item.onClick} style={{ ...S.item, ...S.clicavel }}>
            {conteudo}
          </button>
        ) : (
          <div key={item.rotulo} style={S.item}>{conteudo}</div>
        );
      })}
    </section>
  );
}

const S = {
  // gap de 1px sobre o fundo da borda desenha as divisórias, também quando quebra linha no celular
  faixa: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "1px",
    background: "var(--border-input)",
    border: "1px solid var(--border-input)",
    borderRadius: "12px",
    overflow: "hidden",
  },
  item: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    padding: "14px 18px",
    background: "var(--bg-card)",
    textAlign: "left",
    minWidth: 0,
  },
  clicavel: {
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  valor: {
    fontSize: "22px",
    fontWeight: 700,
    lineHeight: 1.15,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.01em",
  },
  rotulo: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  detalhe: {
    fontSize: "12px",
    color: "var(--text-secondary)",
    opacity: 0.85,
  },
};

export default FaixaIndicadores;

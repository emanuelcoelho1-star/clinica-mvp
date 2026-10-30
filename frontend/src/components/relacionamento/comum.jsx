import { S } from "./relacionamento";

/* ═══════════════════════════════════════════════════════════
   COMPONENTES SIMPLES
   ═══════════════════════════════════════════════════════════ */
export function Segmentado({ opcoes, valor, onChange }) {
  return (
    <div style={S.segWrap}>
      {opcoes.map((o) => (
        <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}
          style={{ ...S.segBtn, ...(valor === o.value ? S.segBtnAtivo : {}) }}>
          {o.label}
          {o.count !== undefined && <span style={{ ...S.segCount, ...(valor === o.value ? S.segCountAtivo : {}) }}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Vazio({ titulo, texto }) {
  return (
    <div style={S.vazio}>
      <span style={S.vazioTitulo}>{titulo}</span>
      {texto && <span style={S.vazioTexto}>{texto}</span>}
    </div>
  );
}

export function Carregando() {
  return <div style={S.vazio}><span style={S.vazioTexto}>Carregando...</span></div>;
}

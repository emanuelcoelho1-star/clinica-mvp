import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModalWhatsApp from "../ModalWhatsApp";
import { WhatsAppIcon } from "../iconeWhatsApp";
import { mensagemAniversario, telefoneWhatsApp } from "../../utils/whatsapp";
import { api, registrarContato, formatarDataHora, S } from "./relacionamento";
import { Segmentado, Vazio, Carregando } from "./comum";

const PERIODOS = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Próximos 7 dias" },
  { value: "mes", label: "Próximos 30 dias" },
];

function quando(dias) {
  if (dias === 0) return { texto: "Hoje 🎂", estilo: S.badgeLaranja };
  if (dias === 1) return { texto: "Amanhã", estilo: S.badgeAzul };
  return { texto: `em ${dias} dias`, estilo: S.badgeCinza };
}

function Aniversariantes({ onAlterado, clinica }) {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState("semana");
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [whats, setWhats] = useState(null);

  async function carregar() {
    try {
      setCarregando(true); setErro("");
      setLista(await api(`/relacionamento/aniversariantes?periodo=${periodo}`));
    } catch (e) { setErro(e.message); setLista([]); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, [periodo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={S.card}>
      <div style={S.toolbar}>
        <Segmentado opcoes={PERIODOS} valor={periodo} onChange={setPeriodo} />
        <span style={S.sub}>Considera pacientes com data de nascimento cadastrada</span>
      </div>

      {erro && <div style={S.erro}>{erro}</div>}

      {carregando ? <Carregando /> : lista.length === 0 ? (
        <Vazio titulo="Nenhum aniversariante neste período" />
      ) : (
        <div style={S.lista}>
          {lista.map((p) => {
            const q = quando(p.dias_para_aniversario);
            const temTel = Boolean(telefoneWhatsApp(p.telefone));
            const [, m, d] = p.data_nascimento.split("-");
            return (
              <div key={p.id} className="rel-linha" style={{ ...S.linha, gridTemplateColumns: "minmax(160px,1.4fr) minmax(140px,1fr) minmax(160px,1fr) minmax(130px,auto)" }}>
                <div style={S.col}>
                  <span style={S.nome} onClick={() => navigate(`/pacientes/${p.id}`)} title="Abrir prontuário">{p.nome}</span>
                  <span style={S.sub}>{p.telefone || "sem telefone"}</span>
                </div>
                <div style={S.col}>
                  <span style={S.valor}>{d}/{m} · {p.idade} anos</span>
                  <span style={{ ...S.badge, ...q.estilo }}>{q.texto}</span>
                </div>
                <div style={S.col}>
                  {p.parabens_enviado_em
                    ? <span style={{ ...S.badge, ...S.badgeVerde }}>Parabéns enviado em {formatarDataHora(p.parabens_enviado_em).slice(0, 5)}</span>
                    : <span style={S.sub}>Parabéns ainda não enviado</span>}
                </div>
                <div style={S.acoes}>
                  <button type="button" style={{ ...S.btnWhats, ...(!temTel ? S.disabled : {}) }} disabled={!temTel}
                    title={temTel ? "" : "Paciente sem telefone válido"} onClick={() => setWhats(p)}>
                    {WhatsAppIcon}<span>{p.parabens_enviado_em ? "Reenviar" : "Parabenizar"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {whats && (
        <ModalWhatsApp titulo="Mensagem de aniversário" paciente={whats.nome} telefone={whats.telefone}
          mensagemInicial={mensagemAniversario({ paciente: whats.nome, clinica })}
          dica={whats.dias_para_aniversario > 0 ? `O aniversário é daqui a ${whats.dias_para_aniversario} dia(s). Você pode enviar agora ou voltar no dia.` : undefined}
          onEnviado={async () => { try { await registrarContato(whats.id, "aniversario"); await carregar(); onAlterado?.(); } catch { /* registro informativo */ } }}
          onFechar={() => setWhats(null)} />
      )}
    </div>
  );
}

export default Aniversariantes;

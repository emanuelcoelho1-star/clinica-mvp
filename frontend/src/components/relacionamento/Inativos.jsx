import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModalWhatsApp from "../ModalWhatsApp";
import { WhatsAppIcon } from "../iconeWhatsApp";
import { mensagemReativacao, telefoneWhatsApp } from "../../utils/whatsapp";
import { api, registrarContato, formatarData, formatarDataHora, linkAgendar, S } from "./relacionamento";
import { Segmentado, Vazio, Carregando } from "./comum";

const MESES = [
  { value: 3, label: "+3 meses" },
  { value: 6, label: "+6 meses" },
  { value: 12, label: "+1 ano" },
  { value: 24, label: "+2 anos" },
];

function tempoSemVir(dias) {
  if (dias === null || dias === undefined) return "Nunca consultou";
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(meses / 12);
  return `há ${anos} ano${anos > 1 ? "s" : ""}${meses % 12 ? ` e ${meses % 12} ${meses % 12 === 1 ? "mês" : "meses"}` : ""}`;
}

function Inativos({ onAlterado, clinica }) {
  const navigate = useNavigate();
  const [meses, setMeses] = useState(6);
  const [incluirSemConsulta, setIncluirSemConsulta] = useState(false);
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [whats, setWhats] = useState(null);

  async function carregar() {
    try {
      setCarregando(true); setErro("");
      setLista(await api(`/relacionamento/inativos?meses=${meses}${incluirSemConsulta ? "&incluir_sem_consulta=1" : ""}`));
    } catch (e) { setErro(e.message); setLista([]); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, [meses, incluirSemConsulta]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={S.card}>
      <div style={S.toolbar}>
        <div style={S.toolbarGroup}>
          <Segmentado opcoes={MESES} valor={meses} onChange={setMeses} />
          <label style={S.check}>
            <input type="checkbox" checked={incluirSemConsulta} onChange={(e) => setIncluirSemConsulta(e.target.checked)} />
            Incluir pacientes que nunca consultaram
          </label>
        </div>
        <span style={S.sub}>{lista.length} paciente{lista.length === 1 ? "" : "s"} sem consulta futura</span>
      </div>

      {erro && <div style={S.erro}>{erro}</div>}

      {carregando ? <Carregando /> : lista.length === 0 ? (
        <Vazio titulo="Nenhum paciente inativo neste período" texto="Pacientes com consulta marcada para o futuro não aparecem aqui." />
      ) : (
        <div style={S.lista}>
          {lista.map((p) => {
            const temTel = Boolean(telefoneWhatsApp(p.telefone));
            return (
              <div key={p.id} className="rel-linha" style={{ ...S.linha, gridTemplateColumns: "minmax(160px,1.4fr) minmax(150px,1fr) minmax(150px,1fr) minmax(220px,auto)" }}>
                <div style={S.col}>
                  <span style={S.nome} onClick={() => navigate(`/pacientes/${p.id}`)} title="Abrir prontuário">{p.nome}</span>
                  <span style={S.sub}>{p.telefone || "sem telefone"}</span>
                </div>
                <div style={S.col}>
                  <span style={S.valor}>{p.ultima_consulta ? formatarData(p.ultima_consulta) : "—"}</span>
                  <span style={{ ...S.badge, ...(p.ultima_consulta ? S.badgeLaranja : S.badgeCinza) }}>{tempoSemVir(p.dias_sem_vir)}</span>
                </div>
                <div style={S.col}>
                  {p.retornos_pendentes > 0 && <span style={{ ...S.badge, ...S.badgeRoxo }}>Retorno pendente</span>}
                  <span style={S.sub}>{p.ultimo_contato_em ? `Contatado em ${formatarDataHora(p.ultimo_contato_em)}` : "Sem contato de reativação"}</span>
                </div>
                <div style={S.acoes}>
                  <button type="button" style={{ ...S.btnWhats, ...(!temTel ? S.disabled : {}) }} disabled={!temTel}
                    title={temTel ? "" : "Paciente sem telefone válido"} onClick={() => setWhats(p)}>
                    {WhatsAppIcon}<span>Reativar</span>
                  </button>
                  <button type="button" style={S.btnAcao} onClick={() => navigate(linkAgendar({ paciente_id: p.id, paciente_nome: p.nome, procedimento: "Avaliação" }))}>
                    Agendar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {whats && (
        <ModalWhatsApp titulo="Reativar paciente" paciente={whats.nome} telefone={whats.telefone}
          mensagemInicial={mensagemReativacao({ paciente: whats.nome, mesesSemVir: whats.dias_sem_vir == null ? null : Math.max(1, Math.floor(whats.dias_sem_vir / 30)), clinica })}
          onEnviado={async () => { try { await registrarContato(whats.id, "reativacao"); await carregar(); onAlterado?.(); } catch { /* registro informativo */ } }}
          onFechar={() => setWhats(null)} />
      )}
    </div>
  );
}

export default Inativos;

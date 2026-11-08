import { useCallback, useEffect, useState } from "react";
import API_URL from "../api";
import "./Assinatura.css";

function dataBR(valor) {
  if (!valor) return "—";
  const data = new Date(valor.length === 10 ? valor + "T12:00:00" : valor);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR");
}

export default function Assinatura({ administrador = false }) {
  const [status, setStatus] = useState(null);
  const [plano, setPlano] = useState("mensal");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [contratando, setContratando] = useState(false);
  const token = localStorage.getItem("token");

  const carregarStatus = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch(API_URL + "/assinaturas/status", {
        headers: { Authorization: "Bearer " + token },
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro || "Não foi possível carregar a assinatura.");
      setStatus(corpo);
    } catch (e) {
      setErro(e.message || "Falha ao consultar a assinatura.");
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => { carregarStatus(); }, [carregarStatus]);

  async function iniciarCheckout() {
    if (!administrador || contratando) return;
    setContratando(true);
    setErro("");
    setMensagem("");
    setCheckoutUrl("");
    try {
      const resposta = await fetch(API_URL + "/assinaturas/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ plano }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro || "Não foi possível iniciar a contratação.");
      setMensagem(corpo.mensagem || "Solicitação enviada ao Asaas.");
      setCheckoutUrl(corpo.checkout_url || "");
    } catch (e) {
      setErro(e.message || "Falha ao iniciar a contratação.");
    } finally {
      setContratando(false);
    }
  }

  const statusLabel = {
    trial: "Período de teste",
    pendente: "Aguardando pagamento",
    ativa: "Assinatura ativa",
    expirada: "Assinatura expirada",
    inadimplente: "Pagamento pendente",
    past_due: "Pagamento em atraso",
  }[String(status?.status || "").toLowerCase()] || "Consulte sua assinatura";

  return (
    <section className="sorrisa-subscription">
      <header className="sorrisa-subscription-heading">
        <div>
          <h2>Assinatura Sorrisa</h2>
          <p>Gerencie o acesso da sua clínica ao Sorrisa Completo.</p>
        </div>
        <span className={"sorrisa-subscription-badge " + (status?.status === "ativa" ? "is-active" : "")}>{carregando ? "Carregando..." : statusLabel}</span>
      </header>

      {erro && <div className="sorrisa-subscription-alert is-error" role="alert">{erro}</div>}
      {mensagem && <div className="sorrisa-subscription-alert" role="status">{mensagem}</div>}

      <div className="sorrisa-subscription-current">
        <div>
          <span className="sorrisa-subscription-eyebrow">Plano atual</span>
          <strong>{status?.plano === "sorrisa_completo_mensal" ? "Sorrisa Completo Mensal" : status?.plano === "sorrisa_completo_anual" ? "Sorrisa Completo Anual" : "Teste grátis"}</strong>
          <span>Válido até: {dataBR(status?.periodo_fim)}</span>
        </div>
        <span className="sorrisa-subscription-current-mark">S</span>
      </div>

      <div className="sorrisa-subscription-plans">
        <button type="button" className={"sorrisa-subscription-plan " + (plano === "mensal" ? "selected" : "")} onClick={() => { setPlano("mensal"); setCheckoutUrl(""); }}>
          <span className="sorrisa-subscription-plan-top"><strong>Mensal</strong>{plano === "mensal" && <span>Selecionado</span>}</span>
          <span className="sorrisa-subscription-price">R$ 79,99 <small>/ mês</small></span>
          <span className="sorrisa-subscription-muted">Cobrança mensal recorrente</span>
        </button>
        <button type="button" className={"sorrisa-subscription-plan " + (plano === "anual" ? "selected" : "")} onClick={() => { setPlano("anual"); setCheckoutUrl(""); }}>
          <span className="sorrisa-subscription-plan-top"><strong>Anual</strong>{plano === "anual" && <span>Selecionado</span>}</span>
          <span className="sorrisa-subscription-price">R$ 799,90 <small>/ ano</small></span>
          <span className="sorrisa-subscription-muted">Equivalente a 10 mensalidades · economize R$ 159,98</span>
        </button>
      </div>

      <div className="sorrisa-subscription-includes">
        <strong>Sorrisa Completo inclui:</strong>
        <span>Todos os módulos, usuários e recursos disponíveis no sistema.</span>
        <span>Dados da clínica preservados mesmo em caso de expiração da assinatura.</span>
      </div>

      {administrador ? (
        <div className="sorrisa-subscription-actions">
          <button type="button" className="sorrisa-subscription-primary" onClick={iniciarCheckout} disabled={contratando || carregando}>
            {contratando ? "Preparando cobrança..." : "Continuar para pagamento"}
          </button>
          {checkoutUrl && <a className="sorrisa-subscription-link" href={checkoutUrl} target="_blank" rel="noopener noreferrer">Abrir página segura de pagamento</a>}
        </div>
      ) : (
        <p className="sorrisa-subscription-muted">Somente o administrador da clínica pode contratar ou alterar o plano.</p>
      )}

      <p className="sorrisa-subscription-footnote">Ambiente de testes: nenhuma cobrança real será realizada enquanto o provedor estiver configurado como Sandbox. O acesso só será ativado após a confirmação do pagamento; a sincronização automática por webhook será implementada na próxima etapa.</p>
    </section>
  );
}

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
  const [meioPagamento, setMeioPagamento] = useState("PIX");
  const [pagamento, setPagamento] = useState(null);
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
    setPagamento(null);
    try {
      const resposta = await fetch(API_URL + "/assinaturas/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ plano, meioPagamento }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro || "Não foi possível iniciar a contratação.");
      setMensagem(corpo.mensagem || "Solicitação enviada ao Asaas.");
      setPagamento(corpo.pagamento || null);
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
        <button type="button" className={"sorrisa-subscription-plan " + (plano === "mensal" ? "selected" : "")} onClick={() => { setPlano("mensal"); setPagamento(null); }}>
          <span className="sorrisa-subscription-plan-top"><strong>Mensal</strong>{plano === "mensal" && <span>Selecionado</span>}</span>
          <span className="sorrisa-subscription-price">R$ 79,99 <small>/ mês</small></span>
          <span className="sorrisa-subscription-muted">Cobrança mensal recorrente</span>
        </button>
        <button type="button" className={"sorrisa-subscription-plan " + (plano === "anual" ? "selected" : "")} onClick={() => { setPlano("anual"); setPagamento(null); }}>
          <span className="sorrisa-subscription-plan-top"><strong>Anual</strong>{plano === "anual" && <span>Selecionado</span>}</span>
          <span className="sorrisa-subscription-price">R$ 799,90 <small>/ ano</small></span>
          <span className="sorrisa-subscription-muted">Equivalente a 10 mensalidades · economize R$ 159,98</span>
        </button>
      </div>

      {administrador && (
        <div className="sorrisa-subscription-payment-methods">
          <div className="sorrisa-subscription-payment-heading">
            <strong>Forma de pagamento</strong>
            <span>Escolha como deseja pagar sua assinatura</span>
          </div>
          <div className="sorrisa-subscription-method-grid">
            <button type="button" className={"sorrisa-subscription-method " + (meioPagamento === "PIX" ? "selected" : "")} onClick={() => { setMeioPagamento("PIX"); setPagamento(null); }}>
              <span className="sorrisa-subscription-method-icon">◇</span>
              <strong>Pix</strong>
              <small>QR Code ou copia e cola</small>
            </button>
            <button type="button" className={"sorrisa-subscription-method " + (meioPagamento === "BOLETO" ? "selected" : "")} onClick={() => { setMeioPagamento("BOLETO"); setPagamento(null); }}>
              <span className="sorrisa-subscription-method-icon">▤</span>
              <strong>Boleto</strong>
              <small>Linha digitável e documento</small>
            </button>
            <button type="button" className={"sorrisa-subscription-method " + (meioPagamento === "CARTAO" ? "selected" : "")} onClick={() => { setMeioPagamento("CARTAO"); setPagamento(null); }}>
              <span className="sorrisa-subscription-method-icon">▣</span>
              <strong>Cartão de crédito</strong>
              <small>Cobrança recorrente segura</small>
            </button>
          </div>
        </div>
      )}

      <div className="sorrisa-subscription-includes">
        <strong>Sorrisa Completo inclui:</strong>
        <span>Todos os módulos, usuários e recursos disponíveis no sistema.</span>
        <span>Dados da clínica preservados mesmo em caso de expiração da assinatura.</span>
      </div>

      {pagamento && (
        <div className="sorrisa-subscription-modal-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setPagamento(null); }}>
          <div className="sorrisa-subscription-payment-modal" role="dialog" aria-modal="true" aria-labelledby="sorrisa-payment-modal-title">
            <div className="sorrisa-subscription-modal-heading">
              <div>
                <span className="sorrisa-subscription-eyebrow">Pagamento da assinatura</span>
                <h3 id="sorrisa-payment-modal-title">{pagamento.tipo === "PIX" ? "Pague com Pix" : pagamento.tipo === "BOLETO" ? "Pague com boleto" : "Finalize com cartão"}</h3>
              </div>
              <button type="button" className="sorrisa-subscription-modal-close" aria-label="Fechar pagamento" onClick={() => setPagamento(null)}>×</button>
            </div>
            <div className="sorrisa-subscription-payment-result">
          <div className="sorrisa-subscription-payment-result-heading">
            <div>
              <strong>{pagamento.tipo === "PIX" ? "Pagamento via Pix" : "Pagamento via boleto"}</strong>
              <span>Valor: {Number(pagamento.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · Vencimento: {dataBR(pagamento.vencimento)}</span>
            </div>
            <span className="sorrisa-subscription-pending">Aguardando pagamento</span>
          </div>
          {pagamento.tipo === "PIX" && (
            <div className="sorrisa-subscription-pix">
              {pagamento.pix?.imagem ? <img className="sorrisa-subscription-qr" src={"data:image/png;base64," + pagamento.pix.imagem} alt="QR Code Pix para pagamento da assinatura" /> : <p>QR Code ainda não disponível.</p>}
              <div className="sorrisa-subscription-copy-area">
                <label htmlFor="sorrisa-pix-code">Pix copia e cola</label>
                <textarea id="sorrisa-pix-code" readOnly value={pagamento.pix?.copiaECola || ""} rows={3} />
                <button type="button" className="sorrisa-subscription-secondary" disabled={!pagamento.pix?.copiaECola} onClick={() => navigator.clipboard?.writeText(pagamento.pix.copiaECola).then(() => setMensagem("Código Pix copiado."), () => setErro("Não foi possível copiar automaticamente. Selecione e copie o código."))}>Copiar código Pix</button>
              </div>
            </div>
          )}
          {pagamento.tipo === "CARTAO" && (
            <div className="sorrisa-subscription-boleto">
              <p>Você será direcionado à página protegida do Asaas para informar os dados do cartão. A Sorrisa não recebe nem armazena os dados do cartão.</p>
              <a className="sorrisa-subscription-primary sorrisa-subscription-checkout-link" href={pagamento.checkoutUrl} target="_blank" rel="noopener noreferrer">Ir para pagamento seguro</a>
            </div>
          )}
          {pagamento.tipo === "BOLETO" && (
            <div className="sorrisa-subscription-boleto">
              <label htmlFor="sorrisa-boleto-code">Linha digitável</label>
              <textarea id="sorrisa-boleto-code" readOnly value={pagamento.boleto?.linhaDigitavel || ""} rows={2} />
              <button type="button" className="sorrisa-subscription-secondary" disabled={!pagamento.boleto?.linhaDigitavel} onClick={() => navigator.clipboard?.writeText(pagamento.boleto.linhaDigitavel).then(() => setMensagem("Linha digitável copiada."), () => setErro("Não foi possível copiar automaticamente. Selecione e copie a linha digitável."))}>Copiar linha digitável</button>
              {pagamento.boleto?.url && <iframe className="sorrisa-subscription-boleto-frame" title="Boleto da assinatura Sorrisa" src={pagamento.boleto.url} /> }
              {!pagamento.boleto?.url && <p>O documento do boleto ainda não está disponível. A linha digitável pode ser utilizada para pagamento.</p>}
            </div>
          )}
          <p className="sorrisa-subscription-footnote">O pagamento será confirmado pelo Asaas. A criação desta cobrança, por si só, não libera o acesso.</p>
            </div>
          </div>
        </div>
      )}

      {administrador ? (
        <div className="sorrisa-subscription-actions">
          <button type="button" className="sorrisa-subscription-primary" onClick={iniciarCheckout} disabled={contratando || carregando}>
            {contratando ? "Preparando cobrança..." : "Continuar para pagamento"}
          </button>

        </div>
      ) : (
        <p className="sorrisa-subscription-muted">Somente o administrador da clínica pode contratar ou alterar o plano.</p>
      )}

      <p className="sorrisa-subscription-footnote">Ambiente de testes: nenhuma cobrança real será realizada enquanto o provedor estiver configurado como Sandbox. O cartão é processado na página segura do Asaas; a liberação do acesso depende da confirmação do pagamento pelo webhook.</p>
    </section>
  );
}

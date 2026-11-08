const express = require("express");
const crypto = require("crypto");
const db = require("../database");
const { obterConfiguracaoAsaas, ativarCobrancaConfirmada } = require("../services/asaas-pagamentos");

const router = express.Router();

function compararToken(recebido, esperado) {
  const a = Buffer.from(String(recebido || ""), "utf8");
  const b = Buffer.from(String(esperado || ""), "utf8");
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function executar(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes || 0 });
    });
  });
}

function consultar(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row || null));
  });
}

router.post("/asaas", async (req, res) => {
  try {
    const config = await obterConfiguracaoAsaas();
    if (!config.webhookToken || config.webhookToken.length < 32 || /\s/.test(config.webhookToken)) {
      return res.status(503).json({ erro: "Token de autenticação do webhook ainda não configurado." });
    }
    if (!compararToken(req.get("asaas-access-token"), config.webhookToken)) {
      return res.status(401).json({ erro: "Notificação não autorizada." });
    }

    const eventoId = String(req.body?.id || "").trim();
    const evento = String(req.body?.event || "").trim().toUpperCase();
    const pagamentoId = String(req.body?.payment?.id || "").trim();
    if (!eventoId || eventoId.length > 180 || !evento) {
      return res.status(400).json({ erro: "Notificação do Asaas inválida." });
    }

    const eventosPagamento = ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"];
    const eventosCheckout = ["CHECKOUT_PAID", "CHECKOUT_CANCELED", "CHECKOUT_EXPIRED"];
    const eventosAssinatura = ["SUBSCRIPTION_CREATED"];
    if (![...eventosPagamento, ...eventosCheckout, ...eventosAssinatura].includes(evento)) {
      return res.status(200).json({ recebido: true, ignorado: true });
    }
    if (eventosPagamento.includes(evento) && (!pagamentoId || pagamentoId.length > 100)) {
      return res.status(400).json({ erro: "Identificador da cobrança ausente." });
    }

    await executar(
      "INSERT OR IGNORE INTO sorrisa_asaas_webhook_eventos (evento_id, evento, pagamento_id, status) VALUES (?, ?, ?, 'recebido')",
      [eventoId, evento, pagamentoId || null]
    );
    const registro = await consultar(
      "SELECT status FROM sorrisa_asaas_webhook_eventos WHERE evento_id = ?",
      [eventoId]
    );
    if (registro?.status === "processado" || registro?.status === "ignorado") {
      return res.status(200).json({ recebido: true, duplicado: true });
    }

    let resultado = null;
    if (eventosPagamento.includes(evento)) {
      resultado = await ativarCobrancaConfirmada(pagamentoId);
    } else if (eventosCheckout.includes(evento)) {
      const checkout = req.body?.checkout || {};
      if (!checkout.id) throw new Error("Identificador do checkout ausente na notificação.");
      const statusCheckout = evento === "CHECKOUT_PAID" ? "pago_checkout" : evento === "CHECKOUT_CANCELED" ? "cancelado" : "expirado";
      await executar(
        "UPDATE sorrisa_asaas_checkouts SET status = ?, updated_at = datetime('now','localtime') WHERE checkout_id = ?",
        [statusCheckout, String(checkout.id)]
      );
    } else if (evento === "SUBSCRIPTION_CREATED") {
      const assinaturaAsaas = req.body?.subscription || {};
      if (!assinaturaAsaas.id || !assinaturaAsaas.externalReference) {
        throw new Error("Dados de identificação da assinatura ausentes no evento.");
      }
      const pendente = await consultar(
        "SELECT * FROM sorrisa_asaas_checkouts WHERE external_reference = ? LIMIT 1",
        [String(assinaturaAsaas.externalReference)]
      );
      if (!pendente) throw new Error("Assinatura criada sem checkout correspondente da Sorrisa.");
      if (assinaturaAsaas.customer !== pendente.customer_id ||
          Math.abs(Number(assinaturaAsaas.value || 0) - Number(pendente.valor || 0)) > 0.01 ||
          String(assinaturaAsaas.cycle || "").toUpperCase() !== (pendente.ciclo === "anual" ? "YEARLY" : "MONTHLY") ||
          String(assinaturaAsaas.billingType || "").toUpperCase() !== "CREDIT_CARD") {
        throw new Error("Os dados da assinatura criada não correspondem ao checkout registrado.");
      }
      await executar("BEGIN IMMEDIATE");
      try {
        await executar(
          "UPDATE sorrisa_asaas_checkouts SET provedor_assinatura_id = ?, status = 'assinatura_criada', updated_at = datetime('now','localtime') WHERE id = ?",
          [String(assinaturaAsaas.id), pendente.id]
        );
        await executar(
          `UPDATE assinaturas
           SET provedor = 'asaas', provedor_cliente_id = ?, provedor_assinatura_id = ?,
               plano = ?, status = 'pendente', updated_at = datetime('now','localtime')
           WHERE clinica_id = ? AND (provedor_assinatura_id IS NULL OR provedor_assinatura_id = '')`,
          [pendente.customer_id, String(assinaturaAsaas.id), pendente.plano, pendente.clinica_id]
        );
        await executar("COMMIT");
      } catch (subscriptionError) {
        try { await executar("ROLLBACK"); } catch {}
        throw subscriptionError;
      }
    }

    await executar(
      "UPDATE sorrisa_asaas_webhook_eventos SET status = 'processado', processado_em = datetime('now','localtime'), erro = NULL WHERE evento_id = ?",
      [eventoId]
    );
    return res.status(200).json({ recebido: true, assinatura_ativada: Boolean(resultado?.ativada) });
  } catch (error) {
    console.error("Falha ao processar webhook Asaas:", error.message);
    const eventoId = String(req.body?.id || "").trim();
    if (eventoId) {
      try {
        await executar(
          "UPDATE sorrisa_asaas_webhook_eventos SET status = 'erro', erro = ?, updated_at = datetime('now','localtime') WHERE evento_id = ?",
          [String(error.message || "Erro interno").slice(0, 500), eventoId]
        );
      } catch {}
    }
    return res.status(500).json({ erro: "Não foi possível processar a confirmação do pagamento. O Asaas poderá reenviar a notificação." });
  }
});

module.exports = router;

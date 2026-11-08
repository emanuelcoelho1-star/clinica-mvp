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

    if (!["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(evento)) {
      return res.status(200).json({ recebido: true, ignorado: true });
    }
    if (!pagamentoId || pagamentoId.length > 100) {
      return res.status(400).json({ erro: "Identificador da cobrança ausente." });
    }

    await executar(
      "INSERT OR IGNORE INTO sorrisa_asaas_webhook_eventos (evento_id, evento, pagamento_id, status) VALUES (?, ?, ?, 'recebido')",
      [eventoId, evento, pagamentoId]
    );
    const registro = await consultar(
      "SELECT status FROM sorrisa_asaas_webhook_eventos WHERE evento_id = ?",
      [eventoId]
    );
    if (registro?.status === "processado" || registro?.status === "ignorado") {
      return res.status(200).json({ recebido: true, duplicado: true });
    }

    const resultado = await ativarCobrancaConfirmada(pagamentoId);
    await executar(
      "UPDATE sorrisa_asaas_webhook_eventos SET status = ?, processado_em = datetime('now','localtime'), erro = NULL WHERE evento_id = ?",
      [resultado.ativada || resultado.jaProcessado ? "processado" : "ignorado", eventoId]
    );
    return res.status(200).json({ recebido: true, assinatura_ativada: Boolean(resultado.ativada) });
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

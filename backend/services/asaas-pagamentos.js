const crypto = require("crypto");
const db = require("../database");

function consultar(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row || null));
  });
}

function executar(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes || 0, lastID: this.lastID });
    });
  });
}

function chaveCredenciaisPagamento() {
  const segredo = String(process.env.PAYMENT_CREDENTIALS_KEY || "");
  if (segredo.length < 32) throw new Error("Chave de criptografia das credenciais indisponível.");
  return crypto.createHash("sha256").update(segredo, "utf8").digest();
}

function decifrarCredenciais(valor) {
  if (!valor) return {};
  const pacote = JSON.parse(valor);
  const decipher = crypto.createDecipheriv("aes-256-gcm", chaveCredenciaisPagamento(), Buffer.from(pacote.iv, "base64"));
  decipher.setAuthTag(Buffer.from(pacote.tag, "base64"));
  const conteudo = Buffer.concat([decipher.update(Buffer.from(pacote.data, "base64")), decipher.final()]);
  return JSON.parse(conteudo.toString("utf8"));
}

async function obterConfiguracaoAsaas() {
  const row = await consultar(
    "SELECT provedor, ambiente, credenciais_cifradas FROM admin_payment_settings WHERE id = 1"
  );
  if (!row || row.provedor !== "asaas") throw new Error("Integração Asaas não configurada.");
  const credenciais = decifrarCredenciais(row.credenciais_cifradas);
  if (!credenciais.apiKey) throw new Error("Chave de API do Asaas não configurada.");
  const ambiente = row.ambiente === "producao" ? "producao" : "sandbox";
  return {
    ambiente,
    apiKey: credenciais.apiKey,
    webhookToken: credenciais.webhookToken || process.env.ASAAS_WEBHOOK_TOKEN || "",
    baseUrl: ambiente === "producao"
      ? "https://api.asaas.com/v3"
      : "https://api-sandbox.asaas.com/v3",
  };
}

async function chamarAsaas(config, caminho) {
  const resposta = await fetch(config.baseUrl + caminho, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "Sorrisa/1.0",
      access_token: config.apiKey,
    },
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const mensagem = Array.isArray(dados.errors)
      ? dados.errors.map((item) => item.description).filter(Boolean).join("; ")
      : "";
    throw new Error(mensagem || "Não foi possível consultar a cobrança no Asaas.");
  }
  return dados;
}

async function ativarCobrancaConfirmada(paymentId) {
  const config = await obterConfiguracaoAsaas();
  const pagamento = await chamarAsaas(config, "/payments/" + encodeURIComponent(paymentId));
  const statusPagamento = String(pagamento.status || "").toUpperCase();

  if (!["CONFIRMED", "RECEIVED"].includes(statusPagamento)) {
    return { confirmado: false, motivo: "O Asaas ainda não informa o pagamento como confirmado." };
  }

  let cobranca = await consultar(
    "SELECT * FROM sorrisa_assinatura_cobrancas WHERE provedor = 'asaas' AND provedor_pagamento_id = ? LIMIT 1",
    [paymentId]
  );

  // A primeira cobrança é registrada no checkout. Nas renovações seguintes,
  // o Asaas cria novos IDs; nesses casos, vinculamos pela assinatura recorrente.
  let assinatura = null;
  if (cobranca) {
    assinatura = await consultar(
      "SELECT s.clinica_id, s.provedor_assinatura_id, s.provedor_cliente_id, s.status AS assinatura_status, s.plano AS assinatura_plano, c.status AS clinica_status FROM assinaturas s INNER JOIN clinicas c ON c.id = s.clinica_id WHERE s.clinica_id = ? LIMIT 1",
      [cobranca.clinica_id]
    );
  } else if (pagamento.subscription) {
    assinatura = await consultar(
      "SELECT s.clinica_id, s.provedor_assinatura_id, s.provedor_cliente_id, s.status AS assinatura_status, s.plano AS assinatura_plano, c.status AS clinica_status FROM assinaturas s INNER JOIN clinicas c ON c.id = s.clinica_id WHERE s.provedor = 'asaas' AND s.provedor_assinatura_id = ? LIMIT 1",
      [pagamento.subscription]
    );
    if (assinatura) {
      const planoAnual = String(assinatura.assinatura_plano || "").endsWith("_anual");
      const ciclo = planoAnual ? "anual" : "mensal";
      const valorEsperado = planoAnual ? 799.90 : 79.99;
      if (Math.abs(Number(pagamento.value || 0) - valorEsperado) > 0.01) {
        throw new Error("O valor da renovação não corresponde ao plano registrado na Sorrisa.");
      }
      await executar(
        "INSERT OR IGNORE INTO sorrisa_assinatura_cobrancas (clinica_id, provedor, provedor_pagamento_id, provedor_assinatura_id, plano, ciclo, valor, status) VALUES (?, 'asaas', ?, ?, ?, ?, ?, ?)",
        [assinatura.clinica_id, paymentId, assinatura.provedor_assinatura_id, assinatura.assinatura_plano, ciclo, valorEsperado, statusPagamento]
      );
      cobranca = await consultar(
        "SELECT * FROM sorrisa_assinatura_cobrancas WHERE provedor = 'asaas' AND provedor_pagamento_id = ? LIMIT 1",
        [paymentId]
      );
    }
  }

  if (!cobranca || !assinatura) {
    throw new Error("Cobrança não vinculada a uma assinatura válida da Sorrisa.");
  }

  if (
    !assinatura.provedor_assinatura_id ||
    assinatura.provedor_assinatura_id !== cobranca.provedor_assinatura_id ||
    (pagamento.subscription && pagamento.subscription !== assinatura.provedor_assinatura_id) ||
    (pagamento.customer && assinatura.provedor_cliente_id && pagamento.customer !== assinatura.provedor_cliente_id)
  ) {
    throw new Error("Os identificadores da cobrança não correspondem à assinatura da clínica.");
  }

  if (Math.abs(Number(pagamento.value || 0) - Number(cobranca.valor || 0)) > 0.01) {
    throw new Error("O valor confirmado pelo Asaas não corresponde ao valor registrado na Sorrisa.");
  }

  if (assinatura.clinica_status !== "ativa") {
    return { confirmado: true, ativada: false, motivo: "A clínica está suspensa administrativamente; a assinatura não foi reativada." };
  }
  if (["suspensa", "cancelada"].includes(String(assinatura.assinatura_status || "").toLowerCase())) {
    return { confirmado: true, ativada: false, motivo: "A assinatura está suspensa ou cancelada administrativamente." };
  }

  await executar("BEGIN IMMEDIATE");
  try {
    const cobrancaAtual = await consultar(
      "SELECT status FROM sorrisa_assinatura_cobrancas WHERE id = ?",
      [cobranca.id]
    );
    if (["CONFIRMED", "RECEIVED"].includes(String(cobrancaAtual?.status || "").toUpperCase())) {
      await executar("COMMIT");
      return { confirmado: true, ativada: false, jaProcessado: true };
    }

    const atualizacaoCobranca = await executar(
      "UPDATE sorrisa_assinatura_cobrancas SET status = ?, updated_at = datetime('now','localtime') WHERE id = ? AND status NOT IN ('CONFIRMED','RECEIVED')",
      [statusPagamento, cobranca.id]
    );
    if (!atualizacaoCobranca.changes) {
      await executar("COMMIT");
      return { confirmado: true, ativada: false, jaProcessado: true };
    }

    const ciclo = String(cobranca.ciclo || "").toLowerCase() === "anual" ? "anual" : "mensal";
    const modificador = ciclo === "anual" ? "+1 year" : "+1 month";
    const atualizacaoAssinatura = await executar(
      "UPDATE assinaturas SET status = 'ativa', periodo_inicio = COALESCE(periodo_inicio, datetime('now','localtime')), periodo_fim = datetime(CASE WHEN periodo_fim IS NOT NULL AND datetime(periodo_fim) > datetime('now','localtime') THEN periodo_fim ELSE datetime('now','localtime') END, ?), updated_at = datetime('now','localtime') WHERE clinica_id = ? AND lower(status) NOT IN ('suspensa','cancelada')",
      [modificador, cobranca.clinica_id]
    );
    if (!atualizacaoAssinatura.changes) {
      await executar(
        "UPDATE sorrisa_assinatura_cobrancas SET status = 'CONFIRMED' WHERE id = ?",
        [cobranca.id]
      );
      await executar("COMMIT");
      return { confirmado: true, ativada: false, motivo: "A assinatura foi mantida no estado administrativo atual." };
    }

    await executar(
      "UPDATE clinicas SET plano = ?, updated_at = datetime('now','localtime') WHERE id = ? AND status = 'ativa'",
      [cobranca.plano, cobranca.clinica_id]
    );
    await executar(
      "INSERT INTO auditoria (clinica_id, acao, recurso, recurso_id, detalhes) VALUES (?, ?, ?, ?, ?)",
      [cobranca.clinica_id, "pagamento_confirmado", "assinatura", String(cobranca.clinica_id), "Pagamento Asaas confirmado; assinatura ativada automaticamente."]
    );
    await executar("COMMIT");
    return { confirmado: true, ativada: true };
  } catch (error) {
    try { await executar("ROLLBACK"); } catch {}
    throw error;
  }
}

async function sincronizarAssinatura(clinicaId) {
  const assinatura = await consultar(
    "SELECT provedor_assinatura_id, status FROM assinaturas WHERE clinica_id = ? LIMIT 1",
    [clinicaId]
  );
  if (!assinatura || !assinatura.provedor_assinatura_id || assinatura.status !== "pendente") {
    return { sincronizada: false };
  }

  const config = await obterConfiguracaoAsaas();
  const lista = await chamarAsaas(
    config,
    "/subscriptions/" + encodeURIComponent(assinatura.provedor_assinatura_id) + "/payments"
  );
  const pagamentos = Array.isArray(lista.data) ? lista.data : [];
  for (const pagamento of pagamentos) {
    if (["CONFIRMED", "RECEIVED"].includes(String(pagamento.status || "").toUpperCase())) {
      const resultado = await ativarCobrancaConfirmada(pagamento.id);
      if (resultado.ativada || resultado.jaProcessado) return { sincronizada: Boolean(resultado.ativada), pagamento: pagamento.id };
    }
  }
  return { sincronizada: false };
}

module.exports = {
  obterConfiguracaoAsaas,
  ativarCobrancaConfirmada,
  sincronizarAssinatura,
};

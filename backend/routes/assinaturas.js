const express = require("express");
const crypto = require("crypto");
const db = require("../database");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth.semAssinatura);

const PLANOS = {
  mensal: { valor: 79.99, ciclo: "MONTHLY", descricao: "Sorrisa Completo - Mensal" },
  anual: { valor: 799.90, ciclo: "YEARLY", descricao: "Sorrisa Completo - Anual" },
};

function chaveCredenciaisPagamento() {
  const segredo = String(process.env.PAYMENT_CREDENTIALS_KEY || "");
  if (segredo.length < 32) throw new Error("Chave de criptografia indisponível.");
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

function dataHoje() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valores = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return valores.year + "-" + valores.month + "-" + valores.day;
}

async function chamarAsaas(baseUrl, apiKey, caminho, metodo = "GET", body) {
  const resposta = await fetch(baseUrl + caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Sorrisa/1.0",
      access_token: apiKey,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const mensagem = Array.isArray(dados.errors)
      ? dados.errors.map((item) => item.description).filter(Boolean).join("; ")
      : "";
    const erro = new Error(mensagem || "O Asaas não conseguiu processar a solicitação.");
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

function carregarContexto(clinicaId, callback) {
  db.get(
    `SELECT c.id, c.nome, c.nome_fantasia, c.cnpj, c.cpf, c.email_contato, c.telefone,
            c.status AS clinica_status, s.provedor, s.provedor_cliente_id,
            s.provedor_assinatura_id, s.status AS assinatura_status, s.plano,
            s.periodo_fim, u.email AS email_usuario
     FROM clinicas c
     LEFT JOIN assinaturas s ON s.clinica_id = c.id
     LEFT JOIN usuarios u ON u.clinica_id = c.id
     WHERE c.id = ?
     ORDER BY u.id ASC
     LIMIT 1`,
    [clinicaId],
    callback
  );
}

router.get("/status", (req, res) => {
  carregarContexto(req.user.clinica_id, (err, row) => {
    if (err) return res.status(500).json({ erro: "Não foi possível consultar a assinatura." });
    if (!row) return res.status(404).json({ erro: "Clínica não encontrada." });
    db.get(
      "SELECT trial_ate FROM clinicas WHERE id = ?",
      [req.user.clinica_id],
      (trialErr, trial) => {
        if (trialErr) return res.status(500).json({ erro: "Não foi possível consultar o período de teste." });
        return res.json({
          plano: row.plano || "trial",
          status: row.assinatura_status || "trial",
          periodo_fim: row.periodo_fim || trial?.trial_ate || null,
          ambiente: "configurado_no_painel",
          pode_contratar: row.clinica_status === "ativa",
        });
      }
    );
  });
});

router.post("/checkout", async (req, res) => {
  const planoEscolhido = String(req.body?.plano || "").trim().toLowerCase();
  const plano = PLANOS[planoEscolhido];
  if (!plano) return res.status(400).json({ erro: "Selecione um plano válido." });

  db.get(
    "SELECT protegido FROM roles WHERE id = (SELECT role_id FROM usuarios WHERE id = ? AND clinica_id = ?)",
    [req.user.id, req.user.clinica_id],
    (roleErr, role) => {
      if (roleErr) return res.status(500).json({ erro: "Não foi possível validar o administrador da clínica." });
      if (!role || Number(role.protegido) !== 1) {
        return res.status(403).json({ erro: "Somente o administrador da clínica pode contratar ou alterar a assinatura." });
      }

      carregarContexto(req.user.clinica_id, async (contextErr, clinica) => {
        if (contextErr) return res.status(500).json({ erro: "Não foi possível carregar os dados da clínica." });
        if (!clinica) return res.status(404).json({ erro: "Clínica não encontrada." });
        if (clinica.clinica_status !== "ativa") {
          return res.status(403).json({ erro: "A clínica está suspensa administrativamente. Entre em contato com o suporte." });
        }

        try {
          const config = await new Promise((resolve, reject) => {
            db.get("SELECT provedor, ambiente, credenciais_cifradas FROM admin_payment_settings WHERE id = 1", [], (err, row) => {
              if (err) return reject(err);
              if (!row) return reject(new Error("O provedor de pagamentos ainda não foi configurado pela Sorrisa."));
              resolve(row);
            });
          });
          if (config.provedor !== "asaas") throw new Error("O provedor configurado ainda não possui checkout disponível.");
          if (config.ambiente !== "sandbox") throw new Error("Durante esta etapa, o checkout está liberado somente no ambiente Sandbox.");
          const credenciais = decifrarCredenciais(config.credenciais_cifradas);
          if (!credenciais.apiKey) throw new Error("A chave de API do Asaas não está configurada.");
          const baseUrl = config.ambiente === "producao"
            ? "https://api.asaas.com/v3"
            : "https://api-sandbox.asaas.com/v3";

          const assinaturaAtual = await new Promise((resolve, reject) => {
            db.get("SELECT provedor_assinatura_id, provedor_cliente_id, status FROM assinaturas WHERE clinica_id = ?", [req.user.clinica_id], (err, row) => err ? reject(err) : resolve(row || {}));
          });
          if (assinaturaAtual.provedor_assinatura_id && assinaturaAtual.status === "ativa") {
            return res.status(409).json({ erro: "Esta clínica já possui uma assinatura ativa. A alteração de plano será disponibilizada em uma etapa posterior." });
          }
          if (assinaturaAtual.provedor_assinatura_id && assinaturaAtual.status === "pendente") {
            const cobrancas = await chamarAsaas(baseUrl, credenciais.apiKey, "/subscriptions/" + encodeURIComponent(assinaturaAtual.provedor_assinatura_id) + "/payments");
            const pagamentoPendente = (cobrancas.data || []).find((item) => !["RECEIVED", "CONFIRMED", "REFUNDED", "DELETED"].includes(String(item.status || "").toUpperCase()));
            if (pagamentoPendente?.invoiceUrl) {
              return res.json({ sucesso: true, checkout_url: pagamentoPendente.invoiceUrl, mensagem: "Já existe uma cobrança aguardando pagamento." });
            }
            return res.status(409).json({ erro: "Já existe uma assinatura em processamento. Aguarde a geração da cobrança antes de tentar novamente." });
          }

          const cnpj = String(clinica.cnpj || "").replace(/\D/g, "");
          const cpf = String(clinica.cpf || "").replace(/\D/g, "");
          if (cnpj && cpf) {
            return res.status(400).json({ erro: "Preencha somente um documento para a cobrança: CPF ou CNPJ." });
          }
          const documento = cnpj || cpf;
          if (![11, 14].includes(documento.length)) {
            return res.status(400).json({ erro: "Para gerar a cobrança, informe um CPF com 11 números ou um CNPJ com 14 números em Configurações → Clínica." });
          }

          let clienteId = assinaturaAtual.provedor_cliente_id;
          if (!clienteId) {
            const cliente = await chamarAsaas(baseUrl, credenciais.apiKey, "/customers", "POST", {
              name: String(clinica.nome_fantasia || clinica.nome).slice(0, 100),
              email: String(clinica.email_contato || clinica.email_usuario || "").trim() || undefined,
              phone: String(clinica.telefone || "").replace(/\D/g, "") || undefined,
              cpfCnpj: documento,
              externalReference: "sorrisa-clinica-" + clinica.id,
            });
            clienteId = cliente.id;
            await new Promise((resolve, reject) => {
              db.run(
                "UPDATE assinaturas SET provedor = 'asaas', provedor_cliente_id = ?, updated_at = datetime('now','localtime') WHERE clinica_id = ?",
                [clienteId, req.user.clinica_id],
                (saveCustomerErr) => saveCustomerErr ? reject(saveCustomerErr) : resolve()
              );
            });
          }

          const novaAssinatura = await chamarAsaas(baseUrl, credenciais.apiKey, "/subscriptions", "POST", {
            customer: clienteId,
            billingType: "UNDEFINED",
            value: plano.valor,
            nextDueDate: dataHoje(),
            cycle: plano.ciclo,
            description: plano.descricao,
            externalReference: "sorrisa-clinica-" + clinica.id + "-" + planoEscolhido,
          });

          db.run(
            `UPDATE assinaturas
             SET provedor = 'asaas', provedor_cliente_id = ?, provedor_assinatura_id = ?,
                 plano = ?, status = 'pendente', updated_at = datetime('now','localtime')
             WHERE clinica_id = ?`,
            [clienteId, novaAssinatura.id, "sorrisa_completo_" + planoEscolhido, req.user.clinica_id],
            async (saveErr) => {
              if (saveErr) {
                console.error("Não foi possível salvar o identificador da assinatura Asaas:", saveErr.message);
                return res.status(500).json({ erro: "A assinatura foi criada no provedor, mas não foi possível registrar o vínculo local. Contate o suporte antes de tentar novamente." });
              }
              try {
                const cobrancas = await chamarAsaas(baseUrl, credenciais.apiKey, "/subscriptions/" + encodeURIComponent(novaAssinatura.id) + "/payments");
                const primeiraCobranca = (cobrancas.data || []).find((item) => item.invoiceUrl);
                if (primeiraCobranca) {
                  db.run(
                    `INSERT OR IGNORE INTO sorrisa_assinatura_cobrancas
                     (clinica_id, provedor, provedor_pagamento_id, provedor_assinatura_id, plano, ciclo, valor, status, checkout_url)
                     VALUES (?, 'asaas', ?, ?, ?, ?, ?, ?, ?)`,
                    [req.user.clinica_id, primeiraCobranca.id, novaAssinatura.id, "sorrisa_completo_" + planoEscolhido, planoEscolhido, plano.valor, primeiraCobranca.status || "PENDING", primeiraCobranca.invoiceUrl]
                  );
                  return res.json({ sucesso: true, checkout_url: primeiraCobranca.invoiceUrl, mensagem: "Cobrança criada no ambiente de testes. O acesso só será liberado após confirmação do pagamento." });
                }
                return res.json({ sucesso: true, checkout_url: novaAssinatura.invoiceUrl || null, mensagem: "Assinatura criada. A primeira cobrança está sendo preparada pelo Asaas." });
              } catch (paymentErr) {
                console.error("Falha ao recuperar a primeira cobrança Asaas:", paymentErr.message);
                return res.json({ sucesso: true, checkout_url: novaAssinatura.invoiceUrl || null, mensagem: "Assinatura criada, mas o link da primeira cobrança ainda não está disponível." });
              }
            }
          );
        } catch (error) {
          console.error("Falha ao criar checkout Asaas:", error.message);
          return res.status(error.status === 401 ? 503 : 502).json({
            erro: error.status === 401
              ? "A chave do Asaas não foi aceita. Confira se a chave corresponde ao ambiente selecionado no painel administrativo."
              : error.message || "Não foi possível iniciar a contratação.",
          });
        }
      });
    }
  );
});

module.exports = router;

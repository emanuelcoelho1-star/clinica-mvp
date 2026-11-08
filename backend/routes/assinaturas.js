const express = require("express");
const crypto = require("crypto");
const db = require("../database");
const auth = require("../middleware/auth");
const { sincronizarAssinatura } = require("../services/asaas-pagamentos");

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

function dataMinimaBoleto() {
  const [ano, mes, dia] = dataHoje().split("-").map(Number);
  const amanha = new Date(Date.UTC(ano, mes - 1, dia + 1));
  return amanha.toISOString().slice(0, 10);
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

async function montarDadosPagamento(baseUrl, apiKey, cobranca, tipo) {
  const dados = {
    id: cobranca.id,
    status: cobranca.status || "PENDING",
    vencimento: cobranca.dueDate || null,
    valor: Number(cobranca.value || 0),
    tipo,
  };

  if (tipo === "PIX") {
    const pix = await chamarAsaas(baseUrl, apiKey, "/payments/" + encodeURIComponent(cobranca.id) + "/pixQrCode");
    dados.pix = {
      imagem: pix.encodedImage || null,
      copiaECola: pix.payload || null,
      expiracao: pix.expirationDate || null,
    };
  } else if (tipo === "BOLETO") {
    if (String(cobranca.billingType || "").toUpperCase() !== "BOLETO") {
      throw new Error("A cobrança existente ainda não está configurada como boleto. Atualize a forma de pagamento e tente novamente.");
    }
    const boleto = await chamarAsaas(baseUrl, apiKey, "/payments/" + encodeURIComponent(cobranca.id) + "/identificationField");
    dados.boleto = {
      linhaDigitavel: boleto.identificationField || null,
      url: cobranca.bankSlipUrl || null,
      codigoBarras: boleto.barCode || null,
    };
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

router.get("/status", async (req, res) => {
  // Também reconcilia pagamentos já confirmados antes da configuração do webhook.
  // Isso permite recuperar a cobrança de teste atual sem gerar outro pagamento.
  try {
    const atual = await new Promise((resolve, reject) => {
      db.get(
        "SELECT status, provedor FROM assinaturas WHERE clinica_id = ? LIMIT 1",
        [req.user.clinica_id],
        (err, row) => err ? reject(err) : resolve(row || null)
      );
    });
    if (atual?.status === "pendente" && atual.provedor === "asaas") {
      try {
        await sincronizarAssinatura(req.user.clinica_id);
      } catch (syncError) {
        console.error("Não foi possível sincronizar a cobrança Asaas neste acesso:", syncError.message);
      }
    }
  } catch (syncLookupError) {
    console.error("Não foi possível verificar a sincronização da assinatura:", syncLookupError.message);
  }

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
  const meioPagamento = String(req.body?.meioPagamento || "PIX").trim().toUpperCase();
  if (!plano) return res.status(400).json({ erro: "Selecione um plano válido." });
  if (!["PIX", "BOLETO", "CARTAO"].includes(meioPagamento)) {
    return res.status(400).json({ erro: "Selecione Pix, boleto ou cartão." });
  }

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
          if (meioPagamento === "CARTAO" && assinaturaAtual.provedor_assinatura_id && assinaturaAtual.status === "pendente") {
            return res.status(409).json({ erro: "Já existe uma assinatura com cobrança pendente por outra forma de pagamento. Conclua ou regularize essa cobrança antes de iniciar o cartão." });
          }
          if (assinaturaAtual.provedor_assinatura_id && assinaturaAtual.status === "pendente") {
            const cobrancas = await chamarAsaas(baseUrl, credenciais.apiKey, "/subscriptions/" + encodeURIComponent(assinaturaAtual.provedor_assinatura_id) + "/payments");
            let pagamentoPendente = (cobrancas.data || []).find((item) => !["RECEIVED", "CONFIRMED", "REFUNDED", "DELETED", "CANCELED"].includes(String(item.status || "").toUpperCase()));
            if (pagamentoPendente) {
              if (String(pagamentoPendente.billingType || "").toUpperCase() !== meioPagamento) {
                await chamarAsaas(
                  baseUrl,
                  credenciais.apiKey,
                  "/subscriptions/" + encodeURIComponent(assinaturaAtual.provedor_assinatura_id),
                  "PUT",
                  { billingType: meioPagamento, updatePendingPayments: true }
                );
                // A atualização da recorrência não garante, por si só, que a cobrança
                // já emitida tenha sido alterada. Atualizamos também a cobrança pendente.
                await chamarAsaas(
                  baseUrl,
                  credenciais.apiKey,
                  "/payments/" + encodeURIComponent(pagamentoPendente.id),
                  "PUT",
                  {
                    billingType: meioPagamento,
                    value: Number(pagamentoPendente.value),
                    dueDate: meioPagamento === "BOLETO"
                      ? dataMinimaBoleto()
                      : (pagamentoPendente.dueDate || dataHoje()),
                  }
                );
                pagamentoPendente = await chamarAsaas(
                  baseUrl,
                  credenciais.apiKey,
                  "/payments/" + encodeURIComponent(pagamentoPendente.id)
                );
              }
              if (String(pagamentoPendente.billingType || "").toUpperCase() !== meioPagamento) {
                return res.status(409).json({ erro: "O Asaas não confirmou a alteração da cobrança para a forma de pagamento selecionada. Nenhum dado de boleto foi exibido. Tente novamente ou gere uma nova cobrança pelo suporte." });
              }
              const dadosPagamento = await montarDadosPagamento(baseUrl, credenciais.apiKey, pagamentoPendente, meioPagamento);
              return res.json({ sucesso: true, pagamento: dadosPagamento, mensagem: "Cobrança pendente atualizada e carregada nesta tela." });
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

          const telefoneAsaas = String(clinica.telefone || "").replace(/\D/g, "");
          const enderecoAsaas = {
            phone: telefoneAsaas || undefined,
            address: String(clinica.rua || "").trim() || undefined,
            addressNumber: String(clinica.numero || "").trim() || undefined,
            postalCode: String(clinica.cep || "").replace(/\D/g, "") || undefined,
            province: String(clinica.bairro || "").trim() || undefined,
            city: String(clinica.cidade || "").trim() || undefined,
          };

          if (meioPagamento === "CARTAO") {
            const camposObrigatorios = [
              ["phone", enderecoAsaas.phone, "telefone"],
              ["address", enderecoAsaas.address, "rua/avenida"],
              ["addressNumber", enderecoAsaas.addressNumber, "número"],
              ["postalCode", enderecoAsaas.postalCode, "CEP"],
              ["province", enderecoAsaas.province, "bairro"],
              ["city", enderecoAsaas.city, "cidade"],
            ];
            const faltantes = camposObrigatorios
              .filter(([, valor]) => !valor)
              .map(([, , rotulo]) => rotulo);
            if (faltantes.length) {
              return res.status(400).json({
                erro: "Para pagar com cartão, complete os seguintes dados em Configurações → Clínica: " + faltantes.join(", ") + ".",
              });
            }
            if (enderecoAsaas.postalCode.length !== 8) {
              return res.status(400).json({ erro: "Informe um CEP válido com 8 números em Configurações → Clínica." });
            }
          }

          let clienteId = assinaturaAtual.provedor_cliente_id;
          const dadosClienteAsaas = {
            name: String(clinica.nome_fantasia || clinica.nome).slice(0, 100),
            email: String(clinica.email_contato || clinica.email_usuario || "").trim() || undefined,
            cpfCnpj: documento,
            ...enderecoAsaas,
          };
          if (!clienteId) {
            const cliente = await chamarAsaas(baseUrl, credenciais.apiKey, "/customers", "POST", {
              ...dadosClienteAsaas,
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
          } else {
            await chamarAsaas(baseUrl, credenciais.apiKey, "/customers/" + encodeURIComponent(clienteId), "PUT", dadosClienteAsaas);
          }

          if (meioPagamento === "CARTAO") {
            const externalReference = "sorrisa-checkout-" + crypto.randomUUID();
            const urlPublica = String(process.env.APP_PUBLIC_URL || "https://sorrisa.com.br").replace(/\/$/, "");
            const checkout = await chamarAsaas(baseUrl, credenciais.apiKey, "/checkouts", "POST", {
              billingTypes: ["CREDIT_CARD"],
              chargeTypes: ["RECURRENT"],
              minutesToExpire: 60,
              externalReference,
              customer: clienteId,
              callback: {
                successUrl: urlPublica + "/?checkout=sucesso",
                cancelUrl: urlPublica + "/?checkout=cancelado",
                expiredUrl: urlPublica + "/?checkout=expirado"
              },
              items: [{
                name: plano.descricao,
                description: "Assinatura recorrente da plataforma Sorrisa",
                quantity: 1,
                value: plano.valor
              }],
              subscription: {
                cycle: plano.ciclo,
                nextDueDate: dataHoje()
              }
            });
            if (!checkout.id) throw new Error("O Asaas não retornou o identificador do checkout.");
            const checkoutUrl = checkout.link || (config.ambiente === "sandbox"
              ? "https://sandbox.asaas.com/checkoutSession/show/" + encodeURIComponent(checkout.id)
              : "https://asaas.com/checkoutSession/show?id=" + encodeURIComponent(checkout.id));
            await new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO sorrisa_asaas_checkouts
                 (clinica_id, checkout_id, external_reference, customer_id, plano, ciclo, valor, status, checkout_url)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'criado', ?)`,
                [req.user.clinica_id, checkout.id, externalReference, clienteId, "sorrisa_completo_" + planoEscolhido, planoEscolhido, plano.valor, checkoutUrl],
                (saveCheckoutErr) => saveCheckoutErr ? reject(saveCheckoutErr) : resolve()
              );
            });
            return res.json({
              sucesso: true,
              mensagem: "Checkout seguro criado no Asaas. Conclua o pagamento na página protegida do provedor.",
              pagamento: { tipo: "CARTAO", checkoutUrl, valor: plano.valor, ciclo: planoEscolhido, checkoutId: checkout.id }
            });
          }

          const novaAssinatura = await chamarAsaas(baseUrl, credenciais.apiKey, "/subscriptions", "POST", {
            customer: clienteId,
            billingType: meioPagamento,
            value: plano.valor,
            nextDueDate: meioPagamento === "BOLETO" ? dataMinimaBoleto() : dataHoje(),
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
                const primeiraCobranca = (cobrancas.data || []).find((item) => !["RECEIVED", "CONFIRMED", "REFUNDED", "DELETED", "CANCELED"].includes(String(item.status || "").toUpperCase()));
                if (primeiraCobranca) {
                  db.run(
                    `INSERT OR IGNORE INTO sorrisa_assinatura_cobrancas
                     (clinica_id, provedor, provedor_pagamento_id, provedor_assinatura_id, plano, ciclo, valor, status, checkout_url)
                     VALUES (?, 'asaas', ?, ?, ?, ?, ?, ?, ?)`,
                    [req.user.clinica_id, primeiraCobranca.id, novaAssinatura.id, "sorrisa_completo_" + planoEscolhido, planoEscolhido, plano.valor, primeiraCobranca.status || "PENDING", primeiraCobranca.invoiceUrl]
                  );
                  const dadosPagamento = await montarDadosPagamento(baseUrl, credenciais.apiKey, primeiraCobranca, meioPagamento);
                  return res.json({
                    sucesso: true,
                    pagamento: dadosPagamento,
                    mensagem: "Cobrança criada no ambiente de testes. O acesso só será liberado após confirmação do pagamento.",
                  });
                }
                return res.json({ sucesso: true, mensagem: "Assinatura criada. A primeira cobrança ainda está sendo preparada pelo Asaas. Tente atualizar em instantes." });
              } catch (paymentErr) {
                console.error("Falha ao recuperar a primeira cobrança Asaas:", paymentErr.message);
                return res.status(502).json({ erro: "A assinatura foi criada, mas não foi possível carregar os dados do pagamento. Atualize a tela em instantes ou contate o suporte antes de tentar novamente." });
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

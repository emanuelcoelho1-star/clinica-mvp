const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const db = require("../database");

const router = express.Router();

db.run(`
  CREATE TABLE IF NOT EXISTS admin_payment_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    provedor TEXT NOT NULL DEFAULT 'asaas',
    ambiente TEXT NOT NULL DEFAULT 'sandbox',
    credenciais_cifradas TEXT,
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )
`);
db.run(`
  CREATE TABLE IF NOT EXISTS admin_clinica_notas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinica_id INTEGER NOT NULL,
    nota TEXT NOT NULL,
    administrador_email TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
  )
`);
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde 15 minutos." },
});

const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "emanuelcoelho1@gmail.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "";

function compararSeguramente(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function exigirAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !ADMIN_JWT_SECRET) {
    return res.status(401).json({ erro: "Acesso administrativo não autorizado." });
  }
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET);
    if (payload.tipo !== "sorrisa_superadmin" || payload.email !== ADMIN_EMAIL) {
      return res.status(403).json({ erro: "Acesso administrativo não autorizado." });
    }
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ erro: "Sessão administrativa expirada." });
  }
}

router.post("/login", loginLimiter, (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const senha = typeof req.body?.senha === "string" ? req.body.senha : "";

  if (!ADMIN_PASSWORD || !ADMIN_JWT_SECRET) {
    return res.status(503).json({
      erro: "Acesso administrativo ainda não configurado. Defina ADMIN_PASSWORD e ADMIN_JWT_SECRET no backend/.env.",
    });
  }
  if (!compararSeguramente(email, ADMIN_EMAIL) || !compararSeguramente(senha, ADMIN_PASSWORD)) {
    return res.status(401).json({ erro: "E-mail ou senha inválidos." });
  }

  const token = jwt.sign(
    { tipo: "sorrisa_superadmin", email: ADMIN_EMAIL },
    ADMIN_JWT_SECRET,
    { expiresIn: "8h", issuer: "sorrisa-admin" }
  );
  return res.json({ token, administrador: { email: ADMIN_EMAIL } });
});


async function cancelarAssinaturaExterna(clinicId) {
  const assinatura = await new Promise((resolve, reject) => {
    db.get(
      "SELECT provedor, provedor_assinatura_id, status FROM assinaturas WHERE clinica_id = ? LIMIT 1",
      [clinicId],
      (err, row) => err ? reject(err) : resolve(row || null)
    );
  });

  if (!assinatura || !assinatura.provedor_assinatura_id || String(assinatura.status || "").toLowerCase() === "cancelada") return;
  if (String(assinatura.provedor || "").toLowerCase() !== "asaas") {
    const erro = new Error("A clínica possui uma assinatura em outro provedor. Cancele a recorrência no provedor antes de excluir a clínica.");
    erro.status = 409;
    throw erro;
  }

  const configuracao = await new Promise((resolve, reject) => {
    db.get(
      "SELECT provedor, ambiente, credenciais_cifradas FROM admin_payment_settings WHERE id = 1",
      [],
      (err, row) => err ? reject(err) : resolve(row || null)
    );
  });
  if (!configuracao || configuracao.provedor !== "asaas") {
    const erro = new Error("A integração Asaas não está disponível para cancelar a assinatura. A clínica não foi excluída.");
    erro.status = 503;
    throw erro;
  }

  let credenciais;
  try {
    credenciais = decifrarCredenciais(configuracao.credenciais_cifradas);
  } catch {
    const erro = new Error("Não foi possível acessar com segurança as credenciais do Asaas. A clínica não foi excluída.");
    erro.status = 503;
    throw erro;
  }
  if (!credenciais.apiKey) {
    const erro = new Error("A chave de API do Asaas não está configurada. A clínica não foi excluída.");
    erro.status = 503;
    throw erro;
  }

  const baseUrl = configuracao.ambiente === "producao"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
  const resposta = await fetch(baseUrl + "/subscriptions/" + encodeURIComponent(assinatura.provedor_assinatura_id), {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "User-Agent": "Sorrisa/1.0",
      access_token: credenciais.apiKey,
    },
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const mensagem = Array.isArray(dados.errors)
      ? dados.errors.map((item) => item.description).filter(Boolean).join("; ")
      : "";
    const erro = new Error(mensagem || "O Asaas não confirmou o cancelamento da assinatura. A clínica não foi excluída.");
    erro.status = 502;
    throw erro;
  }
}

router.get("/clinicas/:id", exigirAdmin, (req, res) => {
  const clinicId = Number(req.params.id);
  if (!Number.isSafeInteger(clinicId) || clinicId <= 0) {
    return res.status(400).json({ erro: "Identificador de clínica inválido." });
  }

  const sqlClinica = `
    SELECT
      id, nome, slug, email_contato, telefone, telefone_secundario,
      cnpj, nome_fantasia, razao_social, cep, rua, numero, complemento,
      bairro, cidade, estado, logo_url, responsavel_tecnico, cro, site,
      status, plano, trial_ate, created_at, updated_at
    FROM clinicas
    WHERE id = ?
    LIMIT 1
  `;

  db.get(sqlClinica, [clinicId], (clinicErr, clinica) => {
    if (clinicErr) {
      console.error("Falha ao consultar detalhes da clínica:", clinicErr.message);
      return res.status(500).json({ erro: "Não foi possível carregar os dados da clínica." });
    }
    if (!clinica) return res.status(404).json({ erro: "Clínica não encontrada." });

    db.all(
      `SELECT id, nome, email, role_id, created_at
       FROM usuarios
       WHERE clinica_id = ?
       ORDER BY nome COLLATE NOCASE ASC, id ASC`,
      [clinicId],
      (usersErr, usuarios) => {
        if (usersErr) {
          console.error("Falha ao consultar usuários da clínica:", usersErr.message);
          return res.status(500).json({ erro: "Não foi possível carregar os usuários da clínica." });
        }

        const sqlUso = `
          SELECT
            (SELECT COUNT(*) FROM pacientes WHERE clinica_id = ?) AS pacientes,
            (SELECT COUNT(*) FROM consultas WHERE clinica_id = ?) AS consultas,
            (SELECT COUNT(*) FROM orcamentos WHERE clinica_id = ?) AS orcamentos,
            (SELECT COUNT(*) FROM documentos WHERE clinica_id = ?) AS documentos,
            (SELECT COUNT(*) FROM arquivos WHERE clinica_id = ?) AS arquivos,
            (SELECT COALESCE(SUM(tamanho), 0) FROM arquivos WHERE clinica_id = ?) AS armazenamento_bytes
        `;
        db.get(sqlUso, [clinicId, clinicId, clinicId, clinicId, clinicId, clinicId], (usageErr, utilizacao) => {
          if (usageErr) {
            console.error("Falha ao consultar utilização da clínica:", usageErr.message);
            return res.status(500).json({ erro: "Não foi possível carregar a utilização da clínica." });
          }

          db.get(
            `SELECT id, provedor, plano, status, periodo_inicio, periodo_fim,
                    cancelamento_no_fim, created_at, updated_at
             FROM assinaturas WHERE clinica_id = ? LIMIT 1`,
            [clinicId],
            (subscriptionErr, assinatura) => {
              if (subscriptionErr) {
                console.error("Falha ao consultar assinatura da clínica:", subscriptionErr.message);
                return res.status(500).json({ erro: "Não foi possível carregar a assinatura da clínica." });
              }

              db.all(
                `SELECT a.id, a.acao, a.recurso, a.recurso_id, a.detalhes, a.ip,
                        a.created_at, u.nome AS usuario_nome
                 FROM auditoria a
                 LEFT JOIN usuarios u ON u.id = a.usuario_id
                 WHERE a.clinica_id = ?
                 ORDER BY a.created_at DESC, a.id DESC
                 LIMIT 50`,
                [clinicId],
                (activityErr, atividades) => {
                  if (activityErr) {
                    console.error("Falha ao consultar atividades da clínica:", activityErr.message);
                    return res.status(500).json({ erro: "Não foi possível carregar o histórico de atividades." });
                  }
                  db.all(
                    `SELECT id, nota, administrador_email, created_at
                     FROM admin_clinica_notas
                     WHERE clinica_id = ?
                     ORDER BY created_at DESC, id DESC
                     LIMIT 100`,
                    [clinicId],
                    (notesErr, notasSuporte) => {
                      if (notesErr) {
                        console.error("Falha ao consultar anotações de suporte:", notesErr.message);
                        return res.status(500).json({ erro: "Não foi possível carregar as anotações de suporte." });
                      }
                      return res.json({
                        clinica,
                        usuarios: usuarios || [],
                        utilizacao: utilizacao || {},
                        assinatura: assinatura || null,
                        atividades: atividades || [],
                        notasSuporte: notasSuporte || [],
                      });
                    }
                  );
                }
              );
            }
          );
        });
      }
    );
  });
});


router.delete("/clinicas/:id", exigirAdmin, (req, res) => {
  const clinicId = Number(req.params.id);
  if (!Number.isSafeInteger(clinicId) || clinicId <= 0) {
    return res.status(400).json({ erro: "Identificador de clínica inválido." });
  }

  // A clínica 1 é a fonte do plano Particular e do catálogo copiados
  // para todas as novas clínicas. Ela é protegida contra exclusão.
  if (clinicId === 1) {
    return res.status(403).json({ erro: "A clínica-modelo da plataforma não pode ser excluída." });
  }

  db.get("SELECT id, nome FROM clinicas WHERE id = ? LIMIT 1", [clinicId], (findErr, clinica) => {
    if (findErr) {
      console.error("Falha ao consultar clínica para exclusão:", findErr.message);
      return res.status(500).json({ erro: "Não foi possível consultar a clínica." });
    }
    if (!clinica) return res.status(404).json({ erro: "Clínica não encontrada." });

    const confirmacao = typeof req.body?.confirmacao === "string" ? req.body.confirmacao.trim() : "";
    const normalizar = (valor) => String(valor || "").normalize("NFC").trim().toLocaleLowerCase("pt-BR");
    if (!confirmacao || normalizar(confirmacao) !== normalizar(clinica.nome)) {
      return res.status(400).json({ erro: "Digite o nome exato da clínica para confirmar a exclusão." });
    }

    return cancelarAssinaturaExterna(clinicId).then(() => {
    return db.all("SELECT nome_salvo FROM arquivos WHERE clinica_id = ?", [clinicId], (filesErr, arquivos) => {
      if (filesErr) {
        console.error("Falha ao listar arquivos da clínica para exclusão:", filesErr.message);
        return res.status(500).json({ erro: "Não foi possível preparar a exclusão dos arquivos." });
      }

      db.serialize(() => {
        db.run("BEGIN IMMEDIATE TRANSACTION", (beginErr) => {
          if (beginErr) {
            console.error("Falha ao iniciar exclusão da clínica:", beginErr.message);
            return res.status(500).json({ erro: "Não foi possível iniciar a exclusão da clínica." });
          }

          const abortar = (err) => {
            db.run("ROLLBACK", () => {
              console.error("Exclusão da clínica revertida:", err?.message || err);
              return res.status(500).json({ erro: "Não foi possível excluir todos os dados da clínica. Nenhuma alteração foi confirmada." });
            });
          };

          db.run("PRAGMA defer_foreign_keys = ON", (pragmaErr) => {
            if (pragmaErr) return abortar(pragmaErr);

            db.all(
              "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
              [],
              (tablesErr, tabelas) => {
                if (tablesErr) return abortar(tablesErr);

                const nomesTabelas = new Set((tabelas || []).map((t) => t.name));
                const limparEventosPagamento = (callback) => {
                  if (!nomesTabelas.has("sorrisa_asaas_webhook_eventos") || !nomesTabelas.has("sorrisa_assinatura_cobrancas")) {
                    return callback();
                  }
                  db.run(
                    "DELETE FROM sorrisa_asaas_webhook_eventos WHERE pagamento_id IN (SELECT provedor_pagamento_id FROM sorrisa_assinatura_cobrancas WHERE clinica_id = ?)",
                    [clinicId],
                    (eventErr) => eventErr ? callback(eventErr) : callback()
                  );
                };

                limparEventosPagamento((eventErr) => {
                  if (eventErr) return abortar(eventErr);

                  const excluirTabelasDaClinica = (indice) => {
                    if (indice >= (tabelas || []).length) {
                      db.run("DELETE FROM clinicas WHERE id = ?", [clinicId], function (clinicDeleteErr) {
                        if (clinicDeleteErr) return abortar(clinicDeleteErr);
                        if (this.changes !== 1) return abortar(new Error("A clínica não foi removida."));
                        db.run("COMMIT", (commitErr) => {
                          if (commitErr) return abortar(commitErr);

                          const uploadDir = path.join(__dirname, "..", "uploads");
                          (arquivos || []).forEach((arquivo) => {
                            const nome = path.basename(String(arquivo.nome_salvo || ""));
                            if (!nome || nome === "." || nome === "..") return;
                            fs.unlink(path.join(uploadDir, nome), (unlinkErr) => {
                              if (unlinkErr && unlinkErr.code !== "ENOENT") {
                                console.warn("Não foi possível remover arquivo físico da clínica:", nome, unlinkErr.message);
                              }
                            });
                          });

                          return res.json({
                            sucesso: true,
                            mensagem: "Clínica e dados vinculados excluídos com sucesso.",
                            clinica_id: clinicId,
                            arquivos_removidos: (arquivos || []).length,
                          });
                        });
                      });
                      return;
                    }

                    const nomeTabela = tabelas[indice].name;
                    if (nomeTabela === "clinicas") {
                      excluirTabelasDaClinica(indice + 1);
                      return;
                    }
                    const nomeSeguro = '"' + String(nomeTabela).replace(/"/g, '""') + '"';
                    db.all("PRAGMA table_info(" + nomeSeguro + ")", [], (columnsErr, colunas) => {
                      if (columnsErr) return abortar(columnsErr);
                      if (!(colunas || []).some((coluna) => coluna.name === "clinica_id")) {
                        excluirTabelasDaClinica(indice + 1);
                        return;
                      }
                      db.run("DELETE FROM " + nomeSeguro + " WHERE clinica_id = ?", [clinicId], (deleteErr) => {
                        if (deleteErr) return abortar(deleteErr);
                        excluirTabelasDaClinica(indice + 1);
                      });
                    });
                  };

                  excluirTabelasDaClinica(0);
                });
              }
            );
          });
        });
      });
    });
    }).catch((subscriptionErr) => {
      console.error("Não foi possível encerrar a assinatura externa antes da exclusão:", subscriptionErr.message);
      if (!res.headersSent) return res.status(subscriptionErr.status || 502).json({
        erro: subscriptionErr.message || "Não foi possível encerrar a assinatura da clínica. A exclusão foi cancelada."
      });
    });
  });
});

router.patch("/clinicas/:id", exigirAdmin, (req, res) => {
  const clinicId = Number(req.params.id);
  if (!Number.isSafeInteger(clinicId) || clinicId <= 0) return res.status(400).json({ erro: "Identificador de clínica inválido." });

  const status = req.body?.status;
  const plano = req.body?.plano;
  if (status === undefined && plano === undefined) return res.status(400).json({ erro: "Informe o status ou o plano para alterar." });
  if (status !== undefined && !["ativa", "suspensa"].includes(String(status))) {
    return res.status(400).json({ erro: "Status inválido. Use ativa ou suspensa." });
  }
  if (plano !== undefined && (typeof plano !== "string" || !plano.trim() || plano.trim().length > 40)) {
    return res.status(400).json({ erro: "Informe um nome de plano válido (até 40 caracteres)." });
  }

  db.get("SELECT id, status, plano FROM clinicas WHERE id = ?", [clinicId], (findErr, atual) => {
    if (findErr) return res.status(500).json({ erro: "Não foi possível consultar a clínica." });
    if (!atual) return res.status(404).json({ erro: "Clínica não encontrada." });

    const novoStatus = status === undefined ? atual.status : status;
    const novoPlano = plano === undefined ? atual.plano : plano.trim();
    db.run(
      "UPDATE clinicas SET status = ?, plano = ?, updated_at = datetime('now','localtime') WHERE id = ?",
      [novoStatus, novoPlano, clinicId],
      (updateErr) => {
        if (updateErr) {
          console.error("Falha ao atualizar clínica:", updateErr.message);
          return res.status(500).json({ erro: "Não foi possível atualizar a clínica." });
        }

        const atualizarAssinatura = (done) => {
          if (plano === undefined) return done();
          db.run(
            `INSERT INTO assinaturas (clinica_id, plano, status)
             VALUES (?, ?, 'trial')
             ON CONFLICT(clinica_id) DO UPDATE SET
               plano = excluded.plano,
               updated_at = datetime('now','localtime')`,
            [clinicId, novoPlano],
            (subscriptionErr) => done(subscriptionErr)
          );
        };

        atualizarAssinatura((subscriptionErr) => {
          if (subscriptionErr) {
            console.error("Falha ao atualizar plano da assinatura:", subscriptionErr.message);
            return res.status(500).json({ erro: "A clínica foi atualizada, mas não foi possível sincronizar a assinatura." });
          }
          const alteracoes = [];
          if (status !== undefined && status !== atual.status) alteracoes.push("status: " + atual.status + " → " + novoStatus);
          if (plano !== undefined && plano.trim() !== atual.plano) alteracoes.push("plano: " + atual.plano + " → " + novoPlano);
          if (alteracoes.length) {
            db.run(
              "INSERT INTO auditoria (clinica_id, acao, recurso, recurso_id, detalhes, ip) VALUES (?, ?, ?, ?, ?, ?)",
              [clinicId, "alteracao_administrativa", "clinica", String(clinicId), alteracoes.join("; "), req.ip || null]
            );
          }
          return res.json({ sucesso: true, clinica: { id: clinicId, status: novoStatus, plano: novoPlano } });
        });
      }
    );
  });
});

router.post("/clinicas/:id/notas-suporte", exigirAdmin, (req, res) => {
  const clinicId = Number(req.params.id);
  const nota = typeof req.body?.nota === "string" ? req.body.nota.trim() : "";
  if (!Number.isSafeInteger(clinicId) || clinicId <= 0) return res.status(400).json({ erro: "Identificador de clínica inválido." });
  if (!nota || nota.length > 5000) return res.status(400).json({ erro: "A anotação deve ter entre 1 e 5.000 caracteres." });

  db.get("SELECT id FROM clinicas WHERE id = ?", [clinicId], (findErr, clinic) => {
    if (findErr) return res.status(500).json({ erro: "Não foi possível consultar a clínica." });
    if (!clinic) return res.status(404).json({ erro: "Clínica não encontrada." });
    db.run(
      "INSERT INTO admin_clinica_notas (clinica_id, nota, administrador_email) VALUES (?, ?, ?)",
      [clinicId, nota, req.admin.email],
      function (insertErr) {
        if (insertErr) {
          console.error("Falha ao salvar anotação de suporte:", insertErr.message);
          return res.status(500).json({ erro: "Não foi possível salvar a anotação." });
        }
        const id = this.lastID;
        db.get("SELECT id, nota, administrador_email, created_at FROM admin_clinica_notas WHERE id = ?", [id], (readErr, registro) => {
          if (readErr) return res.status(500).json({ erro: "Anotação salva, mas não foi possível recarregá-la." });
          db.run(
            "INSERT INTO auditoria (clinica_id, acao, recurso, recurso_id, detalhes, ip) VALUES (?, ?, ?, ?, ?, ?)",
            [clinicId, "anotacao_suporte", "suporte", String(id), "Anotação administrativa registrada.", req.ip || null]
          );
          return res.status(201).json({ nota: registro });
        });
      }
    );
  });
});


function chaveCredenciaisPagamento() {
  const segredo = String(process.env.PAYMENT_CREDENTIALS_KEY || "");
  if (segredo.length < 32) throw new Error("PAYMENT_CREDENTIALS_KEY não configurada.");
  return crypto.createHash("sha256").update(segredo, "utf8").digest();
}
function cifrarCredenciais(valor) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", chaveCredenciaisPagamento(), iv);
  const conteudo = Buffer.concat([cipher.update(JSON.stringify(valor), "utf8"), cipher.final()]);
  return JSON.stringify({ iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: conteudo.toString("base64") });
}
function decifrarCredenciais(valor) {
  if (!valor) return {};
  const pacote = JSON.parse(valor);
  const decipher = crypto.createDecipheriv("aes-256-gcm", chaveCredenciaisPagamento(), Buffer.from(pacote.iv, "base64"));
  decipher.setAuthTag(Buffer.from(pacote.tag, "base64"));
  const conteudo = Buffer.concat([decipher.update(Buffer.from(pacote.data, "base64")), decipher.final()]);
  return JSON.parse(conteudo.toString("utf8"));
}

router.get("/payment-settings", exigirAdmin, (req, res) => {
  db.get("SELECT provedor, ambiente, credenciais_cifradas, updated_at FROM admin_payment_settings WHERE id = 1", [], (err, row) => {
    if (err) return res.status(500).json({ erro: "Não foi possível carregar as configurações de pagamento." });
    if (!row) return res.json({ provedor: "asaas", ambiente: "sandbox", possui_chave_api: false, possui_token_webhook: false, atualizado_em: null });
    try {
      const credenciais = decifrarCredenciais(row.credenciais_cifradas);
      return res.json({ provedor: row.provedor, ambiente: row.ambiente, possui_chave_api: Boolean(credenciais.apiKey), possui_token_webhook: Boolean(credenciais.webhookToken || process.env.ASAAS_WEBHOOK_TOKEN), atualizado_em: row.updated_at });
    } catch (e) {
      console.error("Não foi possível descriptografar as credenciais de pagamento.");
      return res.status(503).json({ erro: "A chave de criptografia das credenciais não está disponível ou foi alterada." });
    }
  });
});

router.put("/payment-settings", exigirAdmin, (req, res) => {
  const provedor = String(req.body?.provedor || "").trim().toLowerCase();
  const ambiente = String(req.body?.ambiente || "").trim().toLowerCase();
  const apiKeyNova = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
  const webhookTokenNovo = typeof req.body?.webhookToken === "string" ? req.body.webhookToken.trim() : "";
  if (!["asaas", "outro"].includes(provedor)) return res.status(400).json({ erro: "Selecione um provedor válido." });
  if (!["sandbox", "producao"].includes(ambiente)) return res.status(400).json({ erro: "Selecione um ambiente válido." });
  db.get("SELECT provedor, credenciais_cifradas FROM admin_payment_settings WHERE id = 1", [], (findErr, atual) => {
    if (findErr) return res.status(500).json({ erro: "Não foi possível consultar a configuração atual." });
    let credenciaisAtuais = {};
    try {
      if (atual?.credenciais_cifradas) credenciaisAtuais = decifrarCredenciais(atual.credenciais_cifradas);
      if (atual && atual.provedor !== provedor && !apiKeyNova) return res.status(400).json({ erro: "Informe a nova chave de API ao trocar de provedor." });
      const credenciais = {
        apiKey: apiKeyNova || credenciaisAtuais.apiKey || "",
        webhookToken: webhookTokenNovo || credenciaisAtuais.webhookToken || "",
      };
      if (!credenciais.apiKey) return res.status(400).json({ erro: "Informe a chave de API do provedor." });
      const cifradas = cifrarCredenciais(credenciais);
      db.run(`INSERT INTO admin_payment_settings (id, provedor, ambiente, credenciais_cifradas, updated_at)
        VALUES (1, ?, ?, ?, datetime('now','localtime'))
        ON CONFLICT(id) DO UPDATE SET provedor=excluded.provedor, ambiente=excluded.ambiente,
        credenciais_cifradas=excluded.credenciais_cifradas, updated_at=datetime('now','localtime')`,
        [provedor, ambiente, cifradas], function (saveErr) {
          if (saveErr) return res.status(500).json({ erro: "Não foi possível salvar as configurações de pagamento." });
          db.run("INSERT INTO auditoria (acao, recurso, detalhes, ip) VALUES (?, ?, ?, ?)",
            ["configuracao_pagamentos", "integracao", "Configurações do provedor de pagamentos atualizadas.", req.ip || null]);
          return res.json({ sucesso: true, provedor, ambiente, possui_chave_api: true, possui_token_webhook: Boolean(credenciais.webhookToken), atualizado_em: new Date().toISOString() });
        });
    } catch (e) {
      console.error("Falha ao proteger credenciais de pagamento.");
      return res.status(503).json({ erro: "Não foi possível proteger as credenciais. Verifique PAYMENT_CREDENTIALS_KEY no backend." });
    }
  });
});

router.get("/dashboard", exigirAdmin, (req, res) => {
  const sql = `
    SELECT
      c.id, c.nome, c.email_contato,
      (SELECT TRIM(u.email)
       FROM usuarios u
       WHERE u.clinica_id = c.id AND TRIM(COALESCE(u.email, '')) <> ''
       ORDER BY u.id ASC
       LIMIT 1) AS email_login,
      c.status, c.plano, c.trial_ate, c.created_at,
      (SELECT COUNT(*) FROM usuarios u WHERE u.clinica_id = c.id) AS total_usuarios,
      (SELECT COUNT(*) FROM usuarios u WHERE u.clinica_id = c.id
       AND TRIM(COALESCE(u.email, '')) <> '') AS usuarios_com_email,
      (SELECT COUNT(*) FROM arquivos a WHERE a.clinica_id = c.id) AS total_arquivos,
      (SELECT COALESCE(SUM(a.tamanho), 0) FROM arquivos a WHERE a.clinica_id = c.id) AS armazenamento_bytes,
      s.status AS assinatura_status, s.periodo_inicio, s.periodo_fim,
      s.provedor
    FROM clinicas c
    LEFT JOIN assinaturas s ON s.clinica_id = c.id
    ORDER BY c.created_at DESC, c.id DESC
  `;

  db.all(sql, [], (err, clinicas) => {
    if (err) {
      console.error("Falha ao carregar painel administrativo:", err.message);
      return res.status(500).json({ erro: "Não foi possível carregar os dados administrativos." });
    }
    const lista = clinicas || [];
    const totalUsuarios = lista.reduce((soma, item) => soma + Number(item.total_usuarios || 0), 0);
    const armazenamentoBytes = lista.reduce((soma, item) => soma + Number(item.armazenamento_bytes || 0), 0);
    return res.json({
      indicadores: {
        total_clinicas: lista.length,
        clinicas_ativas: lista.filter((c) => c.status === "ativa").length,
        total_usuarios: totalUsuarios,
        armazenamento_bytes: armazenamentoBytes,
        assinaturas_trial: lista.filter((c) => (c.assinatura_status || c.plano) === "trial").length,
        assinaturas_ativas: lista.filter((c) => c.assinatura_status === "ativa").length,
        assinaturas_pendentes: lista.filter((c) => ["pendente", "past_due", "inadimplente"].includes(String(c.assinatura_status || "").toLowerCase())).length,
      },
      clinicas: lista,
    });
  });
});


router.post("/clinicas/:id/dias-gratis", exigirAdmin, (req, res) => {
  const clinicId = Number(req.params.id);
  const dias = Number(req.body?.dias);
  if (!Number.isSafeInteger(clinicId) || clinicId <= 0) {
    return res.status(400).json({ erro: "Identificador de clínica inválido." });
  }
  if (!Number.isSafeInteger(dias) || dias < 1 || dias > 365) {
    return res.status(400).json({ erro: "Informe uma quantidade de 1 a 365 dias." });
  }

  db.get(
    `SELECT c.id, c.status AS clinica_status, c.trial_ate,
            s.status AS assinatura_status, s.provedor,
            s.provedor_assinatura_id
     FROM clinicas c
     LEFT JOIN assinaturas s ON s.clinica_id = c.id
     WHERE c.id = ? LIMIT 1`,
    [clinicId],
    (findErr, atual) => {
      if (findErr) {
        console.error("Falha ao consultar período gratuito:", findErr.message);
        return res.status(500).json({ erro: "Não foi possível consultar a assinatura da clínica." });
      }
      if (!atual) return res.status(404).json({ erro: "Clínica não encontrada." });

      const statusAssinatura = String(atual.assinatura_status || "trial").toLowerCase();
      const possuiAssinaturaPaga = Boolean(atual.provedor_assinatura_id) ||
        ["ativa", "pendente", "past_due", "inadimplente"].includes(statusAssinatura);
      if (possuiAssinaturaPaga) {
        return res.status(409).json({ erro: "Esta clínica possui uma assinatura paga ou cobrança em andamento. Os dias grátis não foram alterados." });
      }

      db.serialize(() => {
        db.run(
          `UPDATE clinicas
           SET trial_ate = datetime(
             CASE
               WHEN trial_ate IS NOT NULL AND length(trial_ate) = 10 THEN datetime(trial_ate, '+1 day')
               WHEN trial_ate IS NOT NULL AND datetime(trial_ate) > datetime('now', 'localtime') THEN trial_ate
               ELSE datetime('now', 'localtime')
             END,
             '+' || ? || ' days'
           ),
           updated_at = datetime('now', 'localtime')
           WHERE id = ?`,
          [dias, clinicId],
          function (updateErr) {
            if (updateErr) {
              console.error("Falha ao ampliar período gratuito:", updateErr.message);
              return res.status(500).json({ erro: "Não foi possível adicionar os dias gratuitos." });
            }

            db.get("SELECT trial_ate FROM clinicas WHERE id = ?", [clinicId], (dateErr, clinicaAtualizada) => {
              if (dateErr || !clinicaAtualizada) {
                return res.status(500).json({ erro: "Os dias foram processados, mas não foi possível confirmar a nova data." });
              }
              db.run(
                `INSERT INTO assinaturas (clinica_id, plano, status, periodo_inicio, periodo_fim)
                 VALUES (?, 'trial', 'trial', datetime('now', 'localtime'), ?)
                 ON CONFLICT(clinica_id) DO UPDATE SET
                   status = 'trial',
                   periodo_fim = excluded.periodo_fim,
                   updated_at = datetime('now', 'localtime')`,
                [clinicId, clinicaAtualizada.trial_ate],
                (subscriptionErr) => {
                  if (subscriptionErr) {
                    console.error("Falha ao sincronizar período gratuito:", subscriptionErr.message);
                    return res.status(500).json({ erro: "A data foi atualizada, mas não foi possível sincronizar a assinatura." });
                  }
                  const detalhes = dias + " dia(s) grátis adicionados. Novo vencimento: " + clinicaAtualizada.trial_ate;
                  db.run(
                    "INSERT INTO auditoria (clinica_id, acao, recurso, recurso_id, detalhes, ip) VALUES (?, ?, ?, ?, ?, ?)",
                    [clinicId, "ampliacao_periodo_gratis", "assinatura", String(clinicId), detalhes, req.ip || null]
                  );
                  return res.json({
                    sucesso: true,
                    dias_adicionados: dias,
                    trial_ate: clinicaAtualizada.trial_ate,
                    clinica_status: atual.clinica_status,
                  });
                }
              );
            });
          }
        );
      });
    }
  );
});

module.exports = router;

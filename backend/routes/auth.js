const express = require("express");
const router = express.Router();
/**
 * Copia o plano Particular e o catálogo da clínica-modelo para uma nova clínica.
 * Os registros são duplicados com novos IDs e permanecem isolados por clinica_id.
 */
function copiarPlanoParticularPadrao(clinicaDestinoId, callback) {
  db.get(
    `SELECT c.id AS clinica_id
     FROM clinicas c
     INNER JOIN planos p ON p.clinica_id = c.id
     WHERE c.id = 1 AND LOWER(TRIM(p.nome)) = 'particular'
     LIMIT 1`,
    [],
    (sourceErr, source) => {
      if (sourceErr) return callback(sourceErr);
      if (!source) return callback(null);

      db.get(
        `SELECT id, descricao
         FROM planos
         WHERE clinica_id = ? AND LOWER(TRIM(nome)) = 'particular'
         ORDER BY id
         LIMIT 1`,
        [source.clinica_id],
        (planErr, planModelo) => {
          if (planErr) return callback(planErr);
          if (!planModelo) return callback(null);

          db.run(
            `INSERT INTO planos (clinica_id, nome, tipo, descricao, ativo)
             VALUES (?, 'Particular', ?, ?, 1)`,
            [clinicaDestinoId, JSON.stringify(["padrao"]), planModelo.descricao || ""],
            function (insertPlanErr) {
              if (insertPlanErr) return callback(insertPlanErr);
              const planoDestinoId = this.lastID;

              db.run(
                `INSERT INTO procedimentos_catalogo
                   (clinica_id, nome, codigo, categoria, descricao, ativo, aceita_faces, custo_tratamento, usar_na_frente)
                 SELECT ?, nome, codigo, categoria, descricao, ativo,
                        COALESCE(aceita_faces, 0), COALESCE(custo_tratamento, 0), COALESCE(usar_na_frente, 1)
                 FROM procedimentos_catalogo
                 WHERE clinica_id = ?
                 ORDER BY id`,
                [clinicaDestinoId, source.clinica_id],
                (proceduresErr) => {
                  if (proceduresErr) return callback(proceduresErr);

                  db.run(
                    `INSERT INTO plano_procedimentos (clinica_id, plano_id, procedimento_id, valor)
                     SELECT ?, ?, destino.id, COALESCE(origem_preco.valor, 0)
                     FROM procedimentos_catalogo origem
                     INNER JOIN procedimentos_catalogo destino
                       ON destino.clinica_id = ? AND LOWER(TRIM(destino.nome)) = LOWER(TRIM(origem.nome))
                     LEFT JOIN plano_procedimentos origem_preco
                       ON origem_preco.clinica_id = origem.clinica_id
                      AND origem_preco.plano_id = ?
                      AND origem_preco.procedimento_id = origem.id
                     WHERE origem.clinica_id = ?`,
                    [clinicaDestinoId, planoDestinoId, clinicaDestinoId, planModelo.id, source.clinica_id],
                    (pricesErr) => callback(pricesErr || null)
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}

const db = require("../database");
const verificarAcessoAssinatura = require("../services/assinaturas");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/auth");
const { domainToUnicode } = require("url");
const crypto = require("crypto");
const { enviarEmailVerificacao, hashToken } = require("../services/email-verificacao");

// Exibe domínios internacionalizados em Unicode sem alterar o e-mail usado no login.
function emailParaExibicao(email) {
  if (typeof email !== "string") return email;
  const separador = email.lastIndexOf("@");
  if (separador < 0) return email;
  const usuario = email.slice(0, separador);
  const dominio = email.slice(separador + 1);
  return `${usuario}@${domainToUnicode(dominio) || dominio}`;
}

/* ── SECRET centralizado ──────────────────────── */
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("JWT_SECRET não configurado. Defina a variável de ambiente antes de iniciar a API.");
}

/* ═══════════════════════════════════════════════════════════
   RATE LIMITERS — Proteção contra brute force
   ═══════════════════════════════════════════════════════════ */

/* ── Login: máximo 5 tentativas por IP a cada 15 minutos ── */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { erro: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ── Registro: máximo 3 contas por IP a cada hora ───────── */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { erro: "Muitas contas criadas. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false },
});

/* ── Reenvio de verificação: máximo 3 por hora/IP ── */
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { erro: "Muitas solicitações de reenvio. Aguarde uma hora para tentar novamente." },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ── Geral (me, perfil, senha): 30 req por minuto ───────── */
const authGeneralLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { erro: "Muitas requisições. Aguarde um momento." },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false },
});

/* ── Consulta de disponibilidade do e-mail ───────── */
router.get("/email-disponivel", authGeneralLimiter, (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ erro: "Informe um e-mail válido." });
  }
  db.get("SELECT id FROM usuarios WHERE LOWER(TRIM(email)) = ?", [email], (err, user) => {
    if (err) return res.status(500).json({ erro: "Não foi possível verificar o e-mail." });
    return res.json({ disponivel: !user });
  });
});

/* ── Cadastro inicial local ───────────────────── */
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { nome, email, senha } = req.body || {};
    if (!email || !senha) {
      return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
    }
    if (typeof senha !== "string" || senha.length < 8) {
      return res.status(400).json({ erro: "A senha deve ter no mínimo 8 caracteres." });
    }

    const emailNormalizado = String(email).trim().toLowerCase();
    const nomeNormalizado = String(nome || "").trim().slice(0, 120);
    if (!nomeNormalizado) {
      return res.status(400).json({ erro: "Nome é obrigatório." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
      return res.status(400).json({ erro: "Informe um e-mail válido." });
    }
    const usuarioExistente = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM usuarios WHERE LOWER(TRIM(email)) = ?", [emailNormalizado],
        (err, row) => err ? reject(err) : resolve(row));
    });
    if (usuarioExistente) {
      return res.status(409).json({ erro: "Este e-mail já está cadastrado. Utilize outro endereço ou faça login." });
    }
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      return res.status(503).json({ erro: "O envio de e-mails ainda não está configurado. Configure RESEND_API_KEY e EMAIL_FROM no backend/.env." });
    }

    const hash = await bcrypt.hash(senha, 12);
    const tokenVerificacao = crypto.randomBytes(32).toString("hex");
    const tokenVerificacaoHash = hashToken(tokenVerificacao);
    const tokenVerificacaoExpira = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const slugBase = nomeNormalizado
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      .slice(0, 45) || "clinica";
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    // O primeiro cadastro cria a clínica e seu administrador numa transação.
    // O cadastro público continua bloqueado depois da criação da primeira conta.
    db.serialize(() => {
      db.run("BEGIN IMMEDIATE TRANSACTION", (beginErr) => {
        if (beginErr) return res.status(500).json({ erro: "Não foi possível iniciar o cadastro." });

        const rollback = (status, message) => {
          db.run("ROLLBACK", () => res.status(status).json({ erro: message }));
        };

        db.get("SELECT COUNT(*) AS total FROM usuarios", [], (countErr, count) => {
          if (countErr) return rollback(500, "Erro ao verificar o cadastro inicial.");
          // Por padrão, somente o primeiro cadastro é permitido.
          // Para testar múltiplas clínicas localmente, habilite ALLOW_PUBLIC_SIGNUP=true no .env.
          const cadastroMultiploHabilitado = process.env.ALLOW_PUBLIC_SIGNUP === "true";
          if (count.total > 0 && !cadastroMultiploHabilitado) {
            return rollback(403, "O cadastro inicial já foi realizado. Para cadastrar outra clínica em ambiente local, configure ALLOW_PUBLIC_SIGNUP=true no arquivo backend/.env e reinicie a API.");
          }

          db.get("SELECT id FROM roles WHERE protegido = 1 AND ativo = 1 ORDER BY id LIMIT 1", [], (roleErr, role) => {
            if (roleErr || !role) return rollback(503, "Perfil Administrador indisponível. Reinicie a API e tente novamente.");

            db.run(
              "INSERT INTO clinicas (nome, slug, plano, status, trial_ate) VALUES (?, ?, 'trial', 'ativa', datetime('now', '+7 days'))",
              [`${nomeNormalizado} - Clínica`, slug],
              function (clinicErr) {
                if (clinicErr) {
                  if (clinicErr.message.includes("UNIQUE")) return rollback(409, "Não foi possível registrar esta clínica. Tente novamente.");
                  return rollback(500, "Erro ao criar a clínica.");
                }
                const clinicaId = this.lastID;

                db.run(
                  "INSERT INTO usuarios (nome, email, senha, role_id, clinica_id, email_verificado, email_verificacao_token_hash, email_verificacao_expira_em) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
                  [nomeNormalizado, emailNormalizado, hash, role.id, clinicaId, tokenVerificacaoHash, tokenVerificacaoExpira],
                  function (userErr) {
                    if (userErr) {
                      if (userErr.message.includes("UNIQUE")) return rollback(409, "E-mail já cadastrado.");
                      return rollback(500, "Erro ao criar o usuário administrador.");
                    }
                    const usuarioId = this.lastID;

                    db.run(
                      "INSERT INTO assinaturas (clinica_id, plano, status, periodo_inicio, periodo_fim) VALUES (?, 'trial', 'trial', datetime('now'), datetime('now', '+7 days'))",
                      [clinicaId],
                      (subscriptionErr) => {
                        if (subscriptionErr) return rollback(500, "Erro ao preparar o período de teste.");

                        copiarPlanoParticularPadrao(clinicaId, (catalogoErr) => {
                          if (catalogoErr) return rollback(500, "Erro ao preparar o plano Particular e os procedimentos padrão.");

                          db.run("COMMIT", async (commitErr) => {
                          if (commitErr) return rollback(500, "Não foi possível concluir o cadastro.");
                          let emailEnviado = true;
                          try {
                            await enviarEmailVerificacao({ email: emailNormalizado, nome: nomeNormalizado, token: tokenVerificacao });
                          } catch (emailErr) {
                            emailEnviado = false;
                            console.error("Falha ao enviar verificação de e-mail:", emailErr.message);
                          }
                          return res.status(201).json({
                            mensagem: emailEnviado
                              ? "Conta criada! Enviamos um link para confirmar seu e-mail antes do primeiro acesso."
                              : "Conta criada, mas não foi possível enviar o e-mail. Utilize a opção de reenviar a verificação.",
                            emailEnviado,
                            email: emailParaExibicao(emailNormalizado),
                          });
                        });
                      }
                    );
                  }
                );
              }
            );
          });
        });
      });
    });
    });
  } catch (error) {
    return res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

/* ── Confirmar endereço de e-mail ───────────────── */
router.post("/verificar-email", authGeneralLimiter, (req, res) => {
  const token = String((req.body && req.body.token) || "");
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({ erro: "Link de verificação inválido ou incompleto." });
  }
  const tokenHash = hashToken(token);
  db.get(
    "SELECT id FROM usuarios WHERE email_verificacao_token_hash = ? AND datetime(email_verificacao_expira_em) > datetime('now') AND email_verificado = 0",
    [tokenHash],
    (err, user) => {
      if (err) return res.status(500).json({ erro: "Não foi possível confirmar o e-mail." });
      if (!user) return res.status(400).json({ erro: "Este link é inválido, expirou ou já foi utilizado. Solicite um novo e-mail de verificação." });
      db.run(
        "UPDATE usuarios SET email_verificado = 1, email_verificacao_token_hash = NULL, email_verificacao_expira_em = NULL WHERE id = ? AND email_verificado = 0",
        [user.id],
        function (updateErr) {
          if (updateErr) return res.status(500).json({ erro: "Não foi possível confirmar o e-mail." });
          if (!this.changes) return res.status(400).json({ erro: "Este link já foi utilizado. Faça login." });
          return res.json({ mensagem: "E-mail verificado com sucesso! Você já pode entrar na Sorrisa." });
        }
      );
    }
  );
});

/* ── Reenviar e-mail de verificação ─────────────── */
router.post("/reenviar-verificacao", resendVerificationLimiter, async (req, res) => {
  const email = String((req.body && req.body.email) || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ erro: "Informe um e-mail válido." });
  }
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return res.status(503).json({ erro: "O envio de e-mails não está configurado no servidor." });
  }
  try {
    const user = await new Promise((resolve, reject) => {
      db.get("SELECT id, nome, email, email_verificado FROM usuarios WHERE LOWER(TRIM(email)) = ?", [email],
        (err, row) => err ? reject(err) : resolve(row));
    });
    // Resposta genérica evita revelar se um endereço possui conta cadastrada.
    if (!user || Number(user.email_verificado) === 1) {
      return res.json({ mensagem: "Se existir uma conta pendente para este endereço, enviaremos um novo link." });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expira = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE usuarios SET email_verificacao_token_hash = ?, email_verificacao_expira_em = ? WHERE id = ? AND email_verificado = 0",
        [hashToken(token), expira, user.id],
        (err) => err ? reject(err) : resolve()
      );
    });
    await enviarEmailVerificacao({ email: user.email, nome: user.nome, token });
    return res.json({ mensagem: "Enviamos um novo link de verificação para seu e-mail." });
  } catch (error) {
    console.error("Falha ao reenviar verificação de e-mail:", error.message);
    return res.status(500).json({ erro: "Não foi possível reenviar o e-mail agora. Tente novamente mais tarde." });
  }
});

/* ── Login ────────────────────────────────────── */
router.post("/login", loginLimiter, (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
    }

    db.get(
      `SELECT u.*, r.ativo AS role_ativo, r.clinica_id AS role_clinica_id,\n              r.protegido AS role_protegido, c.status AS clinica_status\n       FROM usuarios u\n       LEFT JOIN roles r ON r.id = u.role_id\n       LEFT JOIN clinicas c ON c.id = u.clinica_id\n       WHERE u.email = ?`,
      [email.toLowerCase().trim()],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ erro: "Erro interno ao buscar usuário." });
        }

        if (!user) {
          return res.status(401).json({ erro: "E-mail ou senha inválidos." });
        }

        const valido = await bcrypt.compare(senha, user.senha);

        if (!valido) {
          return res.status(401).json({ erro: "E-mail ou senha inválidos." });
        }

        if (Number(user.email_verificado) !== 1) {
          return res.status(403).json({ erro: "Confirme seu endereço de e-mail antes de entrar. Verifique sua caixa de entrada ou solicite um novo link." });
        }

        if (!user.role_id || Number(user.role_ativo) !== 1) {
          return res.status(403).json({ erro: "Seu perfil está indisponível. Contate o administrador." });
        }

        if (!user.clinica_id || user.clinica_status !== "ativa") {
          return res.status(403).json({ erro: "A clínica não está ativa ou não está vinculada ao usuário." });
        }

        // Perfis personalizados devem pertencer à mesma clínica do usuário.
        // O perfil protegido de Administrador pode ser global (clinica_id NULL).
        if (Number(user.role_protegido) !== 1 && Number(user.role_clinica_id) !== Number(user.clinica_id)) {
          return res.status(403).json({ erro: "O perfil de acesso não pertence a esta clínica." });
        }

        verificarAcessoAssinatura(user.clinica_id, (assinaturaErr, acesso) => {
          if (assinaturaErr) {
            console.error("Falha ao validar assinatura no login:", assinaturaErr.message);
            return res.status(500).json({ erro: "Não foi possível validar a assinatura da clínica." });
          }
          if (!acesso.permitido) {
            return res.status(403).json({ erro: acesso.mensagem });
          }

          const token = jwt.sign(
            { id: user.id, nome: user.nome, email: user.email },
            SECRET,
            { expiresIn: "24h" }
          );

          return res.json({
            token,
            usuario: {
              id: user.id,
              nome: user.nome || "Administrador",
              email: emailParaExibicao(user.email),
            },
          });
        });
      }
    );
  } catch (error) {
    res.status(500).json({ erro: "Erro interno no servidor." });
  }
});

/* ── Permissões do usuário autenticado ────────── */
router.get("/permissoes", authGeneralLimiter, auth.semAssinatura, (req, res) => {
  db.get(
    `SELECT r.protegido
     FROM usuarios u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? AND u.clinica_id = ? AND r.ativo = 1`,
    [req.user.id, req.user.clinica_id],
    (roleErr, role) => {
      if (roleErr) return res.status(500).json({ erro: "Não foi possível consultar o perfil." });
      if (!role) return res.status(403).json({ erro: "Perfil inexistente ou desativado." });

      if (Number(role.protegido) === 1) {
        return db.all(
          "SELECT DISTINCT modulo, acao FROM permissoes ORDER BY modulo, acao",
          [],
          (permErr, permissoes) => {
            if (permErr) return res.status(500).json({ erro: "Não foi possível consultar permissões." });
            res.json({ administrador: true, permissoes });
          }
        );
      }

      db.all(
        `SELECT DISTINCT p.modulo, p.acao
         FROM usuarios u
         INNER JOIN role_permissoes rp ON rp.role_id = u.role_id
         INNER JOIN permissoes p ON p.id = rp.permissao_id
         WHERE u.id = ? AND u.clinica_id = ?
         ORDER BY p.modulo, p.acao`,
        [req.user.id, req.user.clinica_id],
        (permErr, permissoes) => {
          if (permErr) return res.status(500).json({ erro: "Não foi possível consultar permissões." });
          res.json({ administrador: false, permissoes });
        }
      );
    }
  );
});

/* ── Verificar token (me) ─────────────────────── */
router.get("/me", authGeneralLimiter, auth.semAssinatura, (req, res) => {
  db.get(
    "SELECT id, nome, email FROM usuarios WHERE id = ? AND clinica_id = ?",
    [req.user.id, req.user.clinica_id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ erro: "Erro ao consultar usuário." });
      }
      if (!user) {
        return res.status(401).json({ erro: "Usuário não encontrado nesta clínica." });
      }
      res.json({ usuario: { ...user, email: emailParaExibicao(user.email) } });
    }
  );
});

router.get("/usuarios", authGeneralLimiter, auth, (req, res) => {
  db.all("SELECT u.id, u.nome FROM usuarios u LEFT JOIN roles r ON r.id = u.role_id WHERE u.clinica_id = ? AND (r.ativo = 1 OR r.id IS NULL) ORDER BY u.nome COLLATE NOCASE ASC", [req.user.clinica_id], (err, usuarios) => {
    if (err) return res.status(500).json({ erro: "Erro ao buscar profissionais da clínica." });
    res.json(usuarios || []);
  });
});

/* ── Atualizar perfil ─────────────────────────── */
router.put("/perfil", authGeneralLimiter, auth, (req, res) => {
  const { nome } = req.body;

  if (typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({ erro: "Nome é obrigatório." });
  }

  db.run(
    "UPDATE usuarios SET nome = ? WHERE id = ? AND clinica_id = ?",
    [nome.trim(), req.user.id, req.user.clinica_id],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: "Erro ao atualizar perfil." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ erro: "Usuário não encontrado nesta clínica." });
      }
      res.json({ mensagem: "Perfil atualizado com sucesso." });
    }
  );
});

/* ── Alterar senha ────────────────────────────── */
router.put("/alterar-senha", authGeneralLimiter, auth, (req, res) => {
  const { senha_atual, nova_senha } = req.body;

  if (!senha_atual || !nova_senha) {
    return res.status(400).json({ erro: "Senha atual e nova senha são obrigatórias." });
  }

  if (typeof nova_senha !== "string" || nova_senha.length < 6) {
    return res.status(400).json({ erro: "A nova senha deve ter no mínimo 6 caracteres." });
  }

  db.get(
    "SELECT id, senha FROM usuarios WHERE id = ? AND clinica_id = ?",
    [req.user.id, req.user.clinica_id],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ erro: "Erro ao consultar usuário." });
      }
      if (!user) {
        return res.status(404).json({ erro: "Usuário não encontrado nesta clínica." });
      }

      try {
        const senhaValida = await bcrypt.compare(senha_atual, user.senha);
        if (!senhaValida) {
          return res.status(401).json({ erro: "Senha atual incorreta." });
        }

        const novoHash = await bcrypt.hash(nova_senha, 10);
        db.run(
          "UPDATE usuarios SET senha = ? WHERE id = ? AND clinica_id = ?",
          [novoHash, req.user.id, req.user.clinica_id],
          function (updateErr) {
            if (updateErr) {
              return res.status(500).json({ erro: "Erro ao alterar senha." });
            }
            if (this.changes === 0) {
              return res.status(404).json({ erro: "Usuário não encontrado nesta clínica." });
            }
            res.json({ mensagem: "Senha alterada com sucesso." });
          }
        );
      } catch (hashErr) {
        return res.status(500).json({ erro: "Erro ao processar alteração de senha." });
      }
    }
  );
});

module.exports = router;
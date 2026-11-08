const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const db = require("../database");

const router = express.Router();

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
             VALUES (?, ?, 'ativa')
             ON CONFLICT(clinica_id) DO UPDATE SET
               plano = excluded.plano,
               status = CASE WHEN assinaturas.status = 'trial' THEN 'ativa' ELSE assinaturas.status END,
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

module.exports = router;

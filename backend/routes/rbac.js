const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");

// Todas as operações RBAC exigem administrador e usam a clínica da sessão.
// O catálogo de permissões é global (módulos/ações do sistema); perfis e usuários não.
router.use(auth, (req, res, next) => {
  db.get(
    `SELECT r.protegido
     FROM usuarios u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? AND u.clinica_id = ? AND r.ativo = 1`,
    [req.user.id, req.user.clinica_id],
    (err, row) => {
      if (err) return res.status(500).json({ erro: "Erro ao verificar permissões do usuário." });
      if (!row || Number(row.protegido) !== 1) {
        return res.status(403).json({ erro: "Acesso restrito ao administrador da clínica." });
      }
      next();
    }
  );
});

const clinicaId = (req) => Number(req.user.clinica_id);

// Perfis da clínica atual + perfil protegido do sistema (somente leitura).
router.get("/roles", (req, res) => {
  db.all(
    `SELECT r.*,
       (SELECT COUNT(*) FROM usuarios u
        WHERE u.role_id = r.id AND u.clinica_id = ?) AS total_usuarios
     FROM roles r
     WHERE r.clinica_id = ? OR r.protegido = 1
     ORDER BY r.protegido DESC, r.nome ASC`,
    [clinicaId(req), clinicaId(req)],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: "Erro ao buscar perfis." });
      res.json(rows);
    }
  );
});

router.post("/roles", (req, res) => {
  const { nome, descricao, cor } = req.body || {};
  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ erro: "Nome do perfil é obrigatório." });
  }

  db.run(
    "INSERT INTO roles (nome, descricao, cor, protegido, ativo, clinica_id) VALUES (?, ?, ?, 0, 1, ?)",
    [String(nome).trim(), descricao || "", cor || "#64748b", clinicaId(req)],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(409).json({ erro: "Já existe um perfil com esse nome." });
        }
        return res.status(500).json({ erro: "Erro ao criar perfil." });
      }
      res.status(201).json({ id: this.lastID, mensagem: "Perfil criado com sucesso." });
    }
  );
});

router.put("/roles/:id", (req, res) => {
  const { id } = req.params;
  const { nome, descricao, cor } = req.body || {};
  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ erro: "Nome do perfil é obrigatório." });
  }

  db.get(
    "SELECT id, protegido FROM roles WHERE id = ? AND clinica_id = ?",
    [id, clinicaId(req)],
    (err, role) => {
      if (err) return res.status(500).json({ erro: "Erro interno." });
      if (!role) return res.status(404).json({ erro: "Perfil não encontrado nesta clínica." });
      if (Number(role.protegido) === 1) return res.status(403).json({ erro: "Este perfil é protegido e não pode ser editado." });

      db.run(
        "UPDATE roles SET nome = ?, descricao = ?, cor = ? WHERE id = ? AND clinica_id = ? AND protegido = 0",
        [String(nome).trim(), descricao || "", cor || "#64748b", id, clinicaId(req)],
        function (updateErr) {
          if (updateErr) {
            if (updateErr.message.includes("UNIQUE")) return res.status(409).json({ erro: "Já existe um perfil com esse nome." });
            return res.status(500).json({ erro: "Erro ao atualizar perfil." });
          }
          if (!this.changes) return res.status(404).json({ erro: "Perfil não encontrado nesta clínica." });
          res.json({ mensagem: "Perfil atualizado com sucesso." });
        }
      );
    }
  );
});

router.delete("/roles/:id", (req, res) => {
  const { id } = req.params;
  db.get(
    "SELECT id, protegido FROM roles WHERE id = ? AND clinica_id = ?",
    [id, clinicaId(req)],
    (err, role) => {
      if (err) return res.status(500).json({ erro: "Erro interno." });
      if (!role) return res.status(404).json({ erro: "Perfil não encontrado nesta clínica." });
      if (Number(role.protegido) === 1) return res.status(403).json({ erro: "Este perfil é protegido e não pode ser excluído." });

      db.get(
        "SELECT COUNT(*) AS total FROM usuarios WHERE role_id = ? AND clinica_id = ?",
        [id, clinicaId(req)],
        (countErr, usage) => {
          if (countErr) return res.status(500).json({ erro: "Erro ao verificar usuários vinculados ao perfil." });
          if (usage && usage.total > 0) {
            return res.status(409).json({
              erro: "Este perfil possui usuários vinculados. Reatribua-os a outro perfil antes de excluí-lo.",
              usuarios_vinculados: usage.total,
            });
          }
          db.run("DELETE FROM roles WHERE id = ? AND clinica_id = ? AND protegido = 0", [id, clinicaId(req)], function (deleteErr) {
            if (deleteErr) return res.status(500).json({ erro: "Erro ao excluir perfil." });
            if (!this.changes) return res.status(404).json({ erro: "Perfil não encontrado nesta clínica." });
            res.json({ mensagem: "Perfil excluído com sucesso." });
          });
        }
      );
    }
  );
});

router.get("/roles/:id/permissoes", (req, res) => {
  const { id } = req.params;
  db.get(
    "SELECT id, protegido FROM roles WHERE id = ? AND (clinica_id = ? OR protegido = 1)",
    [id, clinicaId(req)],
    (err, role) => {
      if (err) return res.status(500).json({ erro: "Erro interno." });
      if (!role) return res.status(404).json({ erro: "Perfil não encontrado nesta clínica." });
      if (Number(role.protegido) === 1) {
        return db.all("SELECT * FROM permissoes ORDER BY modulo, acao", [], (permissionErr, rows) => {
          if (permissionErr) return res.status(500).json({ erro: "Erro ao buscar permissões." });
          res.json(rows);
        });
      }

      db.all(
        `SELECT p.* FROM permissoes p
         INNER JOIN role_permissoes rp ON rp.permissao_id = p.id
         WHERE rp.role_id = ?
           AND rp.clinica_id = ?
         ORDER BY p.modulo, p.acao`,
        [id, clinicaId(req)],
        (permissionErr, rows) => {
          if (permissionErr) return res.status(500).json({ erro: "Erro ao buscar permissões." });
          res.json(rows);
        }
      );
    }
  );
});

router.put("/roles/:id/permissoes", (req, res) => {
  const { id } = req.params;
  const raw = req.body?.permissao_ids;
  if (!Array.isArray(raw)) return res.status(400).json({ erro: "permissao_ids deve ser uma lista de IDs." });

  const permissionIds = [...new Set(raw.map(Number))];
  if (permissionIds.some((permissionId) => !Number.isInteger(permissionId) || permissionId <= 0)) {
    return res.status(400).json({ erro: "A lista contém IDs de permissões inválidos." });
  }

  db.get(
    "SELECT id, protegido FROM roles WHERE id = ? AND clinica_id = ?",
    [id, clinicaId(req)],
    (err, role) => {
      if (err) return res.status(500).json({ erro: "Erro interno." });
      if (!role) return res.status(404).json({ erro: "Perfil não encontrado nesta clínica." });
      if (Number(role.protegido) === 1) return res.status(403).json({ erro: "Permissões do Administrador não podem ser alteradas." });

      const save = () => {
        db.serialize(() => {
          db.run("BEGIN IMMEDIATE TRANSACTION", (beginErr) => {
            if (beginErr) return res.status(500).json({ erro: "Não foi possível iniciar a atualização das permissões." });
            db.run("DELETE FROM role_permissoes WHERE role_id = ?", [id], (deleteErr) => {
              if (deleteErr) return db.run("ROLLBACK", () => res.status(500).json({ erro: "Erro ao limpar permissões." }));
              const finish = () => db.run("COMMIT", (commitErr) => {
                if (commitErr) return db.run("ROLLBACK", () => res.status(500).json({ erro: "Erro ao salvar permissões." }));
                res.json({ mensagem: "Permissões atualizadas com sucesso." });
              });
              if (!permissionIds.length) return finish();

              const stmt = db.prepare("INSERT INTO role_permissoes (role_id, permissao_id, clinica_id) VALUES (?, ?, ?)");
              let remaining = permissionIds.length;
              let insertError = null;
              permissionIds.forEach((permissionId) => {
                stmt.run([id, permissionId, clinicaId(req)], (insertErr) => {
                  if (insertErr && !insertError) insertError = insertErr;
                  remaining -= 1;
                  if (remaining === 0) {
                    stmt.finalize((finalizeErr) => {
                      if (insertError || finalizeErr) {
                        return db.run("ROLLBACK", () => res.status(500).json({ erro: "Erro ao salvar algumas permissões." }));
                      }
                      finish();
                    });
                  }
                });
              });
            });
          });
        });
      };

      if (!permissionIds.length) return save();
      const placeholders = permissionIds.map(() => "?").join(",");
      db.get(
        `SELECT COUNT(*) AS total FROM permissoes WHERE id IN (${placeholders})`,
        permissionIds,
        (countErr, row) => {
          if (countErr) return res.status(500).json({ erro: "Erro ao validar permissões." });
          if (!row || Number(row.total) !== permissionIds.length) {
            return res.status(400).json({ erro: "Uma ou mais permissões não existem." });
          }
          save();
        }
      );
    }
  );
});

// Catálogo de permissões é metadado global do sistema, não dados de uma clínica.
router.get("/permissoes", (req, res) => {
  db.all("SELECT * FROM permissoes ORDER BY modulo, acao", [], (err, rows) => {
    if (err) return res.status(500).json({ erro: "Erro ao buscar permissões." });
    res.json(rows);
  });
});

router.get("/usuarios", (req, res) => {
  db.all(
    `SELECT u.id, u.nome, u.email, u.role_id, u.created_at,
            r.nome AS role_nome, r.cor AS role_cor
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.clinica_id = ?
     ORDER BY u.nome ASC`,
    [clinicaId(req)],
    (err, rows) => {
      if (err) return res.status(500).json({ erro: "Erro ao buscar usuários da clínica." });
      res.json(rows);
    }
  );
});

router.put("/usuarios/:id/role", (req, res) => {
  const { id } = req.params;
  const roleId = Number(req.body?.role_id);
  if (!Number.isInteger(roleId) || roleId <= 0) {
    return res.status(400).json({ erro: "role_id é obrigatório e deve ser válido." });
  }

  db.get(
    "SELECT id, protegido, ativo FROM roles WHERE id = ? AND (clinica_id = ? OR protegido = 1)",
    [roleId, clinicaId(req)],
    (roleErr, role) => {
      if (roleErr) return res.status(500).json({ erro: "Erro interno." });
      if (!role) return res.status(404).json({ erro: "Perfil não encontrado nesta clínica." });
      if (Number(role.ativo) !== 1) return res.status(400).json({ erro: "Não é possível atribuir um perfil desativado." });

      db.get(
        `SELECT u.id, r.protegido AS role_protegido
         FROM usuarios u LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.id = ? AND u.clinica_id = ?`,
        [id, clinicaId(req)],
        (userErr, target) => {
          if (userErr) return res.status(500).json({ erro: "Erro ao verificar usuário." });
          if (!target) return res.status(404).json({ erro: "Usuário não encontrado nesta clínica." });
          if (Number(id) === Number(req.user.id) && Number(role.protegido) !== 1) {
            return res.status(409).json({ erro: "Não é possível remover o perfil de administrador da própria sessão." });
          }

          const updateRole = () => db.run(
            "UPDATE usuarios SET role_id = ? WHERE id = ? AND clinica_id = ?",
            [roleId, id, clinicaId(req)],
            function (updateErr) {
              if (updateErr) return res.status(500).json({ erro: "Erro ao atualizar perfil do usuário." });
              if (!this.changes) return res.status(404).json({ erro: "Usuário não encontrado nesta clínica." });
              res.json({ mensagem: "Perfil do usuário atualizado." });
            }
          );

          if (Number(target.role_protegido) !== 1 || Number(role.protegido) === 1) return updateRole();

          db.get(
            `SELECT COUNT(*) AS total FROM usuarios u
             INNER JOIN roles r ON r.id = u.role_id
             WHERE r.protegido = 1 AND u.clinica_id = ?`,
            [clinicaId(req)],
            (countErr, row) => {
              if (countErr) return res.status(500).json({ erro: "Erro ao verificar administradores da clínica." });
              if (!row || row.total <= 1) return res.status(409).json({ erro: "A clínica precisa manter pelo menos um administrador." });
              updateRole();
            }
          );
        }
      );
    }
  );
});

router.delete("/usuarios/:id", (req, res) => {
  const { id } = req.params;
  if (Number(id) === Number(req.user.id)) {
    return res.status(403).json({ erro: "Você não pode excluir sua própria conta." });
  }

  db.get(
    `SELECT u.id, r.protegido AS role_protegido
     FROM usuarios u LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? AND u.clinica_id = ?`,
    [id, clinicaId(req)],
    (userErr, target) => {
      if (userErr) return res.status(500).json({ erro: "Erro ao verificar usuário." });
      if (!target) return res.status(404).json({ erro: "Usuário não encontrado nesta clínica." });

      const removeUser = () => db.run(
        "DELETE FROM usuarios WHERE id = ? AND clinica_id = ?",
        [id, clinicaId(req)],
        function (deleteErr) {
          if (deleteErr) return res.status(500).json({ erro: "Erro ao excluir usuário." });
          if (!this.changes) return res.status(404).json({ erro: "Usuário não encontrado nesta clínica." });
          res.json({ mensagem: "Usuário excluído com sucesso." });
        }
      );

      if (Number(target.role_protegido) !== 1) return removeUser();

      db.get(
        `SELECT COUNT(*) AS total FROM usuarios u
         INNER JOIN roles r ON r.id = u.role_id
         WHERE r.protegido = 1 AND u.clinica_id = ?`,
        [clinicaId(req)],
        (countErr, row) => {
          if (countErr) return res.status(500).json({ erro: "Erro ao verificar administradores da clínica." });
          if (!row || row.total <= 1) return res.status(409).json({ erro: "A clínica precisa manter pelo menos um administrador." });
          removeUser();
        }
      );
    }
  );
});

module.exports = router;

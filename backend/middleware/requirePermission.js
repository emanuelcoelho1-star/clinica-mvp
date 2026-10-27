const db = require("../database");

/**
 * Exige permissão para o módulo/ação. O perfil protegido de Administrador
 * mantém acesso total; os demais perfis precisam ter a permissão explicitamente atribuída.
 */
module.exports = function requirePermission(modulo, resolverAcao) {
  return (req, res, next) => {
    const method = req.method.toUpperCase();
    let acao;

    if (typeof resolverAcao === "function") {
      acao = resolverAcao(req);
    } else if (method === "GET" && req.path.startsWith("/exportar/")) {
      acao = "exportar";
    } else if (method === "GET") {
      acao = "listar";
    } else if (method === "POST") {
      acao = "criar";
    } else if (method === "PUT" || method === "PATCH") {
      acao = "editar";
    } else if (method === "DELETE") {
      acao = "excluir";
    }

    if (!acao) {
      return res.status(403).json({ erro: "Ação não autorizada." });
    }

    db.get(
      `SELECT r.protegido
       FROM usuarios u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.clinica_id = ? AND r.ativo = 1`,
      [req.user.id, req.user.clinica_id],
      (roleErr, role) => {
        if (roleErr) {
          return res.status(500).json({ erro: "Não foi possível verificar as permissões." });
        }
        if (!role) {
          return res.status(403).json({ erro: "Perfil inexistente ou desativado." });
        }
        if (Number(role.protegido) === 1) return next();

        db.get(
          `SELECT 1 AS permitido
           FROM role_permissoes rp
           INNER JOIN permissoes p ON p.id = rp.permissao_id
           WHERE rp.role_id = (
             SELECT role_id
             FROM usuarios
             WHERE id = ? AND clinica_id = ?
           )
           AND rp.clinica_id = ?
           AND p.clinica_id = ?
           AND p.modulo = ? AND p.acao = ?
           LIMIT 1`,
          [req.user.id, req.user.clinica_id, req.user.clinica_id, req.user.clinica_id, modulo, acao],
          (permErr, permission) => {
            if (permErr) {
              return res.status(500).json({ erro: "Não foi possível verificar a permissão." });
            }
            if (!permission) {
              return res.status(403).json({
                erro: "Você não tem permissão para realizar esta ação.",
                modulo,
                acao,
              });
            }
            next();
          }
        );
      }
    );
  };
};

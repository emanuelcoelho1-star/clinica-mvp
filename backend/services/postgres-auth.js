"use strict";

async function buscarUsuarioLogin(pool, email) {
  const result = await pool.query(
    `SELECT
       u.id, u.nome, u.email, u.senha, u.role_id, u.clinica_id,
       r.ativo AS role_ativo,
       r.clinica_id AS role_clinica_id,
       r.protegido AS role_protegido,
       c.status AS clinica_status
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN clinicas c ON c.id = u.clinica_id
     WHERE LOWER(BTRIM(u.email)) = LOWER(BTRIM($1))
     LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

async function buscarUsuarioSessao(pool, usuarioId) {
  const result = await pool.query(
    `SELECT
       u.id, u.nome, u.email, u.role_id, u.clinica_id,
       r.ativo AS role_ativo,
       r.clinica_id AS role_clinica_id,
       r.protegido AS role_protegido,
       c.status AS clinica_status
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.role_id
     LEFT JOIN clinicas c ON c.id = u.clinica_id
     WHERE u.id = $1
     LIMIT 1`,
    [usuarioId]
  );
  return result.rows[0] || null;
}

async function buscarUsuarioAtual(pool, usuarioId, clinicaId) {
  const result = await pool.query(
    "SELECT id, nome, email FROM usuarios WHERE id = $1 AND clinica_id = $2",
    [usuarioId, clinicaId]
  );
  return result.rows[0] || null;
}

async function buscarPermissoesUsuario(pool, usuarioId, clinicaId) {
  const perfil = await pool.query(
    `SELECT r.protegido
     FROM usuarios u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1 AND u.clinica_id = $2 AND r.ativo = 1
     LIMIT 1`,
    [usuarioId, clinicaId]
  );

  if (!perfil.rows[0]) {
    return { encontrado: false, administrador: false, permissoes: [] };
  }

  if (Number(perfil.rows[0].protegido) === 1) {
    const todas = await pool.query(
      "SELECT DISTINCT modulo, acao FROM permissoes ORDER BY modulo, acao"
    );
    return { encontrado: true, administrador: true, permissoes: todas.rows };
  }

  const result = await pool.query(
    `SELECT DISTINCT p.modulo, p.acao
     FROM usuarios u
     INNER JOIN role_permissoes rp
       ON rp.role_id = u.role_id AND rp.clinica_id = u.clinica_id
     INNER JOIN permissoes p
       ON p.id = rp.permissao_id
      AND (p.clinica_id IS NULL OR p.clinica_id = u.clinica_id)
     WHERE u.id = $1 AND u.clinica_id = $2
     ORDER BY p.modulo, p.acao`,
    [usuarioId, clinicaId]
  );

  return { encontrado: true, administrador: false, permissoes: result.rows };
}

async function listarUsuariosDaClinica(pool, clinicaId) {
  const result = await pool.query(
    `SELECT u.id, u.nome
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE u.clinica_id = $1 AND (r.ativo = 1 OR r.id IS NULL)
     ORDER BY LOWER(u.nome) ASC`,
    [clinicaId]
  );
  return result.rows;
}

module.exports = {
  buscarUsuarioLogin,
  buscarUsuarioSessao,
  buscarUsuarioAtual,
  buscarPermissoesUsuario,
  listarUsuariosDaClinica,
};

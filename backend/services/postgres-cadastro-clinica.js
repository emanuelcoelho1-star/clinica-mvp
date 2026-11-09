const { comTransacao } = require("../database/postgres");

const LOCK_CADASTRO_INICIAL = 20261109;

async function copiarPlanoParticular(client, clinicaDestinoId, clinicaModeloId = 1) {
  const modelo = await client.query(
    `SELECT id, descricao
     FROM planos
     WHERE clinica_id = $1 AND LOWER(BTRIM(nome)) = 'particular'
     ORDER BY id
     LIMIT 1`,
    [clinicaModeloId]
  );

  if (modelo.rowCount === 0) return null;

  const duplicados = await client.query(
    `SELECT LOWER(BTRIM(nome)) AS nome_normalizado, COUNT(*)::int AS total
     FROM procedimentos_catalogo
     WHERE clinica_id = $1
     GROUP BY LOWER(BTRIM(nome))
     HAVING COUNT(*) > 1
     LIMIT 1`,
    [clinicaModeloId]
  );

  if (duplicados.rowCount > 0) {
    throw new Error(
      "O catálogo da clínica-modelo contém procedimentos com nomes duplicados; a cópia foi cancelada para evitar vínculos incorretos."
    );
  }

  const plano = await client.query(
    `INSERT INTO planos (clinica_id, nome, tipo, descricao, ativo)
     VALUES ($1, 'Particular', $2, $3, 1)
     RETURNING id`,
    [clinicaDestinoId, JSON.stringify(["padrao"]), modelo.rows[0].descricao || ""]
  );
  const planoDestinoId = plano.rows[0].id;

  await client.query(
    `INSERT INTO procedimentos_catalogo
       (clinica_id, nome, codigo, categoria, descricao, ativo,
        aceita_faces, custo_tratamento, usar_na_frente)
     SELECT $1, nome, codigo, categoria, descricao, ativo,
            COALESCE(aceita_faces, 0), COALESCE(custo_tratamento, 0),
            COALESCE(usar_na_frente, 1)
     FROM procedimentos_catalogo
     WHERE clinica_id = $2
     ORDER BY id`,
    [clinicaDestinoId, clinicaModeloId]
  );

  await client.query(
    `INSERT INTO plano_procedimentos (clinica_id, plano_id, procedimento_id, valor)
     SELECT $1, $2, destino.id, COALESCE(preco.valor, 0)
     FROM procedimentos_catalogo origem
     INNER JOIN procedimentos_catalogo destino
       ON destino.clinica_id = $1
      AND LOWER(BTRIM(destino.nome)) = LOWER(BTRIM(origem.nome))
     LEFT JOIN plano_procedimentos preco
       ON preco.clinica_id = origem.clinica_id
      AND preco.plano_id = $3
      AND preco.procedimento_id = origem.id
     WHERE origem.clinica_id = $4`,
    [clinicaDestinoId, planoDestinoId, modelo.rows[0].id, clinicaModeloId]
  );

  return planoDestinoId;
}

/**
 * Cria clínica, administrador, trial e catálogo padrão numa única transação.
 * A função recebe um pool compatível com node-postgres; não depende do driver
 * SQLite e só retorna IDs depois do COMMIT.
 */
async function criarClinicaComAdministrador(pool, dados, options = {}) {
  const {
    nomeClinica,
    slug,
    nomeUsuario,
    email,
    senhaHash,
  } = dados || {};

  if (!nomeClinica || !slug || !nomeUsuario || !email || !senhaHash) {
    throw new Error("Dados obrigatórios ausentes para criar a clínica.");
  }

  const permitirCadastroMultiplo = options.permitirCadastroMultiplo === true;

  return comTransacao(pool, async (client) => {
    // Serializa a decisão do cadastro inicial entre todas as instâncias da API.
    await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [LOCK_CADASTRO_INICIAL]);

    const total = await client.query("SELECT COUNT(*)::int AS total FROM usuarios");
    if (total.rows[0].total > 0 && !permitirCadastroMultiplo) {
      const erro = new Error("O cadastro inicial já foi realizado.");
      erro.code = "PUBLIC_SIGNUP_CLOSED";
      throw erro;
    }

    const role = await client.query(
      "SELECT id FROM roles WHERE protegido = 1 AND ativo = 1 ORDER BY id LIMIT 1"
    );
    if (role.rowCount === 0) {
      const erro = new Error("Perfil Administrador indisponível.");
      erro.code = "ADMIN_ROLE_UNAVAILABLE";
      throw erro;
    }

    const clinica = await client.query(
      `INSERT INTO clinicas (nome, slug, plano, status, trial_ate)
       VALUES ($1, $2, 'trial', 'ativa', (CURRENT_TIMESTAMP + INTERVAL '7 days')::text)
       RETURNING id`,
      [nomeClinica, slug]
    );
    const clinicaId = clinica.rows[0].id;

    const usuario = await client.query(
      `INSERT INTO usuarios (nome, email, senha, role_id, clinica_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [nomeUsuario, email, senhaHash, role.rows[0].id, clinicaId]
    );
    const usuarioId = usuario.rows[0].id;

    await client.query(
      `INSERT INTO assinaturas
         (clinica_id, plano, status, periodo_inicio, periodo_fim)
       VALUES ($1, 'trial', 'trial', CURRENT_TIMESTAMP::text,
               (CURRENT_TIMESTAMP + INTERVAL '7 days')::text)`,
      [clinicaId]
    );

    const planoId = await copiarPlanoParticular(client, clinicaId);

    return { clinicaId, usuarioId, planoId };
  });
}

module.exports = { criarClinicaComAdministrador, copiarPlanoParticular };

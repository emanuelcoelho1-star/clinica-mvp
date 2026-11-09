"use strict";

const MENSAGEM_ASSINATURA_EXPIRADA =
  "O período de teste ou de assinatura terminou. Os dados da clínica continuam armazenados. Regularize a assinatura para recuperar o acesso.";

async function verificarAcessoAssinaturaPostgres(pool, clinicaId) {
  if (!pool || typeof pool.query !== "function") {
    throw new TypeError("Pool PostgreSQL inválido.");
  }
  if (clinicaId === undefined || clinicaId === null || clinicaId === "") {
    throw new TypeError("ID da clínica é obrigatório para validar a assinatura.");
  }

  const consulta = await pool.query(
    `SELECT
       c.status AS clinica_status,
       c.plano AS plano_clinica,
       c.trial_ate,
       s.status AS assinatura_status,
       s.periodo_fim
     FROM clinicas c
     LEFT JOIN assinaturas s ON s.clinica_id = c.id
     WHERE c.id = $1
     LIMIT 1`,
    [clinicaId]
  );

  const row = consulta.rows[0];
  if (!row) {
    return {
      permitido: false,
      mensagem: "Clínica não encontrada. Entre em contato com o suporte.",
    };
  }

  if (row.clinica_status !== "ativa") {
    return {
      permitido: false,
      mensagem: "A clínica está suspensa. Entre em contato com o suporte.",
    };
  }

  const statusAssinatura = String(
    row.assinatura_status || (row.plano_clinica === "trial" ? "trial" : "")
  ).toLowerCase();

  const usandoPeriodoTeste =
    statusAssinatura === "pendente" && Boolean(row.trial_ate);
  const fimPeriodo = usandoPeriodoTeste
    ? row.trial_ate
    : (row.periodo_fim || row.trial_ate);
  const statusComAcesso =
    ["trial", "ativa"].includes(statusAssinatura) || usandoPeriodoTeste;

  if (!statusComAcesso || !fimPeriodo) {
    return { permitido: false, mensagem: MENSAGEM_ASSINATURA_EXPIRADA };
  }

  // Datas sem offset são horários locais de São Paulo; valores com offset/Z
  // representam instantes absolutos e devem ser comparados como timestamptz.
  const data = await pool.query(
    `SELECT CASE
       WHEN $1 ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         AND (($1::date + INTERVAL '1 day')::timestamp
              AT TIME ZONE 'America/Sao_Paulo') <= CURRENT_TIMESTAMP
         THEN 1
       WHEN $1 ~* '(Z|[+-][0-9]{2}(:[0-9]{2})?)$'
         AND $1::timestamptz <= CURRENT_TIMESTAMP
         THEN 1
       WHEN $1 !~* '(Z|[+-][0-9]{2}(:[0-9]{2})?)$'
         AND ($1::timestamp AT TIME ZONE 'America/Sao_Paulo') <= CURRENT_TIMESTAMP
         THEN 1
       ELSE 0
     END AS expirou`,
    [fimPeriodo]
  );

  if (Number(data.rows[0]?.expirou) !== 1) {
    return { permitido: true };
  }

  await pool.query(
    `UPDATE assinaturas
     SET status = 'expirada', updated_at = CURRENT_TIMESTAMP::text
     WHERE clinica_id = $1 AND status IN ('trial', 'ativa')`,
    [clinicaId]
  );

  return { permitido: false, mensagem: MENSAGEM_ASSINATURA_EXPIRADA };
}

module.exports = {
  verificarAcessoAssinaturaPostgres,
  MENSAGEM_ASSINATURA_EXPIRADA,
};

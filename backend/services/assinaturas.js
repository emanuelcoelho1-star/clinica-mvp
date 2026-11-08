const db = require("../database");

const MENSAGEM_ASSINATURA_EXPIRADA =
  "O período de teste ou de assinatura terminou. Os dados da clínica continuam armazenados. Regularize a assinatura para recuperar o acesso.";

function verificarAcessoAssinatura(clinicaId, callback) {
  db.get(
    `SELECT
       c.status AS clinica_status,
       c.plano AS plano_clinica,
       c.trial_ate,
       s.status AS assinatura_status,
       s.periodo_fim
     FROM clinicas c
     LEFT JOIN assinaturas s ON s.clinica_id = c.id
     WHERE c.id = ?
     LIMIT 1`,
    [clinicaId],
    (err, row) => {
      if (err) return callback(err);
      if (!row) {
        return callback(null, {
          permitido: false,
          mensagem: "Clínica não encontrada. Entre em contato com o suporte.",
        });
      }
      if (row.clinica_status !== "ativa") {
        return callback(null, {
          permitido: false,
          mensagem: "A clínica está suspensa. Entre em contato com o suporte.",
        });
      }

      const statusAssinatura = String(
        row.assinatura_status || (row.plano_clinica === "trial" ? "trial" : "")
      ).toLowerCase();
      const fimPeriodo = row.periodo_fim || row.trial_ate;
      const statusComAcesso = ["trial", "ativa"].includes(statusAssinatura);

      if (!statusComAcesso || !fimPeriodo) {
        return callback(null, { permitido: statusComAcesso, mensagem: MENSAGEM_ASSINATURA_EXPIRADA });
      }

      db.get(
        `SELECT CASE
           WHEN length(?) = 10 AND datetime(?, '+1 day') <= datetime('now', 'localtime') THEN 1
           WHEN length(?) <> 10 AND datetime(?) <= datetime('now', 'localtime') THEN 1
           ELSE 0
         END AS expirou`,
        [fimPeriodo, fimPeriodo, fimPeriodo, fimPeriodo],
        (dateErr, dateRow) => {
          if (dateErr) return callback(dateErr);
          if (!dateRow || Number(dateRow.expirou) !== 1) {
            return callback(null, { permitido: true });
          }

          db.serialize(() => {
            db.run(
              `UPDATE assinaturas
               SET status = 'expirada', updated_at = datetime('now', 'localtime')
               WHERE clinica_id = ? AND status IN ('trial', 'ativa')`,
              [clinicaId],
              (subscriptionErr) => {
                if (subscriptionErr) return callback(subscriptionErr);
                return callback(null, {
                  permitido: false,
                  mensagem: MENSAGEM_ASSINATURA_EXPIRADA,
                });
              }
            );
          });
        }
      );
    }
  );
}

module.exports = verificarAcessoAssinatura;

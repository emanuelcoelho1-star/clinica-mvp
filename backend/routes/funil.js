const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

// O funil é uma visão dos orçamentos, então usa a mesma permissão do módulo.
// GET = listar, PATCH = editar. Mudança de status continua em PATCH /orcamentos/:id/status,
// que é quem gera as contas a receber na aprovação.
router.use(auth, requirePermission("orcamentos"));

const ERRO_GENERICO = "Não foi possível processar a solicitação. Tente novamente.";
const MOTIVO_MAX = 200;

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve({ changes: this.changes });
  }));
}

/* ══════════════════════════════════════════════════════════════
   GET /funil
   Orçamentos em aberto e os fechados nos últimos 90 dias,
   com total líquido e há quantos dias estão sem contato.
   ══════════════════════════════════════════════════════════════ */
router.get("/", async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT o.id, o.paciente_id, o.data, o.status, o.desconto, o.created_at,
              o.ultimo_contato_em, o.motivo_recusa,
              p.nome AS paciente_nome, p.telefone AS paciente_telefone,
              COALESCE(t.bruto, 0) AS total_bruto,
              MAX(0, COALESCE(t.bruto, 0) - COALESCE(o.desconto, 0)) AS total,
              t.procedimentos,
              CAST(julianday('now','localtime') - julianday(COALESCE(o.ultimo_contato_em, o.created_at, o.data)) AS INTEGER) AS dias_sem_contato
       FROM orcamentos o
       JOIN pacientes p ON p.id = o.paciente_id AND p.clinica_id = o.clinica_id
       LEFT JOIN (
         SELECT orcamento_id,
                SUM(COALESCE(valor, 0) * COALESCE(quantidade, 1)) AS bruto,
                GROUP_CONCAT(procedimento, ', ') AS procedimentos
         FROM orcamento_itens GROUP BY orcamento_id
       ) t ON t.orcamento_id = o.id
       WHERE o.clinica_id = ?
         AND (o.status IN ('pendente', 'aprovado', 'em_andamento')
              OR o.data >= date('now','localtime','-90 days'))
       ORDER BY o.data DESC, o.id DESC`,
      [req.user.clinica_id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

/* ══════════════════════════════════════════════════════════════
   PATCH /funil/:id/contato — registra um follow-up feito agora
   ══════════════════════════════════════════════════════════════ */
router.patch("/:id/contato", async (req, res) => {
  try {
    const r = await dbRun(
      "UPDATE orcamentos SET ultimo_contato_em = datetime('now','localtime') WHERE id = ? AND clinica_id = ?",
      [req.params.id, req.user.clinica_id]
    );
    if (r.changes === 0) return res.status(404).json({ erro: "Orçamento não encontrado." });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

/* ══════════════════════════════════════════════════════════════
   PATCH /funil/:id/recusa — marca como recusado guardando o motivo
   Só vale para orçamento ainda pendente: aprovado já gerou financeiro.
   ══════════════════════════════════════════════════════════════ */
router.patch("/:id/recusa", async (req, res) => {
  const motivo = String(req.body?.motivo || "").trim().slice(0, MOTIVO_MAX);
  if (!motivo) return res.status(400).json({ erro: "Informe o motivo da recusa." });
  try {
    const r = await dbRun(
      "UPDATE orcamentos SET status = 'recusado', motivo_recusa = ? WHERE id = ? AND clinica_id = ? AND status = 'pendente'",
      [motivo, req.params.id, req.user.clinica_id]
    );
    if (r.changes === 0) return res.status(409).json({ erro: "Só orçamentos pendentes podem ser marcados como recusados aqui." });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

module.exports = router;

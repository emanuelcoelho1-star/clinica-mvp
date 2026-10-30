const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

router.use(auth, requirePermission("relatorios"));

const ERRO_GENERICO = "Não foi possível processar a solicitação. Tente novamente.";
// Aprovado, em andamento e concluído contam como orçamento fechado
const FECHADOS = "('aprovado', 'em_andamento', 'concluido')";
const MAX_DIAS = 366;

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));
}
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || {}))));
}

function dataValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || "")) && !Number.isNaN(Date.parse(valor));
}

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function percentual(parte, todo) {
  return todo > 0 ? Math.round((parte / todo) * 1000) / 10 : null;
}

// Total líquido de cada orçamento (itens menos desconto, nunca negativo)
const ORCAMENTOS_COM_TOTAL = `
  SELECT o.*, MAX(0, COALESCE(t.bruto, 0) - COALESCE(o.desconto, 0)) AS total
  FROM orcamentos o
  LEFT JOIN (
    SELECT orcamento_id, SUM(COALESCE(valor, 0) * COALESCE(quantidade, 1)) AS bruto
    FROM orcamento_itens GROUP BY orcamento_id
  ) t ON t.orcamento_id = o.id
  WHERE o.clinica_id = ? AND o.data BETWEEN ? AND ?
`;

/* ══════════════════════════════════════════════════════════════
   GET /relatorios?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
   Padrão: mês corrente. Orçamentos entram pela data do orçamento;
   faltas consideram só consultas até hoje com desfecho registrado.
   ══════════════════════════════════════════════════════════════ */
router.get("/", async (req, res) => {
  const hoje = new Date();
  const inicio = dataValida(req.query.inicio) ? req.query.inicio : iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const fim = dataValida(req.query.fim) ? req.query.fim : iso(hoje);
  if (inicio > fim) return res.status(400).json({ erro: "A data inicial precisa ser anterior à final." });
  if ((Date.parse(fim) - Date.parse(inicio)) / 86400000 > MAX_DIAS) {
    return res.status(400).json({ erro: "Escolha um período de até 12 meses." });
  }

  const cid = req.user.clinica_id;
  const periodo = [cid, inicio, fim];

  try {
    const [consultas, porProfissional, orcamentos, porOrigem, motivos, procedimentos, receita] = await Promise.all([
      dbGet(
        `SELECT COUNT(*) AS total,
                SUM(status = 'concluido') AS concluidas,
                SUM(status = 'faltou') AS faltas,
                SUM(status = 'cancelado') AS canceladas
         FROM consultas WHERE clinica_id = ? AND data BETWEEN ? AND ?`,
        periodo
      ),
      dbAll(
        `SELECT COALESCE(pr.nome, 'Sem profissional') AS nome,
                COUNT(*) AS total,
                SUM(c.status = 'concluido') AS concluidas,
                SUM(c.status = 'faltou') AS faltas
         FROM consultas c
         LEFT JOIN profissionais pr ON pr.id = c.profissional_id AND pr.clinica_id = c.clinica_id
         WHERE c.clinica_id = ? AND c.data BETWEEN ? AND ?
         GROUP BY COALESCE(pr.nome, 'Sem profissional')
         ORDER BY total DESC`,
        periodo
      ),
      dbGet(
        `SELECT COUNT(*) AS criados,
                SUM(status IN ${FECHADOS}) AS aprovados,
                SUM(status = 'recusado') AS recusados,
                SUM(status = 'pendente') AS pendentes,
                COALESCE(SUM(total), 0) AS valor_orcado,
                COALESCE(SUM(CASE WHEN status IN ${FECHADOS} THEN total END), 0) AS valor_aprovado
         FROM (${ORCAMENTOS_COM_TOTAL})`,
        periodo
      ),
      dbAll(
        `SELECT COALESCE(NULLIF(TRIM(p.como_conheceu), ''), 'Não informado') AS origem,
                COUNT(*) AS criados,
                SUM(o.status IN ${FECHADOS}) AS aprovados,
                COALESCE(SUM(CASE WHEN o.status IN ${FECHADOS} THEN o.total END), 0) AS valor_aprovado
         FROM (${ORCAMENTOS_COM_TOTAL}) o
         JOIN pacientes p ON p.id = o.paciente_id AND p.clinica_id = o.clinica_id
         GROUP BY origem
         ORDER BY valor_aprovado DESC, criados DESC`,
        periodo
      ),
      dbAll(
        `SELECT COALESCE(NULLIF(TRIM(motivo_recusa), ''), 'Sem motivo registrado') AS motivo, COUNT(*) AS total
         FROM orcamentos WHERE clinica_id = ? AND data BETWEEN ? AND ? AND status = 'recusado'
         GROUP BY motivo ORDER BY total DESC`,
        periodo
      ),
      dbAll(
        `SELECT oi.procedimento, COUNT(*) AS vezes,
                COALESCE(SUM(COALESCE(oi.valor, 0) * COALESCE(oi.quantidade, 1)), 0) AS valor
         FROM orcamento_itens oi
         JOIN orcamentos o ON o.id = oi.orcamento_id
         WHERE o.clinica_id = ? AND o.data BETWEEN ? AND ? AND o.status IN ${FECHADOS}
         GROUP BY oi.procedimento ORDER BY valor DESC LIMIT 8`,
        periodo
      ),
      // Mesmo critério do módulo Financeiro: contas pagas pela data de recebimento
      dbGet(
        `SELECT COALESCE(SUM(valor_recebido), 0) AS recebido
         FROM contas_receber
         WHERE clinica_id = ? AND status = 'pago' AND date(data_recebimento) BETWEEN ? AND ?`,
        periodo
      ),
    ]);

    const concluidas = consultas.concluidas || 0;
    const faltas = consultas.faltas || 0;
    const aprovados = orcamentos.aprovados || 0;

    res.json({
      periodo: { inicio, fim },
      consultas: {
        total: consultas.total || 0,
        concluidas,
        faltas,
        canceladas: consultas.canceladas || 0,
        taxa_faltas: percentual(faltas, concluidas + faltas),
      },
      orcamentos: {
        criados: orcamentos.criados || 0,
        aprovados,
        recusados: orcamentos.recusados || 0,
        pendentes: orcamentos.pendentes || 0,
        valor_orcado: orcamentos.valor_orcado || 0,
        valor_aprovado: orcamentos.valor_aprovado || 0,
        conversao: percentual(aprovados, orcamentos.criados || 0),
        ticket_medio: aprovados > 0 ? Math.round((orcamentos.valor_aprovado / aprovados) * 100) / 100 : null,
      },
      receita_recebida: receita.recebido || 0,
      por_profissional: porProfissional.map((p) => ({ ...p, taxa_faltas: percentual(p.faltas, p.concluidas + p.faltas) })),
      por_origem: porOrigem.map((o) => ({ ...o, conversao: percentual(o.aprovados, o.criados) })),
      motivos_recusa: motivos,
      procedimentos_aprovados: procedimentos,
    });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

module.exports = router;

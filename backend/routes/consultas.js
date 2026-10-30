const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

// A autorização é validada na API, não apenas na interface.
router.use(auth, requirePermission("agenda"));

const ERRO_GENERICO = "Não foi possível processar a solicitação. Tente novamente.";
const STATUS_VALIDOS = ["agendado", "confirmado", "concluido", "faltou", "cancelado"];
// Status que liberam o horário (não contam como ocupado)
const STATUS_LIVRES = ["cancelado", "faltou"];
const DURACAO_PADRAO = 30;

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));
}
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve({ lastID: this.lastID, changes: this.changes });
  }));
}

function paraMinutos(horario) {
  const [h, m] = String(horario).split(":").map(Number);
  return h * 60 + m;
}

function formatarHora(minutos) {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

// Minutos de início em SQL a partir de "HH:MM"
const INICIO_SQL = "(CAST(substr(c.horario, 1, 2) AS INTEGER) * 60 + CAST(substr(c.horario, 4, 2) AS INTEGER))";

const SELECT_CONSULTAS = `
  SELECT c.*,
         p.nome AS paciente_nome,
         p.telefone AS paciente_telefone,
         pr.nome AS profissional_nome
  FROM consultas c
  LEFT JOIN pacientes p ON c.paciente_id = p.id AND p.clinica_id = c.clinica_id
  LEFT JOIN profissionais pr ON c.profissional_id = pr.id AND pr.clinica_id = c.clinica_id
`;

function validarCorpo(body) {
  const { paciente_id, data, horario, status, duracao } = body || {};
  if (!paciente_id || !data || !horario) return "Paciente, data e horário são obrigatórios.";
  if (!/^\d{2}:\d{2}$/.test(horario)) return "Horário inválido.";
  if (status && !STATUS_VALIDOS.includes(status)) return "Status inválido.";
  if (duracao !== undefined && duracao !== null && duracao !== "") {
    const d = Number(duracao);
    if (!Number.isInteger(d) || d < 5 || d > 480) return "Duração inválida.";
  }
  return null;
}

/* Conflito de horário (respeitando a duração):
   - com profissional: só conflita com atendimentos do mesmo profissional
   - sem profissional: mantém a regra da clínica, qualquer atendimento sobreposto conflita */
async function buscarConflito({ clinicaId, id, profissionalId, data, horario, duracao }) {
  const inicio = paraMinutos(horario);
  const fim = inicio + duracao;
  const filtroProf = profissionalId ? "AND c.profissional_id = ?" : "";
  const params = [clinicaId, data, id || 0];
  if (profissionalId) params.push(profissionalId);
  params.push(fim, inicio);

  return dbGet(
    `SELECT c.id, c.horario, COALESCE(c.duracao, ${DURACAO_PADRAO}) AS duracao, p.nome AS paciente_nome
     FROM consultas c
     LEFT JOIN pacientes p ON p.id = c.paciente_id AND p.clinica_id = c.clinica_id
     WHERE c.clinica_id = ? AND c.data = ?
       AND c.status NOT IN ('cancelado', 'faltou')
       AND c.id != ?
       ${filtroProf}
       AND ${INICIO_SQL} < ?
       AND ${INICIO_SQL} + COALESCE(c.duracao, ${DURACAO_PADRAO}) > ?
     LIMIT 1`,
    params
  );
}

function mensagemConflito(conflito, comProfissional) {
  const fim = formatarHora(paraMinutos(conflito.horario) + conflito.duracao);
  const quem = comProfissional ? "O profissional já tem atendimento" : "Este horário já está ocupado";
  return `${quem} das ${conflito.horario} às ${fim}${conflito.paciente_nome ? ` (${conflito.paciente_nome})` : ""}. Escolha outro horário.`;
}

async function validarProfissional(clinicaId, profissionalId) {
  if (!profissionalId) return true;
  const pr = await dbGet("SELECT id FROM profissionais WHERE id = ? AND clinica_id = ?", [profissionalId, clinicaId]);
  return Boolean(pr);
}

// Mantém o retorno (Relacionamento) vinculado à consulta coerente com o status dela
async function sincronizarRetorno(clinicaId, consultaId, status) {
  if (status === "concluido") {
    await dbRun("UPDATE retornos SET status = 'concluido' WHERE clinica_id = ? AND consulta_id = ? AND status = 'agendado'", [clinicaId, consultaId]);
  } else if (STATUS_LIVRES.includes(status) || status === null) {
    await dbRun(
      "UPDATE retornos SET status = 'pendente', consulta_id = NULL WHERE clinica_id = ? AND consulta_id = ? AND status IN ('agendado', 'concluido')",
      [clinicaId, consultaId]
    );
  } else {
    await dbRun("UPDATE retornos SET status = 'agendado' WHERE clinica_id = ? AND consulta_id = ? AND status = 'concluido'", [clinicaId, consultaId]);
  }
}

/* ══════════════════════════════════════════════════════════════
   ROTAS
   ══════════════════════════════════════════════════════════════ */

router.get("/", async (req, res) => {
  try {
    const rows = await dbAll(
      `${SELECT_CONSULTAS} WHERE c.clinica_id = ? ORDER BY c.data ASC, c.horario ASC`,
      [req.user.clinica_id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

// Profissionais ativos da clínica (para o seletor da agenda; não exige permissão do Financeiro)
router.get("/profissionais", async (req, res) => {
  try {
    const rows = await dbAll(
      "SELECT id, nome, especialidade FROM profissionais WHERE clinica_id = ? AND ativo = 1 ORDER BY nome",
      [req.user.clinica_id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

router.post("/", async (req, res) => {
  const erro = validarCorpo(req.body);
  if (erro) return res.status(400).json({ erro });

  const clinicaId = req.user.clinica_id;
  const { paciente_id, data, horario, procedimento, profissional_id, observacoes } = req.body;
  const status = req.body.status || "agendado";
  const duracao = Number(req.body.duracao) || DURACAO_PADRAO;

  try {
    if (!(await validarProfissional(clinicaId, profissional_id))) {
      return res.status(404).json({ erro: "Profissional não encontrado nesta clínica." });
    }
    if (!STATUS_LIVRES.includes(status)) {
      const conflito = await buscarConflito({ clinicaId, profissionalId: profissional_id, data, horario, duracao });
      if (conflito) return res.status(409).json({ erro: mensagemConflito(conflito, Boolean(profissional_id)) });
    }

    const result = await dbRun(
      `INSERT INTO consultas
         (paciente_id, data, horario, procedimento, status, clinica_id, profissional_id, duracao, observacoes, confirmado_em)
       SELECT p.id, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'confirmado' THEN datetime('now','localtime') END
       FROM pacientes p WHERE p.id = ? AND p.clinica_id = ?`,
      [data, horario, procedimento || "", status, clinicaId, profissional_id || null, duracao, observacoes || null, status, paciente_id, clinicaId]
    );
    if (result.changes === 0) return res.status(404).json({ erro: "Paciente não encontrado nesta clínica." });

    res.status(201).json({ mensagem: "Consulta cadastrada com sucesso.", id: result.lastID });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

router.put("/:id", async (req, res) => {
  const erro = validarCorpo(req.body);
  if (erro) return res.status(400).json({ erro });

  const { id } = req.params;
  const clinicaId = req.user.clinica_id;
  const { paciente_id, data, horario, procedimento, profissional_id, observacoes } = req.body;
  const status = req.body.status || "agendado";
  const duracao = Number(req.body.duracao) || DURACAO_PADRAO;

  try {
    if (!(await validarProfissional(clinicaId, profissional_id))) {
      return res.status(404).json({ erro: "Profissional não encontrado nesta clínica." });
    }
    if (!STATUS_LIVRES.includes(status)) {
      const conflito = await buscarConflito({ clinicaId, id, profissionalId: profissional_id, data, horario, duracao });
      if (conflito) return res.status(409).json({ erro: mensagemConflito(conflito, Boolean(profissional_id)) });
    }

    const result = await dbRun(
      `UPDATE consultas
       SET paciente_id = ?, data = ?, horario = ?, procedimento = ?, status = ?,
           profissional_id = ?, duracao = ?, observacoes = ?,
           confirmado_em = CASE WHEN ? = 'confirmado' THEN COALESCE(confirmado_em, datetime('now','localtime')) ELSE NULL END
       WHERE id = ? AND clinica_id = ?
         AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = ? AND p.clinica_id = ?)`,
      [paciente_id, data, horario, procedimento || "", status, profissional_id || null, duracao, observacoes || null,
        status, id, clinicaId, paciente_id, clinicaId]
    );
    if (result.changes === 0) return res.status(404).json({ erro: "Consulta não encontrada." });

    await sincronizarRetorno(clinicaId, id, status);
    res.json({ mensagem: "Consulta atualizada com sucesso." });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

// PATCH /consultas/:id/status  { status } — confirmação rápida, falta, conclusão
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body || {};
  if (!STATUS_VALIDOS.includes(status)) return res.status(400).json({ erro: "Status inválido." });
  const clinicaId = req.user.clinica_id;

  try {
    const result = await dbRun(
      `UPDATE consultas
       SET status = ?,
           confirmado_em = CASE WHEN ? = 'confirmado' THEN COALESCE(confirmado_em, datetime('now','localtime')) ELSE confirmado_em END
       WHERE id = ? AND clinica_id = ?`,
      [status, status, req.params.id, clinicaId]
    );
    if (result.changes === 0) return res.status(404).json({ erro: "Consulta não encontrada." });

    await sincronizarRetorno(clinicaId, req.params.id, status);
    res.json({ mensagem: "Status atualizado." });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

// PATCH /consultas/:id/lembrete — registra que a confirmação foi enviada ao paciente
router.patch("/:id/lembrete", async (req, res) => {
  const clinicaId = req.user.clinica_id;
  try {
    const result = await dbRun(
      "UPDATE consultas SET lembrete_enviado_em = datetime('now','localtime') WHERE id = ? AND clinica_id = ?",
      [req.params.id, clinicaId]
    );
    if (result.changes === 0) return res.status(404).json({ erro: "Consulta não encontrada." });
    const consulta = await dbGet(`${SELECT_CONSULTAS} WHERE c.id = ? AND c.clinica_id = ?`, [req.params.id, clinicaId]);
    res.json(consulta);
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

router.delete("/:id", async (req, res) => {
  const clinicaId = req.user.clinica_id;
  try {
    const consulta = await dbGet("SELECT id FROM consultas WHERE id = ? AND clinica_id = ?", [req.params.id, clinicaId]);
    if (!consulta) return res.status(404).json({ erro: "Consulta não encontrada." });

    await sincronizarRetorno(clinicaId, req.params.id, null);
    await dbRun("UPDATE retornos SET consulta_origem_id = NULL WHERE clinica_id = ? AND consulta_origem_id = ?", [clinicaId, req.params.id]);
    await dbRun("DELETE FROM consultas WHERE id = ? AND clinica_id = ?", [req.params.id, clinicaId]);
    res.json({ mensagem: "Consulta excluída com sucesso." });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

// A autorização é validada na API, não apenas na interface.
// GET = listar, POST = criar, PUT/PATCH = editar, DELETE = excluir.
router.use(auth, requirePermission("relacionamento"));

const STATUS_RETORNO = ["pendente", "agendado", "concluido", "cancelado"];
const TIPOS_CONTATO = ["retorno", "reativacao", "aniversario"];
const HOJE = "date('now','localtime')";
const ERRO_GENERICO = "Não foi possível processar a solicitação. Tente novamente.";

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

function dataValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(valor || ""));
}

// Dias até o próximo aniversário (0 = hoje) a partir de "YYYY-MM-DD"
function diasAteAniversario(dataNascimento, hoje) {
  if (!dataValida(dataNascimento)) return null;
  const [, mes, dia] = dataNascimento.split("-").map(Number);
  let proximo = new Date(hoje.getFullYear(), mes - 1, dia);
  if (proximo < hoje) proximo = new Date(hoje.getFullYear() + 1, mes - 1, dia);
  return Math.round((proximo - hoje) / 86400000);
}

function hojeLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Paciente e profissional precisam pertencer à clínica do usuário
async function validarVinculos(clinicaId, pacienteId, profissionalId) {
  if (pacienteId) {
    const p = await dbGet("SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?", [pacienteId, clinicaId]);
    if (!p) return "Paciente não encontrado nesta clínica.";
  }
  if (profissionalId) {
    const pr = await dbGet("SELECT id FROM profissionais WHERE id = ? AND clinica_id = ?", [profissionalId, clinicaId]);
    if (!pr) return "Profissional não encontrado nesta clínica.";
  }
  return null;
}

const SELECT_RETORNOS = `
  SELECT r.*,
         p.nome AS paciente_nome,
         p.telefone AS paciente_telefone,
         pr.nome AS profissional_nome,
         c.data AS consulta_data,
         c.horario AS consulta_horario,
         CAST(julianday(r.data_prevista) - julianday(${HOJE}) AS INTEGER) AS dias_para_retorno
  FROM retornos r
  JOIN pacientes p ON p.id = r.paciente_id AND p.clinica_id = r.clinica_id
  LEFT JOIN profissionais pr ON pr.id = r.profissional_id AND pr.clinica_id = r.clinica_id
  LEFT JOIN consultas c ON c.id = r.consulta_id AND c.clinica_id = r.clinica_id
`;

// Pacientes sem consulta realizada há N meses e sem nada marcado para o futuro
function sqlInativos(incluirSemConsulta) {
  return `
    SELECT * FROM (
      SELECT p.id, p.nome, p.telefone, p.data_nascimento,
             (SELECT MAX(c.data) FROM consultas c
               WHERE c.paciente_id = p.id AND c.clinica_id = p.clinica_id
                 AND c.status NOT IN ('cancelado', 'faltou') AND c.data <= ${HOJE}) AS ultima_consulta,
             (SELECT COUNT(*) FROM consultas c
               WHERE c.paciente_id = p.id AND c.clinica_id = p.clinica_id
                 AND c.data >= ${HOJE} AND c.status IN ('agendado', 'confirmado')) AS consultas_futuras,
             (SELECT COUNT(*) FROM retornos r
               WHERE r.paciente_id = p.id AND r.clinica_id = p.clinica_id AND r.status = 'pendente') AS retornos_pendentes,
             (SELECT MAX(cp.created_at) FROM contatos_paciente cp
               WHERE cp.paciente_id = p.id AND cp.clinica_id = p.clinica_id AND cp.tipo = 'reativacao') AS ultimo_contato_em
      FROM pacientes p
      WHERE p.clinica_id = ?
    )
    WHERE consultas_futuras = 0
      AND (${incluirSemConsulta ? "ultima_consulta IS NULL OR " : ""}ultima_consulta <= date(${HOJE}, ?))
  `;
}

/* ══════════════════════════════════════════════════════════════
   RESUMO (indicadores do cabeçalho)
   GET /relacionamento/resumo?meses=6
   ══════════════════════════════════════════════════════════════ */
router.get("/resumo", async (req, res) => {
  try {
    const clinicaId = req.user.clinica_id;
    const meses = Math.min(120, Math.max(1, Number(req.query.meses) || 6));
    const retornos = await dbGet(
      `SELECT
         SUM(CASE WHEN data_prevista < ${HOJE} THEN 1 ELSE 0 END) AS atrasados,
         SUM(CASE WHEN data_prevista BETWEEN ${HOJE} AND date(${HOJE}, '+7 days') THEN 1 ELSE 0 END) AS proximos_7_dias
       FROM retornos WHERE clinica_id = ? AND status = 'pendente'`,
      [clinicaId]
    );
    const inativos = await dbAll(sqlInativos(false), [clinicaId, `-${meses} months`]);
    const pacientes = await dbAll(
      "SELECT data_nascimento FROM pacientes WHERE clinica_id = ? AND data_nascimento IS NOT NULL AND data_nascimento != ''",
      [clinicaId]
    );
    const hoje = hojeLocal();

    res.json({
      retornos_atrasados: retornos?.atrasados || 0,
      retornos_proximos_7_dias: retornos?.proximos_7_dias || 0,
      inativos: inativos.length,
      aniversariantes_hoje: pacientes.filter((p) => diasAteAniversario(p.data_nascimento, hoje) === 0).length,
    });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

/* ══════════════════════════════════════════════════════════════
   RETORNOS
   ══════════════════════════════════════════════════════════════ */

// GET /relacionamento/retornos?status=pendente&periodo=atrasados|semana|mes|todos&paciente_id=1
router.get("/retornos", async (req, res) => {
  try {
    const { status = "ativos", periodo = "todos", paciente_id, profissional_id } = req.query;
    const filtros = ["r.clinica_id = ?"];
    const params = [req.user.clinica_id];

    if (status === "ativos") filtros.push("r.status IN ('pendente', 'agendado')");
    else if (STATUS_RETORNO.includes(status)) { filtros.push("r.status = ?"); params.push(status); }

    if (periodo === "atrasados") filtros.push(`r.data_prevista < ${HOJE}`);
    else if (periodo === "semana") filtros.push(`r.data_prevista BETWEEN ${HOJE} AND date(${HOJE}, '+7 days')`);
    else if (periodo === "mes") filtros.push(`r.data_prevista BETWEEN ${HOJE} AND date(${HOJE}, '+30 days')`);

    if (paciente_id) { filtros.push("r.paciente_id = ?"); params.push(paciente_id); }
    if (profissional_id) { filtros.push("r.profissional_id = ?"); params.push(profissional_id); }

    const rows = await dbAll(`${SELECT_RETORNOS} WHERE ${filtros.join(" AND ")} ORDER BY r.data_prevista ASC, p.nome ASC`, params);
    res.json(rows);
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

// POST /relacionamento/retornos
// Com consulta_origem_id, atualiza o retorno pendente já criado a partir daquela consulta (evita duplicar).
router.post("/retornos", async (req, res) => {
  const clinicaId = req.user.clinica_id;
  const { paciente_id, profissional_id, data_prevista, motivo, observacoes, consulta_origem_id } = req.body || {};
  if (!paciente_id || !dataValida(data_prevista)) {
    return res.status(400).json({ erro: "Paciente e data prevista são obrigatórios." });
  }

  try {
    const erroVinculo = await validarVinculos(clinicaId, paciente_id, profissional_id);
    if (erroVinculo) return res.status(404).json({ erro: erroVinculo });

    if (consulta_origem_id) {
      const existente = await dbGet(
        "SELECT id FROM retornos WHERE clinica_id = ? AND consulta_origem_id = ? AND status = 'pendente'",
        [clinicaId, consulta_origem_id]
      );
      if (existente) {
        await dbRun(
          "UPDATE retornos SET data_prevista = ?, motivo = ?, profissional_id = ? WHERE id = ? AND clinica_id = ?",
          [data_prevista, motivo || null, profissional_id || null, existente.id, clinicaId]
        );
        return res.json({ id: existente.id, mensagem: "Retorno atualizado." });
      }
    }

    const result = await dbRun(
      `INSERT INTO retornos (clinica_id, paciente_id, profissional_id, data_prevista, motivo, observacoes, consulta_origem_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [clinicaId, paciente_id, profissional_id || null, data_prevista, motivo || null, observacoes || null, consulta_origem_id || null]
    );
    res.status(201).json({ id: result.lastID, mensagem: "Retorno cadastrado." });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

// PUT /relacionamento/retornos/:id
router.put("/retornos/:id", async (req, res) => {
  const clinicaId = req.user.clinica_id;
  const { profissional_id, data_prevista, motivo, observacoes } = req.body || {};
  if (!dataValida(data_prevista)) return res.status(400).json({ erro: "Data prevista inválida." });

  try {
    const erroVinculo = await validarVinculos(clinicaId, null, profissional_id);
    if (erroVinculo) return res.status(404).json({ erro: erroVinculo });

    const result = await dbRun(
      "UPDATE retornos SET profissional_id = ?, data_prevista = ?, motivo = ?, observacoes = ? WHERE id = ? AND clinica_id = ?",
      [profissional_id || null, data_prevista, motivo || null, observacoes || null, req.params.id, clinicaId]
    );
    if (result.changes === 0) return res.status(404).json({ erro: "Retorno não encontrado." });
    res.json({ mensagem: "Retorno atualizado." });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

// PATCH /relacionamento/retornos/:id/status  { status, consulta_id? }
// agendado: vincula a consulta; pendente: desvincula; concluido/cancelado: mantém o vínculo
router.patch("/retornos/:id/status", async (req, res) => {
  const clinicaId = req.user.clinica_id;
  const { status, consulta_id } = req.body || {};
  if (!STATUS_RETORNO.includes(status)) return res.status(400).json({ erro: "Status inválido." });

  try {
    if (status === "agendado" && consulta_id) {
      const consulta = await dbGet("SELECT id FROM consultas WHERE id = ? AND clinica_id = ?", [consulta_id, clinicaId]);
      if (!consulta) return res.status(404).json({ erro: "Consulta não encontrada nesta clínica." });
    }
    const result = await dbRun(
      `UPDATE retornos
       SET status = ?,
           consulta_id = CASE ? WHEN 'agendado' THEN ? WHEN 'pendente' THEN NULL ELSE consulta_id END
       WHERE id = ? AND clinica_id = ?`,
      [status, status, consulta_id || null, req.params.id, clinicaId]
    );
    if (result.changes === 0) return res.status(404).json({ erro: "Retorno não encontrado." });
    res.json({ mensagem: "Status do retorno atualizado." });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

router.delete("/retornos/:id", async (req, res) => {
  const clinicaId = req.user.clinica_id;
  try {
    await dbRun("DELETE FROM contatos_paciente WHERE retorno_id = ? AND clinica_id = ?", [req.params.id, clinicaId]);
    const result = await dbRun("DELETE FROM retornos WHERE id = ? AND clinica_id = ?", [req.params.id, clinicaId]);
    if (result.changes === 0) return res.status(404).json({ erro: "Retorno não encontrado." });
    res.json({ mensagem: "Retorno excluído." });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

/* ══════════════════════════════════════════════════════════════
   PROFISSIONAIS (para escolher o responsável pelo retorno)
   Lista própria do módulo: não exige permissão do Financeiro.
   ══════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════
   PACIENTES INATIVOS
   GET /relacionamento/inativos?meses=6&incluir_sem_consulta=1
   ══════════════════════════════════════════════════════════════ */
router.get("/inativos", async (req, res) => {
  try {
    const meses = Math.min(120, Math.max(1, Number(req.query.meses) || 6));
    const incluirSemConsulta = req.query.incluir_sem_consulta === "1";
    const rows = await dbAll(
      `${sqlInativos(incluirSemConsulta)} ORDER BY ultima_consulta IS NULL, ultima_consulta ASC, nome ASC`,
      [req.user.clinica_id, `-${meses} months`]
    );
    res.json(rows.map((r) => ({
      ...r,
      dias_sem_vir: r.ultima_consulta
        ? Math.floor((Date.now() - new Date(`${r.ultima_consulta}T00:00:00`).getTime()) / 86400000)
        : null,
    })));
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

/* ══════════════════════════════════════════════════════════════
   ANIVERSARIANTES
   GET /relacionamento/aniversariantes?periodo=hoje|semana|mes
   ══════════════════════════════════════════════════════════════ */
router.get("/aniversariantes", async (req, res) => {
  try {
    const limite = { hoje: 0, semana: 7, mes: 30 }[req.query.periodo] ?? 7;
    const pacientes = await dbAll(
      `SELECT p.id, p.nome, p.telefone, p.data_nascimento,
              (SELECT MAX(cp.created_at) FROM contatos_paciente cp
                WHERE cp.paciente_id = p.id AND cp.clinica_id = p.clinica_id AND cp.tipo = 'aniversario'
                  AND strftime('%Y', cp.created_at) = ?) AS parabens_enviado_em
       FROM pacientes p
       WHERE p.clinica_id = ? AND p.data_nascimento IS NOT NULL AND p.data_nascimento != ''`,
      [String(new Date().getFullYear()), req.user.clinica_id]
    );

    const hoje = hojeLocal();
    const lista = pacientes
      .map((p) => {
        const dias = diasAteAniversario(p.data_nascimento, hoje);
        if (dias === null) return null;
        const alvo = new Date(hoje.getTime() + dias * 86400000);
        return { ...p, dias_para_aniversario: dias, idade: alvo.getFullYear() - Number(p.data_nascimento.slice(0, 4)) };
      })
      .filter((p) => p && p.dias_para_aniversario <= limite)
      .sort((a, b) => a.dias_para_aniversario - b.dias_para_aniversario || a.nome.localeCompare(b.nome));

    res.json(lista);
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

/* ══════════════════════════════════════════════════════════════
   HISTÓRICO DE CONTATOS
   ══════════════════════════════════════════════════════════════ */

// POST /relacionamento/contatos  { paciente_id, tipo, retorno_id? }
router.post("/contatos", async (req, res) => {
  const clinicaId = req.user.clinica_id;
  const { paciente_id, tipo, retorno_id } = req.body || {};
  if (!paciente_id || !TIPOS_CONTATO.includes(tipo)) {
    return res.status(400).json({ erro: "Paciente e tipo de contato são obrigatórios." });
  }

  try {
    const erroVinculo = await validarVinculos(clinicaId, paciente_id, null);
    if (erroVinculo) return res.status(404).json({ erro: erroVinculo });

    const result = await dbRun(
      "INSERT INTO contatos_paciente (clinica_id, paciente_id, tipo, retorno_id, usuario_id) VALUES (?, ?, ?, ?, ?)",
      [clinicaId, paciente_id, tipo, retorno_id || null, req.user.id || null]
    );
    if (retorno_id) {
      await dbRun(
        "UPDATE retornos SET ultimo_contato_em = datetime('now','localtime') WHERE id = ? AND clinica_id = ?",
        [retorno_id, clinicaId]
      );
    }
    res.status(201).json({ id: result.lastID, mensagem: "Contato registrado." });
  } catch {
    res.status(500).json({ erro: ERRO_GENERICO });
  }
});

module.exports = router;

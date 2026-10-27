const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

// A autorização é validada na API, não apenas na interface.
router.use(auth, requirePermission("pagamentos"));


// =========================
// LISTAR PAGAMENTOS POR PACIENTE
// =========================
router.get("/paciente/:paciente_id", auth, (req, res) => {
  const { paciente_id } = req.params;

  db.all(
    `SELECT p.*, o.status AS orcamento_status, o.data AS orcamento_data
     FROM pagamentos p
     LEFT JOIN orcamentos o ON p.orcamento_id = o.id AND o.clinica_id = p.clinica_id
     WHERE p.paciente_id = ? AND p.clinica_id = ?
     ORDER BY p.data DESC, p.id DESC`,
    [paciente_id, req.user.clinica_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }
      res.json(rows || []);
    }
  );
});


// =========================
// BUSCAR PAGAMENTO POR ID
// =========================
router.get("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT p.*, o.status AS orcamento_status, o.data AS orcamento_data
     FROM pagamentos p
     LEFT JOIN orcamentos o ON p.orcamento_id = o.id AND o.clinica_id = p.clinica_id
     WHERE p.id = ? AND p.clinica_id = ?`,
    [id, req.user.clinica_id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }
      if (!row) {
        return res.status(404).json({ erro: "Pagamento não encontrado." });
      }
      res.json(row);
    }
  );
});


// =========================
// CRIAR PAGAMENTO
// =========================
router.post("/", auth, (req, res) => {
  const {
    paciente_id, orcamento_id, data, valor,
    forma_pagamento, status, parcela_atual,
    total_parcelas, descricao, observacoes,
  } = req.body;

  if (!paciente_id || !data || valor === undefined || valor === null) {
    return res.status(400).json({ erro: "Paciente, data e valor são obrigatórios." });
  }

  const formasValidas = [
    "dinheiro", "pix", "cartao_credito", "cartao_debito",
    "boleto", "transferencia", "cheque",
  ];
  const fp = forma_pagamento || "dinheiro";
  if (!formasValidas.includes(fp)) {
    return res.status(400).json({
      erro: `Forma de pagamento inválida. Use: ${formasValidas.join(", ")}`,
    });
  }

  const statusValidos = ["confirmado", "pendente", "cancelado", "estornado"];
  const st = status || "confirmado";
  if (!statusValidos.includes(st)) {
    return res.status(400).json({
      erro: `Status inválido. Use: ${statusValidos.join(", ")}`,
    });
  }

  const sql = `
    INSERT INTO pagamentos
      (paciente_id, orcamento_id, data, valor, forma_pagamento,
       status, parcela_atual, total_parcelas, descricao, observacoes, clinica_id)
    SELECT p.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    FROM pacientes p
    WHERE p.id = ? AND p.clinica_id = ?
      AND (? IS NULL OR EXISTS (
        SELECT 1 FROM orcamentos o
        WHERE o.id = ? AND o.clinica_id = ? AND o.paciente_id = p.id
      ))
  `;

  db.run(
    sql,
    [
      orcamento_id || null,
      data,
      valor,
      fp,
      st,
      parcela_atual || 1,
      total_parcelas || 1,
      descricao || "",
      observacoes || "",
      req.user.clinica_id,
      paciente_id,
      req.user.clinica_id,
      orcamento_id || null,
      orcamento_id || null,
      req.user.clinica_id,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ erro: "Paciente ou orçamento não encontrado nesta clínica." });
      }
      res.status(201).json({
        id: this.lastID,
        mensagem: "Pagamento registrado com sucesso.",
      });
    }
  );
});


// =========================
// ATUALIZAR PAGAMENTO
// =========================
router.put("/:id", auth, (req, res) => {
  const { id } = req.params;
  const {
    paciente_id, orcamento_id, data, valor,
    forma_pagamento, status, parcela_atual,
    total_parcelas, descricao, observacoes,
  } = req.body;

  if (!paciente_id || !data || valor === undefined || valor === null) {
    return res.status(400).json({ erro: "Paciente, data e valor são obrigatórios." });
  }

  const sql = `
    UPDATE pagamentos SET
      paciente_id = ?, orcamento_id = ?, data = ?, valor = ?,
      forma_pagamento = ?, status = ?, parcela_atual = ?,
      total_parcelas = ?, descricao = ?, observacoes = ?
    WHERE id = ?
  `;

  db.run(
    sql,
    [
      paciente_id,
      orcamento_id || null,
      data,
      valor,
      forma_pagamento || "dinheiro",
      status || "confirmado",
      parcela_atual || 1,
      total_parcelas || 1,
      descricao || "",
      observacoes || "",
      id,
      req.user.clinica_id,
      paciente_id,
      req.user.clinica_id,
      orcamento_id || null,
      orcamento_id || null,
      req.user.clinica_id,
      paciente_id,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ erro: "Pagamento não encontrado." });
      }
      res.json({ mensagem: "Pagamento atualizado com sucesso." });
    }
  );
});


// =========================
// ATUALIZAR STATUS DO PAGAMENTO
// =========================
router.patch("/:id/status", auth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusValidos = ["confirmado", "pendente", "cancelado", "estornado"];

  if (!status || !statusValidos.includes(status)) {
    return res.status(400).json({
      erro: `Status inválido. Use: ${statusValidos.join(", ")}`,
    });
  }

  db.run(
    "UPDATE pagamentos SET status = ? WHERE id = ? AND clinica_id = ?",
    [status, id, req.user.clinica_id],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ erro: "Pagamento não encontrado." });
      }
      res.json({ mensagem: "Status atualizado com sucesso." });
    }
  );
});


// =========================
// DELETAR PAGAMENTO
// =========================
router.delete("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM pagamentos WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], function (err) {
    if (err) {
      return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    }
    if (this.changes === 0) {
      return res.status(404).json({ erro: "Pagamento não encontrado." });
    }
    res.json({ mensagem: "Pagamento excluído com sucesso." });
  });
});


module.exports = router;
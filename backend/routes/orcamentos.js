const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");


// =========================
// LISTAR ORÇAMENTOS POR PACIENTE
// =========================
router.get("/paciente/:paciente_id", auth, (req, res) => {
  const { paciente_id } = req.params;

  db.all(
    "SELECT * FROM orcamentos WHERE paciente_id = ? ORDER BY data DESC, id DESC",
    [paciente_id],
    (err, orcamentos) => {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      if (orcamentos.length === 0) {
        return res.json([]);
      }

      const ids = orcamentos.map((o) => o.id);
      const placeholders = ids.map(() => "?").join(",");

      db.all(
        `SELECT * FROM orcamento_itens WHERE orcamento_id IN (${placeholders}) ORDER BY id ASC`,
        ids,
        (errItens, itens) => {
          if (errItens) {
            return res.status(500).json({ erro: errItens.message });
          }

          const resultado = orcamentos.map((o) => ({
            ...o,
            itens: itens.filter((i) => i.orcamento_id === o.id),
          }));

          res.json(resultado);
        }
      );
    }
  );
});


// =========================
// BUSCAR ORÇAMENTO POR ID
// =========================
router.get("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM orcamentos WHERE id = ?", [id], (err, orcamento) => {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }
    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado." });
    }

    db.all(
      "SELECT * FROM orcamento_itens WHERE orcamento_id = ? ORDER BY id ASC",
      [id],
      (errItens, itens) => {
        if (errItens) {
          return res.status(500).json({ erro: errItens.message });
        }

        res.json({ ...orcamento, itens: itens || [] });
      }
    );
  });
});


// =========================
// CRIAR ORÇAMENTO
// =========================
router.post("/", auth, (req, res) => {
  const { paciente_id, data, status, desconto, observacoes, itens } = req.body;

  if (!paciente_id || !data) {
    return res.status(400).json({ erro: "Paciente e data são obrigatórios." });
  }

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: "Adicione pelo menos um procedimento." });
  }

  const sqlOrcamento = `
    INSERT INTO orcamentos (paciente_id, data, status, desconto, observacoes)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(
    sqlOrcamento,
    [paciente_id, data, status || "pendente", desconto || 0, observacoes || ""],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      const orcamentoId = this.lastID;

      const sqlItem = `
        INSERT INTO orcamento_itens (orcamento_id, dente, procedimento, valor, quantidade)
        VALUES (?, ?, ?, ?, ?)
      `;

      let inseridos = 0;
      let erroInsercao = false;

      itens.forEach((item) => {
        if (erroInsercao) return;

        db.run(
          sqlItem,
          [
            orcamentoId,
            item.dente || "",
            item.procedimento || "",
            item.valor || 0,
            item.quantidade || 1,
          ],
          function (errItem) {
            if (errItem) {
              erroInsercao = true;
              return res.status(500).json({ erro: errItem.message });
            }

            inseridos += 1;

            if (inseridos === itens.length) {
              res.status(201).json({
                id: orcamentoId,
                mensagem: "Orçamento criado com sucesso.",
              });
            }
          }
        );
      });
    }
  );
});


// =========================
// ATUALIZAR ORÇAMENTO
// =========================
router.put("/:id", auth, (req, res) => {
  const { id } = req.params;
  const { paciente_id, data, status, desconto, observacoes, itens } = req.body;

  if (!paciente_id || !data) {
    return res.status(400).json({ erro: "Paciente e data são obrigatórios." });
  }

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: "Adicione pelo menos um procedimento." });
  }

  const sqlUpdate = `
    UPDATE orcamentos SET
      paciente_id = ?, data = ?, status = ?, desconto = ?, observacoes = ?
    WHERE id = ?
  `;

  db.run(
    sqlUpdate,
    [paciente_id, data, status || "pendente", desconto || 0, observacoes || "", id],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: "Orçamento não encontrado." });
      }

      // Remove itens antigos e insere os novos
      db.run(
        "DELETE FROM orcamento_itens WHERE orcamento_id = ?",
        [id],
        function (errDel) {
          if (errDel) {
            return res.status(500).json({ erro: errDel.message });
          }

          const sqlItem = `
            INSERT INTO orcamento_itens (orcamento_id, dente, procedimento, valor, quantidade)
            VALUES (?, ?, ?, ?, ?)
          `;

          let inseridos = 0;
          let erroInsercao = false;

          itens.forEach((item) => {
            if (erroInsercao) return;

            db.run(
              sqlItem,
              [
                id,
                item.dente || "",
                item.procedimento || "",
                item.valor || 0,
                item.quantidade || 1,
              ],
              function (errItem) {
                if (errItem) {
                  erroInsercao = true;
                  return res.status(500).json({ erro: errItem.message });
                }

                inseridos += 1;

                if (inseridos === itens.length) {
                  res.json({ mensagem: "Orçamento atualizado com sucesso." });
                }
              }
            );
          });
        }
      );
    }
  );
});


// =========================
// ATUALIZAR STATUS DO ORÇAMENTO
// =========================
router.patch("/:id/status", auth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusValidos = ["pendente", "aprovado", "recusado", "em_andamento", "concluido"];

  if (!status || !statusValidos.includes(status)) {
    return res.status(400).json({
      erro: `Status inválido. Use: ${statusValidos.join(", ")}`,
    });
  }

  db.run(
    "UPDATE orcamentos SET status = ? WHERE id = ?",
    [status, id],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ erro: "Orçamento não encontrado." });
      }
      res.json({ mensagem: "Status atualizado com sucesso." });
    }
  );
});


// =========================
// DELETAR ORÇAMENTO
// =========================
router.delete("/:id", auth, (req, res) => {
  const { id } = req.params;

  // Itens são deletados automaticamente pelo ON DELETE CASCADE
  db.run("DELETE FROM orcamentos WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ erro: "Orçamento não encontrado." });
    }
    res.json({ mensagem: "Orçamento excluído com sucesso." });
  });
});


module.exports = router;
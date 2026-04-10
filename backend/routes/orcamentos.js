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

  // 1) Busca o orçamento atual (precisa saber o status anterior)
  db.get("SELECT * FROM orcamentos WHERE id = ?", [id], (err, orcamento) => {
    if (err) {
      return res.status(500).json({ erro: err.message });
    }
    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado." });
    }

    // 2) Atualiza o status
    db.run(
      "UPDATE orcamentos SET status = ? WHERE id = ?",
      [status, id],
      function (errUpdate) {
        if (errUpdate) {
          return res.status(500).json({ erro: errUpdate.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ erro: "Orçamento não encontrado." });
        }

        // 3) Se está sendo APROVADO (e não estava aprovado antes), gera contas a receber
        if (status === "aprovado" && orcamento.status !== "aprovado") {
          gerarContasReceber(id, orcamento.paciente_id, (erroFinanceiro) => {
            if (erroFinanceiro) {
              console.error("Erro ao gerar contas a receber:", erroFinanceiro);
              // Retorna sucesso no status, mas avisa sobre o erro financeiro
              return res.json({
                mensagem: "Status atualizado, mas houve erro ao gerar contas a receber.",
                aviso: erroFinanceiro,
              });
            }
            res.json({
              mensagem: "Status atualizado e contas a receber geradas com sucesso.",
              financeiro_gerado: true,
            });
          });
        } else {
          res.json({ mensagem: "Status atualizado com sucesso." });
        }
      }
    );
  });
});


// =========================
// FUNÇÃO: GERAR CONTAS A RECEBER A PARTIR DO ORÇAMENTO
// =========================
function gerarContasReceber(orcamentoId, pacienteId, callback) {
  // Busca os itens do orçamento
  db.all(
    "SELECT * FROM orcamento_itens WHERE orcamento_id = ? ORDER BY id ASC",
    [orcamentoId],
    (err, itens) => {
      if (err) return callback(err.message);
      if (!itens || itens.length === 0) return callback("Orçamento sem itens.");

      // Busca o orçamento para pegar o desconto
      db.get(
        "SELECT * FROM orcamentos WHERE id = ?",
        [orcamentoId],
        (errOrc, orcamento) => {
          if (errOrc) return callback(errOrc.message);
          if (!orcamento) return callback("Orçamento não encontrado.");

          // Verifica se já existem contas vinculadas a este orçamento (evita duplicatas)
          db.get(
            "SELECT COUNT(*) as total FROM contas_receber WHERE orcamento_id = ?",
            [orcamentoId],
            (errCheck, row) => {
              if (errCheck) return callback(errCheck.message);

              if (row && row.total > 0) {
                // Já existem contas geradas para este orçamento, pula
                return callback(null);
              }

              // Calcula o total bruto dos itens
              const totalBruto = itens.reduce(
                (acc, item) => acc + (Number(item.valor) || 0) * (Number(item.quantidade) || 1),
                0
              );
              const desconto = Number(orcamento.desconto) || 0;
              const totalLiquido = Math.max(0, totalBruto - desconto);

              // Data de hoje para emissão e vencimento (30 dias padrão)
              const hoje = new Date();
              const hojeStr = hoje.toISOString().split("T")[0];
              const vencimento = new Date(hoje);
              vencimento.setDate(vencimento.getDate() + 30);
              const vencimentoStr = vencimento.toISOString().split("T")[0];

              // Monta a descrição com os procedimentos
              const procedimentos = itens
                .map((i) => i.procedimento)
                .filter(Boolean)
                .join(", ");

              const descricao = `Orçamento #${orcamentoId} — ${procedimentos || "Procedimentos"}`;

              // Insere a conta a receber
              db.run(
                `INSERT INTO contas_receber
                   (paciente_id, orcamento_id, descricao, procedimento, valor,
                    desconto, data_emissao, data_vencimento, forma_pagamento,
                    status, parcela_atual, total_parcelas, observacoes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'dinheiro', 'pendente', 1, 1, ?)`,
                [
                  pacienteId,
                  orcamentoId,
                  descricao,
                  procedimentos || null,
                  totalLiquido,
                  desconto,
                  hojeStr,
                  vencimentoStr,
                  `Gerado automaticamente ao aprovar orçamento #${orcamentoId}`,
                ],
                function (errInsert) {
                  if (errInsert) return callback(errInsert.message);
                  callback(null);
                }
              );
            }
          );
        }
      );
    }
  );
}


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
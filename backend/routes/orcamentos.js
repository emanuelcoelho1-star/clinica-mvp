const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

// A autorização é validada na API, não apenas na interface.
router.use(auth, requirePermission("orcamentos"));


// =========================
// LISTAR ORÇAMENTOS POR PACIENTE
// =========================
router.get("/paciente/:paciente_id", auth, (req, res) => {
  const { paciente_id } = req.params;

  db.all(
    "SELECT * FROM orcamentos WHERE paciente_id = ? AND clinica_id = ? ORDER BY data DESC, id DESC",
    [paciente_id, req.user.clinica_id],
    (err, orcamentos) => {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
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
            return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
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


// Retorna o nome do usuário autenticado para exibição no formulário.
router.get("/usuario-atual", (req, res) => {
  res.json({ nome: req.user.nome || "" });
});

// =========================
// BUSCAR ORÇAMENTO POR ID
// =========================
router.get("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM orcamentos WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], (err, orcamento) => {
    if (err) {
      return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    }
    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado." });
    }

    db.all(
      "SELECT * FROM orcamento_itens WHERE orcamento_id = ? ORDER BY id ASC",
      [id],
      (errItens, itens) => {
        if (errItens) {
          return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
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
  const { paciente_id, data, descricao, itens, desconto, dentista_responsavel } = req.body;
  const planoId = req.body.plano_id === null || req.body.plano_id === undefined || req.body.plano_id === "" ? null : Number(req.body.plano_id);
  if (planoId !== null && (!Number.isInteger(planoId) || planoId <= 0)) return res.status(400).json({ erro: "Selecione um plano válido." });

  if (!paciente_id || !data) {
    return res.status(400).json({ erro: "Paciente e data são obrigatórios." });
  }

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: "Adicione pelo menos um procedimento." });
  }

  const nomeDentista = typeof dentista_responsavel === "string" && dentista_responsavel.trim() ? dentista_responsavel.trim() : req.user.nome || "";
  const sqlOrcamento = `
    INSERT INTO orcamentos (paciente_id, data, status, desconto, observacoes, descricao, dentista_responsavel, clinica_id, plano_id)
    SELECT p.id, ?, ?, ?, '', ?, ?, ?, ? FROM pacientes p
    WHERE p.id = ? AND p.clinica_id = ?
      AND EXISTS (SELECT 1 FROM usuarios u WHERE u.nome = ? AND u.clinica_id = ?)
      AND (? IS NULL OR EXISTS (SELECT 1 FROM planos pl WHERE pl.id = ? AND pl.clinica_id = p.clinica_id AND pl.ativo = 1))
  `;

  db.run(
    sqlOrcamento,
    [data, "pendente", Math.max(0, Number(desconto) || 0), descricao || "", nomeDentista, req.user.clinica_id, planoId, paciente_id, req.user.clinica_id, nomeDentista, req.user.clinica_id, planoId, planoId],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }

      if (this.changes === 0) return res.status(404).json({ erro: "Paciente não encontrado nesta clínica." });

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
              return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
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
  const { paciente_id, data, descricao, itens, desconto, dentista_responsavel } = req.body;

  if (!paciente_id || !data) {
    return res.status(400).json({ erro: "Paciente e data são obrigatórios." });
  }

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ erro: "Adicione pelo menos um procedimento." });
  }

  const nomeDentista = typeof dentista_responsavel === "string" && dentista_responsavel.trim() ? dentista_responsavel.trim() : req.user.nome || "";
  const sqlUpdate = `
    UPDATE orcamentos SET
      paciente_id = ?, data = ?, descricao = ?, desconto = ?, dentista_responsavel = ?, plano_id = ?
    WHERE id = ? AND clinica_id = ?
      AND (? IS NULL OR EXISTS (SELECT 1 FROM planos pl WHERE pl.id = ? AND pl.clinica_id = orcamentos.clinica_id AND pl.ativo = 1))
      AND EXISTS (SELECT 1 FROM pacientes p WHERE p.id = ? AND p.clinica_id = ? AND EXISTS (SELECT 1 FROM usuarios u WHERE u.nome = ? AND u.clinica_id = ?))
  `;

  db.run(
    sqlUpdate,
    [paciente_id, data, descricao || "", Math.max(0, Number(desconto) || 0), nomeDentista, planoId, id, req.user.clinica_id, planoId, planoId, paciente_id, req.user.clinica_id, nomeDentista, req.user.clinica_id],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
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
            return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
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
                  return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
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
  db.get("SELECT * FROM orcamentos WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], (err, orcamento) => {
    if (err) {
      return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    }
    if (!orcamento) {
      return res.status(404).json({ erro: "Orçamento não encontrado." });
    }

    // 2) Atualiza o status
    db.run(
      "UPDATE orcamentos SET status = ? WHERE id = ? AND clinica_id = ?",
      [status, id, req.user.clinica_id],
      function (errUpdate) {
        if (errUpdate) {
          return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
        }
        if (this.changes === 0) {
          return res.status(404).json({ erro: "Orçamento não encontrado." });
        }

        // 3) Se está sendo APROVADO (e não estava aprovado antes), gera contas a receber
        if (status === "aprovado" && orcamento.status !== "aprovado") {
          gerarContasReceber(id, orcamento.paciente_id, req.user.clinica_id, (erroFinanceiro) => {
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
function gerarContasReceber(orcamentoId, pacienteId, clinicaId, callback) {
  // Busca os itens apenas se o orçamento pertencer à clínica autenticada.
  db.all(
    `SELECT oi.* FROM orcamento_itens oi
     INNER JOIN orcamentos o ON o.id = oi.orcamento_id
     WHERE oi.orcamento_id = ? AND o.clinica_id = ?
     ORDER BY oi.id ASC`,
    [orcamentoId, clinicaId],
    (err, itens) => {
      if (err) return callback(err.message);
      if (!itens || itens.length === 0) return callback("Orçamento sem itens.");

      // Busca o orçamento para pegar o desconto
      db.get(
        "SELECT * FROM orcamentos WHERE id = ? AND clinica_id = ? AND paciente_id = ?",
        [orcamentoId, clinicaId, pacienteId],
        (errOrc, orcamento) => {
          if (errOrc) return callback(errOrc.message);
          if (!orcamento) return callback("Orçamento não encontrado.");

          // Verifica se já existem contas vinculadas a este orçamento (evita duplicatas)
          db.get(
            "SELECT COUNT(*) as total FROM contas_receber WHERE orcamento_id = ? AND clinica_id = ?",
            [orcamentoId, clinicaId],
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
                    status, parcela_atual, total_parcelas, observacoes, clinica_id)
                 SELECT p.id, o.id, ?, ?, ?, ?, ?, ?, 'dinheiro', 'pendente', 1, 1, ?, ?
                 FROM pacientes p
                 INNER JOIN orcamentos o ON o.paciente_id = p.id
                 WHERE p.id = ? AND p.clinica_id = ?
                   AND o.id = ? AND o.clinica_id = ?`,
                [
                  descricao,
                  procedimentos || null,
                  totalLiquido,
                  desconto,
                  hojeStr,
                  vencimentoStr,
                  `Gerado automaticamente ao aprovar orçamento #${orcamentoId}`,
                  clinicaId,
                  pacienteId,
                  clinicaId,
                  orcamentoId,
                  clinicaId,
                ],
                function (errInsert) {
                  if (errInsert) return callback(errInsert.message);
                  if (this.changes === 0) return callback("Paciente ou orçamento não pertence a esta clínica.");
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

  // Confirma a propriedade antes de tocar em qualquer registro financeiro.
  db.get(
    "SELECT id FROM orcamentos WHERE id = ? AND clinica_id = ?",
    [id, req.user.clinica_id],
    (errBusca, orcamento) => {
      if (errBusca) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }
      if (!orcamento) {
        return res.status(404).json({ erro: "Orçamento não encontrado." });
      }

      // Só remove registros financeiros vinculados a contas da mesma clínica.
      db.run(
        `DELETE FROM fluxo_caixa WHERE conta_receber_id IN
           (SELECT id FROM contas_receber WHERE orcamento_id = ? AND clinica_id = ?)`,
        [id, req.user.clinica_id],
        (errFluxo) => {
          if (errFluxo) {
            return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
          }

          db.run(
            `DELETE FROM comissoes WHERE conta_receber_id IN
               (SELECT id FROM contas_receber WHERE orcamento_id = ? AND clinica_id = ?)`,
            [id, req.user.clinica_id],
            (errComissoes) => {
              if (errComissoes) {
                return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
              }

              db.run(
                "DELETE FROM contas_receber WHERE orcamento_id = ? AND clinica_id = ?",
                [id, req.user.clinica_id],
                (errContas) => {
                  if (errContas) {
                    return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
                  }

                  db.run(
                    "DELETE FROM orcamentos WHERE id = ? AND clinica_id = ?",
                    [id, req.user.clinica_id],
                    function (errDelete) {
                      if (errDelete) {
                        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
                      }
                      if (this.changes === 0) {
                        return res.status(404).json({ erro: "Orçamento não encontrado." });
                      }
                      res.json({ mensagem: "Orçamento e registros financeiros excluídos com sucesso." });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;
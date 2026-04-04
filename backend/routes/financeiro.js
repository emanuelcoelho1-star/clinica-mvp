const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   1. DASHBOARD FINANCEIRO
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/dashboard?mes=3&ano=2026
router.get("/dashboard", auth, async (req, res) => {
  try {
    const now = new Date();
    const mes = parseInt(req.query.mes) || now.getMonth() + 1;
    const ano = parseInt(req.query.ano) || now.getFullYear();
    const mesStr = String(mes).padStart(2, "0");
    const periodo = `${ano}-${mesStr}`;

    // Receitas do mês (contas_receber pagas)
    const receitas = await dbGet(
      `SELECT COALESCE(SUM(valor_recebido), 0) as total
       FROM contas_receber
       WHERE status = 'pago' AND strftime('%Y-%m', data_recebimento) = ?`,
      [periodo]
    );

    // Receitas dos pagamentos legados
    const receitasLegado = await dbGet(
      `SELECT COALESCE(SUM(valor), 0) as total
       FROM pagamentos
       WHERE status = 'confirmado' AND strftime('%Y-%m', data) = ?`,
      [periodo]
    );

    // Despesas do mês (contas_pagar pagas)
    const despesas = await dbGet(
      `SELECT COALESCE(SUM(valor_pago), 0) as total
       FROM contas_pagar
       WHERE status = 'pago' AND strftime('%Y-%m', data_pagamento) = ?`,
      [periodo]
    );

    // Contas a receber pendentes
    const receberPendente = await dbGet(
      `SELECT COALESCE(SUM(valor - valor_recebido), 0) as total,
              COUNT(*) as quantidade
       FROM contas_receber
       WHERE status IN ('pendente', 'parcial')`
    );

    // Contas a pagar pendentes
    const pagarPendente = await dbGet(
      `SELECT COALESCE(SUM(valor - valor_pago), 0) as total,
              COUNT(*) as quantidade
       FROM contas_pagar
       WHERE status IN ('pendente', 'parcial')`
    );

    // Contas vencidas (a pagar)
    const pagarVencido = await dbGet(
      `SELECT COALESCE(SUM(valor - valor_pago), 0) as total,
              COUNT(*) as quantidade
       FROM contas_pagar
       WHERE status IN ('pendente', 'parcial') AND data_vencimento < date('now')`
    );

    // Contas vencidas (a receber)
    const receberVencido = await dbGet(
      `SELECT COALESCE(SUM(valor - valor_recebido), 0) as total,
              COUNT(*) as quantidade
       FROM contas_receber
       WHERE status IN ('pendente', 'parcial') AND data_vencimento < date('now')`
    );

    // Receitas vs Despesas últimos 6 meses
    const ultimos6Meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ano, mes - 1 - i, 1);
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const a = d.getFullYear();
      const p = `${a}-${m}`;

      const rec = await dbGet(
        `SELECT COALESCE(SUM(valor_recebido), 0) as total
         FROM contas_receber
         WHERE status = 'pago' AND strftime('%Y-%m', data_recebimento) = ?`,
        [p]
      );
      const recLeg = await dbGet(
        `SELECT COALESCE(SUM(valor), 0) as total
         FROM pagamentos
         WHERE status = 'confirmado' AND strftime('%Y-%m', data) = ?`,
        [p]
      );
      const desp = await dbGet(
        `SELECT COALESCE(SUM(valor_pago), 0) as total
         FROM contas_pagar
         WHERE status = 'pago' AND strftime('%Y-%m', data_pagamento) = ?`,
        [p]
      );

      ultimos6Meses.push({
        mes: p,
        mesNome: d.toLocaleString("pt-BR", { month: "short" }).replace(".", ""),
        receitas: (rec?.total || 0) + (recLeg?.total || 0),
        despesas: desp?.total || 0,
      });
    }

    // Receitas por forma de pagamento (mês atual)
    const porFormaPagamento = await dbAll(
      `SELECT forma_pagamento, COALESCE(SUM(valor_recebido), 0) as total
       FROM contas_receber
       WHERE status = 'pago' AND strftime('%Y-%m', data_recebimento) = ?
       GROUP BY forma_pagamento
       UNION ALL
       SELECT forma_pagamento, COALESCE(SUM(valor), 0) as total
       FROM pagamentos
       WHERE status = 'confirmado' AND strftime('%Y-%m', data) = ?
       GROUP BY forma_pagamento`,
      [periodo, periodo]
    );

    // Agrupar formas de pagamento
    const formasAgrupadas = {};
    porFormaPagamento.forEach((r) => {
      const key = r.forma_pagamento || "outros";
      formasAgrupadas[key] = (formasAgrupadas[key] || 0) + r.total;
    });

    // Meta do mês
    const meta = await dbGet(
      `SELECT * FROM metas_financeiras WHERE mes = ? AND ano = ? AND tipo = 'receita'`,
      [mes, ano]
    );

    const totalReceitas = (receitas?.total || 0) + (receitasLegado?.total || 0);
    const totalDespesas = despesas?.total || 0;

    res.json({
      periodo: { mes, ano },
      resumo: {
        receitas: totalReceitas,
        despesas: totalDespesas,
        lucro: totalReceitas - totalDespesas,
        margem: totalReceitas > 0 ? (((totalReceitas - totalDespesas) / totalReceitas) * 100).toFixed(1) : 0,
      },
      pendentes: {
        a_receber: { total: receberPendente?.total || 0, quantidade: receberPendente?.quantidade || 0 },
        a_pagar: { total: pagarPendente?.total || 0, quantidade: pagarPendente?.quantidade || 0 },
      },
      vencidos: {
        a_receber: { total: receberVencido?.total || 0, quantidade: receberVencido?.quantidade || 0 },
        a_pagar: { total: pagarVencido?.total || 0, quantidade: pagarVencido?.quantidade || 0 },
      },
      grafico_mensal: ultimos6Meses,
      formas_pagamento: formasAgrupadas,
      meta: meta || null,
    });
  } catch (error) {
    console.error("Erro no dashboard financeiro:", error);
    res.status(500).json({ erro: "Erro ao carregar dashboard financeiro." });
  }
});

/* ══════════════════════════════════════════════════════════════
   2. CATEGORIAS FINANCEIRAS
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/categorias?tipo=despesa
router.get("/categorias", auth, async (req, res) => {
  try {
    const { tipo } = req.query;
    let sql = "SELECT * FROM categorias_financeiras WHERE ativo = 1";
    const params = [];

    if (tipo) {
      sql += " AND tipo = ?";
      params.push(tipo);
    }

    sql += " ORDER BY tipo, nome";
    const categorias = await dbAll(sql, params);
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao listar categorias." });
  }
});

// POST /financeiro/categorias
router.post("/categorias", auth, async (req, res) => {
  try {
    const { nome, tipo, cor, icone } = req.body;
    if (!nome || !tipo) {
      return res.status(400).json({ erro: "Nome e tipo são obrigatórios." });
    }

    const result = await dbRun(
      "INSERT INTO categorias_financeiras (nome, tipo, cor, icone) VALUES (?, ?, ?, ?)",
      [nome, tipo, cor || "#64748b", icone || "tag"]
    );

    res.status(201).json({ id: result.lastID, mensagem: "Categoria criada." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao criar categoria." });
  }
});

// PUT /financeiro/categorias/:id
router.put("/categorias/:id", auth, async (req, res) => {
  try {
    const { nome, tipo, cor, icone, ativo } = req.body;
    await dbRun(
      `UPDATE categorias_financeiras
       SET nome = ?, tipo = ?, cor = ?, icone = ?, ativo = ?
       WHERE id = ?`,
      [nome, tipo, cor, icone, ativo !== undefined ? ativo : 1, req.params.id]
    );
    res.json({ mensagem: "Categoria atualizada." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao atualizar categoria." });
  }
});

// DELETE /financeiro/categorias/:id
router.delete("/categorias/:id", auth, async (req, res) => {
  try {
    await dbRun("UPDATE categorias_financeiras SET ativo = 0 WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Categoria desativada." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao desativar categoria." });
  }
});

/* ══════════════════════════════════════════════════════════════
   3. CONTAS A PAGAR
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/contas-pagar?status=pendente&mes=3&ano=2026
router.get("/contas-pagar", auth, async (req, res) => {
  try {
    const { status, categoria_id, mes, ano, data_inicio, data_fim } = req.query;
    let sql = `
      SELECT cp.*, cf.nome as categoria_nome, cf.cor as categoria_cor
      FROM contas_pagar cp
      LEFT JOIN categorias_financeiras cf ON cp.categoria_id = cf.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += " AND cp.status = ?";
      params.push(status);
    }
    if (categoria_id) {
      sql += " AND cp.categoria_id = ?";
      params.push(categoria_id);
    }
    if (mes && ano) {
      sql += " AND strftime('%Y-%m', cp.data_vencimento) = ?";
      params.push(`${ano}-${String(mes).padStart(2, "0")}`);
    }
    if (data_inicio) {
      sql += " AND cp.data_vencimento >= ?";
      params.push(data_inicio);
    }
    if (data_fim) {
      sql += " AND cp.data_vencimento <= ?";
      params.push(data_fim);
    }

    sql += " ORDER BY cp.data_vencimento ASC";
    const contas = await dbAll(sql, params);

    // Resumo
    const resumo = await dbGet(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'pendente' THEN valor - valor_pago ELSE 0 END), 0) as total_pendente,
        COALESCE(SUM(CASE WHEN status = 'pago' THEN valor_pago ELSE 0 END), 0) as total_pago,
        COALESCE(SUM(CASE WHEN status IN ('pendente','parcial') AND data_vencimento < date('now') THEN valor - valor_pago ELSE 0 END), 0) as total_vencido,
        COUNT(CASE WHEN status IN ('pendente','parcial') AND data_vencimento < date('now') THEN 1 END) as qtd_vencidas
      FROM contas_pagar
    `);

    res.json({ contas, resumo });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao listar contas a pagar." });
  }
});

// GET /financeiro/contas-pagar/:id
router.get("/contas-pagar/:id", auth, async (req, res) => {
  try {
    const conta = await dbGet(
      `SELECT cp.*, cf.nome as categoria_nome, cf.cor as categoria_cor
       FROM contas_pagar cp
       LEFT JOIN categorias_financeiras cf ON cp.categoria_id = cf.id
       WHERE cp.id = ?`,
      [req.params.id]
    );
    if (!conta) return res.status(404).json({ erro: "Conta não encontrada." });
    res.json(conta);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar conta." });
  }
});

// POST /financeiro/contas-pagar
router.post("/contas-pagar", auth, async (req, res) => {
  try {
    const {
      descricao, categoria_id, fornecedor, valor, data_emissao,
      data_vencimento, forma_pagamento, recorrente, recorrencia_tipo,
      recorrencia_fim, total_parcelas, numero_documento,
      codigo_barras, observacoes,
    } = req.body;

    if (!descricao || !valor || !data_vencimento) {
      return res.status(400).json({ erro: "Descrição, valor e vencimento são obrigatórios." });
    }

    const parcelas = total_parcelas || 1;
    const valorParcela = valor / parcelas;

    // Gerar parcelas
    for (let i = 0; i < parcelas; i++) {
      const venc = new Date(data_vencimento);
      venc.setMonth(venc.getMonth() + i);
      const vencStr = venc.toISOString().split("T")[0];

      await dbRun(
        `INSERT INTO contas_pagar
           (descricao, categoria_id, fornecedor, valor, data_emissao,
            data_vencimento, forma_pagamento, recorrente, recorrencia_tipo,
            recorrencia_fim, parcela_atual, total_parcelas,
            numero_documento, codigo_barras, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parcelas > 1 ? `${descricao} (${i + 1}/${parcelas})` : descricao,
          categoria_id || null, fornecedor || null, valorParcela,
          data_emissao || new Date().toISOString().split("T")[0],
          vencStr, forma_pagamento || null, recorrente || 0,
          recorrencia_tipo || null, recorrencia_fim || null,
          i + 1, parcelas, numero_documento || null,
          codigo_barras || null, observacoes || null,
        ]
      );
    }

    res.status(201).json({ mensagem: `${parcelas} parcela(s) criada(s) com sucesso.` });
  } catch (error) {
    console.error("Erro ao criar conta a pagar:", error);
    res.status(500).json({ erro: "Erro ao criar conta a pagar." });
  }
});

// PUT /financeiro/contas-pagar/:id
router.put("/contas-pagar/:id", auth, async (req, res) => {
  try {
    const {
      descricao, categoria_id, fornecedor, valor, data_emissao,
      data_vencimento, forma_pagamento, numero_documento,
      codigo_barras, observacoes,
    } = req.body;

    await dbRun(
      `UPDATE contas_pagar
       SET descricao = ?, categoria_id = ?, fornecedor = ?, valor = ?,
           data_emissao = ?, data_vencimento = ?, forma_pagamento = ?,
           numero_documento = ?, codigo_barras = ?, observacoes = ?
       WHERE id = ?`,
      [
        descricao, categoria_id, fornecedor, valor, data_emissao,
        data_vencimento, forma_pagamento, numero_documento,
        codigo_barras, observacoes, req.params.id,
      ]
    );

    res.json({ mensagem: "Conta atualizada." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao atualizar conta." });
  }
});

// PUT /financeiro/contas-pagar/:id/pagar
router.put("/contas-pagar/:id/pagar", auth, async (req, res) => {
  try {
    const { valor_pago, data_pagamento, forma_pagamento } = req.body;
    const conta = await dbGet("SELECT * FROM contas_pagar WHERE id = ?", [req.params.id]);
    if (!conta) return res.status(404).json({ erro: "Conta não encontrada." });

    const novoValorPago = (conta.valor_pago || 0) + (valor_pago || conta.valor);
    const novoStatus = novoValorPago >= conta.valor ? "pago" : "parcial";

    await dbRun(
      `UPDATE contas_pagar
       SET valor_pago = ?, data_pagamento = ?, forma_pagamento = ?, status = ?
       WHERE id = ?`,
      [
        novoValorPago,
        data_pagamento || new Date().toISOString().split("T")[0],
        forma_pagamento || conta.forma_pagamento,
        novoStatus,
        req.params.id,
      ]
    );

    // Registrar no fluxo de caixa
    await dbRun(
      `INSERT INTO fluxo_caixa (tipo, categoria_id, conta_pagar_id, descricao, valor, data, forma_pagamento)
       VALUES ('saida', ?, ?, ?, ?, ?, ?)`,
      [
        conta.categoria_id,
        conta.id,
        `Pgto: ${conta.descricao}`,
        valor_pago || conta.valor,
        data_pagamento || new Date().toISOString().split("T")[0],
        forma_pagamento || conta.forma_pagamento,
      ]
    );

    res.json({ mensagem: "Pagamento registrado.", status: novoStatus });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao registrar pagamento." });
  }
});

// DELETE /financeiro/contas-pagar/:id
router.delete("/contas-pagar/:id", auth, async (req, res) => {
  try {
    const conta = await dbGet("SELECT * FROM contas_pagar WHERE id = ?", [req.params.id]);
    if (!conta) return res.status(404).json({ erro: "Conta não encontrada." });
    if (conta.status === "pago") {
      return res.status(400).json({ erro: "Não é possível excluir conta já paga." });
    }

    await dbRun("DELETE FROM contas_pagar WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Conta excluída." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao excluir conta." });
  }
});

/* ══════════════════════════════════════════════════════════════
   4. CONTAS A RECEBER
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/contas-receber?status=pendente&paciente_id=1
router.get("/contas-receber", auth, async (req, res) => {
  try {
    const { status, paciente_id, profissional_id, mes, ano, data_inicio, data_fim } = req.query;
    let sql = `
      SELECT cr.*, p.nome as paciente_nome, prof.nome as profissional_nome
      FROM contas_receber cr
      LEFT JOIN pacientes p ON cr.paciente_id = p.id
      LEFT JOIN profissionais prof ON cr.profissional_id = prof.id
      WHERE 1=1
    `;
    const params = [];

    if (status) { sql += " AND cr.status = ?"; params.push(status); }
    if (paciente_id) { sql += " AND cr.paciente_id = ?"; params.push(paciente_id); }
    if (profissional_id) { sql += " AND cr.profissional_id = ?"; params.push(profissional_id); }
    if (mes && ano) {
      sql += " AND strftime('%Y-%m', cr.data_vencimento) = ?";
      params.push(`${ano}-${String(mes).padStart(2, "0")}`);
    }
    if (data_inicio) { sql += " AND cr.data_vencimento >= ?"; params.push(data_inicio); }
    if (data_fim) { sql += " AND cr.data_vencimento <= ?"; params.push(data_fim); }

    sql += " ORDER BY cr.data_vencimento ASC";
    const contas = await dbAll(sql, params);

    const resumo = await dbGet(`
      SELECT
        COALESCE(SUM(CASE WHEN status IN ('pendente','parcial') THEN valor - valor_recebido ELSE 0 END), 0) as total_pendente,
        COALESCE(SUM(CASE WHEN status = 'pago' THEN valor_recebido ELSE 0 END), 0) as total_recebido,
        COALESCE(SUM(CASE WHEN status IN ('pendente','parcial') AND data_vencimento < date('now') THEN valor - valor_recebido ELSE 0 END), 0) as total_vencido,
        COUNT(CASE WHEN status IN ('pendente','parcial') AND data_vencimento < date('now') THEN 1 END) as qtd_vencidas
      FROM contas_receber
    `);

    res.json({ contas, resumo });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao listar contas a receber." });
  }
});

// POST /financeiro/contas-receber
router.post("/contas-receber", auth, async (req, res) => {
  try {
    const {
      paciente_id, orcamento_id, tratamento_id, profissional_id,
      descricao, procedimento, valor, desconto, data_emissao,
      data_vencimento, forma_pagamento, total_parcelas, numero_nota, observacoes,
    } = req.body;

    if (!descricao || !valor || !data_vencimento) {
      return res.status(400).json({ erro: "Descrição, valor e vencimento são obrigatórios." });
    }

    const parcelas = total_parcelas || 1;
    const valorComDesconto = valor - (desconto || 0);
    const valorParcela = valorComDesconto / parcelas;

    for (let i = 0; i < parcelas; i++) {
      const venc = new Date(data_vencimento);
      venc.setMonth(venc.getMonth() + i);
      const vencStr = venc.toISOString().split("T")[0];

      await dbRun(
        `INSERT INTO contas_receber
           (paciente_id, orcamento_id, tratamento_id, profissional_id,
            descricao, procedimento, valor, desconto, data_emissao,
            data_vencimento, forma_pagamento, status,
            parcela_atual, total_parcelas, numero_nota, observacoes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?, ?)`,
        [
          paciente_id || null, orcamento_id || null, tratamento_id || null,
          profissional_id || null,
          parcelas > 1 ? `${descricao} (${i + 1}/${parcelas})` : descricao,
          procedimento || null, valorParcela, i === 0 ? (desconto || 0) : 0,
          data_emissao || new Date().toISOString().split("T")[0],
          vencStr, forma_pagamento || "dinheiro",
          i + 1, parcelas, numero_nota || null, observacoes || null,
        ]
      );
    }

    res.status(201).json({ mensagem: `${parcelas} parcela(s) criada(s).` });
  } catch (error) {
    console.error("Erro ao criar conta a receber:", error);
    res.status(500).json({ erro: "Erro ao criar conta a receber." });
  }
});

// PUT /financeiro/contas-receber/:id
router.put("/contas-receber/:id", auth, async (req, res) => {
  try {
    const {
      descricao, procedimento, valor, desconto, data_emissao,
      data_vencimento, forma_pagamento, numero_nota, observacoes,
      paciente_id, profissional_id,
    } = req.body;

    await dbRun(
      `UPDATE contas_receber
       SET descricao = ?, procedimento = ?, valor = ?, desconto = ?,
           data_emissao = ?, data_vencimento = ?, forma_pagamento = ?,
           numero_nota = ?, observacoes = ?, paciente_id = ?, profissional_id = ?
       WHERE id = ?`,
      [
        descricao, procedimento, valor, desconto, data_emissao,
        data_vencimento, forma_pagamento, numero_nota, observacoes,
        paciente_id, profissional_id, req.params.id,
      ]
    );

    res.json({ mensagem: "Conta atualizada." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao atualizar conta." });
  }
});

// PUT /financeiro/contas-receber/:id/receber
router.put("/contas-receber/:id/receber", auth, async (req, res) => {
  try {
    const { valor_recebido, data_recebimento, forma_pagamento } = req.body;
    const conta = await dbGet("SELECT * FROM contas_receber WHERE id = ?", [req.params.id]);
    if (!conta) return res.status(404).json({ erro: "Conta não encontrada." });

    const novoValorRecebido = (conta.valor_recebido || 0) + (valor_recebido || conta.valor);
    const novoStatus = novoValorRecebido >= conta.valor ? "pago" : "parcial";

    await dbRun(
      `UPDATE contas_receber
       SET valor_recebido = ?, data_recebimento = ?, forma_pagamento = ?, status = ?
       WHERE id = ?`,
      [
        novoValorRecebido,
        data_recebimento || new Date().toISOString().split("T")[0],
        forma_pagamento || conta.forma_pagamento,
        novoStatus,
        req.params.id,
      ]
    );

    // Registrar no fluxo de caixa
    await dbRun(
      `INSERT INTO fluxo_caixa (tipo, conta_receber_id, descricao, valor, data, forma_pagamento)
       VALUES ('entrada', ?, ?, ?, ?, ?)`,
      [
        conta.id,
        `Receb: ${conta.descricao}`,
        valor_recebido || conta.valor,
        data_recebimento || new Date().toISOString().split("T")[0],
        forma_pagamento || conta.forma_pagamento,
      ]
    );

    // Gerar comissão automaticamente se houver profissional
    if (conta.profissional_id && novoStatus === "pago") {
      const prof = await dbGet("SELECT * FROM profissionais WHERE id = ?", [conta.profissional_id]);
      if (prof && prof.ativo) {
        let valorComissao = 0;
        if (prof.tipo_comissao === "percentual") {
          valorComissao = (conta.valor * prof.percentual_comissao) / 100;
        } else {
          valorComissao = prof.valor_fixo_comissao;
        }

        if (valorComissao > 0) {
          await dbRun(
            `INSERT INTO comissoes
               (profissional_id, conta_receber_id, paciente_id, procedimento,
                valor_procedimento, percentual, valor_comissao, data_referencia, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente')`,
            [
              prof.id, conta.id, conta.paciente_id, conta.procedimento,
              conta.valor, prof.percentual_comissao, valorComissao,
              data_recebimento || new Date().toISOString().split("T")[0],
            ]
          );
        }
      }
    }

    res.json({ mensagem: "Recebimento registrado.", status: novoStatus });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao registrar recebimento." });
  }
});

// DELETE /financeiro/contas-receber/:id
router.delete("/contas-receber/:id", auth, async (req, res) => {
  try {
    const conta = await dbGet("SELECT * FROM contas_receber WHERE id = ?", [req.params.id]);
    if (!conta) return res.status(404).json({ erro: "Conta não encontrada." });
    if (conta.status === "pago") {
      return res.status(400).json({ erro: "Não é possível excluir conta já recebida." });
    }

    await dbRun("DELETE FROM contas_receber WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Conta excluída." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao excluir conta." });
  }
});

/* ══════════════════════════════════════════════════════════════
   5. FLUXO DE CAIXA
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/fluxo-caixa?periodo=mensal&mes=3&ano=2026
router.get("/fluxo-caixa", auth, async (req, res) => {
  try {
    const now = new Date();
    const mes = parseInt(req.query.mes) || now.getMonth() + 1;
    const ano = parseInt(req.query.ano) || now.getFullYear();
    const periodo = req.query.periodo || "mensal"; // mensal | semanal

    let movimentacoes;

    if (periodo === "semanal") {
      // Últimas 4 semanas
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 28);
      const dataInicioStr = dataInicio.toISOString().split("T")[0];

      movimentacoes = await dbAll(
        `SELECT * FROM fluxo_caixa
         WHERE data >= ?
         ORDER BY data ASC, id ASC`,
        [dataInicioStr]
      );
    } else {
      const mesStr = String(mes).padStart(2, "0");
      movimentacoes = await dbAll(
        `SELECT * FROM fluxo_caixa
         WHERE strftime('%Y-%m', data) = ?
         ORDER BY data ASC, id ASC`,
        [`${ano}-${mesStr}`]
      );
    }

    // Calcular saldo acumulado
    let saldoAcumulado = 0;
    const movComSaldo = movimentacoes.map((m) => {
      if (m.tipo === "entrada") {
        saldoAcumulado += m.valor;
      } else {
        saldoAcumulado -= m.valor;
      }
      return { ...m, saldo_acumulado: saldoAcumulado };
    });

    // Agrupar por dia
    const porDia = {};
    movComSaldo.forEach((m) => {
      if (!porDia[m.data]) {
        porDia[m.data] = { data: m.data, entradas: 0, saidas: 0, movimentacoes: [] };
      }
      if (m.tipo === "entrada") {
        porDia[m.data].entradas += m.valor;
      } else {
        porDia[m.data].saidas += m.valor;
      }
      porDia[m.data].movimentacoes.push(m);
    });

    const totalEntradas = movimentacoes
      .filter((m) => m.tipo === "entrada")
      .reduce((s, m) => s + m.valor, 0);
    const totalSaidas = movimentacoes
      .filter((m) => m.tipo === "saida")
      .reduce((s, m) => s + m.valor, 0);

    // Projeção: contas pendentes pro restante do mês
    const mesStr = String(mes).padStart(2, "0");
    const hoje = new Date().toISOString().split("T")[0];

    const projecaoReceber = await dbGet(
      `SELECT COALESCE(SUM(valor - valor_recebido), 0) as total
       FROM contas_receber
       WHERE status IN ('pendente','parcial')
         AND strftime('%Y-%m', data_vencimento) = ?
         AND data_vencimento >= ?`,
      [`${ano}-${mesStr}`, hoje]
    );

    const projecaoPagar = await dbGet(
      `SELECT COALESCE(SUM(valor - valor_pago), 0) as total
       FROM contas_pagar
       WHERE status IN ('pendente','parcial')
         AND strftime('%Y-%m', data_vencimento) = ?
         AND data_vencimento >= ?`,
      [`${ano}-${mesStr}`, hoje]
    );

    res.json({
      periodo: { tipo: periodo, mes, ano },
      movimentacoes: movComSaldo,
      por_dia: Object.values(porDia),
      totais: {
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldo: totalEntradas - totalSaidas,
      },
      projecao: {
        a_receber: projecaoReceber?.total || 0,
        a_pagar: projecaoPagar?.total || 0,
        saldo_projetado: saldoAcumulado + (projecaoReceber?.total || 0) - (projecaoPagar?.total || 0),
      },
    });
  } catch (error) {
    console.error("Erro no fluxo de caixa:", error);
    res.status(500).json({ erro: "Erro ao carregar fluxo de caixa." });
  }
});

// POST /financeiro/fluxo-caixa (lançamento manual)
router.post("/fluxo-caixa", auth, async (req, res) => {
  try {
    const { tipo, categoria_id, descricao, valor, data, forma_pagamento, observacoes } = req.body;

    if (!tipo || !descricao || !valor || !data) {
      return res.status(400).json({ erro: "Tipo, descrição, valor e data são obrigatórios." });
    }

    const result = await dbRun(
      `INSERT INTO fluxo_caixa (tipo, categoria_id, descricao, valor, data, forma_pagamento, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tipo, categoria_id || null, descricao, valor, data, forma_pagamento || null, observacoes || null]
    );

    res.status(201).json({ id: result.lastID, mensagem: "Lançamento registrado." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao registrar lançamento." });
  }
});

// DELETE /financeiro/fluxo-caixa/:id
router.delete("/fluxo-caixa/:id", auth, async (req, res) => {
  try {
    await dbRun("DELETE FROM fluxo_caixa WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Lançamento excluído." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao excluir lançamento." });
  }
});

/* ══════════════════════════════════════════════════════════════
   6. INADIMPLÊNCIA
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/inadimplencia
router.get("/inadimplencia", auth, async (req, res) => {
  try {
    // Contas a receber vencidas agrupadas por paciente
    const inadimplentes = await dbAll(`
      SELECT
        p.id as paciente_id,
        p.nome as paciente_nome,
        p.telefone as paciente_telefone,
        p.email as paciente_email,
        COUNT(cr.id) as total_contas,
        COALESCE(SUM(cr.valor - cr.valor_recebido), 0) as valor_total_devido,
        MIN(cr.data_vencimento) as vencimento_mais_antigo,
        MAX(cr.data_vencimento) as vencimento_mais_recente,
        CAST(julianday('now') - julianday(MIN(cr.data_vencimento)) AS INTEGER) as dias_atraso_max
      FROM contas_receber cr
      INNER JOIN pacientes p ON cr.paciente_id = p.id
      WHERE cr.status IN ('pendente', 'parcial')
        AND cr.data_vencimento < date('now')
      GROUP BY p.id
      ORDER BY valor_total_devido DESC
    `);

    // Classificar por gravidade
    const classificados = inadimplentes.map((i) => {
      let gravidade = "leve";
      let cor = "#eab308";
      if (i.dias_atraso_max > 90) {
        gravidade = "critico";
        cor = "#dc2626";
      } else if (i.dias_atraso_max > 30) {
        gravidade = "moderado";
        cor = "#f97316";
      }
      return { ...i, gravidade, cor };
    });

    // Resumo geral
    const resumo = {
      total_inadimplentes: classificados.length,
      valor_total: classificados.reduce((s, i) => s + i.valor_total_devido, 0),
      criticos: classificados.filter((i) => i.gravidade === "critico").length,
      moderados: classificados.filter((i) => i.gravidade === "moderado").length,
      leves: classificados.filter((i) => i.gravidade === "leve").length,
    };

    // Detalhes por paciente (contas individuais)
    for (const inad of classificados) {
      inad.contas = await dbAll(
        `SELECT id, descricao, procedimento, valor, valor_recebido,
                (valor - valor_recebido) as valor_restante,
                data_vencimento, forma_pagamento,
                CAST(julianday('now') - julianday(data_vencimento) AS INTEGER) as dias_atraso
         FROM contas_receber
         WHERE paciente_id = ? AND status IN ('pendente', 'parcial')
           AND data_vencimento < date('now')
         ORDER BY data_vencimento ASC`,
        [inad.paciente_id]
      );
    }

    res.json({ inadimplentes: classificados, resumo });
  } catch (error) {
    console.error("Erro no relatório de inadimplência:", error);
    res.status(500).json({ erro: "Erro ao gerar relatório de inadimplência." });
  }
});

/* ══════════════════════════════════════════════════════════════
   7. PROFISSIONAIS
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/profissionais
router.get("/profissionais", auth, async (req, res) => {
  try {
    const profissionais = await dbAll(
      "SELECT * FROM profissionais WHERE ativo = 1 ORDER BY nome"
    );
    res.json(profissionais);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao listar profissionais." });
  }
});

// POST /financeiro/profissionais
router.post("/profissionais", auth, async (req, res) => {
  try {
    const {
      nome, cpf, cro, especialidade, telefone, email,
      tipo, percentual_comissao, valor_fixo_comissao, tipo_comissao, observacoes,
    } = req.body;

    if (!nome) return res.status(400).json({ erro: "Nome é obrigatório." });

    const result = await dbRun(
      `INSERT INTO profissionais
         (nome, cpf, cro, especialidade, telefone, email, tipo,
          percentual_comissao, valor_fixo_comissao, tipo_comissao, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nome, cpf || null, cro || null, especialidade || null,
        telefone || null, email || null, tipo || "dentista",
        percentual_comissao || 0, valor_fixo_comissao || 0,
        tipo_comissao || "percentual", observacoes || null,
      ]
    );

    res.status(201).json({ id: result.lastID, mensagem: "Profissional cadastrado." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao cadastrar profissional." });
  }
});

// PUT /financeiro/profissionais/:id
router.put("/profissionais/:id", auth, async (req, res) => {
  try {
    const {
      nome, cpf, cro, especialidade, telefone, email,
      tipo, percentual_comissao, valor_fixo_comissao, tipo_comissao, observacoes,
    } = req.body;

    await dbRun(
      `UPDATE profissionais
       SET nome = ?, cpf = ?, cro = ?, especialidade = ?, telefone = ?,
           email = ?, tipo = ?, percentual_comissao = ?, valor_fixo_comissao = ?,
           tipo_comissao = ?, observacoes = ?
       WHERE id = ?`,
      [
        nome, cpf, cro, especialidade, telefone, email, tipo,
        percentual_comissao, valor_fixo_comissao, tipo_comissao,
        observacoes, req.params.id,
      ]
    );

    res.json({ mensagem: "Profissional atualizado." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao atualizar profissional." });
  }
});

// DELETE /financeiro/profissionais/:id (soft delete)
router.delete("/profissionais/:id", auth, async (req, res) => {
  try {
    await dbRun("UPDATE profissionais SET ativo = 0 WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Profissional desativado." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao desativar profissional." });
  }
});

/* ══════════════════════════════════════════════════════════════
   8. COMISSÕES
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/comissoes?profissional_id=1&mes=3&ano=2026&status=pendente
router.get("/comissoes", auth, async (req, res) => {
  try {
    const { profissional_id, mes, ano, status } = req.query;
    let sql = `
      SELECT c.*, pr.nome as profissional_nome, pr.cro as profissional_cro,
             p.nome as paciente_nome
      FROM comissoes c
      INNER JOIN profissionais pr ON c.profissional_id = pr.id
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (profissional_id) { sql += " AND c.profissional_id = ?"; params.push(profissional_id); }
    if (status) { sql += " AND c.status = ?"; params.push(status); }
    if (mes && ano) {
      sql += " AND strftime('%Y-%m', c.data_referencia) = ?";
      params.push(`${ano}-${String(mes).padStart(2, "0")}`);
    }

    sql += " ORDER BY c.data_referencia DESC";
    const comissoes = await dbAll(sql, params);

    // Resumo por profissional
    const resumoPorProf = {};
    comissoes.forEach((c) => {
      if (!resumoPorProf[c.profissional_id]) {
        resumoPorProf[c.profissional_id] = {
          profissional_id: c.profissional_id,
          profissional_nome: c.profissional_nome,
          profissional_cro: c.profissional_cro,
          total_comissao: 0,
          total_pendente: 0,
          total_pago: 0,
          quantidade: 0,
        };
      }
      resumoPorProf[c.profissional_id].total_comissao += c.valor_comissao;
      resumoPorProf[c.profissional_id].quantidade += 1;
      if (c.status === "pendente") {
        resumoPorProf[c.profissional_id].total_pendente += c.valor_comissao;
      } else {
        resumoPorProf[c.profissional_id].total_pago += c.valor_comissao;
      }
    });

    res.json({
      comissoes,
      resumo_profissionais: Object.values(resumoPorProf),
      total_geral: comissoes.reduce((s, c) => s + c.valor_comissao, 0),
      total_pendente: comissoes.filter((c) => c.status === "pendente").reduce((s, c) => s + c.valor_comissao, 0),
      total_pago: comissoes.filter((c) => c.status === "pago").reduce((s, c) => s + c.valor_comissao, 0),
    });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao listar comissões." });
  }
});

// PUT /financeiro/comissoes/:id/pagar
router.put("/comissoes/:id/pagar", auth, async (req, res) => {
  try {
    const { data_pagamento } = req.body;
    const comissao = await dbGet("SELECT * FROM comissoes WHERE id = ?", [req.params.id]);
    if (!comissao) return res.status(404).json({ erro: "Comissão não encontrada." });

    await dbRun(
      "UPDATE comissoes SET status = 'pago', data_pagamento = ? WHERE id = ?",
      [data_pagamento || new Date().toISOString().split("T")[0], req.params.id]
    );

    // Registrar saída no fluxo
    await dbRun(
      `INSERT INTO fluxo_caixa (tipo, descricao, valor, data, forma_pagamento)
       VALUES ('saida', ?, ?, ?, 'transferencia')`,
      [
        `Comissão: ${comissao.procedimento || "Procedimento"}`,
        comissao.valor_comissao,
        data_pagamento || new Date().toISOString().split("T")[0],
      ]
    );

    res.json({ mensagem: "Comissão paga com sucesso." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao pagar comissão." });
  }
});

// PUT /financeiro/comissoes/pagar-lote
router.put("/comissoes/pagar-lote", auth, async (req, res) => {
  try {
    const { ids, data_pagamento } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ erro: "Selecione comissões." });

    const dataPgto = data_pagamento || new Date().toISOString().split("T")[0];

    for (const id of ids) {
      const comissao = await dbGet("SELECT * FROM comissoes WHERE id = ? AND status = 'pendente'", [id]);
      if (comissao) {
        await dbRun("UPDATE comissoes SET status = 'pago', data_pagamento = ? WHERE id = ?", [dataPgto, id]);
        await dbRun(
          `INSERT INTO fluxo_caixa (tipo, descricao, valor, data, forma_pagamento)
           VALUES ('saida', ?, ?, ?, 'transferencia')`,
          [`Comissão: ${comissao.procedimento || "Procedimento"}`, comissao.valor_comissao, dataPgto]
        );
      }
    }

    res.json({ mensagem: `${ids.length} comissão(ões) paga(s).` });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao pagar comissões em lote." });
  }
});

/* ══════════════════════════════════════════════════════════════
   9. FORMAS DE PAGAMENTO (CONFIG)
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/formas-pagamento
router.get("/formas-pagamento", auth, async (req, res) => {
  try {
    const formas = await dbAll(
      "SELECT * FROM formas_pagamento_config WHERE ativo = 1 ORDER BY nome"
    );
    res.json(formas);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao listar formas de pagamento." });
  }
});

// POST /financeiro/formas-pagamento
router.post("/formas-pagamento", auth, async (req, res) => {
  try {
    const { nome, tipo, taxa_percentual, taxa_fixa, prazo_recebimento, max_parcelas } = req.body;
    if (!nome) return res.status(400).json({ erro: "Nome é obrigatório." });

    const result = await dbRun(
      `INSERT INTO formas_pagamento_config
         (nome, tipo, taxa_percentual, taxa_fixa, prazo_recebimento, max_parcelas)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nome, tipo || "outros", taxa_percentual || 0, taxa_fixa || 0, prazo_recebimento || 0, max_parcelas || 1]
    );

    res.status(201).json({ id: result.lastID, mensagem: "Forma de pagamento criada." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao criar forma de pagamento." });
  }
});

// PUT /financeiro/formas-pagamento/:id
router.put("/formas-pagamento/:id", auth, async (req, res) => {
  try {
    const { nome, tipo, taxa_percentual, taxa_fixa, prazo_recebimento, max_parcelas } = req.body;
    await dbRun(
      `UPDATE formas_pagamento_config
       SET nome = ?, tipo = ?, taxa_percentual = ?, taxa_fixa = ?,
           prazo_recebimento = ?, max_parcelas = ?
       WHERE id = ?`,
      [nome, tipo, taxa_percentual, taxa_fixa, prazo_recebimento, max_parcelas, req.params.id]
    );
    res.json({ mensagem: "Forma de pagamento atualizada." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao atualizar forma de pagamento." });
  }
});

// DELETE /financeiro/formas-pagamento/:id
router.delete("/formas-pagamento/:id", auth, async (req, res) => {
  try {
    await dbRun("UPDATE formas_pagamento_config SET ativo = 0 WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Forma de pagamento desativada." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao desativar forma de pagamento." });
  }
});

/* ══════════════════════════════════════════════════════════════
   10. METAS FINANCEIRAS
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/metas?ano=2026
router.get("/metas", auth, async (req, res) => {
  try {
    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const metas = await dbAll("SELECT * FROM metas_financeiras WHERE ano = ? ORDER BY mes", [ano]);
    res.json(metas);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao listar metas." });
  }
});

// POST /financeiro/metas
router.post("/metas", auth, async (req, res) => {
  try {
    const { titulo, tipo, valor_meta, mes, ano, observacoes } = req.body;
    if (!titulo || !valor_meta || !mes || !ano) {
      return res.status(400).json({ erro: "Título, valor, mês e ano são obrigatórios." });
    }

    // Verificar se já existe meta para o mesmo mês/ano/tipo
    const existente = await dbGet(
      "SELECT id FROM metas_financeiras WHERE mes = ? AND ano = ? AND tipo = ?",
      [mes, ano, tipo || "receita"]
    );

    if (existente) {
      await dbRun(
        "UPDATE metas_financeiras SET titulo = ?, valor_meta = ?, observacoes = ? WHERE id = ?",
        [titulo, valor_meta, observacoes || null, existente.id]
      );
      return res.json({ mensagem: "Meta atualizada." });
    }

    const result = await dbRun(
      `INSERT INTO metas_financeiras (titulo, tipo, valor_meta, mes, ano, observacoes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [titulo, tipo || "receita", valor_meta, mes, ano, observacoes || null]
    );

    res.status(201).json({ id: result.lastID, mensagem: "Meta criada." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao criar meta." });
  }
});

// DELETE /financeiro/metas/:id
router.delete("/metas/:id", auth, async (req, res) => {
  try {
    await dbRun("DELETE FROM metas_financeiras WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Meta excluída." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao excluir meta." });
  }
});

/* ══════════════════════════════════════════════════════════════
   11. DRE SIMPLIFICADO
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/dre?mes=3&ano=2026
router.get("/dre", auth, async (req, res) => {
  try {
    const now = new Date();
    const mes = parseInt(req.query.mes) || now.getMonth() + 1;
    const ano = parseInt(req.query.ano) || now.getFullYear();
    const mesStr = String(mes).padStart(2, "0");
    const periodo = `${ano}-${mesStr}`;

    // Receitas por categoria
    const receitas = await dbAll(
      `SELECT
         COALESCE(cr.procedimento, 'Outros') as categoria,
         COALESCE(SUM(cr.valor_recebido), 0) as total
       FROM contas_receber cr
       WHERE cr.status = 'pago' AND strftime('%Y-%m', cr.data_recebimento) = ?
       GROUP BY cr.procedimento
       ORDER BY total DESC`,
      [periodo]
    );

    // Receitas legadas
    const receitasLegado = await dbAll(
      `SELECT
         COALESCE(pg.descricao, 'Procedimento') as categoria,
         COALESCE(SUM(pg.valor), 0) as total
       FROM pagamentos pg
       WHERE pg.status = 'confirmado' AND strftime('%Y-%m', pg.data) = ?
       GROUP BY pg.descricao
       ORDER BY total DESC`,
      [periodo]
    );

    // Despesas por categoria
    const despesas = await dbAll(
      `SELECT
         COALESCE(cf.nome, 'Sem categoria') as categoria,
         cf.cor,
         COALESCE(SUM(cp.valor_pago), 0) as total
       FROM contas_pagar cp
       LEFT JOIN categorias_financeiras cf ON cp.categoria_id = cf.id
       WHERE cp.status = 'pago' AND strftime('%Y-%m', cp.data_pagamento) = ?
       GROUP BY cp.categoria_id
       ORDER BY total DESC`,
      [periodo]
    );

    // Comissões do mês
    const comissoes = await dbGet(
      `SELECT COALESCE(SUM(valor_comissao), 0) as total
       FROM comissoes
       WHERE strftime('%Y-%m', data_referencia) = ?`,
      [periodo]
    );

    const totalReceitas = receitas.reduce((s, r) => s + r.total, 0)
      + receitasLegado.reduce((s, r) => s + r.total, 0);
    const totalDespesas = despesas.reduce((s, d) => s + d.total, 0);
    const totalComissoes = comissoes?.total || 0;
    const lucroOperacional = totalReceitas - totalDespesas;
    const lucroLiquido = lucroOperacional - totalComissoes;

    res.json({
      periodo: { mes, ano },
      receitas: {
        itens: [...receitas, ...receitasLegado],
        total: totalReceitas,
      },
      despesas: {
        itens: despesas,
        total: totalDespesas,
      },
      comissoes: totalComissoes,
            lucro_operacional: lucroOperacional,
      lucro_liquido: lucroLiquido,
      margem_operacional: totalReceitas > 0 ? ((lucroOperacional / totalReceitas) * 100).toFixed(1) : 0,
      margem_liquida: totalReceitas > 0 ? ((lucroLiquido / totalReceitas) * 100).toFixed(1) : 0,
    });
  } catch (error) {
    console.error("Erro no DRE:", error);
    res.status(500).json({ erro: "Erro ao gerar DRE." });
  }
});

/* ══════════════════════════════════════════════════════════════
   12. KPIs E INDICADORES
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/kpis?mes=3&ano=2026
router.get("/kpis", auth, async (req, res) => {
  try {
    const now = new Date();
    const mes = parseInt(req.query.mes) || now.getMonth() + 1;
    const ano = parseInt(req.query.ano) || now.getFullYear();
    const mesStr = String(mes).padStart(2, "0");
    const periodo = `${ano}-${mesStr}`;

    // Ticket médio
    const ticketMedio = await dbGet(
      `SELECT
         COUNT(*) as total_recebimentos,
         COALESCE(AVG(valor_recebido), 0) as ticket_medio
       FROM contas_receber
       WHERE status = 'pago' AND strftime('%Y-%m', data_recebimento) = ?`,
      [periodo]
    );

    // Taxa de conversão (orçamentos aprovados vs total)
    const orcamentos = await dbGet(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'aprovado' THEN 1 END) as aprovados
       FROM orcamentos
       WHERE strftime('%Y-%m', data) = ?`,
      [periodo]
    );

    // Receita por procedimento (top 5)
    const topProcedimentos = await dbAll(
      `SELECT
         COALESCE(procedimento, 'Outros') as procedimento,
         COUNT(*) as quantidade,
         COALESCE(SUM(valor_recebido), 0) as receita_total,
         COALESCE(AVG(valor_recebido), 0) as valor_medio
       FROM contas_receber
       WHERE status = 'pago' AND strftime('%Y-%m', data_recebimento) = ?
       GROUP BY procedimento
       ORDER BY receita_total DESC
       LIMIT 5`,
      [periodo]
    );

    // Receita por profissional
    const receitaPorProfissional = await dbAll(
      `SELECT
         pr.nome as profissional,
         COUNT(cr.id) as atendimentos,
         COALESCE(SUM(cr.valor_recebido), 0) as receita_total
       FROM contas_receber cr
       INNER JOIN profissionais pr ON cr.profissional_id = pr.id
       WHERE cr.status = 'pago' AND strftime('%Y-%m', cr.data_recebimento) = ?
       GROUP BY cr.profissional_id
       ORDER BY receita_total DESC`,
      [periodo]
    );

    // Pacientes novos no mês
    const pacientesNovos = await dbGet(
      `SELECT COUNT(*) as total
       FROM pacientes
       WHERE strftime('%Y-%m', COALESCE(data_nascimento, '')) != ?`,
      [periodo]
    );

    // Comparativo com mês anterior
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const anoAnterior = mes === 1 ? ano - 1 : ano;
    const periodoAnterior = `${anoAnterior}-${String(mesAnterior).padStart(2, "0")}`;

    const receitaMesAnterior = await dbGet(
      `SELECT COALESCE(SUM(valor_recebido), 0) as total
       FROM contas_receber
       WHERE status = 'pago' AND strftime('%Y-%m', data_recebimento) = ?`,
      [periodoAnterior]
    );

    const receitaMesAtual = await dbGet(
      `SELECT COALESCE(SUM(valor_recebido), 0) as total
       FROM contas_receber
       WHERE status = 'pago' AND strftime('%Y-%m', data_recebimento) = ?`,
      [periodo]
    );

    const variacaoReceita = receitaMesAnterior?.total > 0
      ? (((receitaMesAtual?.total - receitaMesAnterior?.total) / receitaMesAnterior?.total) * 100).toFixed(1)
      : 0;

    // Taxa de inadimplência
    const totalFaturado = await dbGet(
      `SELECT COALESCE(SUM(valor), 0) as total FROM contas_receber
       WHERE strftime('%Y-%m', data_vencimento) = ?`,
      [periodo]
    );

    const totalInadimplente = await dbGet(
      `SELECT COALESCE(SUM(valor - valor_recebido), 0) as total
       FROM contas_receber
       WHERE status IN ('pendente','parcial')
         AND data_vencimento < date('now')
         AND strftime('%Y-%m', data_vencimento) = ?`,
      [periodo]
    );

    const taxaInadimplencia = totalFaturado?.total > 0
      ? ((totalInadimplente?.total / totalFaturado?.total) * 100).toFixed(1)
      : 0;

    res.json({
      periodo: { mes, ano },
      ticket_medio: ticketMedio?.ticket_medio || 0,
      total_recebimentos: ticketMedio?.total_recebimentos || 0,
      taxa_conversao: orcamentos?.total > 0
        ? ((orcamentos.aprovados / orcamentos.total) * 100).toFixed(1)
        : 0,
      orcamentos: {
        total: orcamentos?.total || 0,
        aprovados: orcamentos?.aprovados || 0,
      },
      top_procedimentos: topProcedimentos,
      receita_por_profissional: receitaPorProfissional,
      variacao_receita: {
        percentual: variacaoReceita,
        mes_atual: receitaMesAtual?.total || 0,
        mes_anterior: receitaMesAnterior?.total || 0,
      },
      taxa_inadimplencia: taxaInadimplencia,
    });
  } catch (error) {
    console.error("Erro nos KPIs:", error);
    res.status(500).json({ erro: "Erro ao calcular KPIs." });
  }
});

/* ══════════════════════════════════════════════════════════════
   13. EXPORTAÇÃO CSV
   ══════════════════════════════════════════════════════════════ */

// GET /financeiro/exportar/contas-pagar?mes=3&ano=2026
router.get("/exportar/contas-pagar", auth, async (req, res) => {
  try {
    const { mes, ano, status } = req.query;
    let sql = `
      SELECT cp.descricao, cp.fornecedor, cp.valor, cp.valor_pago,
             cp.data_vencimento, cp.data_pagamento, cp.forma_pagamento,
             cp.status, cf.nome as categoria
      FROM contas_pagar cp
      LEFT JOIN categorias_financeiras cf ON cp.categoria_id = cf.id
      WHERE 1=1
    `;
    const params = [];

    if (mes && ano) {
      sql += " AND strftime('%Y-%m', cp.data_vencimento) = ?";
      params.push(`${ano}-${String(mes).padStart(2, "0")}`);
    }
    if (status) { sql += " AND cp.status = ?"; params.push(status); }

    sql += " ORDER BY cp.data_vencimento ASC";
    const rows = await dbAll(sql, params);

    const header = "Descrição;Fornecedor;Valor;Valor Pago;Vencimento;Pagamento;Forma Pgto;Status;Categoria\n";
    const csv = header + rows.map((r) =>
      `"${r.descricao || ""}";"${r.fornecedor || ""}";"${(r.valor || 0).toFixed(2)}";"${(r.valor_pago || 0).toFixed(2)}";"${r.data_vencimento || ""}";"${r.data_pagamento || ""}";"${r.forma_pagamento || ""}";"${r.status || ""}";"${r.categoria || ""}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=contas_pagar.csv");
    res.send("\uFEFF" + csv);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao exportar." });
  }
});

// GET /financeiro/exportar/contas-receber?mes=3&ano=2026
router.get("/exportar/contas-receber", auth, async (req, res) => {
  try {
    const { mes, ano, status } = req.query;
    let sql = `
      SELECT cr.descricao, p.nome as paciente, cr.procedimento, cr.valor,
             cr.valor_recebido, cr.desconto, cr.data_vencimento,
             cr.data_recebimento, cr.forma_pagamento, cr.status
      FROM contas_receber cr
      LEFT JOIN pacientes p ON cr.paciente_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (mes && ano) {
      sql += " AND strftime('%Y-%m', cr.data_vencimento) = ?";
      params.push(`${ano}-${String(mes).padStart(2, "0")}`);
    }
    if (status) { sql += " AND cr.status = ?"; params.push(status); }

    sql += " ORDER BY cr.data_vencimento ASC";
    const rows = await dbAll(sql, params);

    const header = "Descrição;Paciente;Procedimento;Valor;Recebido;Desconto;Vencimento;Recebimento;Forma Pgto;Status\n";
    const csv = header + rows.map((r) =>
      `"${r.descricao || ""}";"${r.paciente || ""}";"${r.procedimento || ""}";"${(r.valor || 0).toFixed(2)}";"${(r.valor_recebido || 0).toFixed(2)}";"${(r.desconto || 0).toFixed(2)}";"${r.data_vencimento || ""}";"${r.data_recebimento || ""}";"${r.forma_pagamento || ""}";"${r.status || ""}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=contas_receber.csv");
    res.send("\uFEFF" + csv);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao exportar." });
  }
});

// GET /financeiro/exportar/fluxo-caixa?mes=3&ano=2026
router.get("/exportar/fluxo-caixa", auth, async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const now = new Date();
    const m = parseInt(mes) || now.getMonth() + 1;
    const a = parseInt(ano) || now.getFullYear();
    const periodo = `${a}-${String(m).padStart(2, "0")}`;

    const rows = await dbAll(
      `SELECT tipo, descricao, valor, data, forma_pagamento
       FROM fluxo_caixa
       WHERE strftime('%Y-%m', data) = ?
       ORDER BY data ASC`,
      [periodo]
    );

    const header = "Tipo;Descrição;Valor;Data;Forma Pgto\n";
    const csv = header + rows.map((r) =>
      `"${r.tipo || ""}";"${r.descricao || ""}";"${(r.valor || 0).toFixed(2)}";"${r.data || ""}";"${r.forma_pagamento || ""}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=fluxo_caixa.csv");
    res.send("\uFEFF" + csv);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao exportar." });
  }
});

// GET /financeiro/exportar/inadimplencia
router.get("/exportar/inadimplencia", auth, async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT
        p.nome as paciente, p.telefone, p.email,
        cr.descricao, cr.valor, cr.valor_recebido,
        (cr.valor - cr.valor_recebido) as valor_restante,
        cr.data_vencimento,
        CAST(julianday('now') - julianday(cr.data_vencimento) AS INTEGER) as dias_atraso
      FROM contas_receber cr
      INNER JOIN pacientes p ON cr.paciente_id = p.id
      WHERE cr.status IN ('pendente', 'parcial')
        AND cr.data_vencimento < date('now')
      ORDER BY dias_atraso DESC
    `);

    const header = "Paciente;Telefone;Email;Descrição;Valor;Recebido;Restante;Vencimento;Dias Atraso\n";
    const csv = header + rows.map((r) =>
      `"${r.paciente || ""}";"${r.telefone || ""}";"${r.email || ""}";"${r.descricao || ""}";"${(r.valor || 0).toFixed(2)}";"${(r.valor_recebido || 0).toFixed(2)}";"${(r.valor_restante || 0).toFixed(2)}";"${r.data_vencimento || ""}";"${r.dias_atraso || 0}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=inadimplencia.csv");
    res.send("\uFEFF" + csv);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao exportar." });
  }
});

// GET /financeiro/exportar/comissoes?mes=3&ano=2026
router.get("/exportar/comissoes", auth, async (req, res) => {
  try {
    const { mes, ano, profissional_id } = req.query;
    let sql = `
      SELECT pr.nome as profissional, pr.cro, c.procedimento,
             p.nome as paciente, c.valor_procedimento, c.percentual,
             c.valor_comissao, c.data_referencia, c.status, c.data_pagamento
      FROM comissoes c
      INNER JOIN profissionais pr ON c.profissional_id = pr.id
      LEFT JOIN pacientes p ON c.paciente_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (mes && ano) {
      sql += " AND strftime('%Y-%m', c.data_referencia) = ?";
      params.push(`${ano}-${String(mes).padStart(2, "0")}`);
    }
    if (profissional_id) { sql += " AND c.profissional_id = ?"; params.push(profissional_id); }

    sql += " ORDER BY c.data_referencia DESC";
    const rows = await dbAll(sql, params);

    const header = "Profissional;CRO;Procedimento;Paciente;Valor Proc.;% Comissão;Valor Comissão;Data Ref.;Status;Data Pgto\n";
    const csv = header + rows.map((r) =>
      `"${r.profissional || ""}";"${r.cro || ""}";"${r.procedimento || ""}";"${r.paciente || ""}";"${(r.valor_procedimento || 0).toFixed(2)}";"${(r.percentual || 0).toFixed(1)}";"${(r.valor_comissao || 0).toFixed(2)}";"${r.data_referencia || ""}";"${r.status || ""}";"${r.data_pagamento || ""}"`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=comissoes.csv");
    res.send("\uFEFF" + csv);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao exportar." });
  }
});

module.exports = router;
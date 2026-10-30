const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");
const fs = require("fs");
const path = require("path");

// A autorização é validada na API, não apenas na interface.
router.use(auth, requirePermission("pacientes", (req) => {
  if (req.method === "GET" && req.path === "/") return "listar";
  if (req.method === "GET" && req.path.includes("/odontograma")) return "ver_prontuario";
  if (req.method === "GET") return "ver_prontuario";
  if (req.method === "PUT" && req.path.includes("/odontograma")) return "editar";
  if (req.method === "POST") return "criar";
  if (req.method === "PUT" || req.method === "PATCH") return "editar";
  if (req.method === "DELETE") return "excluir";
  return null;
}));


// =========================
// LISTAR PACIENTES (COM PAGINAÇÃO + BUSCA)
// =========================
router.get("/", auth, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const busca = (req.query.busca || "").trim();
  const offset = (page - 1) * limit;

  let whereClause = "WHERE clinica_id = ?";
  let params = [req.user.clinica_id];

  if (busca) {
    whereClause += ` AND (
      nome LIKE ?
      OR cpf LIKE ?
      OR telefone LIKE ?
      OR email LIKE ?
    )`;
    const termo = `%${busca}%`;
    params.push(termo, termo, termo, termo);
  }

  // 1) Conta o total de registros (com ou sem filtro)
  const countSql = `SELECT COUNT(*) as total FROM pacientes ${whereClause}`;

  db.get(countSql, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    }

    const total = countRow.total;
    const totalPages = Math.ceil(total / limit) || 1;

    // 2) Busca a página solicitada
    const dataSql = `
      SELECT * FROM pacientes 
      ${whereClause} 
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `;

    db.all(dataSql, [...params, limit, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }

      res.json({
        dados: rows,
        paginacao: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    });
  });
});


// =========================
// BUSCAR PACIENTE POR ID
// =========================
router.get("/:id", auth, (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM pacientes WHERE id = ? AND clinica_id = ?", [id, req.user.clinica_id], (err, row) => {
    if (err) {
      return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
    }

    if (!row) {
      return res.status(404).json({ erro: "Paciente não encontrado" });
    }

    res.json(row);
  });
});


// =========================
// BUSCAR ODONTOGRAMA
// =========================
router.get("/:id/odontograma", auth, (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT o.mapa
     FROM pacientes p
     LEFT JOIN odontogramas o
       ON o.paciente_id = p.id AND o.clinica_id = p.clinica_id
     WHERE p.id = ? AND p.clinica_id = ?`,
    [id, req.user.clinica_id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }

      if (!row) {
        return res.status(404).json({ erro: "Paciente não encontrado" });
      }

      if (!row.mapa) {
        return res.json({});
      }

      try {
        return res.json(JSON.parse(row.mapa));
      } catch {
        return res.json({});
      }
    }
  );
});


// =========================
// SALVAR ODONTOGRAMA
// =========================
router.put("/:id/odontograma", auth, (req, res) => {
  const { id } = req.params;
  const { mapa } = req.body;

  const mapaString = JSON.stringify(mapa || {});

  // Confirma que o paciente pertence à clínica autenticada antes de ler ou gravar.
  db.get(
    "SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?",
    [id, req.user.clinica_id],
    (patientErr, patient) => {
      if (patientErr) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }
      if (!patient) {
        return res.status(404).json({ erro: "Paciente não encontrado" });
      }

      db.get(
        "SELECT id FROM odontogramas WHERE paciente_id = ? AND clinica_id = ?",
        [id, req.user.clinica_id],
        (err, row) => {
          if (err) {
            return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
          }

          if (row) {
            db.run(
              "UPDATE odontogramas SET mapa = ? WHERE paciente_id = ? AND clinica_id = ?",
              [mapaString, id, req.user.clinica_id],
              function (updateErr) {
                if (updateErr) {
                  return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
                }

                res.json({ message: "Odontograma atualizado com sucesso" });
              }
            );
          } else {
            db.run(
              "INSERT INTO odontogramas (paciente_id, mapa, clinica_id) VALUES (?, ?, ?)",
              [id, mapaString, req.user.clinica_id],
              function (insertErr) {
                if (insertErr) {
                  return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
                }

                res.json({ message: "Odontograma salvo com sucesso" });
              }
            );
          }
        }
      );
    }
  );
});


// =========================
// CADASTRAR PACIENTE
// =========================
router.post("/", auth, (req, res) => {
  const {
    nome,
    telefone,
    email,
    comoConheceu,
    profissao,
    genero,
    dataNascimento,
    cpf,
    observacoes,
    cep,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    responsavelNome,
    responsavelCpf,
    responsavelDataNascimento,
    responsavelTelefone,
  } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome é obrigatório." });
  }

  if (!telefone) {
    return res.status(400).json({ erro: "Telefone é obrigatório." });
  }

  if (!cpf) {
    return res.status(400).json({ erro: "CPF é obrigatório." });
  }

  const sql = `
    INSERT INTO pacientes (
      nome,
      telefone,
      email,
      como_conheceu,
      profissao,
      genero,
      data_nascimento,
      cpf,
      observacoes,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      responsavel_nome,
      responsavel_cpf,
      responsavel_data_nascimento,
      responsavel_telefone,
      clinica_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      nome,
      telefone || "",
      email || "",
      comoConheceu || "",
      profissao || "",
      genero || "",
      dataNascimento || "",
      cpf || "",
      observacoes || "",
      cep || "",
      rua || "",
      numero || "",
      complemento || "",
      bairro || "",
      cidade || "",
      estado || "",
      responsavelNome || "",
      responsavelCpf || "",
      responsavelDataNascimento || "",
      responsavelTelefone || "",
      req.user.clinica_id,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }

      res.status(201).json({
        id: this.lastID,
        nome,
      });
    }
  );
});


// =========================
// ATUALIZAR PACIENTE
// =========================
router.put("/:id", auth, (req, res) => {
  const { id } = req.params;

  const {
    nome,
    telefone,
    email,
    comoConheceu,
    profissao,
    genero,
    dataNascimento,
    cpf,
    observacoes,
    cep,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    responsavelNome,
    responsavelCpf,
    responsavelDataNascimento,
    responsavelTelefone,
  } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: "Nome é obrigatório." });
  }

  if (!telefone) {
    return res.status(400).json({ erro: "Telefone é obrigatório." });
  }

  if (!cpf) {
    return res.status(400).json({ erro: "CPF é obrigatório." });
  }

  const sql = `
    UPDATE pacientes
    SET
      nome = ?,
      telefone = ?,
      email = ?,
      como_conheceu = ?,
      profissao = ?,
      genero = ?,
      data_nascimento = ?,
      cpf = ?,
      observacoes = ?,
      cep = ?,
      rua = ?,
      numero = ?,
      complemento = ?,
      bairro = ?,
      cidade = ?,
      estado = ?,
      responsavel_nome = ?,
      responsavel_cpf = ?,
      responsavel_data_nascimento = ?,
      responsavel_telefone = ?
    WHERE id = ? AND clinica_id = ?
  `;

  db.run(
    sql,
    [
      nome,
      telefone || "",
      email || "",
      comoConheceu || "",
      profissao || "",
      genero || "",
      dataNascimento || "",
      cpf || "",
      observacoes || "",
      cep || "",
      rua || "",
      numero || "",
      complemento || "",
      bairro || "",
      cidade || "",
      estado || "",
      responsavelNome || "",
      responsavelCpf || "",
      responsavelDataNascimento || "",
      responsavelTelefone || "",
      id,
      req.user.clinica_id,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
      }

      if (!this.changes) {
        return res.status(404).json({ erro: "Paciente não encontrado nesta clínica." });
      }

      res.json({ message: "Paciente atualizado com sucesso" });
    }
  );
});


// =========================
// DELETAR PACIENTE
// =========================
// =========================
// EXCLUIR PACIENTE
// Bloqueia se houver lançamentos financeiros (preserva o histórico contábil);
// caso contrário remove junto os dados clínicos, a agenda e os arquivos do paciente,
// sempre restrito à clínica do usuário.
// =========================
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
}
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (err) { return err ? reject(err) : resolve(this); }));
}

const uploadDir = path.join(__dirname, "..", "uploads");

// Tabelas clínicas apagadas junto com o paciente (todas têm paciente_id e clinica_id)
const TABELAS_DO_PACIENTE = ["consultas", "tratamentos", "evolucoes", "anamneses", "documentos", "arquivos", "pastas_arquivos", "odontogramas"];

router.delete("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const clinicaId = req.user.clinica_id;

  try {
    const paciente = await dbGet("SELECT id FROM pacientes WHERE id = ? AND clinica_id = ?", [id, clinicaId]);
    if (!paciente) return res.status(404).json({ erro: "Paciente não encontrado nesta clínica." });

    const financeiro = await dbGet(
      `SELECT
         (SELECT COUNT(*) FROM pagamentos WHERE paciente_id = ? AND clinica_id = ?) +
         (SELECT COUNT(*) FROM contas_receber WHERE paciente_id = ? AND clinica_id = ?) +
         (SELECT COUNT(*) FROM comissoes WHERE paciente_id = ? AND clinica_id = ?) AS total`,
      [id, clinicaId, id, clinicaId, id, clinicaId]
    );
    if (financeiro.total > 0) {
      return res.status(409).json({
        erro: `Este paciente tem ${financeiro.total} lançamento(s) financeiro(s). Para preservar o histórico, ele não pode ser excluído.`,
      });
    }

    const arquivos = await dbAll("SELECT nome_salvo FROM arquivos WHERE paciente_id = ? AND clinica_id = ?", [id, clinicaId]);

    await dbRun("BEGIN TRANSACTION");
    try {
      await dbRun(
        "DELETE FROM orcamento_itens WHERE orcamento_id IN (SELECT id FROM orcamentos WHERE paciente_id = ? AND clinica_id = ?)",
        [id, clinicaId]
      );
      await dbRun("DELETE FROM orcamentos WHERE paciente_id = ? AND clinica_id = ?", [id, clinicaId]);
      for (const tabela of TABELAS_DO_PACIENTE) {
        await dbRun(`DELETE FROM ${tabela} WHERE paciente_id = ? AND clinica_id = ?`, [id, clinicaId]);
      }
      await dbRun("DELETE FROM pacientes WHERE id = ? AND clinica_id = ?", [id, clinicaId]);
      await dbRun("COMMIT");
    } catch (err) {
      await dbRun("ROLLBACK").catch(() => {});
      throw err;
    }

    // Arquivos físicos só são apagados depois que o banco confirmou a exclusão
    for (const a of arquivos) {
      const caminho = path.join(uploadDir, path.basename(a.nome_salvo || ""));
      if (a.nome_salvo && fs.existsSync(caminho)) fs.unlinkSync(caminho);
    }

    res.json({ message: "Paciente deletado com sucesso" });
  } catch {
    res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });
  }
});


module.exports = router;
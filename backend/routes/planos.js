const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");

router.use(auth);

// O gerenciamento de planos e tabelas de preços é exclusivo do administrador
// da clínica. Todas as consultas também são limitadas pelo clinica_id da sessão.
router.use((req, res, next) => {
  db.get(
    `SELECT r.protegido
     FROM usuarios u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? AND u.clinica_id = ? AND r.ativo = 1`,
    [req.user.id, req.user.clinica_id],
    (err, row) => {
      if (err) return res.status(500).json({ erro: "Não foi possível validar o acesso." });
      if (!row || Number(row.protegido) !== 1) {
        return res.status(403).json({ erro: "Acesso restrito ao administrador da clínica." });
      }
      next();
    }
  );
});

const clinicaId = (req) => Number(req.user.clinica_id);
const erroInterno = (res) => res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });

function validarNome(nome) {
  return typeof nome === "string" && nome.trim().length > 0 && nome.trim().length <= 120;
}

// Lista planos e os valores dos procedimentos configurados em cada um.
router.get("/", (req, res) => {
  const idClinica = clinicaId(req);
  db.all(
    "SELECT * FROM planos WHERE clinica_id = ? ORDER BY ativo DESC, nome COLLATE NOCASE",
    [idClinica],
    (err, planos) => {
      if (err) return erroInterno(res);
      if (!planos.length) return res.json([]);
      db.all(
        `SELECT pp.plano_id, pp.procedimento_id, pp.valor
         FROM plano_procedimentos pp
         WHERE pp.clinica_id = ?`,
        [idClinica],
        (precosErr, precos) => {
          if (precosErr) return erroInterno(res);
          res.json(planos.map((plano) => ({
            ...plano,
            valores: precos
              .filter((preco) => preco.plano_id === plano.id)
              .reduce((acc, preco) => ({ ...acc, [preco.procedimento_id]: Number(preco.valor) }), {}),
          })));
        }
      );
    }
  );
});

// Catálogo único de procedimentos da clínica.
router.get("/procedimentos", (req, res) => {
  db.all(
    "SELECT * FROM procedimentos_catalogo WHERE clinica_id = ? ORDER BY ativo DESC, nome COLLATE NOCASE",
    [clinicaId(req)],
    (err, rows) => err ? erroInterno(res) : res.json(rows || [])
  );
});

router.post("/", (req, res) => {
  const { nome, tipo = "padrao", descricao = "" } = req.body || {};
  const tiposValidos = ["convenio", "padrao"];
  if (!validarNome(nome)) return res.status(400).json({ erro: "Informe um nome válido para o plano." });
  if (!tiposValidos.includes(tipo)) return res.status(400).json({ erro: "Tipo de plano inválido." });

  db.run(
    "INSERT INTO planos (clinica_id, nome, tipo, descricao) VALUES (?, ?, ?, ?)",
    [clinicaId(req), nome.trim(), tipo, String(descricao || "").trim()],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) return res.status(409).json({ erro: "Já existe um plano com esse nome." });
        return erroInterno(res);
      }
      res.status(201).json({ id: this.lastID, mensagem: "Plano criado com sucesso." });
    }
  );
});

router.put("/:id", (req, res) => {
  const { nome, tipo = "padrao", descricao = "", ativo = 1 } = req.body || {};
  const tiposValidos = ["convenio", "padrao"];
  if (!validarNome(nome)) return res.status(400).json({ erro: "Informe um nome válido para o plano." });
  if (!tiposValidos.includes(tipo)) return res.status(400).json({ erro: "Tipo de plano inválido." });

  db.run(
    "UPDATE planos SET nome = ?, tipo = ?, descricao = ?, ativo = ? WHERE id = ? AND clinica_id = ?",
    [nome.trim(), tipo, String(descricao || "").trim(), ativo ? 1 : 0, req.params.id, clinicaId(req)],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) return res.status(409).json({ erro: "Já existe um plano com esse nome." });
        return erroInterno(res);
      }
      if (!this.changes) return res.status(404).json({ erro: "Plano não encontrado nesta clínica." });
      res.json({ mensagem: "Plano atualizado com sucesso." });
    }
  );
});

router.delete("/:id", (req, res) => {
  const idClinica = clinicaId(req);
  db.serialize(() => {
    db.run("BEGIN IMMEDIATE TRANSACTION");
    db.run("DELETE FROM plano_procedimentos WHERE plano_id = ? AND clinica_id = ?", [req.params.id, idClinica], (deletePricesErr) => {
      if (deletePricesErr) {
        return db.run("ROLLBACK", () => erroInterno(res));
      }
      db.run("DELETE FROM planos WHERE id = ? AND clinica_id = ?", [req.params.id, idClinica], function (deletePlanErr) {
        if (deletePlanErr || !this.changes) {
          return db.run("ROLLBACK", () => deletePlanErr ? erroInterno(res) : res.status(404).json({ erro: "Plano não encontrado nesta clínica." }));
        }
        db.run("COMMIT", (commitErr) => commitErr ? erroInterno(res) : res.json({ mensagem: "Plano excluído com sucesso." }));
      });
    });
  });
});

router.post("/procedimentos", (req, res) => {
  const { nome, codigo = "", categoria = "", descricao = "" } = req.body || {};
  if (!validarNome(nome)) return res.status(400).json({ erro: "Informe um nome válido para o procedimento." });

  db.run(
    "INSERT INTO procedimentos_catalogo (clinica_id, nome, codigo, categoria, descricao) VALUES (?, ?, ?, ?, ?)",
    [clinicaId(req), nome.trim(), String(codigo || "").trim(), String(categoria || "").trim(), String(descricao || "").trim()],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) return res.status(409).json({ erro: "Esse procedimento já está cadastrado." });
        return erroInterno(res);
      }
      res.status(201).json({ id: this.lastID, mensagem: "Procedimento cadastrado com sucesso." });
    }
  );
});

router.put("/procedimentos/:id", (req, res) => {
  const { nome, codigo = "", categoria = "", descricao = "", ativo = 1 } = req.body || {};
  if (!validarNome(nome)) return res.status(400).json({ erro: "Informe um nome válido para o procedimento." });

  db.run(
    "UPDATE procedimentos_catalogo SET nome = ?, codigo = ?, categoria = ?, descricao = ?, ativo = ? WHERE id = ? AND clinica_id = ?",
    [nome.trim(), String(codigo || "").trim(), String(categoria || "").trim(), String(descricao || "").trim(), ativo ? 1 : 0, req.params.id, clinicaId(req)],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) return res.status(409).json({ erro: "Esse procedimento já está cadastrado." });
        return erroInterno(res);
      }
      if (!this.changes) return res.status(404).json({ erro: "Procedimento não encontrado nesta clínica." });
      res.json({ mensagem: "Procedimento atualizado com sucesso." });
    }
  );
});

router.delete("/procedimentos/:id", (req, res) => {
  const idClinica = clinicaId(req);
  db.run(
    "DELETE FROM plano_procedimentos WHERE procedimento_id = ? AND clinica_id = ?",
    [req.params.id, idClinica],
    (priceErr) => {
      if (priceErr) return erroInterno(res);
      db.run(
        "DELETE FROM procedimentos_catalogo WHERE id = ? AND clinica_id = ?",
        [req.params.id, idClinica],
        function (err) {
          if (err) return erroInterno(res);
          if (!this.changes) return res.status(404).json({ erro: "Procedimento não encontrado nesta clínica." });
          res.json({ mensagem: "Procedimento excluído do catálogo. Os preços associados também foram removidos." });
        }
      );
    }
  );
});

// Salva a tabela completa de preços do plano. Valores vazios removem o vínculo
// daquele procedimento com o plano; zero é um preço válido.
router.put("/:id/valores", (req, res) => {
  const valores = req.body?.valores;
  if (!Array.isArray(valores)) return res.status(400).json({ erro: "Envie a lista de valores dos procedimentos." });

  const normalizados = [];
  const vistos = new Set();
  for (const item of valores) {
    const procedimentoId = Number(item?.procedimento_id);
    if (!Number.isInteger(procedimentoId) || procedimentoId <= 0 || vistos.has(procedimentoId)) {
      return res.status(400).json({ erro: "A lista contém procedimentos inválidos ou repetidos." });
    }
    vistos.add(procedimentoId);
    if (item.valor === null || item.valor === "") {
      normalizados.push({ procedimentoId, valor: null });
      continue;
    }
    const valor = Number(item.valor);
    if (!Number.isFinite(valor) || valor < 0 || valor > 99999999) {
      return res.status(400).json({ erro: "Informe valores válidos e não negativos." });
    }
    normalizados.push({ procedimentoId, valor });
  }

  const idClinica = clinicaId(req);
  db.get("SELECT id FROM planos WHERE id = ? AND clinica_id = ?", [req.params.id, idClinica], (planErr, plano) => {
    if (planErr) return erroInterno(res);
    if (!plano) return res.status(404).json({ erro: "Plano não encontrado nesta clínica." });
    if (!normalizados.length) return res.json({ mensagem: "Tabela de preços atualizada." });

    const ids = normalizados.map((item) => item.procedimentoId);
    const placeholders = ids.map(() => "?").join(",");
    db.all(
      `SELECT id FROM procedimentos_catalogo WHERE clinica_id = ? AND ativo = 1 AND id IN (${placeholders})`,
      [idClinica, ...ids],
      (proceduresErr, procedures) => {
        if (proceduresErr) return erroInterno(res);
        if (procedures.length !== ids.length) return res.status(400).json({ erro: "Um ou mais procedimentos não pertencem a esta clínica ou estão inativos." });

        db.serialize(() => {
          db.run("BEGIN IMMEDIATE TRANSACTION");
          let indice = 0;
          const salvarProximo = () => {
            if (indice >= normalizados.length) {
              return db.run("COMMIT", (commitErr) => commitErr ? db.run("ROLLBACK", () => erroInterno(res)) : res.json({ mensagem: "Tabela de preços atualizada com sucesso." }));
            }
            const item = normalizados[indice++];
            if (item.valor === null) {
              return db.run(
                "DELETE FROM plano_procedimentos WHERE clinica_id = ? AND plano_id = ? AND procedimento_id = ?",
                [idClinica, plano.id, item.procedimentoId],
                (err) => err ? db.run("ROLLBACK", () => erroInterno(res)) : salvarProximo()
              );
            }
            db.run(
              `INSERT INTO plano_procedimentos (clinica_id, plano_id, procedimento_id, valor)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(clinica_id, plano_id, procedimento_id) DO UPDATE SET valor = excluded.valor`,
              [idClinica, plano.id, item.procedimentoId, item.valor],
              (err) => err ? db.run("ROLLBACK", () => erroInterno(res)) : salvarProximo()
            );
          };
          salvarProximo();
        });
      }
    );
  });
});

module.exports = router;

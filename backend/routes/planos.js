const express = require("express");
const router = express.Router();
const db = require("../database");
const auth = require("../middleware/auth");
const requirePermission = require("../middleware/requirePermission");

router.use(auth);

// Essas consultas são usadas internamente pelos orçamentos e não abrem o módulo de gestão.
router.use((req, res, next) => {
  if (req.method === "GET" && ["/padrao", "/opcoes-orcamento"].includes(req.path)) return next();
  return requirePermission("planos", () => "listar")(req, res, next);
});

const ESPECIALIDADES = [
  "Cirurgia",
  "Dentística",
  "Disfunção Temporomandibular (DTM)",
  "Endodontia",
  "Estética",
  "Harmonização facial",
  "Implantodontia",
  "Odontopediatria",
  "Ortodontia",
  "Ortopedia Funcional",
  "Outros",
  "Periodontia",
  "Prevenção",
  "Prótese",
  "Radiologia",
  "Testes e exames laboratoriais",
  "Urgência"
];

const clinicaId = (req) => Number(req.user.clinica_id);
const erroInterno = (res) => res.status(500).json({ erro: "Não foi possível processar a solicitação. Tente novamente." });

function validarNome(nome) {
  return typeof nome === "string" && nome.trim().length > 0 && nome.trim().length <= 120;
}

function normalizarTipos(tipo) {
  if (Array.isArray(tipo)) return tipo;
  if (typeof tipo === "string" && tipo.startsWith("[")) {
    try { return JSON.parse(tipo); } catch { return []; }
  }
  // Compatibilidade com planos criados antes da seleção múltipla.
  return tipo ? [tipo] : [];
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
            tipo: normalizarTipos(plano.tipo),
            valores: precos
              .filter((preco) => preco.plano_id === plano.id)
              .reduce((acc, preco) => ({ ...acc, [preco.procedimento_id]: Number(preco.valor) }), {}),
          })));
        }
      );
    }
  );
});

// Retorna a tabela marcada como padrão e seus preços para preencher novos orçamentos.
router.get("/padrao", (req, res) => {
  const idClinica = clinicaId(req);
  db.all("SELECT * FROM planos WHERE clinica_id = ? AND ativo = 1 ORDER BY id ASC", [idClinica], (err, rows) => {
    if (err) return erroInterno(res);
    const plano = (rows || []).find((item) => normalizarTipos(item.tipo).includes("padrao"));
    if (!plano) return res.json({ plano: null, procedimentos: [] });
    db.all(
      `SELECT pc.id, pc.nome, pp.valor
       FROM procedimentos_catalogo pc
       LEFT JOIN plano_procedimentos pp ON pp.procedimento_id = pc.id AND pp.plano_id = ? AND pp.clinica_id = ?
       WHERE pc.clinica_id = ? AND pc.ativo = 1
       ORDER BY pc.nome COLLATE NOCASE`,
      [plano.id, idClinica, idClinica],
      (precosErr, procedimentos) => {
        if (precosErr) return erroInterno(res);
        res.json({ plano: { id: plano.id, nome: plano.nome }, procedimentos: procedimentos || [] });
      }
    );
  });
});

// Lista apenas planos ativos e seus procedimentos/preços para criação de orçamentos.
router.get("/opcoes-orcamento", (req, res) => {
  const idClinica = clinicaId(req);
  db.all(
    "SELECT id, nome, tipo FROM planos WHERE clinica_id = ? AND ativo = 1 ORDER BY nome COLLATE NOCASE",
    [idClinica],
    (err, planos) => {
      if (err) return erroInterno(res);
      if (!planos || !planos.length) return res.json([]);
      db.all(
        `SELECT pp.plano_id, pc.id, pc.nome, pc.usar_na_frente, pc.aceita_faces, pp.valor
         FROM procedimentos_catalogo pc
         LEFT JOIN plano_procedimentos pp
           ON pp.procedimento_id = pc.id AND pp.clinica_id = pc.clinica_id
         WHERE pc.clinica_id = ? AND pc.ativo = 1
         ORDER BY pc.nome COLLATE NOCASE`,
        [idClinica],
        (procedimentosErr, procedimentos) => {
          if (procedimentosErr) return erroInterno(res);
          res.json(planos.map((plano) => ({
            id: plano.id,
            nome: plano.nome,
            tipo: normalizarTipos(plano.tipo),
            procedimentos: (procedimentos || [])
              .filter((item) => Number(item.plano_id) === Number(plano.id))
              .map(({ plano_id, ...item }) => item),
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

function removerPlanoPadraoAnterior(idClinica, planoAtualId, callback) {
  db.all("SELECT id, tipo FROM planos WHERE clinica_id = ?", [idClinica], (err, rows) => {
    if (err) return callback(err);
    const anteriores = (rows || []).filter((plano) => plano.id !== planoAtualId && normalizarTipos(plano.tipo).includes("padrao"));
    let indice = 0;
    const proximo = () => {
      if (indice >= anteriores.length) return callback(null);
      const plano = anteriores[indice++];
      const tipos = normalizarTipos(plano.tipo).filter((tipo) => tipo !== "padrao");
      db.run("UPDATE planos SET tipo = ? WHERE id = ? AND clinica_id = ?", [JSON.stringify(tipos), plano.id, idClinica], (updateErr) => updateErr ? callback(updateErr) : proximo());
    };
    proximo();
  });
}

router.post("/", (req, res) => {
  const { nome, tipo = [], descricao = "" } = req.body || {};
  const tiposValidos = ["convenio", "padrao"];
  if (!validarNome(nome)) return res.status(400).json({ erro: "Informe um nome válido para o plano." });
  if (!Array.isArray(tipo) || tipo.some((item) => !tiposValidos.includes(item)) || new Set(tipo).size !== tipo.length) {
    return res.status(400).json({ erro: "Selecione opções válidas para o tipo de plano." });
  }

  const idClinica = clinicaId(req);
  db.serialize(() => {
    db.run("BEGIN IMMEDIATE TRANSACTION");
    const inserir = () => db.run(
      "INSERT INTO planos (clinica_id, nome, tipo, descricao) VALUES (?, ?, ?, ?)",
      [idClinica, nome.trim(), JSON.stringify(tipo), String(descricao || "").trim()],
      function (err) {
        if (err) return db.run("ROLLBACK", () => err.message.includes("UNIQUE") ? res.status(409).json({ erro: "Já existe um plano com esse nome." }) : erroInterno(res));
        const id = this.lastID;
        db.run("COMMIT", (commitErr) => commitErr ? db.run("ROLLBACK", () => erroInterno(res)) : res.status(201).json({ id, mensagem: "Plano criado com sucesso." }));
      }
    );
    if (tipo.includes("padrao")) {
      removerPlanoPadraoAnterior(idClinica, null, (err) => err ? db.run("ROLLBACK", () => erroInterno(res)) : inserir());
    } else inserir();
  });
});

router.put("/:id", (req, res) => {
  const { nome, tipo = [], descricao = "", ativo = 1 } = req.body || {};
  const tiposValidos = ["convenio", "padrao"];
  if (!validarNome(nome)) return res.status(400).json({ erro: "Informe um nome válido para o plano." });
  if (!Array.isArray(tipo) || tipo.some((item) => !tiposValidos.includes(item)) || new Set(tipo).size !== tipo.length) {
    return res.status(400).json({ erro: "Selecione opções válidas para o tipo de plano." });
  }

  const idClinica = clinicaId(req);
  db.serialize(() => {
    db.run("BEGIN IMMEDIATE TRANSACTION");
    const atualizar = () => db.run(
      "UPDATE planos SET nome = ?, tipo = ?, descricao = ?, ativo = ? WHERE id = ? AND clinica_id = ?",
      [nome.trim(), JSON.stringify(tipo), String(descricao || "").trim(), ativo ? 1 : 0, req.params.id, idClinica],
      function (err) {
        if (err) return db.run("ROLLBACK", () => err.message.includes("UNIQUE") ? res.status(409).json({ erro: "Já existe um plano com esse nome." }) : erroInterno(res));
        if (!this.changes) return db.run("ROLLBACK", () => res.status(404).json({ erro: "Plano não encontrado nesta clínica." }));
        db.run("COMMIT", (commitErr) => commitErr ? db.run("ROLLBACK", () => erroInterno(res)) : res.json({ mensagem: "Plano atualizado com sucesso." }));
      }
    );
    if (tipo.includes("padrao")) {
      removerPlanoPadraoAnterior(idClinica, Number(req.params.id), (err) => err ? db.run("ROLLBACK", () => erroInterno(res)) : atualizar());
    } else atualizar();
  });
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
  const { nome, categoria = "", aceita_faces = false, custo_tratamento = 0 } = req.body || {};
  const custo = Number(custo_tratamento);
  if (!validarNome(nome)) return res.status(400).json({ erro: "Informe um nome válido para o procedimento." });
  if (!ESPECIALIDADES.includes(categoria)) return res.status(400).json({ erro: "Selecione uma especialidade válida." });
  if (!Number.isFinite(custo) || custo < 0 || custo > 99999999) return res.status(400).json({ erro: "Informe um custo de tratamento válido." });

  db.run(
    "INSERT INTO procedimentos_catalogo (clinica_id, nome, categoria, aceita_faces, custo_tratamento) VALUES (?, ?, ?, ?, ?)",
    [clinicaId(req), nome.trim(), String(categoria || "").trim(), aceita_faces ? 1 : 0, custo],
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
  const { nome, categoria = "", aceita_faces = false, custo_tratamento = 0, ativo = 1 } = req.body || {};
  const custo = Number(custo_tratamento);
  if (!validarNome(nome)) return res.status(400).json({ erro: "Informe um nome válido para o procedimento." });
  if (!ESPECIALIDADES.includes(categoria)) return res.status(400).json({ erro: "Selecione uma especialidade válida." });
  if (!Number.isFinite(custo) || custo < 0 || custo > 99999999) return res.status(400).json({ erro: "Informe um custo de tratamento válido." });

  db.run(
    "UPDATE procedimentos_catalogo SET nome = ?, categoria = ?, aceita_faces = ?, custo_tratamento = ?, ativo = ? WHERE id = ? AND clinica_id = ?",
    [nome.trim(), String(categoria || "").trim(), aceita_faces ? 1 : 0, custo, ativo ? 1 : 0, req.params.id, clinicaId(req)],
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

router.patch("/procedimentos/:id/custo", (req, res) => {
  const custo = Number(req.body?.custo_tratamento);
  if (!Number.isFinite(custo) || custo < 0 || custo > 99999999) {
    return res.status(400).json({ erro: "Informe um custo de tratamento válido." });
  }
  db.run(
    "UPDATE procedimentos_catalogo SET custo_tratamento = ? WHERE id = ? AND clinica_id = ?",
    [custo, req.params.id, clinicaId(req)],
    function (err) {
      if (err) return erroInterno(res);
      if (!this.changes) return res.status(404).json({ erro: "Procedimento não encontrado nesta clínica." });
      res.json({ mensagem: "Custo do tratamento atualizado." });
    }
  );
});

router.patch("/procedimentos/:id/aceita-faces", (req, res) => {
  const aceitaFaces = req.body?.aceita_faces;
  if (![true, false, 0, 1].includes(aceitaFaces)) {
    return res.status(400).json({ erro: "Informe se o procedimento aceita faces." });
  }
  db.run(
    "UPDATE procedimentos_catalogo SET aceita_faces = ? WHERE id = ? AND clinica_id = ?",
    [aceitaFaces ? 1 : 0, req.params.id, clinicaId(req)],
    function (err) {
      if (err) return erroInterno(res);
      if (!this.changes) return res.status(404).json({ erro: "Procedimento não encontrado nesta clínica." });
      res.json({ mensagem: "Configuração de faces atualizada." });
    }
  );
});

router.patch("/procedimentos/:id/usar-na-frente", (req, res) => {
  const usarNaFrente = req.body?.usar_na_frente;
  if (![true, false, 0, 1].includes(usarNaFrente)) {
    return res.status(400).json({ erro: "Informe se o procedimento deve aparecer no orçamento." });
  }
  db.run(
    "UPDATE procedimentos_catalogo SET usar_na_frente = ? WHERE id = ? AND clinica_id = ?",
    [usarNaFrente ? 1 : 0, req.params.id, clinicaId(req)],
    function (err) {
      if (err) return erroInterno(res);
      if (!this.changes) return res.status(404).json({ erro: "Procedimento não encontrado nesta clínica." });
      res.json({ mensagem: "Preferência do procedimento atualizada." });
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

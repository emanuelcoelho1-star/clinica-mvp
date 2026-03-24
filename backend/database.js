const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "database.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Erro ao conectar ao banco:", err.message);
  } else {
    console.log("Banco SQLite conectado.");
  }
});

function adicionarColunaSeNaoExistir(nomeTabela, nomeColuna, definicao) {
  db.all(`PRAGMA table_info(${nomeTabela})`, [], (err, columns) => {
    if (err) {
      console.error(`Erro ao verificar colunas da tabela ${nomeTabela}:`, err.message);
      return;
    }

    const existe = columns.some((col) => col.name === nomeColuna);

    if (!existe) {
      db.run(
        `ALTER TABLE ${nomeTabela} ADD COLUMN ${nomeColuna} ${definicao}`,
        (alterErr) => {
          if (alterErr) {
            console.error(
              `Erro ao adicionar coluna ${nomeColuna} na tabela ${nomeTabela}:`,
              alterErr.message
            );
          } else {
            console.log(
              `Coluna ${nomeColuna} adicionada com sucesso na tabela ${nomeTabela}.`
            );
          }
        }
      );
    }
  });
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT,
      email TEXT,
      como_conheceu TEXT,
      profissao TEXT,
      genero TEXT,
      data_nascimento TEXT,
      cpf TEXT,
      observacoes TEXT,
      cep TEXT,
      rua TEXT,
      numero TEXT,
      complemento TEXT,
      bairro TEXT,
      cidade TEXT,
      estado TEXT,
      responsavel_nome TEXT,
      responsavel_cpf TEXT,
      responsavel_data_nascimento TEXT,
      responsavel_telefone TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS consultas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      horario TEXT NOT NULL,
      procedimento TEXT,
      status TEXT DEFAULT 'agendado',
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS odontogramas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL UNIQUE,
      mapa TEXT,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS anamneses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      queixa_principal TEXT,
      historia_medica TEXT,
      medicamentos TEXT,
      alergias TEXT,
      cirurgias_anteriores TEXT,
      doencas_cronicas TEXT,
      habitos TEXT,
      historico_familiar TEXT,
      observacoes TEXT,
      pressao_arterial TEXT,
      frequencia_cardiaca TEXT,
      glicemia TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orcamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'pendente',
      desconto REAL DEFAULT 0,
      observacoes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orcamento_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orcamento_id INTEGER NOT NULL,
      dente TEXT,
      procedimento TEXT NOT NULL,
      valor REAL DEFAULT 0,
      quantidade INTEGER DEFAULT 1,
      FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE
    )
  `);

  /* ── NOVA TABELA: arquivos ──────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS arquivos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      nome_original TEXT NOT NULL,
      nome_salvo TEXT NOT NULL,
      tamanho INTEGER DEFAULT 0,
      mimetype TEXT,
      categoria TEXT DEFAULT 'outro',
      descricao TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    )
  `);

  /* ── NOVA TABELA: documentos ────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS documentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'atestado',
      titulo TEXT NOT NULL,
      conteudo TEXT,
      data TEXT NOT NULL,
      profissional TEXT,
      observacoes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    )
  `);

  /* ── NOVA TABELA: pagamentos ────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      orcamento_id INTEGER,
      data TEXT NOT NULL,
      valor REAL NOT NULL DEFAULT 0,
      forma_pagamento TEXT NOT NULL DEFAULT 'dinheiro',
      status TEXT NOT NULL DEFAULT 'confirmado',
      parcela_atual INTEGER DEFAULT 1,
      total_parcelas INTEGER DEFAULT 1,
      descricao TEXT,
      observacoes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
      FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id)
    )
  `);

  adicionarColunaSeNaoExistir("pacientes", "telefone", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "email", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "como_conheceu", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "profissao", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "genero", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "data_nascimento", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "cpf", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "observacoes", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "cep", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "rua", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "numero", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "complemento", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "bairro", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "cidade", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "estado", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "responsavel_nome", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "responsavel_cpf", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "responsavel_data_nascimento", "TEXT");
  adicionarColunaSeNaoExistir("pacientes", "responsavel_telefone", "TEXT");
});

module.exports = db;
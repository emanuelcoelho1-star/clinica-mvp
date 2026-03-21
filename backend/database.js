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

  db.run(`ALTER TABLE pacientes ADD COLUMN email TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN como_conheceu TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN profissao TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN genero TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN data_nascimento TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN cpf TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN cep TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN rua TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN numero TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN complemento TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN bairro TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN cidade TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN estado TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN responsavel_nome TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN responsavel_cpf TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN responsavel_data_nascimento TEXT`, () => {});
  db.run(`ALTER TABLE pacientes ADD COLUMN responsavel_telefone TEXT`, () => {});

  db.run(`
    CREATE TABLE IF NOT EXISTS consultas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      horario TEXT NOT NULL,
      procedimento TEXT,
      status TEXT DEFAULT 'agendado',
      FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    )
  `);
});

module.exports = db;
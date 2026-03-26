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
  /* ══════════════════════════════════════════════════════════
     TABELAS EXISTENTES (sem alteração)
     ══════════════════════════════════════════════════════════ */

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
      nome TEXT NOT NULL DEFAULT 'Administrador',
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
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

  db.run(`
    CREATE TABLE IF NOT EXISTS evolucoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      procedimento TEXT,
      dente TEXT,
      descricao TEXT,
      observacoes TEXT,
      profissional TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tratamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      data_inicio TEXT NOT NULL,
      data_fim TEXT,
      procedimento TEXT NOT NULL,
      dente TEXT,
      status TEXT NOT NULL DEFAULT 'em_andamento',
      valor REAL DEFAULT 0,
      profissional TEXT,
      descricao TEXT,
      observacoes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    )
  `);

  /* ══════════════════════════════════════════════════════════
     NOVAS TABELAS — MÓDULO FINANCEIRO
     ══════════════════════════════════════════════════════════ */

  /* ── Profissionais (dentistas/colaboradores) ───────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS profissionais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cpf TEXT,
      cro TEXT,
      especialidade TEXT,
      telefone TEXT,
      email TEXT,
      tipo TEXT NOT NULL DEFAULT 'dentista',
      percentual_comissao REAL DEFAULT 0,
      valor_fixo_comissao REAL DEFAULT 0,
      tipo_comissao TEXT NOT NULL DEFAULT 'percentual',
      ativo INTEGER NOT NULL DEFAULT 1,
      observacoes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  /* ── Categorias de despesa ─────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS categorias_financeiras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'despesa',
      cor TEXT DEFAULT '#64748b',
      icone TEXT DEFAULT 'tag',
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  /* ── Contas a pagar ────────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS contas_pagar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao TEXT NOT NULL,
      categoria_id INTEGER,
      fornecedor TEXT,
      valor REAL NOT NULL DEFAULT 0,
      valor_pago REAL DEFAULT 0,
      data_emissao TEXT NOT NULL,
      data_vencimento TEXT NOT NULL,
      data_pagamento TEXT,
      forma_pagamento TEXT,
      status TEXT NOT NULL DEFAULT 'pendente',
      recorrente INTEGER DEFAULT 0,
      recorrencia_tipo TEXT,
      recorrencia_fim TEXT,
      parcela_atual INTEGER DEFAULT 1,
      total_parcelas INTEGER DEFAULT 1,
      numero_documento TEXT,
      codigo_barras TEXT,
      observacoes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id)
    )
  `);

  /* ── Contas a receber ──────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS contas_receber (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER,
      orcamento_id INTEGER,
      tratamento_id INTEGER,
      profissional_id INTEGER,
      descricao TEXT NOT NULL,
      procedimento TEXT,
      valor REAL NOT NULL DEFAULT 0,
      valor_recebido REAL DEFAULT 0,
      desconto REAL DEFAULT 0,
      data_emissao TEXT NOT NULL,
      data_vencimento TEXT NOT NULL,
      data_recebimento TEXT,
      forma_pagamento TEXT DEFAULT 'dinheiro',
      status TEXT NOT NULL DEFAULT 'pendente',
      parcela_atual INTEGER DEFAULT 1,
      total_parcelas INTEGER DEFAULT 1,
      numero_nota TEXT,
      observacoes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
      FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id),
      FOREIGN KEY (tratamento_id) REFERENCES tratamentos(id),
      FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
    )
  `);

  /* ── Comissões ─────────────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS comissoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profissional_id INTEGER NOT NULL,
      conta_receber_id INTEGER,
      paciente_id INTEGER,
      procedimento TEXT,
      valor_procedimento REAL NOT NULL DEFAULT 0,
      percentual REAL NOT NULL DEFAULT 0,
      valor_comissao REAL NOT NULL DEFAULT 0,
      data_referencia TEXT NOT NULL,
      data_pagamento TEXT,
      status TEXT NOT NULL DEFAULT 'pendente',
      observacoes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (profissional_id) REFERENCES profissionais(id),
      FOREIGN KEY (conta_receber_id) REFERENCES contas_receber(id),
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    )
  `);

  /* ── Fluxo de caixa (movimentações) ────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS fluxo_caixa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL DEFAULT 'entrada',
      categoria_id INTEGER,
      conta_pagar_id INTEGER,
      conta_receber_id INTEGER,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL DEFAULT 0,
      data TEXT NOT NULL,
      forma_pagamento TEXT,
      saldo_acumulado REAL DEFAULT 0,
      observacoes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (categoria_id) REFERENCES categorias_financeiras(id),
      FOREIGN KEY (conta_pagar_id) REFERENCES contas_pagar(id),
      FOREIGN KEY (conta_receber_id) REFERENCES contas_receber(id)
    )
  `);

  /* ── Centro de custos ──────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS centros_custo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  /* ── Formas de pagamento configuráveis ─────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS formas_pagamento_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'outros',
      taxa_percentual REAL DEFAULT 0,
      taxa_fixa REAL DEFAULT 0,
      prazo_recebimento INTEGER DEFAULT 0,
      max_parcelas INTEGER DEFAULT 1,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  /* ── Metas financeiras ─────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS metas_financeiras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'receita',
      valor_meta REAL NOT NULL DEFAULT 0,
      valor_atual REAL DEFAULT 0,
      mes INTEGER NOT NULL,
      ano INTEGER NOT NULL,
      observacoes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  /* ══════════════════════════════════════════════════════════
     SEED — Categorias financeiras padrão
     ══════════════════════════════════════════════════════════ */
  db.get("SELECT COUNT(*) as total FROM categorias_financeiras", [], (err, row) => {
    if (err) return;
    if (row && row.total === 0) {
      const categorias = [
        // Despesas
        ["Aluguel", "despesa", "#ef4444", "building"],
        ["Materiais Odontológicos", "despesa", "#f97316", "package"],
        ["Salários e Encargos", "despesa", "#8b5cf6", "users"],
        ["Energia / Água / Internet", "despesa", "#06b6d4", "zap"],
        ["Manutenção e Equipamentos", "despesa", "#64748b", "wrench"],
        ["Marketing e Publicidade", "despesa", "#ec4899", "megaphone"],
        ["Impostos e Taxas", "despesa", "#dc2626", "file-text"],
        ["Seguros", "despesa", "#0ea5e9", "shield"],
        ["Material de Limpeza", "despesa", "#14b8a6", "sparkles"],
        ["Contabilidade", "despesa", "#a855f7", "calculator"],
        ["Software e Assinaturas", "despesa", "#6366f1", "monitor"],
        ["Outras Despesas", "despesa", "#94a3b8", "more-horizontal"],
        // Receitas
        ["Consultas", "receita", "#22c55e", "stethoscope"],
        ["Procedimentos", "receita", "#10b981", "activity"],
        ["Convênios", "receita", "#2563eb", "credit-card"],
        ["Outras Receitas", "receita", "#16a34a", "plus-circle"],
      ];

      const stmt = db.prepare(
        "INSERT INTO categorias_financeiras (nome, tipo, cor, icone) VALUES (?, ?, ?, ?)"
      );
      categorias.forEach((c) => stmt.run(c));
      stmt.finalize();
      console.log("Categorias financeiras padrão inseridas.");
    }
  });

  /* ══════════════════════════════════════════════════════════
     SEED — Formas de pagamento padrão
     ══════════════════════════════════════════════════════════ */
  db.get("SELECT COUNT(*) as total FROM formas_pagamento_config", [], (err, row) => {
    if (err) return;
    if (row && row.total === 0) {
      const formas = [
        ["Dinheiro", "dinheiro", 0, 0, 0, 1],
        ["PIX", "pix", 0, 0, 0, 1],
        ["Cartão de Débito", "debito", 1.5, 0, 1, 1],
        ["Cartão de Crédito", "credito", 3.5, 0, 30, 12],
        ["Convênio", "convenio", 0, 0, 30, 1],
        ["Boleto Bancário", "boleto", 0, 3.5, 3, 1],
        ["Transferência Bancária", "transferencia", 0, 0, 0, 1],
        ["Cheque", "cheque", 0, 0, 0, 1],
      ];

      const stmt = db.prepare(
        `INSERT INTO formas_pagamento_config
           (nome, tipo, taxa_percentual, taxa_fixa, prazo_recebimento, max_parcelas)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      formas.forEach((f) => stmt.run(f));
      stmt.finalize();
      console.log("Formas de pagamento padrão inseridas.");
    }
  });

  /* ══════════════════════════════════════════════════════════
     MIGRAÇÕES — Tabelas existentes (pacientes, usuarios)
     ══════════════════════════════════════════════════════════ */
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

  adicionarColunaSeNaoExistir("usuarios", "nome", "TEXT DEFAULT 'Administrador'");
  adicionarColunaSeNaoExistir("usuarios", "created_at", "TEXT");
});

module.exports = db;
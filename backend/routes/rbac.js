  /* ══════════════════════════════════════════════════════════
     NOVAS TABELAS — SISTEMA RBAC
     ══════════════════════════════════════════════════════════ */

  /* ── Perfis (roles) ─────────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      descricao TEXT,
      cor TEXT DEFAULT '#64748b',
      protegido INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  /* ── Permissões ─────────────────────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS permissoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      modulo TEXT NOT NULL,
      acao TEXT NOT NULL,
      descricao TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(modulo, acao)
    )
  `);

  /* ── Relação role ↔ permissão ───────────────────────────── */
  db.run(`
    CREATE TABLE IF NOT EXISTS role_permissoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      permissao_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permissao_id) REFERENCES permissoes(id) ON DELETE CASCADE,
      UNIQUE(role_id, permissao_id)
    )
  `);
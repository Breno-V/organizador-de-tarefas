import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DB_PATH = join(__dirname, 'database.sqlite')

let db

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    initTables()
    seedCategorias()
  }
  return db
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS tarefas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      data_entrega TEXT,
      concluida INTEGER DEFAULT 0,
      criada_em TEXT DEFAULT (datetime('now')),
      ordem INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tarefa_categoria (
      tarefa_id INTEGER NOT NULL,
      categoria_id INTEGER NOT NULL,
      PRIMARY KEY (tarefa_id, categoria_id),
      FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      reminders INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Migration: drop cor column from categorias (moved to CSS)
  const catCols = db.prepare("PRAGMA table_info('categorias')").all()
  if (catCols.find(c => c.name === 'cor')) {
    db.exec("ALTER TABLE categorias DROP COLUMN cor")
  }

  // Migration: add ordem column if missing
  const colInfo = db.prepare("PRAGMA table_info('tarefas')").all()
  if (!colInfo.find(c => c.name === 'ordem')) {
    db.exec("ALTER TABLE tarefas ADD COLUMN ordem INTEGER DEFAULT 0")
    db.exec(`
      UPDATE tarefas SET ordem = (
        SELECT COUNT(*) FROM tarefas t2
        WHERE t2.data_entrega < tarefas.data_entrega
           OR (t2.data_entrega = tarefas.data_entrega AND t2.criada_em > tarefas.criada_em)
           OR (t2.data_entrega IS NULL AND tarefas.data_entrega IS NOT NULL)
           OR (t2.data_entrega IS NULL AND tarefas.data_entrega IS NULL AND t2.criada_em > tarefas.criada_em)
      )
    `)
  }
}

function seedCategorias() {
  const count = db.prepare('SELECT COUNT(*) as c FROM categorias').get().c
  if (count > 0) return

  const insert = db.prepare('INSERT INTO categorias (nome) VALUES (?)')
  insert.run('tecnico')
  insert.run('normal')
  insert.run('eventos')
  insert.run('domestica')
}

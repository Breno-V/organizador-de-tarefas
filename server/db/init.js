import pg from 'pg'

const { Pool } = pg
let pool

export function getPool() {
  return pool
}

export async function initDb() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        cor TEXT NOT NULL DEFAULT '#2B5F5F',
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS tarefas (
        id SERIAL PRIMARY KEY,
        titulo TEXT NOT NULL,
        descricao TEXT DEFAULT '',
        data_entrega DATE,
        concluida BOOLEAN DEFAULT false,
        criada_em TIMESTAMP DEFAULT NOW(),
        ordem INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS tarefa_categoria (
        tarefa_id INTEGER NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
        categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
        PRIMARY KEY (tarefa_id, categoria_id)
      );
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        criada_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        reminders BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
      ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
      ALTER TABLE tarefas ALTER COLUMN data_entrega TYPE TIMESTAMP USING data_entrega::timestamp;

      CREATE TABLE IF NOT EXISTS task_reminders_sent (
        id SERIAL PRIMARY KEY,
        tarefa_id INTEGER NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
        milestone TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tarefa_id, milestone)
      );

      ALTER TABLE categorias ADD COLUMN IF NOT EXISTS cor TEXT NOT NULL DEFAULT '#2B5F5F';
      ALTER TABLE categorias ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE;
      ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_nome_key;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT true;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_cat_nome_global ON categorias(nome) WHERE usuario_id IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cat_nome_usuario ON categorias(nome, usuario_id) WHERE usuario_id IS NOT NULL;

      UPDATE categorias SET cor = '#2B5F5F' WHERE nome = 'tecnico' AND usuario_id IS NULL;
      UPDATE categorias SET cor = '#4A7B5C' WHERE nome = 'normal' AND usuario_id IS NULL;
      UPDATE categorias SET cor = '#C47A2E' WHERE nome = 'eventos' AND usuario_id IS NULL;
      UPDATE categorias SET cor = '#8B6F9E' WHERE nome = 'domestica' AND usuario_id IS NULL;
    `)

    const { rows } = await client.query('SELECT COUNT(*)::int as c FROM categorias WHERE usuario_id IS NULL')
    if (rows[0].c === 0) {
      await client.query(
        'INSERT INTO categorias (nome, cor) VALUES ($1, $2), ($3, $4), ($5, $6), ($7, $8)',
        ['tecnico', '#2B5F5F', 'normal', '#4A7B5C', 'eventos', '#C47A2E', 'domestica', '#8B6F9E']
      )
    }

    console.log('Banco PostgreSQL inicializado')
  } finally {
    client.release()
  }
}

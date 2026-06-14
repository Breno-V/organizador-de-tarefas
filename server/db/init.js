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
        nome TEXT NOT NULL UNIQUE
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
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        reminders BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)

    const { rows } = await client.query('SELECT COUNT(*)::int as c FROM categorias')
    if (rows[0].c === 0) {
      await client.query(
        'INSERT INTO categorias (nome) VALUES ($1), ($2), ($3), ($4)',
        ['tecnico', 'normal', 'eventos', 'domestica']
      )
    }

    console.log('Banco PostgreSQL inicializado')
  } finally {
    client.release()
  }
}

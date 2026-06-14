import { Router } from 'express'
import { getPool } from '../db/init.js'

const router = Router()

function tryHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

function tarefaComCategorias(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    data_entrega: row.data_entrega,
    concluida: !!row.concluida,
    criada_em: row.criada_em,
    ordem: row.ordem,
    categorias: row.categorias || [],
  }
}

router.get('/', tryHandler(async (req, res) => {
  const db = getPool()
  const { rows } = await db.query(`
    SELECT t.*, COALESCE(
      (SELECT json_agg(c.nome) FROM tarefa_categoria tc
       JOIN categorias c ON c.id = tc.categoria_id
       WHERE tc.tarefa_id = t.id), '[]'::json
    ) as categorias
    FROM tarefas t
    ORDER BY t.ordem ASC, t.data_entrega ASC, t.criada_em DESC
  `)

  res.json(rows.map(tarefaComCategorias))
}))

function toLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function isPastDate(dateStr) {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = toLocalDate(dateStr)
  target.setHours(0, 0, 0, 0)
  return target < today
}

router.post('/', tryHandler(async (req, res) => {
  const db = getPool()
  const { titulo, descricao, data_entrega, categorias } = req.body

  if (!titulo || !titulo.trim()) {
    return res.status(400).json({ error: 'O título é obrigatório.' })
  }

  if (isPastDate(data_entrega)) {
    return res.status(400).json({ error: 'A data não pode ser anterior a hoje.' })
  }

  const { rows: [maxRow] } = await db.query('SELECT COALESCE(MAX(ordem), -1) + 1 as next FROM tarefas')
  const nextOrdem = maxRow.next

  const { rows } = await db.query(`
    INSERT INTO tarefas (titulo, descricao, data_entrega, ordem)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [titulo, descricao || '', data_entrega || null, nextOrdem])

  const tarefaId = rows[0].id

  if (categorias?.length > 0) {
    for (const cat of categorias) {
      await db.query(`
        INSERT INTO tarefa_categoria (tarefa_id, categoria_id)
        SELECT $1, id FROM categorias WHERE nome = $2
      `, [tarefaId, cat])
    }
  }

  const { rows: [row] } = await db.query('SELECT * FROM tarefas WHERE id = $1', [tarefaId])
  res.status(201).json(tarefaComCategorias({ ...row, categorias: categorias || [] }))
}))

router.put('/:id', tryHandler(async (req, res) => {
  const db = getPool()
  const { id } = req.params
  const { titulo, descricao, data_entrega, concluida, categorias } = req.body

  if (data_entrega !== undefined && isPastDate(data_entrega)) {
    return res.status(400).json({ error: 'A data não pode ser anterior a hoje.' })
  }

  const updates = []
  const params = []
  let idx = 1

  if (titulo !== undefined) { updates.push(`titulo = $${idx++}`); params.push(titulo) }
  if (descricao !== undefined) { updates.push(`descricao = $${idx++}`); params.push(descricao) }
  if (data_entrega !== undefined) { updates.push(`data_entrega = $${idx++}`); params.push(data_entrega || null) }
  if (concluida !== undefined) { updates.push(`concluida = $${idx++}`); params.push(concluida) }

  if (updates.length > 0) {
    params.push(id)
    await db.query(`UPDATE tarefas SET ${updates.join(', ')} WHERE id = $${idx}`, params)
  }

  if (categorias !== undefined) {
    await db.query('DELETE FROM tarefa_categoria WHERE tarefa_id = $1', [id])
    if (categorias.length > 0) {
      for (const cat of categorias) {
        await db.query(`
          INSERT INTO tarefa_categoria (tarefa_id, categoria_id)
          SELECT $1, id FROM categorias WHERE nome = $2
        `, [id, cat])
      }
    }
  }

  const { rows: [row] } = await db.query('SELECT * FROM tarefas WHERE id = $1', [id])
  if (!row) return res.status(404).json({ error: 'Tarefa não encontrada' })

  const { rows: [catRow] } = await db.query(`
    SELECT COALESCE(json_agg(c.nome), '[]'::json) as categorias
    FROM tarefa_categoria tc
    JOIN categorias c ON c.id = tc.categoria_id
    WHERE tc.tarefa_id = $1
  `, [id])

  res.json(tarefaComCategorias({ ...row, categorias: catRow.categorias }))
}))

router.put('/reorder', tryHandler(async (req, res) => {
  const db = getPool()
  const { orders } = req.body
  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'orders must be an array' })
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    for (const item of orders) {
      await client.query('UPDATE tarefas SET ordem = $1 WHERE id = $2', [item.ordem, item.id])
    }
    await client.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}))

router.delete('/:id', tryHandler(async (req, res) => {
  const db = getPool()
  const { id } = req.params
  await db.query('DELETE FROM tarefas WHERE id = $1', [id])
  res.status(204).end()
}))

export default router

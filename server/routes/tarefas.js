import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { getPool } from '../db/init.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
})

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
      (SELECT json_agg(json_build_object('id', c.id, 'nome', c.nome, 'cor', c.cor))
       FROM tarefa_categoria tc
       JOIN categorias c ON c.id = tc.categoria_id
       WHERE tc.tarefa_id = t.id), '[]'::json
    ) as categorias
    FROM tarefas t
    WHERE t.usuario_id = $1
    ORDER BY t.ordem ASC, t.data_entrega ASC, t.criada_em DESC
  `, [req.user.id])

  res.json(rows.map(tarefaComCategorias))
}))

function parseDatetime(dateStr) {
  if (!dateStr) return new Date(NaN)
  const [datePart, timePart] = dateStr.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  if (!timePart) return new Date(y, m - 1, d)
  const [hh, mm] = timePart.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

function isPastDate(dateStr) {
  if (!dateStr) return false
  const target = parseDatetime(dateStr)
  if (isNaN(target.getTime())) return false
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return target < todayStart
}

router.post('/', writeLimiter, tryHandler(async (req, res) => {
  const db = getPool()
  const { titulo, descricao, data_entrega, categorias } = req.body

  if (!titulo || !titulo.trim()) {
    return res.status(400).json({ error: 'O título é obrigatório.' })
  }
  if (titulo.length > 100) {
    return res.status(400).json({ error: 'O título deve ter no máximo 100 caracteres.' })
  }
  if (descricao && descricao.length > 500) {
    return res.status(400).json({ error: 'A descrição deve ter no máximo 500 caracteres.' })
  }

  if (isPastDate(data_entrega)) {
    return res.status(400).json({ error: 'A data não pode ser anterior a hoje.' })
  }

  const { rows: [maxRow] } = await db.query(
    'SELECT COALESCE(MAX(ordem), -1) + 1 as next FROM tarefas WHERE usuario_id = $1',
    [req.user.id]
  )
  const nextOrdem = maxRow.next

  const { rows } = await db.query(`
    INSERT INTO tarefas (titulo, descricao, data_entrega, ordem, usuario_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [titulo, descricao || '', data_entrega || null, nextOrdem, req.user.id])

  const tarefaId = rows[0].id

  if (categorias?.length > 0) {
    for (const catId of categorias) {
      await db.query(
        'INSERT INTO tarefa_categoria (tarefa_id, categoria_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [tarefaId, catId]
      )
    }
  }

  const { rows: [row] } = await db.query('SELECT * FROM tarefas WHERE id = $1', [tarefaId])
  const { rows: [catRow] } = await db.query(`
    SELECT COALESCE(json_agg(json_build_object('id', c.id, 'nome', c.nome, 'cor', c.cor)), '[]'::json) as categorias
    FROM tarefa_categoria tc
    JOIN categorias c ON c.id = tc.categoria_id
    WHERE tc.tarefa_id = $1
  `, [tarefaId])
  res.status(201).json(tarefaComCategorias({ ...row, categorias: catRow.categorias }))
}))

router.put('/:id', writeLimiter, tryHandler(async (req, res) => {
  const db = getPool()
  const { id } = req.params
  const { titulo, descricao, data_entrega, concluida, categorias } = req.body

  if (titulo !== undefined && (!titulo.trim() || titulo.length > 100)) {
    return res.status(400).json({ error: 'O título deve ter entre 1 e 100 caracteres.' })
  }
  if (descricao !== undefined && descricao.length > 500) {
    return res.status(400).json({ error: 'A descrição deve ter no máximo 500 caracteres.' })
  }

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
    params.push(id, req.user.id)
    await db.query(
      `UPDATE tarefas SET ${updates.join(', ')} WHERE id = $${idx} AND usuario_id = $${idx + 1}`,
      params
    )
  }

  if (data_entrega !== undefined || concluida !== undefined) {
    await db.query('DELETE FROM task_reminders_sent WHERE tarefa_id = $1', [id])
  }

  if (categorias !== undefined) {
    await db.query('DELETE FROM tarefa_categoria WHERE tarefa_id = $1', [id])
    if (categorias.length > 0) {
      for (const catId of categorias) {
        await db.query(
          'INSERT INTO tarefa_categoria (tarefa_id, categoria_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, catId]
        )
      }
    }
  }

  const { rows: [row] } = await db.query('SELECT * FROM tarefas WHERE id = $1', [id])
  if (!row) return res.status(404).json({ error: 'Tarefa não encontrada' })

  const { rows: [catRow] } = await db.query(`
    SELECT COALESCE(json_agg(json_build_object('id', c.id, 'nome', c.nome, 'cor', c.cor)), '[]'::json) as categorias
    FROM tarefa_categoria tc
    JOIN categorias c ON c.id = tc.categoria_id
    WHERE tc.tarefa_id = $1
  `, [id])

  res.json(tarefaComCategorias({ ...row, categorias: catRow.categorias }))
}))

router.put('/reorder', writeLimiter, tryHandler(async (req, res) => {
  const db = getPool()
  const { orders } = req.body
  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'orders must be an array' })
  }

  for (const item of orders) {
    if (!item.id || typeof item.ordem !== 'number') {
      return res.status(400).json({ error: 'Cada item deve ter id (number) e ordem (number).' })
    }
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    for (const item of orders) {
      await client.query(
        'UPDATE tarefas SET ordem = $1 WHERE id = $2 AND usuario_id = $3',
        [item.ordem, item.id, req.user.id]
      )
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

router.delete('/:id', writeLimiter, tryHandler(async (req, res) => {
  const db = getPool()
  const { id } = req.params
  await db.query('DELETE FROM tarefas WHERE id = $1 AND usuario_id = $2', [id, req.user.id])
  res.status(204).end()
}))

export default router

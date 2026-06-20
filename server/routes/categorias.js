import { Router } from 'express'
import { getPool } from '../db/init.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

function tryHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

router.get('/', tryHandler(async (req, res) => {
  const db = getPool()
  const { rows } = await db.query(
    `SELECT id, nome, cor FROM categorias
     WHERE usuario_id IS NULL OR usuario_id = $1
     ORDER BY nome ASC`,
    [req.user.id]
  )
  res.json(rows)
}))

router.post('/', tryHandler(async (req, res) => {
  const db = getPool()
  const { nome, cor } = req.body

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'O nome é obrigatório.' })
  }
  if (nome.length > 30) {
    return res.status(400).json({ error: 'O nome deve ter no máximo 30 caracteres.' })
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO categorias (nome, cor, usuario_id)
       VALUES ($1, $2, $3) RETURNING id, nome, cor`,
      [nome.trim(), cor || '#2B5F5F', req.user.id]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Você já tem uma tag com esse nome.' })
    }
    throw err
  }
}))

router.put('/:id', tryHandler(async (req, res) => {
  const db = getPool()
  const { id } = req.params
  const { nome, cor } = req.body

  const { rows: [cat] } = await db.query(
    'SELECT id FROM categorias WHERE id = $1 AND usuario_id = $2',
    [id, req.user.id]
  )
  if (!cat) return res.status(404).json({ error: 'Tag não encontrada.' })

  const updates = []
  const params = []
  let idx = 1

  if (nome !== undefined) {
    if (!nome.trim()) return res.status(400).json({ error: 'O nome não pode ficar vazio.' })
    if (nome.length > 30) return res.status(400).json({ error: 'O nome deve ter no máximo 30 caracteres.' })
    updates.push(`nome = $${idx++}`)
    params.push(nome.trim())
  }
  if (cor !== undefined) {
    updates.push(`cor = $${idx++}`)
    params.push(cor)
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nada para alterar.' })

  params.push(id)
  try {
    const { rows } = await db.query(
      `UPDATE categorias SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, nome, cor`,
      params
    )
    res.json(rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Você já tem uma tag com esse nome.' })
    }
    throw err
  }
}))

router.delete('/:id', tryHandler(async (req, res) => {
  const db = getPool()
  const { id } = req.params

  const { rows: [cat] } = await db.query(
    'SELECT id FROM categorias WHERE id = $1 AND usuario_id = $2',
    [id, req.user.id]
  )
  if (!cat) return res.status(404).json({ error: 'Tag não encontrada.' })

  const { rows: [active] } = await db.query(
    `SELECT COUNT(*)::int AS count FROM tarefa_categoria tc
     JOIN tarefas t ON t.id = tc.tarefa_id
     WHERE tc.categoria_id = $1 AND t.concluida = false`,
    [id]
  )

  if (active.count > 0) {
    return res.status(409).json({
      error: `Tag em uso por ${active.count} tarefa${active.count > 1 ? 's' : ''}. Conclua ou remova as tarefas primeiro.`,
    })
  }

  await db.query('DELETE FROM categorias WHERE id = $1', [id])
  res.status(204).end()
}))

export default router

import { Router } from 'express'
import { getDb } from '../db/init.js'

const router = Router()

function tryHandler(fn) {
  return (req, res, next) => {
    try {
      fn(req, res, next)
    } catch (err) {
      next(err)
    }
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
    categorias: row.categorias ? JSON.parse(row.categorias) : [],
  }
}

router.get('/', tryHandler((req, res) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT t.*, COALESCE(
      (SELECT json_group_array(c.nome) FROM tarefa_categoria tc
       JOIN categorias c ON c.id = tc.categoria_id
       WHERE tc.tarefa_id = t.id), '[]'
    ) as categorias
    FROM tarefas t
    ORDER BY t.ordem ASC, t.data_entrega ASC, t.criada_em DESC
  `).all()

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

router.post('/', tryHandler((req, res) => {
  const db = getDb()
  const { titulo, descricao, data_entrega, categorias } = req.body

  if (!titulo || !titulo.trim()) {
    return res.status(400).json({ error: 'O título é obrigatório.' })
  }

  if (isPastDate(data_entrega)) {
    return res.status(400).json({ error: 'A data não pode ser anterior a hoje.' })
  }

  const maxOrdem = db.prepare('SELECT COALESCE(MAX(ordem), -1) + 1 as next FROM tarefas').get().next
  const result = db.prepare(`
    INSERT INTO tarefas (titulo, descricao, data_entrega, ordem)
    VALUES (?, ?, ?, ?)
  `).run(titulo, descricao || '', data_entrega || null, maxOrdem)

  const tarefaId = result.lastInsertRowid

  if (categorias?.length > 0) {
    const insertCat = db.prepare(`
      INSERT INTO tarefa_categoria (tarefa_id, categoria_id)
      SELECT ?, id FROM categorias WHERE nome = ?
    `)
    for (const cat of categorias) {
      insertCat.run(tarefaId, cat)
    }
  }

  const row = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(tarefaId)
  res.status(201).json(tarefaComCategorias({ ...row, categorias: JSON.stringify(categorias || []) }))
}))

router.put('/:id', tryHandler((req, res) => {
  const db = getDb()
  const { id } = req.params
  const { titulo, descricao, data_entrega, concluida, categorias } = req.body

  if (data_entrega !== undefined && isPastDate(data_entrega)) {
    return res.status(400).json({ error: 'A data não pode ser anterior a hoje.' })
  }

  const updates = []
  const params = []

  if (titulo !== undefined) { updates.push('titulo = ?'); params.push(titulo) }
  if (descricao !== undefined) { updates.push('descricao = ?'); params.push(descricao) }
  if (data_entrega !== undefined) { updates.push('data_entrega = ?'); params.push(data_entrega || null) }
  if (concluida !== undefined) { updates.push('concluida = ?'); params.push(concluida ? 1 : 0) }

  if (updates.length > 0) {
    params.push(id)
    db.prepare(`UPDATE tarefas SET ${updates.join(', ')} WHERE id = ?`).run(...params)
  }

  if (categorias !== undefined) {
    db.prepare('DELETE FROM tarefa_categoria WHERE tarefa_id = ?').run(id)
    if (categorias.length > 0) {
      const insertCat = db.prepare(`
        INSERT INTO tarefa_categoria (tarefa_id, categoria_id)
        SELECT ?, id FROM categorias WHERE nome = ?
      `)
      for (const cat of categorias) {
        insertCat.run(id, cat)
      }
    }
  }

  const row = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ error: 'Tarefa não encontrada' })

  const catRow = db.prepare(`
    SELECT json_group_array(c.nome) as categorias
    FROM tarefa_categoria tc
    JOIN categorias c ON c.id = tc.categoria_id
    WHERE tc.tarefa_id = ?
  `).get(id)

  res.json(tarefaComCategorias({ ...row, categorias: catRow.categorias }))
}))

router.put('/reorder', tryHandler((req, res) => {
  const db = getDb()
  const { orders } = req.body
  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'orders must be an array' })
  }
  const stmt = db.prepare('UPDATE tarefas SET ordem = ? WHERE id = ?')
  const updateMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.ordem, item.id)
    }
  })
  updateMany(orders)
  res.json({ ok: true })
}))

router.delete('/:id', tryHandler((req, res) => {
  const db = getDb()
  const { id } = req.params
  db.prepare('DELETE FROM tarefas WHERE id = ?').run(id)
  res.status(204).end()
}))

export default router

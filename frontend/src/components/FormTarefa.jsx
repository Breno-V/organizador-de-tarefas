import { useState, useEffect } from 'react'
import { toLocalDate, hasTimeComponent } from '../utils/date'

function toInputDate(dateStr) {
  if (!dateStr) return ''
  const datePart = dateStr.split('T')[0]
  const [y, m, d] = datePart.split('-').map(Number)
  const pad = n => String(n).padStart(2, '0')
  return `${y}-${pad(m)}-${pad(d)}`
}

function toInputTime(dateStr) {
  if (!hasTimeComponent(dateStr)) return ''
  const timePart = dateStr.split('T')[1]
  return timePart.slice(0, 5)
}

function isPastDate(dateStr) {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = toLocalDate(dateStr)
  target.setHours(0, 0, 0, 0)
  return target < today
}

export default function FormTarefa({ tarefa, onSave, onCancel, categories = [] }) {
  const editing = !!tarefa
  const [titulo, setTitulo] = useState(tarefa?.titulo || '')
  const [descricao, setDescricao] = useState(tarefa?.descricao || '')
  const [dataEntrega, setDataEntrega] = useState(toInputDate(tarefa?.data_entrega) || '')
  const [horaEntrega, setHoraEntrega] = useState(toInputTime(tarefa?.data_entrega) || '23:59')
  const [categoriaIds, setCategoriaIds] = useState(tarefa?.categorias?.map(c => c.id) || [])
  const [dateError, setDateError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  function handleDateChange(value) {
    setDataEntrega(value)
    if (!value) {
      setHoraEntrega('23:59')
    }
    if (isPastDate(value)) {
      setDateError(true)
    } else {
      setDateError(false)
    }
  }

  function toggleCat(id) {
    setCategoriaIds(prev =>
      prev.includes(id)
        ? prev.filter(c => c !== id)
        : [...prev, id]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!titulo.trim()) return
    if (isPastDate(dataEntrega)) return
    setSubmitting(true)
    let dataEntregaFinal = dataEntrega || null
    if (dataEntregaFinal && horaEntrega) {
      dataEntregaFinal = `${dataEntregaFinal}T${horaEntrega}:00`
    }
    await onSave({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      data_entrega: dataEntregaFinal,
      categorias: categoriaIds,
    })
    setSubmitting(false)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">
          {editing ? 'Editar tarefa' : 'Nova tarefa'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título</label>
            <input
              className="form-input"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="O que precisa ser feito?"
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea
              className="form-textarea"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Detalhes (opcional)"
              maxLength={1000}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Data de entrega</label>
            <div className="date-input-wrap">
              <input
                type="date"
                className={`form-input${dateError ? ' input-error' : ''}`}
                value={dataEntrega}
                onChange={e => handleDateChange(e.target.value)}
              />
              {dataEntrega && (
                <button type="button" className="date-clear" onClick={() => { setDataEntrega(''); setDateError(false); setHoraEntrega('23:59') }} title="Limpar data">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="14" height="14">
                    <line x1="3" y1="3" x2="13" y2="13" />
                    <line x1="13" y1="3" x2="3" y2="13" />
                  </svg>
                </button>
              )}
            </div>
            <div className="time-input-wrap">
              <label className="form-label form-label--inline">Horário</label>
              <input
                type="time"
                className="form-input form-input--time"
                value={horaEntrega}
                onChange={e => setHoraEntrega(e.target.value)}
              />
            </div>
            {dateError && <p className="form-error">A data não pode ser anterior a hoje.</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Categorias</label>
            <div className="form-categories">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className={`cat-check${categoriaIds.includes(cat.id) ? ' selected' : ''}`}
                  style={categoriaIds.includes(cat.id) ? { backgroundColor: cat.cor, borderColor: cat.cor, color: '#fff' } : {}}
                  onClick={() => toggleCat(cat.id)}
                >
                  {cat.nome}
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? (editing ? 'Salvando…' : 'Criando…') : editing ? 'Salvar' : 'Criar tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

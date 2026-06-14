import { useState } from 'react'

const CATEGORIES = [
  { key: 'tecnico', label: 'Técnico' },
  { key: 'normal', label: 'Normal' },
  { key: 'eventos', label: 'Eventos' },
  { key: 'domestica', label: 'Doméstica' },
]

function toInputDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toISOString().split('T')[0]
}

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

export default function FormTarefa({ tarefa, onSave, onCancel }) {
  const editing = !!tarefa
  const [titulo, setTitulo] = useState(tarefa?.titulo || '')
  const [descricao, setDescricao] = useState(tarefa?.descricao || '')
  const [dataEntrega, setDataEntrega] = useState(toInputDate(tarefa?.data_entrega) || '')
  const [categorias, setCategorias] = useState(tarefa?.categorias || [])
  const [dateError, setDateError] = useState(false)

  function handleDateChange(value) {
    setDataEntrega(value)
    if (isPastDate(value)) {
      setDateError(true)
    } else {
      setDateError(false)
    }
  }

  function toggleCat(cat) {
    setCategorias(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!titulo.trim()) return
    if (isPastDate(dataEntrega)) return
    onSave({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      data_entrega: dataEntrega || null,
      categorias,
    })
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
                <button type="button" className="date-clear" onClick={() => { setDataEntrega(''); setDateError(false) }} title="Limpar data">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="14" height="14">
                    <line x1="3" y1="3" x2="13" y2="13" />
                    <line x1="13" y1="3" x2="3" y2="13" />
                  </svg>
                </button>
              )}
            </div>
            {dateError && <p className="form-error">A data não pode ser anterior a hoje.</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Categorias</label>
            <div className="form-categories">
              {CATEGORIES.map(cat => (
                <div
                  key={cat.key}
                  className={`cat-check${categorias.includes(cat.key) ? ` selected ${cat.key}` : ''}`}
                  onClick={() => toggleCat(cat.key)}
                >
                  {cat.label}
                </div>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {editing ? 'Salvar' : 'Criar tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

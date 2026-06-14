import CardTarefa from './CardTarefa'

function getProximas(tasks) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return tasks
    .filter(t => {
      if (!t.data_entrega || t.concluida) return false
      const target = new Date(t.data_entrega)
      target.setHours(0, 0, 0, 0)
      const diff = (target - today) / (1000 * 60 * 60 * 24)
      return diff >= 0 && diff <= 7
    })
    .sort((a, b) => new Date(a.data_entrega) - new Date(b.data_entrega))
}

export default function ProximasTarefas({ tasks, onToggle, onEdit, onDelete }) {
  const proximas = getProximas(tasks)

  if (proximas.length === 0) return null

  return (
    <div className="section">
      <div className="section-header">
        <h3 className="section-title">Próximos dias</h3>
      </div>
      <div className="proximas-list">
        {proximas.map(t => (
          <CardTarefa
            key={t.id}
            tarefa={t}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            compact
          />
        ))}
      </div>
    </div>
  )
}

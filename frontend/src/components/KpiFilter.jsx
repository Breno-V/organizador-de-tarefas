export default function KpiFilter({ tasks, active, onChange, categories = [] }) {
  const counts = {}

  counts['__all'] = tasks.length

  for (const cat of categories) {
    counts[cat.id] = tasks.filter(t => t.categorias?.some(c => c.id === cat.id)).length
  }

  return (
    <div className="kpi-bar">
      <button
        className={`kpi-btn${!active ? ' active' : ''}`}
        onClick={() => onChange(null)}
      >
        Todas
        <span className="kpi-count">{counts['__all']}</span>
      </button>
      {categories.map(cat => (
        <button
          key={cat.id}
          className={`kpi-btn${active === cat.id ? ' active' : ''}`}
          onClick={() => onChange(cat.id)}
        >
          <span className="kpi-dot" style={{ backgroundColor: cat.cor }} />
          {cat.nome}
          <span className="kpi-count">{counts[cat.id]}</span>
        </button>
      ))}
    </div>
  )
}

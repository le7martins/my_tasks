function getCategoryColor(category) {
  const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ef4444']
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const STATUSES = [
  { key: 'pending', label: 'Pendentes', icon: '○' },
  { key: 'completed', label: 'Concluídas', icon: '✓' },
  { key: 'all', label: 'Todas', icon: '≡' },
]

export default function Sidebar({ categories, selectedCategory, onSelectCategory, selectedStatus, onSelectStatus, tasks }) {
  function countStatus(key) {
    if (key === 'all') return tasks.length
    if (key === 'pending') return tasks.filter(t => !t.completed).length
    return tasks.filter(t => t.completed).length
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">✓</span>
        <span className="sidebar-logo-text">MyTasks</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Status</div>
        {STATUSES.map(s => (
          <button
            key={s.key}
            className={`sidebar-item ${selectedStatus === s.key ? 'active' : ''}`}
            onClick={() => onSelectStatus(s.key)}
          >
            <span className="sidebar-item-icon">{s.icon}</span>
            <span className="sidebar-item-label">{s.label}</span>
            <span className="sidebar-item-count">{countStatus(s.key)}</span>
          </button>
        ))}

        <div className="sidebar-section-title">Categorias</div>
        <button
          className={`sidebar-item ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => onSelectCategory('all')}
        >
          <span className="sidebar-item-dot" style={{ background: '#94a3b8' }} />
          <span className="sidebar-item-label">Todas</span>
          <span className="sidebar-item-count">{tasks.length}</span>
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            className={`sidebar-item ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat)}
          >
            <span className="sidebar-item-dot" style={{ background: getCategoryColor(cat) }} />
            <span className="sidebar-item-label">{cat}</span>
            <span className="sidebar-item-count">
              {tasks.filter(t => t.category === cat).length}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

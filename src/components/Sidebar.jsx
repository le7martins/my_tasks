import { useState } from 'react'

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

export default function Sidebar({
  categories, selectedCategory, onSelectCategory,
  selectedStatus, onSelectStatus,
  tasks, isOpen, onClose,
  onAddCategory, onRemoveCategory,
}) {
  const [editing, setEditing] = useState(false)
  const [newCat, setNewCat] = useState('')

  function handleAdd() {
    const trimmed = newCat.trim()
    if (!trimmed) return
    onAddCategory(trimmed)
    setNewCat('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
  }

  function countStatus(key) {
    if (key === 'all') return tasks.length
    if (key === 'pending') return tasks.filter(t => !t.completed).length
    return tasks.filter(t => t.completed).length
  }

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">✓</div>
        <span className="sidebar-logo-text">MyTasks</span>
        <button className="sidebar-close" onClick={onClose} aria-label="Fechar">×</button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Status</div>
        {STATUSES.map(s => (
          <button
            key={s.key}
            className={`sidebar-item${selectedStatus === s.key ? ' active' : ''}`}
            onClick={() => onSelectStatus(s.key)}
          >
            <span className="sidebar-item-icon">{s.icon}</span>
            <span className="sidebar-item-label">{s.label}</span>
            <span className="sidebar-item-count">{countStatus(s.key)}</span>
          </button>
        ))}

        <div className="sidebar-section-title">
          Categorias
          <button
            className={`sidebar-edit-btn${editing ? ' active' : ''}`}
            onClick={() => { setEditing(e => !e); setNewCat('') }}
            title={editing ? 'Concluir edição' : 'Editar categorias'}
          >
            {editing ? 'Pronto' : 'Editar'}
          </button>
        </div>

        <button
          className={`sidebar-item${selectedCategory === 'all' ? ' active' : ''}`}
          onClick={() => onSelectCategory('all')}
        >
          <span className="sidebar-item-dot" style={{ background: '#94a3b8' }} />
          <span className="sidebar-item-label">Todas</span>
          <span className="sidebar-item-count">{tasks.length}</span>
        </button>

        <div className="category-grid">
          {categories.map(cat => {
            const color = getCategoryColor(cat)
            const count = tasks.filter(t => t.category === cat).length
            const isActive = selectedCategory === cat
            return (
              <button
                key={cat}
                className={`category-card${isActive ? ' active' : ''}`}
                onClick={() => !editing && onSelectCategory(cat)}
                style={isActive ? {
                  borderColor: color + '70',
                  background: color + '22',
                } : {}}
              >
                <div className="category-card-dot" style={{ background: color }} />
                <div className="category-card-name">{cat}</div>
                <div className="category-card-count">{count} tarefa{count !== 1 ? 's' : ''}</div>
                {editing && (
                  <button
                    className="category-card-remove"
                    onClick={e => { e.stopPropagation(); onRemoveCategory(cat) }}
                    aria-label={`Remover ${cat}`}
                  >
                    ×
                  </button>
                )}
              </button>
            )
          })}

          {editing && (
            <div className="category-card category-card-add">
              <input
                className="category-add-input"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nova..."
                autoFocus
              />
              <button className="category-add-confirm" onClick={handleAdd}>✓</button>
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}

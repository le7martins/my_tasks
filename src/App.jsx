import { useState, useEffect, useMemo } from 'react'
import TaskList from './components/TaskList'
import TaskForm from './components/TaskForm'
import { useTasks } from './hooks/useTasks'

const PRIORITY_RANK = { alta: 0, media: 1, baixa: 2 }

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function isOverdue(task) {
  return task.status === 'pendente' && task.data < getToday()
}

export default function App() {
  const { tasks, addTask, updateTask, deleteTask, toggleTask } = useTasks()
  const [filter, setFilter]           = useState('pendentes')
  const [showForm, setShowForm]       = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved !== 'light'
    return true
  })

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const today = getToday()

  const completedToday = useMemo(
    () => tasks.filter(t => t.concluidoEm?.slice(0, 10) === today).length,
    [tasks, today]
  )

  const counts = useMemo(() => ({
    todas:      tasks.length,
    pendentes:  tasks.filter(t => t.status === 'pendente').length,
    concluidas: tasks.filter(t => t.status === 'concluido').length,
  }), [tasks])

  const sortedTasks = useMemo(() => {
    const filtered = tasks.filter(t => {
      if (filter === 'pendentes')  return t.status === 'pendente'
      if (filter === 'concluidas') return t.status === 'concluido'
      return true
    })

    return [...filtered].sort((a, b) => {
      if (filter === 'concluidas') {
        return (b.concluidoEm || '').localeCompare(a.concluidoEm || '')
      }
      const aOver = isOverdue(a) ? 0 : 1
      const bOver = isOverdue(b) ? 0 : 1
      if (aOver !== bOver) return aOver - bOver
      const pDiff = (PRIORITY_RANK[a.prioridade] ?? 1) - (PRIORITY_RANK[b.prioridade] ?? 1)
      if (pDiff !== 0) return pDiff
      const dDiff = a.data.localeCompare(b.data)
      if (dDiff !== 0) return dDiff
      return b.criadoEm.localeCompare(a.criadoEm)
    })
  }, [tasks, filter])

  function handleEdit(task) {
    setEditingTask(task)
    setShowForm(true)
  }

  function handleSubmit(data) {
    if (editingTask) updateTask(editingTask.id, data)
    else addTask(data)
    setShowForm(false)
    setEditingTask(null)
  }

  function handleClose() {
    setShowForm(false)
    setEditingTask(null)
  }

  const isMilestone = completedToday > 0 && completedToday % 3 === 0

  const FILTERS = [
    { key: 'todas',      label: 'Todas' },
    { key: 'pendentes',  label: 'Pendentes' },
    { key: 'concluidas', label: 'Concluídas' },
  ]

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-top">
          <h1 className="app-title">My<span>Tasks</span></h1>
          <div className="header-actions">
            <button
              className="btn-theme"
              onClick={() => setDark(d => !d)}
              aria-label="Alternar tema"
              title={dark ? 'Modo claro' : 'Modo escuro'}
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button
              className="btn-add"
              onClick={() => setShowForm(true)}
              aria-label="Nova tarefa"
            >
              + Nova
            </button>
          </div>
        </div>

        {completedToday > 0 && (
          <div className={`productivity-counter${isMilestone ? ' milestone' : ''}`}>
            ✓ {completedToday} tarefa{completedToday !== 1 ? 's' : ''} concluída{completedToday !== 1 ? 's' : ''} hoje
          </div>
        )}

        <div className="filter-tabs">
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`tab${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="tab-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </header>

      <TaskList
        tasks={sortedTasks}
        filter={filter}
        onToggle={toggleTask}
        onDelete={deleteTask}
        onEdit={handleEdit}
      />

      {showForm && (
        <TaskForm
          task={editingTask}
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      )}
    </div>
  )
}

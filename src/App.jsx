import { useState, useEffect, useMemo, useRef } from 'react'
import TaskList from './components/TaskList'
import TaskForm from './components/TaskForm'
import CalendarView from './components/CalendarView'
import { useTasks } from './hooks/useTasks'
import { useGoogleCalendar } from './hooks/useGoogleCalendar'

const PRIORITY_RANK = { alta: 0, media: 1, baixa: 2 }
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function isOverdue(task) {
  return task.status === 'pendente' && task.data < getToday()
}

function formatBarDate(dateStr) {
  const [, m, d] = dateStr.split('-')
  return `${parseInt(d)} de ${MONTHS[parseInt(m) - 1]}`
}

export default function App() {
  const { tasks, addTask, updateTask, patchTask, deleteTask, toggleTask, importTasks } = useTasks()
  const gcal = useGoogleCalendar()

  const [filter,       setFilter]       = useState('pendentes')
  const [view,         setView]         = useState('list')
  const [selectedDate, setSelectedDate] = useState(null)
  const [showForm,     setShowForm]     = useState(false)
  const [editingTask,  setEditingTask]  = useState(null)
  const [gcalError,    setGcalError]    = useState(null)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved !== 'light'
    return true
  })

  const importRef = useRef(null)

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // Sync gcal errors
  useEffect(() => {
    if (gcal.error) setGcalError(gcal.error)
  }, [gcal.error])

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

  const displayedTasks = useMemo(() => {
    let list = tasks.filter(t => {
      if (filter === 'pendentes')  return t.status === 'pendente'
      if (filter === 'concluidas') return t.status === 'concluido'
      return true
    })
    if (view === 'calendar' && selectedDate) {
      list = list.filter(t => t.data === selectedDate)
    }
    return [...list].sort((a, b) => {
      if (filter === 'concluidas') {
        return (b.concluidoEm || '').localeCompare(a.concluidoEm || '')
      }
      const od = (isOverdue(a) ? 0 : 1) - (isOverdue(b) ? 0 : 1)
      if (od !== 0) return od
      const pd = (PRIORITY_RANK[a.prioridade] ?? 1) - (PRIORITY_RANK[b.prioridade] ?? 1)
      if (pd !== 0) return pd
      const dd = a.data.localeCompare(b.data)
      if (dd !== 0) return dd
      return b.criadoEm.localeCompare(a.criadoEm)
    })
  }, [tasks, filter, view, selectedDate])

  // ── Handlers ──

  function handleSubmit(data) {
    if (editingTask) {
      updateTask(editingTask.id, data)
      if (gcal.isConnected && editingTask.googleEventId) {
        gcal.updateEvent(editingTask.googleEventId, { ...editingTask, ...data }).catch(() => {})
      }
    } else {
      const newTask = addTask(data)
      if (gcal.isConnected) {
        gcal.createEvent(newTask)
          .then(ev => { if (ev?.id) patchTask(newTask.id, { googleEventId: ev.id }) })
          .catch(() => {})
      }
    }
    setShowForm(false)
    setEditingTask(null)
  }

  function handleEdit(task) {
    setEditingTask(task)
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditingTask(null)
  }

  function handleDelete(id) {
    const task = tasks.find(t => t.id === id)
    if (gcal.isConnected && task?.googleEventId) {
      gcal.deleteEvent(task.googleEventId).catch(() => {})
    }
    deleteTask(id)
  }

  function handleToggle(id) {
    const task = tasks.find(t => t.id === id)
    toggleTask(id)
    if (gcal.isConnected && task?.googleEventId) {
      const toggled = { ...task, status: task.status === 'pendente' ? 'concluido' : 'pendente' }
      gcal.updateEvent(task.googleEventId, toggled).catch(() => {})
    }
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `mytasks-backup-${today}.json`,
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result)
        if (!Array.isArray(imported)) throw new Error()
        const valid = imported.filter(t => t.titulo && t.data)
        if (valid.length === 0) throw new Error()
        if (window.confirm(
          `Importar ${valid.length} tarefa${valid.length !== 1 ? 's' : ''}?\n\nIsso substituirá as tarefas atuais.`
        )) {
          importTasks(valid)
        }
      } catch {
        window.alert('Arquivo inválido ou formato não reconhecido.')
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  function handleGoogleCalendar() {
    if (gcal.isConnected) {
      gcal.syncAllTasks(tasks, (id, patch) => patchTask(id, patch))
    } else {
      gcal.connect(() => {
        gcal.syncAllTasks(tasks, (id, patch) => patchTask(id, patch))
      })
    }
  }

  function handleToggleView() {
    setView(v => v === 'list' ? 'calendar' : 'list')
    setSelectedDate(null)
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
              title={dark ? 'Modo claro' : 'Modo escuro'}
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button className="btn-add" onClick={() => setShowForm(true)}>
              + Nova
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <button
            className={`toolbar-btn${view === 'calendar' ? ' active' : ''}`}
            onClick={handleToggleView}
          >
            📅 {view === 'calendar' ? 'Lista' : 'Calendário'}
          </button>
          <button className="toolbar-btn" onClick={handleExport} title="Exportar JSON">
            ⬇️ Exportar
          </button>
          <label className="toolbar-btn" style={{ cursor: 'pointer' }} title="Importar JSON">
            ⬆️ Importar
            <input
              ref={importRef}
              type="file"
              accept=".json"
              className="import-input"
              onChange={handleImportFile}
            />
          </label>
          {gcal.isConfigured && (
            <button
              className={`toolbar-btn${gcal.isConnected ? ' gcal-connected' : ''}`}
              onClick={handleGoogleCalendar}
              disabled={gcal.isSyncing}
              title={gcal.isConnected ? 'Sincronizar com Google Calendar' : 'Conectar Google Calendar'}
            >
              {gcal.isSyncing
                ? '↻ Sincronizando...'
                : gcal.isConnected
                  ? '✓ Google Sync'
                  : 'G Google Cal'}
            </button>
          )}
        </div>

        {/* Productivity counter */}
        {completedToday > 0 && (
          <div className={`productivity-counter${isMilestone ? ' milestone' : ''}`}>
            ✓ {completedToday} tarefa{completedToday !== 1 ? 's' : ''} concluída{completedToday !== 1 ? 's' : ''} hoje
            {isMilestone && ' 🎉'}
          </div>
        )}

        {/* Filter tabs */}
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

      {/* Sync error banner */}
      {gcalError && (
        <div className="sync-error">
          <span>⚠️ {gcalError}</span>
          <button onClick={() => setGcalError(null)}>✕</button>
        </div>
      )}

      {/* Calendar view */}
      {view === 'calendar' && (
        <CalendarView
          tasks={tasks}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}

      {/* Selected date bar */}
      {view === 'calendar' && selectedDate && (
        <div className="selected-date-bar">
          <span>
            📅 {formatBarDate(selectedDate)} · {displayedTasks.length} tarefa{displayedTasks.length !== 1 ? 's' : ''}
          </span>
          <button onClick={() => setSelectedDate(null)} aria-label="Limpar seleção">✕</button>
        </div>
      )}

      <TaskList
        tasks={displayedTasks}
        filter={filter}
        onToggle={handleToggle}
        onDelete={handleDelete}
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

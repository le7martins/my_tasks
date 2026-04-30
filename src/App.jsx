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

function taskToCSV(tasks) {
  const header = ['ID','Título','Data','Hora','Prioridade','Status','Tag','Recorrência','Descrição','Criado em']
  const rows = tasks.map(t => [
    t.id, t.titulo, t.data, t.hora || '', t.prioridade, t.status,
    t.tag || '', t.recorrencia || '', t.descricao || '', t.criadoEm || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`))
  return [header, ...rows].map(r => r.join(',')).join('\n')
}

function taskToICS(tasks) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MyTasks//EN']
  for (const t of tasks) {
    const hasTime = t.hora && /^\d{2}:\d{2}$/.test(t.hora)
    const dtStart = hasTime
      ? `DTSTART:${t.data.replace(/-/g, '')}T${t.hora.replace(':', '')}00`
      : `DTSTART;VALUE=DATE:${t.data.replace(/-/g, '')}`
    const parts = [
      'BEGIN:VEVENT',
      `UID:${t.id}@mytasks`,
      dtStart,
      `SUMMARY:${t.titulo.replace(/[,;\\]/g, c => '\\' + c)}`,
      t.descricao ? `DESCRIPTION:${t.descricao.replace(/\n/g, '\\n')}` : null,
      `STATUS:${t.status === 'concluido' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
      'END:VEVENT',
    ].filter(Boolean)
    lines.push(...parts)
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export default function App() {
  const { tasks, addTask, updateTask, patchTask, deleteTask, toggleTask, toggleSubtask, duplicateTask, importTasks } = useTasks()
  const gcal = useGoogleCalendar()

  const [filter,       setFilter]       = useState('pendentes')
  const [view,         setView]         = useState('list')
  const [selectedDate, setSelectedDate] = useState(null)
  const [showForm,     setShowForm]     = useState(false)
  const [editingTask,  setEditingTask]  = useState(null)
  const [gcalError,    setGcalError]    = useState(null)
  const [search,       setSearch]       = useState('')
  const [showSearch,   setShowSearch]   = useState(false)
  const [toasts,       setToasts]       = useState([])
  const [isOnline,     setIsOnline]     = useState(navigator.onLine)
  const [showStats,    setShowStats]    = useState(false)
  const [showProfile,  setShowProfile]  = useState(false)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved !== 'light'
    return true
  })

  const importRef   = useRef(null)
  const searchRef   = useRef(null)
  const toastTimers = useRef({})

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    if (gcal.error) setGcalError(gcal.error)
  }, [gcal.error])

  useEffect(() => {
    const onOnline  = () => { setIsOnline(true);  showToast('Conexão restaurada', 'success') }
    const onOffline = () => { setIsOnline(false); showToast('Sem conexão', 'warning') }
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    function handleKey(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setEditingTask(null)
        setShowForm(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearch(true)
        setTimeout(() => searchRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        if (showForm)    { setShowForm(false);    setEditingTask(null) }
        if (showStats)   setShowStats(false)
        if (showProfile) setShowProfile(false)
        if (showSearch)  { setShowSearch(false);  setSearch('') }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showForm, showStats, showProfile, showSearch])

  function showToast(msg, type = 'info', duration = 3000) {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, msg, type }])
    toastTimers.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      delete toastTimers.current[id]
    }, duration)
  }

  function dismissToast(id) {
    clearTimeout(toastTimers.current[id])
    delete toastTimers.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }

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

  const stats = useMemo(() => {
    const total = tasks.length
    const done  = tasks.filter(t => t.status === 'concluido').length
    const byPriority = { alta: 0, media: 0, baixa: 0 }
    const byTag = {}
    tasks.forEach(t => {
      byPriority[t.prioridade] = (byPriority[t.prioridade] || 0) + 1
      if (t.tag) byTag[t.tag] = (byTag[t.tag] || 0) + 1
    })
    return {
      total, done,
      pending:  total - done,
      overdue:  tasks.filter(t => isOverdue(t)).length,
      byPriority, byTag, completedToday,
    }
  }, [tasks, completedToday])

  const displayedTasks = useMemo(() => {
    let list = tasks.filter(t => {
      if (filter === 'pendentes')  return t.status === 'pendente'
      if (filter === 'concluidas') return t.status === 'concluido'
      return true
    })
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(t =>
        t.titulo.toLowerCase().includes(q) ||
        (t.descricao || '').toLowerCase().includes(q) ||
        (t.tag || '').toLowerCase().includes(q)
      )
    }
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
  }, [tasks, filter, view, selectedDate, search])

  // ── Handlers ──

  function handleSubmit(data) {
    if (editingTask) {
      updateTask(editingTask.id, data)
      if (gcal.isConnected && editingTask.googleEventId) {
        gcal.updateEvent(editingTask.googleEventId, { ...editingTask, ...data }).catch(() => {})
      }
      showToast('Tarefa atualizada', 'success')
    } else {
      const newTask = addTask(data)
      if (gcal.isConnected) {
        gcal.createEvent(newTask)
          .then(ev => { if (ev?.id) patchTask(newTask.id, { googleEventId: ev.id }) })
          .catch(() => {})
      }
      showToast('Tarefa criada', 'success')
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
    showToast('Tarefa excluída', 'info')
  }

  function handleToggle(id) {
    const task = tasks.find(t => t.id === id)
    toggleTask(id)
    if (gcal.isConnected && task?.googleEventId) {
      const toggled = { ...task, status: task.status === 'pendente' ? 'concluido' : 'pendente' }
      gcal.updateEvent(task.googleEventId, toggled).catch(() => {})
    }
  }

  function handleDuplicate(id) {
    duplicateTask(id)
    showToast('Tarefa duplicada', 'info')
  }

  function handleExportJSON() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: `mytasks-${today}.json` }).click()
    URL.revokeObjectURL(url)
    showToast('Exportado como JSON', 'success')
  }

  function handleExportCSV() {
    const blob = new Blob([taskToCSV(tasks)], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: `mytasks-${today}.csv` }).click()
    URL.revokeObjectURL(url)
    showToast('Exportado como CSV', 'success')
  }

  function handleExportICS() {
    const blob = new Blob([taskToICS(tasks)], { type: 'text/calendar' })
    const url  = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: `mytasks-${today}.ics` }).click()
    URL.revokeObjectURL(url)
    showToast('Exportado como ICS', 'success')
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
          showToast(`${valid.length} tarefas importadas`, 'success')
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
      showToast('Sincronizando...', 'info', 2000)
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

  function toggleSearch() {
    if (showSearch) {
      setShowSearch(false)
      setSearch('')
    } else {
      setShowSearch(true)
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }

  const isMilestone = completedToday > 0 && completedToday % 3 === 0

  const FILTERS = [
    { key: 'todas',      label: 'Todas' },
    { key: 'pendentes',  label: 'Pendentes' },
    { key: 'concluidas', label: 'Concluídas' },
  ]

  return (
    <div className="app">
      {!isOnline && (
        <div className="offline-banner">
          📵 Você está offline — alterações salvas localmente
        </div>
      )}

      <header className="app-header">
        <div className="app-header-top">
          <h1 className="app-title">My<span>Tasks</span></h1>
          <div className="header-actions">
            {gcal.isConnected && gcal.profile && (
              <button
                className="btn-profile"
                onClick={() => setShowProfile(true)}
                title={gcal.profile.email}
                aria-label="Perfil Google"
              >
                {gcal.profile.picture
                  ? <img src={gcal.profile.picture} alt="" className="profile-avatar" />
                  : <span className="profile-initials">{(gcal.profile.name || gcal.profile.email || '?')[0].toUpperCase()}</span>
                }
              </button>
            )}
            <button className="btn-icon" onClick={toggleSearch} title="Pesquisar (Ctrl+F)" aria-label="Pesquisar">
              🔍
            </button>
            <button className="btn-icon" onClick={() => setShowStats(true)} title="Estatísticas" aria-label="Estatísticas">
              📊
            </button>
            <button
              className="btn-theme"
              onClick={() => setDark(d => !d)}
              title={dark ? 'Modo claro' : 'Modo escuro'}
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <button
              className="btn-add"
              onClick={() => { setEditingTask(null); setShowForm(true) }}
              title="Nova tarefa (Ctrl+N)"
            >
              + Nova
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              ref={searchRef}
              className="search-input"
              type="search"
              placeholder="Pesquisar tarefas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearch('') } }}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')} aria-label="Limpar pesquisa">✕</button>
            )}
          </div>
        )}

        <div className="toolbar">
          <button
            className={`toolbar-btn${view === 'calendar' ? ' active' : ''}`}
            onClick={handleToggleView}
          >
            📅 {view === 'calendar' ? 'Lista' : 'Calendário'}
          </button>
          <button className="toolbar-btn" onClick={handleExportJSON} title="Exportar JSON">⬇️ JSON</button>
          <button className="toolbar-btn" onClick={handleExportCSV}  title="Exportar CSV">⬇️ CSV</button>
          <button className="toolbar-btn" onClick={handleExportICS}  title="Exportar ICS">⬇️ ICS</button>
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
              {gcal.isSyncing ? '↻ Sincronizando...' : gcal.isConnected ? '✓ Google Sync' : 'G Google Cal'}
            </button>
          )}
          {gcal.isConnected && (
            <button
              className="toolbar-btn"
              onClick={() => { gcal.disconnect(); showToast('Desconectado do Google', 'info') }}
              title="Desconectar Google"
            >
              ✕ Google
            </button>
          )}
        </div>

        {completedToday > 0 && (
          <div className={`productivity-counter${isMilestone ? ' milestone' : ''}`}>
            ✓ {completedToday} tarefa{completedToday !== 1 ? 's' : ''} concluída{completedToday !== 1 ? 's' : ''} hoje
            {isMilestone && ' 🎉'}
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

      {gcalError && (
        <div className="sync-error">
          <span>⚠️ {gcalError}</span>
          <button onClick={() => setGcalError(null)}>✕</button>
        </div>
      )}

      {view === 'calendar' && (
        <CalendarView
          tasks={tasks}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      )}

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
        search={search}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onToggleSubtask={toggleSubtask}
      />

      {showForm && (
        <TaskForm
          task={editingTask}
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      )}

      {/* Stats modal */}
      {showStats && (
        <div className="modal-overlay" onClick={() => setShowStats(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>📊 Estatísticas</h2>
              <button className="modal-close" onClick={() => setShowStats(false)} aria-label="Fechar">×</button>
            </div>
            <div className="stats-body">
              <div className="stats-grid">
                {[
                  { value: stats.total,          label: 'Total',           cls: '' },
                  { value: stats.done,            label: 'Concluídas',      cls: 'success' },
                  { value: stats.pending,         label: 'Pendentes',       cls: 'warning' },
                  { value: stats.overdue,         label: 'Atrasadas',       cls: 'danger' },
                  { value: stats.completedToday,  label: 'Hoje',            cls: 'primary' },
                  { value: stats.total > 0 ? `${Math.round(stats.done / stats.total * 100)}%` : '0%', label: 'Conclusão', cls: 'primary' },
                ].map(({ value, label, cls }) => (
                  <div key={label} className={`stat-card${cls ? ` ${cls}` : ''}`}>
                    <span className="stat-value">{value}</span>
                    <span className="stat-label">{label}</span>
                  </div>
                ))}
              </div>

              <div className="stats-section">
                <h3 className="stats-section-title">Por Prioridade</h3>
                <div className="stats-bars">
                  {[['alta','Alta','var(--p-alta-color)'],['media','Média','var(--p-media-color)'],['baixa','Baixa','var(--p-baixa-color)']].map(([k, label, color]) => (
                    <div key={k} className="stats-bar-row">
                      <span className="stats-bar-label">{label}</span>
                      <div className="stats-bar-track">
                        <div
                          className="stats-bar-fill"
                          style={{
                            width: stats.total > 0 ? `${(stats.byPriority[k] || 0) / stats.total * 100}%` : '0%',
                            background: color,
                          }}
                        />
                      </div>
                      <span className="stats-bar-count">{stats.byPriority[k] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              {Object.keys(stats.byTag).length > 0 && (
                <div className="stats-section">
                  <h3 className="stats-section-title">Por Tag</h3>
                  <div className="stats-tags">
                    {Object.entries(stats.byTag).map(([tag, count]) => (
                      <span key={tag} className="stats-tag-item">{tag}: {count}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {showProfile && gcal.profile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>Conta Google</h2>
              <button className="modal-close" onClick={() => setShowProfile(false)} aria-label="Fechar">×</button>
            </div>
            <div className="profile-body">
              {gcal.profile.picture
                ? <img src={gcal.profile.picture} alt="" className="profile-avatar-lg" />
                : <div className="profile-initials-lg">{(gcal.profile.name || gcal.profile.email || '?')[0].toUpperCase()}</div>
              }
              <p className="profile-name">{gcal.profile.name}</p>
              <p className="profile-email">{gcal.profile.email}</p>
              <button
                className="btn-secondary"
                style={{ marginTop: 8 }}
                onClick={() => {
                  gcal.disconnect()
                  setShowProfile(false)
                  showToast('Desconectado do Google', 'info')
                }}
              >
                Desconectar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismissToast(t.id)}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  )
}

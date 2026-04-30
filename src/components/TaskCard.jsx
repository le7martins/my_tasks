import { useState, useEffect, useRef } from 'react'

const PRIORITY_CONFIG = {
  alta:  { label: 'Alta',  cls: 'priority-alta' },
  media: { label: 'Média', cls: 'priority-media' },
  baixa: { label: 'Baixa', cls: 'priority-baixa' },
}

const TAG_COLORS = {
  trabalho: '#6366f1',
  pessoal:  '#22c55e',
  saude:    '#ef4444',
  financas: '#f59e0b',
  estudos:  '#06b6d4',
}

const TAG_LABELS = {
  trabalho: 'Trabalho',
  pessoal:  'Pessoal',
  saude:    'Saúde',
  financas: 'Finanças',
  estudos:  'Estudos',
}

function getRelativeDate(dateStr) {
  const now      = new Date()
  now.setHours(0, 0, 0, 0)
  const taskDate = new Date(dateStr + 'T00:00:00')
  const diff     = Math.round((taskDate - now) / 86400000)

  if (diff === 0)  return 'Hoje'
  if (diff === 1)  return 'Amanhã'
  if (diff === -1) return 'Ontem'
  if (diff > 1 && diff <= 7) return `Em ${diff} dias`
  if (diff < -1)  return `Atrasado há ${Math.abs(diff)} dia${Math.abs(diff) !== 1 ? 's' : ''}`

  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

const SWIPE_THRESHOLD = 80

export default function TaskCard({ task, onToggle, onDelete, onEdit, onDuplicate, onToggleSubtask }) {
  const [entering, setEntering] = useState(true)
  const [swipeX,   setSwipeX]   = useState(0)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const swiping     = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setEntering(false), 400)
    return () => clearTimeout(t)
  }, [])

  const isCompleted = task.status === 'concluido'
  const isOverdue   = !isCompleted && task.data < getToday()
  const priority    = PRIORITY_CONFIG[task.prioridade] || PRIORITY_CONFIG.media
  const dateLabel   = getRelativeDate(task.data)
  const subtarefas  = task.subtarefas || []
  const subTotal    = subtarefas.length
  const subDone     = subtarefas.filter(s => s.status === 'concluido').length

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    swiping.current = false
  }

  function handleTouchMove(e) {
    if (touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (!swiping.current && dy > 10) {
      touchStartX.current = null
      return
    }
    if (Math.abs(dx) > 8) swiping.current = true
    if (swiping.current) {
      e.preventDefault()
      setSwipeX(Math.max(-SWIPE_THRESHOLD * 1.1, Math.min(SWIPE_THRESHOLD * 1.1, dx)))
    }
  }

  function handleTouchEnd() {
    if (swipeX <= -SWIPE_THRESHOLD) onDelete(task.id)
    else if (swipeX >= SWIPE_THRESHOLD) onToggle(task.id)
    setSwipeX(0)
    touchStartX.current = null
    swiping.current = false
  }

  const cardClass = [
    'task-card',
    entering    ? 'entering'  : '',
    isCompleted ? 'completed' : '',
    isOverdue   ? 'overdue'   : '',
  ].filter(Boolean).join(' ')

  const swipeHint = swipeX <= -SWIPE_THRESHOLD * 0.5 ? 'swipe-delete'
                  : swipeX >= SWIPE_THRESHOLD  * 0.5 ? 'swipe-complete'
                  : ''

  return (
    <div
      className={`task-card-wrapper${swipeHint ? ` ${swipeHint}` : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={cardClass}
        style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? 'transform .25s' : 'none' }}
      >
        <div className="task-card-body">
          <div className="task-main-row">
            <button
              key={task.status}
              className={`task-check${isCompleted ? ' checked' : ''}`}
              onClick={() => onToggle(task.id)}
              aria-label={isCompleted ? 'Reabrir tarefa' : 'Marcar como concluída'}
            >
              {isCompleted && '✓'}
            </button>

            <div className="task-content">
              <span className="task-title">{task.titulo}</span>
              {task.descricao && (
                <p className="task-desc">{task.descricao}</p>
              )}
              <div className="task-meta-row">
                <span className={`task-date${isOverdue ? ' overdue' : ''}`}>
                  {isOverdue ? '⚠' : '📅'} {dateLabel}
                  {task.hora && <span className="task-time"> · {task.hora}</span>}
                </span>
                <span className={`priority-badge ${priority.cls}`}>
                  {priority.label}
                </span>
                {task.tag && TAG_LABELS[task.tag] && (
                  <span className="tag-badge" style={{ '--tag-color': TAG_COLORS[task.tag] }}>
                    {TAG_LABELS[task.tag]}
                  </span>
                )}
                {task.recorrencia && (
                  <span className="recorrencia-badge" title={`Recorrência: ${task.recorrencia}`}>🔁</span>
                )}
              </div>

              {subTotal > 0 && (
                <div className="subtask-progress">
                  <div className="subtask-progress-bar">
                    <div
                      className="subtask-progress-fill"
                      style={{ width: `${(subDone / subTotal) * 100}%` }}
                    />
                  </div>
                  <span className="subtask-count">{subDone}/{subTotal}</span>
                </div>
              )}

              {subTotal > 0 && !isCompleted && (
                <ul className="subtask-list">
                  {subtarefas.map(s => (
                    <li
                      key={s.id}
                      className={`subtask-item${s.status === 'concluido' ? ' done' : ''}`}
                      onClick={() => onToggleSubtask?.(task.id, s.id)}
                    >
                      <span className={`subtask-check${s.status === 'concluido' ? ' checked' : ''}`}>
                        {s.status === 'concluido' && '✓'}
                      </span>
                      <span>{s.titulo}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="task-actions">
              {onDuplicate && (
                <button
                  className="task-action-btn"
                  onClick={() => onDuplicate(task.id)}
                  title="Duplicar"
                  aria-label="Duplicar tarefa"
                >
                  📋
                </button>
              )}
              <button
                className="task-action-btn"
                onClick={() => onEdit(task)}
                title="Editar"
                aria-label="Editar tarefa"
              >
                ✏️
              </button>
              <button
                className="task-action-btn danger"
                onClick={() => onDelete(task.id)}
                title="Excluir"
                aria-label="Excluir tarefa"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'

const PRIORITY_CONFIG = {
  alta:  { label: 'Alta',  cls: 'priority-alta' },
  media: { label: 'Média', cls: 'priority-media' },
  baixa: { label: 'Baixa', cls: 'priority-baixa' },
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

export default function TaskCard({ task, onToggle, onDelete, onEdit }) {
  const [entering, setEntering] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setEntering(false), 400)
    return () => clearTimeout(t)
  }, [])

  const isCompleted = task.status === 'concluido'
  const isOverdue   = !isCompleted && task.data < getToday()
  const priority    = PRIORITY_CONFIG[task.prioridade] || PRIORITY_CONFIG.media
  const dateLabel   = getRelativeDate(task.data)

  const cardClass = [
    'task-card',
    entering    ? 'entering'  : '',
    isCompleted ? 'completed' : '',
    isOverdue   ? 'overdue'   : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClass}>
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
              </span>
              <span className={`priority-badge ${priority.cls}`}>
                {priority.label}
              </span>
            </div>
          </div>

          <div className="task-actions">
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
  )
}

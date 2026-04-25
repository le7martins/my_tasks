import { useState } from 'react'

const RECURRENCE_LABELS = {
  none: null,
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
}

function getCategoryColor(category) {
  const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ef4444']
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function formatDate(date, time) {
  if (!date) return null
  const [year, month, day] = date.split('-')
  const formatted = `${day}/${month}/${year}`
  return time ? `${formatted} às ${time}` : formatted
}

function isOverdue(dueDate) {
  if (!dueDate) return false
  return new Date(dueDate + 'T23:59:59') < new Date()
}

export default function TaskCard({ task, onEdit, onDelete, onToggle, onToggleSubtask }) {
  const [expanded, setExpanded] = useState(false)

  const hasSubtasks = task.subtasks && task.subtasks.length > 0
  const completedSubtasks = hasSubtasks ? task.subtasks.filter(s => s.completed).length : 0
  const overdue = !task.completed && isOverdue(task.dueDate)
  const dateStr = formatDate(task.dueDate, task.dueTime)
  const recurrenceLabel = RECURRENCE_LABELS[task.recurrence]
  const categoryColor = task.category ? getCategoryColor(task.category) : null

  return (
    <div className={`task-card${task.completed ? ' completed' : ''}${overdue ? ' overdue' : ''}`}>
      <div className="task-card-main">
        <button
          className={`task-check${task.completed ? ' checked' : ''}`}
          onClick={() => onToggle(task.id)}
          aria-label="Marcar como concluída"
        >
          {task.completed && '✓'}
        </button>

        <div className="task-content">
          <div className="task-title-row">
            <span className="task-title">{task.title}</span>
            {task.category && (
              <span
                className="task-category"
                style={{
                  background: categoryColor + '22',
                  color: categoryColor,
                  border: `1px solid ${categoryColor}44`,
                }}
              >
                {task.category}
              </span>
            )}
          </div>

          {task.description && (
            <p className="task-description">{task.description}</p>
          )}

          <div className="task-meta">
            {dateStr && (
              <span className={`task-meta-item${overdue ? ' overdue-text' : ''}`}>
                📅 {dateStr}
              </span>
            )}
            {recurrenceLabel && (
              <span className="task-meta-item">🔄 {recurrenceLabel}</span>
            )}
            {hasSubtasks && (
              <span className="task-meta-item">
                ☑ {completedSubtasks}/{task.subtasks.length} subtarefas
              </span>
            )}
          </div>
        </div>

        <div className="task-actions">
          {hasSubtasks && (
            <button
              className="task-action-btn"
              onClick={() => setExpanded(e => !e)}
              title="Ver subtarefas"
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
          <button
            className="task-action-btn"
            onClick={() => onEdit(task)}
            title="Editar"
          >
            ✏️
          </button>
          <button
            className="task-action-btn danger"
            onClick={() => onDelete(task.id)}
            title="Excluir"
          >
            🗑️
          </button>
        </div>
      </div>

      {expanded && hasSubtasks && (
        <ul className="subtask-list">
          {task.subtasks.map(sub => (
            <li key={sub.id} className={`subtask-item${sub.completed ? ' completed' : ''}`}>
              <button
                className={`task-check small${sub.completed ? ' checked' : ''}`}
                onClick={() => onToggleSubtask(task.id, sub.id)}
              >
                {sub.completed && '✓'}
              </button>
              <span className="subtask-title">{sub.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

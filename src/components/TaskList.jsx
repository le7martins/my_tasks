import TaskCard from './TaskCard'

export default function TaskList({ tasks, onEdit, onDelete, onToggle, onToggleSubtask }) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <p className="empty-text">Nenhuma tarefa aqui</p>
        <p className="empty-sub">Clique em "+" para começar</p>
      </div>
    )
  }

  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
          onToggleSubtask={onToggleSubtask}
        />
      ))}
    </div>
  )
}

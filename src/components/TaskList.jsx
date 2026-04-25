import TaskCard from './TaskCard'

const EMPTY_STATES = {
  todas:     { icon: '📋', title: 'Nenhuma tarefa ainda',       sub: 'Clique em "+ Nova" para começar' },
  pendentes: { icon: '✅', title: 'Tudo em dia!',               sub: 'Você não tem tarefas pendentes' },
  concluidas:{ icon: '🏆', title: 'Nenhuma tarefa concluída',   sub: 'Complete uma tarefa para vê-la aqui' },
}

export default function TaskList({ tasks, filter, onToggle, onDelete, onEdit }) {
  if (tasks.length === 0) {
    const e = EMPTY_STATES[filter] || EMPTY_STATES.todas
    return (
      <div className="task-list-container">
        <div className="empty-state">
          <div className="empty-icon">{e.icon}</div>
          <p className="empty-title">{e.title}</p>
          <p className="empty-sub">{e.sub}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="task-list-container">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}

import { useState } from 'react'
import Sidebar from './components/Sidebar'
import TaskList from './components/TaskList'
import TaskForm from './components/TaskForm'
import { useTasks } from './hooks/useTasks'

export default function App() {
  const { tasks, addTask, updateTask, deleteTask, toggleTask, toggleSubtask } = useTasks()
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('pending')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))].sort()

  const filteredTasks = tasks.filter(task => {
    const catMatch = selectedCategory === 'all' || task.category === selectedCategory
    const statusMatch =
      selectedStatus === 'all' ||
      (selectedStatus === 'pending' && !task.completed) ||
      (selectedStatus === 'completed' && task.completed)
    return catMatch && statusMatch
  })

  function handleEdit(task) {
    setEditingTask(task)
    setShowForm(true)
  }

  function handleSubmit(data) {
    if (editingTask) {
      updateTask(editingTask.id, data)
    } else {
      addTask(data)
    }
    setShowForm(false)
    setEditingTask(null)
  }

  function handleClose() {
    setShowForm(false)
    setEditingTask(null)
  }

  function handleSelectCategory(cat) {
    setSelectedCategory(cat)
    setSidebarOpen(false)
  }

  function handleSelectStatus(status) {
    setSelectedStatus(status)
    setSidebarOpen(false)
  }

  const pendingCount = filteredTasks.filter(t => !t.completed).length
  const title = selectedCategory === 'all' ? 'Todas as Tarefas' : selectedCategory

  return (
    <div className="app">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        selectedStatus={selectedStatus}
        onSelectStatus={handleSelectStatus}
        tasks={tasks}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main">
        <div className="main-header">
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <span /><span /><span />
          </button>
          <div className="main-header-info">
            <h1 className="main-title">{title}</h1>
            <p className="main-subtitle">
              {pendingCount === 0
                ? 'Tudo em dia ✓'
                : `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`}
            </p>
          </div>
          <button className="btn-add" onClick={() => setShowForm(true)} aria-label="Nova tarefa">
            +
          </button>
        </div>

        <TaskList
          tasks={filteredTasks}
          onEdit={handleEdit}
          onDelete={deleteTask}
          onToggle={toggleTask}
          onToggleSubtask={toggleSubtask}
        />
      </main>

      {showForm && (
        <TaskForm
          task={editingTask}
          categories={categories}
          onSubmit={handleSubmit}
          onClose={handleClose}
        />
      )}
    </div>
  )
}

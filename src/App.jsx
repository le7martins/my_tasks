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

  const pendingCount = filteredTasks.filter(t => !t.completed).length

  return (
    <div className="app">
      <Sidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        tasks={tasks}
      />
      <main className="main">
        <div className="main-header">
          <div>
            <h1 className="main-title">
              {selectedCategory === 'all' ? 'Todas as Tarefas' : selectedCategory}
            </h1>
            <p className="main-subtitle">
              {pendingCount === 0 ? 'Tudo em dia!' : `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`}
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Nova Tarefa
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

import { useState, useEffect } from 'react'

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const STORAGE_KEY = 'my_tasks_v1'

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState(loadTasks)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  function addTask(data) {
    setTasks(prev => [{
      id: genId(),
      title: data.title,
      description: data.description || '',
      category: data.category || '',
      dueDate: data.dueDate || '',
      dueTime: data.dueTime || '',
      recurrence: data.recurrence || 'none',
      completed: false,
      subtasks: (data.subtasks || []).map(s => ({
        id: s.id || genId(),
        title: s.title,
        completed: s.completed || false,
      })),
      createdAt: new Date().toISOString(),
    }, ...prev])
  }

  function updateTask(id, data) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const existingMap = Object.fromEntries(t.subtasks.map(s => [s.id, s]))
      return {
        ...t,
        title: data.title,
        description: data.description || '',
        category: data.category || '',
        dueDate: data.dueDate || '',
        dueTime: data.dueTime || '',
        recurrence: data.recurrence || 'none',
        subtasks: (data.subtasks || []).map(s => ({
          id: s.id || genId(),
          title: s.title,
          completed: existingMap[s.id] ? existingMap[s.id].completed : false,
        })),
        updatedAt: new Date().toISOString(),
      }
    }))
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function toggleTask(id) {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ))
  }

  function toggleSubtask(taskId, subtaskId) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      return {
        ...t,
        subtasks: t.subtasks.map(s =>
          s.id === subtaskId ? { ...s, completed: !s.completed } : s
        ),
      }
    }))
  }

  return { tasks, addTask, updateTask, deleteTask, toggleTask, toggleSubtask }
}

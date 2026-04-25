import { useState, useEffect } from 'react'

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const STORAGE_KEY = 'my_tasks_v2'

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
      titulo: data.titulo,
      data: data.data,
      prioridade: data.prioridade || 'media',
      status: 'pendente',
      descricao: data.descricao || '',
      concluidoEm: null,
      criadoEm: new Date().toISOString(),
    }, ...prev])
  }

  function updateTask(id, data) {
    setTasks(prev => prev.map(t => t.id !== id ? t : {
      ...t,
      titulo: data.titulo,
      data: data.data,
      prioridade: data.prioridade,
      descricao: data.descricao || '',
    }))
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function toggleTask(id) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const concluding = t.status === 'pendente'
      return {
        ...t,
        status: concluding ? 'concluido' : 'pendente',
        concluidoEm: concluding ? new Date().toISOString() : null,
      }
    }))
  }

  return { tasks, addTask, updateTask, deleteTask, toggleTask }
}

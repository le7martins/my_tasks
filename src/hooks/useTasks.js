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
    const newTask = {
      id: genId(),
      titulo: data.titulo,
      data: data.data,
      prioridade: data.prioridade || 'media',
      status: 'pendente',
      descricao: data.descricao || '',
      googleEventId: null,
      concluidoEm: null,
      criadoEm: new Date().toISOString(),
    }
    setTasks(prev => [newTask, ...prev])
    return newTask
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

  function patchTask(id, patch) {
    setTasks(prev => prev.map(t => t.id !== id ? t : { ...t, ...patch }))
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

  function importTasks(imported) {
    setTasks(imported)
  }

  return { tasks, addTask, updateTask, patchTask, deleteTask, toggleTask, importTasks }
}

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

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function nextRecorrencia(task) {
  if (!task.recorrencia) return null
  const map = { diaria: 1, semanal: 7, mensal: 30 }
  const dias = map[task.recorrencia]
  if (!dias) return null
  return {
    ...task,
    id: genId(),
    status: 'pendente',
    concluidoEm: null,
    criadoEm: new Date().toISOString(),
    googleEventId: null,
    data: addDays(task.data, dias),
    subtarefas: (task.subtarefas || []).map(s => ({ ...s, status: 'pendente' })),
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
      hora: data.hora || null,
      prioridade: data.prioridade || 'media',
      status: 'pendente',
      descricao: data.descricao || '',
      tag: data.tag || null,
      recorrencia: data.recorrencia || null,
      googleEventId: null,
      concluidoEm: null,
      criadoEm: new Date().toISOString(),
      subtarefas: data.subtarefas || [],
    }
    setTasks(prev => [newTask, ...prev])
    return newTask
  }

  function updateTask(id, data) {
    setTasks(prev => prev.map(t => t.id !== id ? t : {
      ...t,
      titulo: data.titulo,
      data: data.data,
      hora: data.hora || null,
      prioridade: data.prioridade,
      descricao: data.descricao || '',
      tag: data.tag || null,
      recorrencia: data.recorrencia || null,
      subtarefas: data.subtarefas || t.subtarefas || [],
    }))
  }

  function patchTask(id, patch) {
    setTasks(prev => prev.map(t => t.id !== id ? t : { ...t, ...patch }))
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function toggleTask(id) {
    let newTask = null
    setTasks(prev => {
      const mapped = prev.map(t => {
        if (t.id !== id) return t
        const concluding = t.status === 'pendente'
        if (concluding && (t.subtarefas || []).some(s => s.status === 'pendente')) return t
        const updated = {
          ...t,
          status: concluding ? 'concluido' : 'pendente',
          concluidoEm: concluding ? new Date().toISOString() : null,
        }
        if (concluding) newTask = updated
        return updated
      })
      if (newTask) {
        const next = nextRecorrencia(newTask)
        if (next) return [next, ...mapped]
      }
      return mapped
    })
  }

  function toggleSubtask(taskId, subtaskId) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      return {
        ...t,
        subtarefas: (t.subtarefas || []).map(s =>
          s.id !== subtaskId ? s : {
            ...s,
            status: s.status === 'pendente' ? 'concluido' : 'pendente',
          }
        ),
      }
    }))
  }

  function duplicateTask(id) {
    const orig = tasks.find(t => t.id === id)
    if (!orig) return
    const dup = {
      ...orig,
      id: genId(),
      titulo: `${orig.titulo} (cópia)`,
      status: 'pendente',
      concluidoEm: null,
      criadoEm: new Date().toISOString(),
      googleEventId: null,
      subtarefas: (orig.subtarefas || []).map(s => ({ ...s, id: genId(), status: 'pendente' })),
    }
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === id)
      const next = [...prev]
      next.splice(idx + 1, 0, dup)
      return next
    })
  }

  function importTasks(imported) {
    setTasks(imported)
  }

  return {
    tasks,
    addTask, updateTask, patchTask, deleteTask,
    toggleTask, toggleSubtask, duplicateTask, importTasks,
  }
}

import { useState } from 'react'

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Não repetir' },
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'monthly', label: 'Mensalmente' },
  { value: 'yearly', label: 'Anualmente' },
]

export default function TaskForm({ task, categories, onSubmit, onClose }) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [categoryInput, setCategoryInput] = useState(task?.category || '')
  const [dueDate, setDueDate] = useState(task?.dueDate || '')
  const [dueTime, setDueTime] = useState(task?.dueTime || '')
  const [recurrence, setRecurrence] = useState(task?.recurrence || 'none')
  const [subtasks, setSubtasks] = useState(task?.subtasks || [])
  const [newSubtask, setNewSubtask] = useState('')

  function addSubtask() {
    const trimmed = newSubtask.trim()
    if (!trimmed) return
    setSubtasks(prev => [...prev, { id: genId(), title: trimmed, completed: false }])
    setNewSubtask('')
  }

  function updateSubtaskTitle(id, value) {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, title: value } : s))
  }

  function removeSubtask(id) {
    setSubtasks(prev => prev.filter(s => s.id !== id))
  }

  function handleSubtaskKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addSubtask() }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category: categoryInput.trim(),
      dueDate,
      dueTime,
      recurrence,
      subtasks: subtasks.filter(s => s.title.trim()),
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h2>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="O que você precisa fazer?"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Categoria</label>
            <input
              className="form-input"
              value={categoryInput}
              onChange={e => setCategoryInput(e.target.value)}
              placeholder="ex: Trabalho, Pessoal, Saúde..."
              list="categories-list"
            />
            <datalist id="categories-list">
              {categories.map(cat => <option key={cat} value={cat} />)}
            </datalist>
          </div>

          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea
              className="form-input form-textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalhes opcionais..."
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vencimento</label>
              <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Horário</label>
              <input className="form-input" type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Recorrência</label>
            <select className="form-input form-select" value={recurrence} onChange={e => setRecurrence(e.target.value)}>
              {RECURRENCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subtarefas</label>
            {subtasks.length > 0 && (
              <ul className="subtask-form-list">
                {subtasks.map(sub => (
                  <li key={sub.id} className="subtask-form-item">
                    <input
                      className="subtask-form-input"
                      value={sub.title}
                      onChange={e => updateSubtaskTitle(sub.id, e.target.value)}
                    />
                    <button type="button" className="subtask-remove" onClick={() => removeSubtask(sub.id)} aria-label="Remover">×</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="subtask-add-row">
              <input
                className="form-input"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                placeholder="Nova subtarefa... (Enter para adicionar)"
              />
              <button type="button" className="btn-add-subtask" onClick={addSubtask}>+</button>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={!title.trim()}>
              {task ? 'Salvar' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

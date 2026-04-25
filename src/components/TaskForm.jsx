import { useState } from 'react'

const today = () => new Date().toISOString().slice(0, 10)

const PRIORITIES = [
  { value: 'alta',  label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
]

export default function TaskForm({ task, onSubmit, onClose }) {
  const [titulo, setTitulo] = useState(task?.titulo || '')
  const [data, setData] = useState(task?.data || today())
  const [prioridade, setPrioridade] = useState(task?.prioridade || 'media')
  const [descricao, setDescricao] = useState(task?.descricao || '')

  const canSubmit = titulo.trim() && data

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({ titulo: titulo.trim(), data, prioridade, descricao: descricao.trim() })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault()
      if (canSubmit) handleSubmit(e)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h2>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <form className="form" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input
              className="form-input"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="O que você precisa fazer?"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Data *</label>
            <input
              className="form-input"
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Prioridade</label>
            <div className="priority-toggle">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`priority-btn priority-btn-${p.value}${prioridade === p.value ? ' active' : ''}`}
                  onClick={() => setPrioridade(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descrição <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span></label>
            <textarea
              className="form-input form-textarea"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Detalhes adicionais..."
              rows={2}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {task ? 'Salvar' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

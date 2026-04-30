import { useState } from 'react'

const today = () => new Date().toISOString().slice(0, 10)
const genId  = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const PRIORITIES = [
  { value: 'alta',  label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
]

const RECORRENCIAS = [
  { value: '',        label: 'Sem recorrência' },
  { value: 'diaria',  label: '🔁 Diária' },
  { value: 'semanal', label: '🔁 Semanal' },
  { value: 'mensal',  label: '🔁 Mensal' },
]

const TAGS = [
  { value: '',         label: 'Sem tag',    color: '' },
  { value: 'trabalho', label: 'Trabalho',   color: '#6366f1' },
  { value: 'pessoal',  label: 'Pessoal',    color: '#22c55e' },
  { value: 'saude',    label: 'Saúde',      color: '#ef4444' },
  { value: 'financas', label: 'Finanças',   color: '#f59e0b' },
  { value: 'estudos',  label: 'Estudos',    color: '#06b6d4' },
]

export default function TaskForm({ task, onSubmit, onClose }) {
  const [titulo,      setTitulo]      = useState(task?.titulo      || '')
  const [data,        setData]        = useState(task?.data        || today())
  const [hora,        setHora]        = useState(task?.hora        || '')
  const [prioridade,  setPrioridade]  = useState(task?.prioridade  || 'media')
  const [descricao,   setDescricao]   = useState(task?.descricao   || '')
  const [tag,         setTag]         = useState(task?.tag         || '')
  const [recorrencia, setRecorrencia] = useState(task?.recorrencia || '')
  const [subtarefas,  setSubtarefas]  = useState(task?.subtarefas  || [])
  const [newSub,      setNewSub]      = useState('')

  const canSubmit = titulo.trim() && data

  function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit({
      titulo: titulo.trim(),
      data,
      hora:        hora || null,
      prioridade,
      descricao:   descricao.trim(),
      tag:         tag || null,
      recorrencia: recorrencia || null,
      subtarefas,
    })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target !== document.getElementById('new-sub-input')) {
      e.preventDefault()
      if (canSubmit) handleSubmit(e)
    }
  }

  function addSubtarefa() {
    const t = newSub.trim()
    if (!t) return
    setSubtarefas(prev => [...prev, { id: genId(), titulo: t, status: 'pendente' }])
    setNewSub('')
  }

  function removeSubtarefa(id) {
    setSubtarefas(prev => prev.filter(s => s.id !== id))
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

          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">Data *</label>
              <input
                className="form-input"
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ width: '120px' }}>
              <label className="form-label">Horário</label>
              <input
                className="form-input"
                type="time"
                value={hora}
                onChange={e => setHora(e.target.value)}
              />
            </div>
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

          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">Tag</label>
              <select className="form-input form-select" value={tag} onChange={e => setTag(e.target.value)}>
                {TAGS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Recorrência</label>
              <select className="form-input form-select" value={recorrencia} onChange={e => setRecorrencia(e.target.value)}>
                {RECORRENCIAS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
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

          <div className="form-group">
            <label className="form-label">Subtarefas</label>
            <div className="subtask-input-row">
              <input
                id="new-sub-input"
                className="form-input"
                value={newSub}
                onChange={e => setNewSub(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtarefa() } }}
                placeholder="Adicionar subtarefa..."
              />
              <button type="button" className="btn-add-sub" onClick={addSubtarefa}>+</button>
            </div>
            {subtarefas.length > 0 && (
              <ul className="subtask-list-form">
                {subtarefas.map(s => (
                  <li key={s.id} className="subtask-item-form">
                    <span>{s.titulo}</span>
                    <button type="button" onClick={() => removeSubtarefa(s.id)} aria-label="Remover">✕</button>
                  </li>
                ))}
              </ul>
            )}
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

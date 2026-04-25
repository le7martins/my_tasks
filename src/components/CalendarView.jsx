import { useState, useMemo } from 'react'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS   = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const P_COLOR = { alta: '#ef4444', media: '#f59e0b', baixa: '#22c55e' }

function pad2(n) { return String(n).padStart(2, '0') }

export default function CalendarView({ tasks, selectedDate, onSelectDate }) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const [year,  setYear]  = useState(() => parseInt(todayStr.slice(0, 4)))
  const [month, setMonth] = useState(() => parseInt(todayStr.slice(5, 7)) - 1)

  const tasksByDate = useMemo(() => {
    const map = {}
    for (const t of tasks) {
      if (!map[t.data]) map[t.data] = []
      map[t.data].push(t)
    }
    return map
  }, [tasks])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const firstWeekday  = new Date(year, month, 1).getDay()
  const daysInMonth   = new Date(year, month + 1, 0).getDate()

  const cells = [
    ...Array.from({ length: firstWeekday }, (_, i) => ({ key: `e${i}`, day: null })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ key: i + 1, day: i + 1 })),
  ]

  return (
    <div className="calendar">
      <div className="calendar-nav">
        <button className="cal-nav-btn" onClick={prevMonth} aria-label="Mês anterior">‹</button>
        <span className="cal-month-title">{MONTHS[month]} {year}</span>
        <button className="cal-nav-btn" onClick={nextMonth} aria-label="Próximo mês">›</button>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map(d => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}

        {cells.map(({ key, day }) => {
          if (!day) return <div key={key} className="cal-cell empty" />

          const dateStr   = `${year}-${pad2(month + 1)}-${pad2(day)}`
          const dayTasks  = tasksByDate[dateStr] || []
          const isToday   = dateStr === todayStr
          const isSelected= dateStr === selectedDate
          const hasTasks  = dayTasks.length > 0

          return (
            <button
              key={key}
              className={[
                'cal-cell',
                isToday    ? 'today'    : '',
                isSelected ? 'selected' : '',
                hasTasks   ? 'has-tasks': '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              aria-label={`${day} de ${MONTHS[month]}: ${dayTasks.length} tarefa(s)`}
            >
              <span className="cal-day-num">{day}</span>
              {hasTasks && (
                <div className="cal-dots">
                  {dayTasks.slice(0, 3).map((t, i) => (
                    <span
                      key={i}
                      className="cal-dot"
                      style={{
                        background: t.status === 'concluido'
                          ? 'var(--text-faint)'
                          : P_COLOR[t.prioridade] || P_COLOR.media,
                      }}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="cal-dot-more">+{dayTasks.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

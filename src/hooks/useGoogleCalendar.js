import { useState, useRef, useCallback } from 'react'

const SCOPE    = 'https://www.googleapis.com/auth/calendar.events'
const CAL_ID   = 'primary'
const API_BASE = 'https://www.googleapis.com/calendar/v3'

// Client ID can be set via env var at build time or via localStorage at runtime
function getClientId() {
  return (
    localStorage.getItem('mytasks_google_client_id') ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    ''
  )
}

function taskToEvent(task) {
  return {
    summary: task.titulo,
    description: task.descricao || undefined,
    start: { date: task.data },
    end:   { date: task.data },
    colorId: { alta: '11', media: '5', baixa: '10' }[task.prioridade] || '5',
    status: task.status === 'concluido' ? 'cancelled' : 'confirmed',
    extendedProperties: { private: { myTasksId: task.id } },
  }
}

async function calRequest(method, path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false)
  const [isSyncing,   setIsSyncing]   = useState(false)
  const [error,       setError]       = useState(null)
  const tokenRef      = useRef(null)
  const tokenClientRef= useRef(null)

  const isConfigured = Boolean(getClientId())

  function initClient(onSuccess) {
    if (!window.google?.accounts?.oauth2) {
      setError('Google Identity Services não carregado. Verifique sua conexão.')
      return null
    }
    const clientId = getClientId()
    if (!clientId) {
      setError('CLIENT_ID não configurado.')
      return null
    }
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) {
          setError(`Erro de autenticação: ${resp.error}`)
          setIsConnected(false)
          return
        }
        setError(null)
        tokenRef.current = resp.access_token
        setIsConnected(true)
        onSuccess?.()
      },
    })
    return tokenClientRef.current
  }

  const connect = useCallback((onSuccess) => {
    setError(null)
    const tc = tokenClientRef.current || initClient(onSuccess)
    if (tc) tc.requestAccessToken()
  }, [])

  function disconnect() {
    if (tokenRef.current && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(tokenRef.current)
    }
    tokenRef.current = null
    setIsConnected(false)
  }

  async function createEvent(task) {
    if (!tokenRef.current) throw new Error('Não conectado')
    return calRequest('POST', `/calendars/${CAL_ID}/events`, taskToEvent(task), tokenRef.current)
  }

  async function updateEvent(eventId, task) {
    if (!tokenRef.current || !eventId) return null
    return calRequest('PUT', `/calendars/${CAL_ID}/events/${eventId}`, taskToEvent(task), tokenRef.current)
  }

  async function deleteEvent(eventId) {
    if (!tokenRef.current || !eventId) return
    return calRequest('DELETE', `/calendars/${CAL_ID}/events/${eventId}`, null, tokenRef.current)
  }

  async function syncAllTasks(tasks, onPatch) {
    if (!tokenRef.current) return
    setIsSyncing(true)
    setError(null)
    try {
      for (const task of tasks) {
        if (task.googleEventId) {
          await updateEvent(task.googleEventId, task).catch(() => {})
        } else {
          const event = await createEvent(task).catch(() => null)
          if (event?.id) onPatch(task.id, { googleEventId: event.id })
        }
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setIsSyncing(false)
    }
  }

  return {
    isConfigured,
    isConnected,
    isSyncing,
    error,
    connect,
    disconnect,
    createEvent,
    updateEvent,
    deleteEvent,
    syncAllTasks,
  }
}

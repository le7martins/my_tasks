import { useState, useRef, useCallback, useEffect } from 'react'

const SCOPE    = 'https://www.googleapis.com/auth/calendar.events'
const CAL_ID   = 'primary'
const API_BASE = 'https://www.googleapis.com/calendar/v3'
const TOKEN_KEY = 'mytasks_gtoken'
const PROFILE_KEY = 'mytasks_gprofile'

function getClientId() {
  return (
    localStorage.getItem('mytasks_google_client_id') ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    ''
  )
}

function taskToEvent(task) {
  const hasTime = task.hora && /^\d{2}:\d{2}$/.test(task.hora)
  const start = hasTime
    ? { dateTime: `${task.data}T${task.hora}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
    : { date: task.data }
  const end = hasTime
    ? { dateTime: `${task.data}T${task.hora}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
    : { date: task.data }
  return {
    summary: task.titulo,
    description: task.descricao || undefined,
    start,
    end,
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

async function fetchProfile(token) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false)
  const [isSyncing,   setIsSyncing]   = useState(false)
  const [error,       setError]       = useState(null)
  const [profile,     setProfile]     = useState(() => {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null') } catch { return null }
  })
  const tokenRef       = useRef(null)
  const tokenClientRef = useRef(null)
  const renewTimerRef  = useRef(null)

  // Restore persisted token on mount
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (!saved) return
    try {
      const { token, expires } = JSON.parse(saved)
      if (token && expires - Date.now() > 60_000) {
        tokenRef.current = token
        setIsConnected(true)
        const msLeft = expires - Date.now() - 5 * 60_000
        if (msLeft > 0) {
          renewTimerRef.current = setTimeout(() => silentRenew(), msLeft)
        }
      } else {
        localStorage.removeItem(TOKEN_KEY)
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [])

  function silentRenew() {
    if (!tokenClientRef.current) return
    tokenClientRef.current.requestAccessToken({ prompt: '' })
  }

  function saveToken(token, expiresIn = 3600) {
    const expires = Date.now() + expiresIn * 1000
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expires }))
    if (renewTimerRef.current) clearTimeout(renewTimerRef.current)
    renewTimerRef.current = setTimeout(() => silentRenew(), (expiresIn - 300) * 1000)
  }

  const isConfigured = true

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
      callback: async (resp) => {
        if (resp.error) {
          const msg = resp.error === 'access_denied'
            ? 'Acesso negado. Adicione seu e-mail como usuário de teste no Google Cloud Console.'
            : `Erro de autenticação: ${resp.error}`
          setError(msg)
          setIsConnected(false)
          return
        }
        setError(null)
        tokenRef.current = resp.access_token
        saveToken(resp.access_token, resp.expires_in || 3600)
        setIsConnected(true)
        const prof = await fetchProfile(resp.access_token).catch(() => null)
        if (prof) {
          setProfile(prof)
          localStorage.setItem(PROFILE_KEY, JSON.stringify(prof))
        }
        onSuccess?.()
      },
    })
    return tokenClientRef.current
  }

  const connect = useCallback((onSuccess) => {
    setError(null)
    if (!getClientId()) {
      setError('Client ID não configurado. Adicione VITE_GOOGLE_CLIENT_ID nas secrets do GitHub e faça um novo deploy.')
      return
    }
    const tc = tokenClientRef.current || initClient(onSuccess)
    if (tc) tc.requestAccessToken()
  }, [])

  function disconnect() {
    if (tokenRef.current && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(tokenRef.current)
    }
    tokenRef.current = null
    if (renewTimerRef.current) clearTimeout(renewTimerRef.current)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PROFILE_KEY)
    setIsConnected(false)
    setProfile(null)
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

  async function syncFromCalendar(tasks, onPatch) {
    if (!tokenRef.current) return tasks
    const updated = [...tasks]
    for (const task of tasks) {
      if (!task.googleEventId) continue
      try {
        const ev = await calRequest('GET', `/calendars/${CAL_ID}/events/${task.googleEventId}`, null, tokenRef.current)
        if (!ev) continue
        const calStatus = ev.status === 'cancelled' ? 'concluido' : 'pendente'
        if (calStatus !== task.status) {
          onPatch(task.id, { status: calStatus, concluidoEm: calStatus === 'concluido' ? new Date().toISOString() : null })
        }
      } catch { /* ignore */ }
    }
    return updated
  }

  async function syncAllTasks(tasks, onPatch) {
    if (!tokenRef.current) return
    setIsSyncing(true)
    setError(null)
    try {
      await syncFromCalendar(tasks, onPatch)
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
    profile,
    connect,
    disconnect,
    createEvent,
    updateEvent,
    deleteEvent,
    syncFromCalendar,
    syncAllTasks,
  }
}

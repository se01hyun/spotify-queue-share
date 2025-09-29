'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface SessionInfo {
  id: string
  code: string
  name: string
  hostName: string
  isHost: boolean
}

// API response helpers
type ApiError = { error?: string; message?: string }
type JoinResponse = {
  session: {
    id: string
    code: string
    name: string
    hostName: string
    isHost: boolean
  }
}

interface SessionContextType {
  currentSession: SessionInfo | null
  setCurrentSession: (session: SessionInfo | null) => void
  createSession: (sessionName: string) => Promise<SessionInfo>
  joinSession: (sessionCode: string, userName: string) => Promise<SessionInfo>
  leaveSession: () => void
  isInSession: boolean
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null)

  // Load from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('sq_current_session')
      if (saved) {
        const parsed: SessionInfo = JSON.parse(saved)
        setCurrentSession(parsed)
      }
    } catch {}
  }, [])

  // Persist to sessionStorage on change
  useEffect(() => {
    try {
      if (currentSession) {
        sessionStorage.setItem('sq_current_session', JSON.stringify(currentSession))
      } else {
        sessionStorage.removeItem('sq_current_session')
      }
    } catch {}
  }, [currentSession])

  const createSession = async (sessionName: string): Promise<SessionInfo> => {
    const response = await fetch('/api/sessions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionName }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create session')
    }

    const data = await response.json()
    const sessionInfo: SessionInfo = {
      id: data.session.id,
      code: data.session.code,
      name: data.session.name,
      hostName: data.session.hostName,
      isHost: true,
    }

    setCurrentSession(sessionInfo)
    return sessionInfo
  }

  const joinSession = async (sessionCode: string, userName: string): Promise<SessionInfo> => {
    console.log('🔄 Joining session:', sessionCode, 'as', userName)
    
    const response = await fetch('/api/sessions/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ sessionCode, userName }),
    })

    if (!response.ok) {
      let parsed: ApiError | null = null
      let rawText = ''
      try {
        parsed = (await response.json()) as ApiError
      } catch {
        try {
          rawText = await response.text()
        } catch {}
      }
      const message = parsed?.error || parsed?.message || rawText || `HTTP ${response.status} ${response.statusText}`
      console.error('❌ Join session error:', {
        status: response.status,
        statusText: response.statusText,
        body: parsed ?? rawText,
      })
      throw new Error(message)
    }

    const data = (await response.json()) as JoinResponse
    console.log('✅ Join session response:', data)
    
    const sessionInfo: SessionInfo = {
      id: data.session.id,
      code: data.session.code,
      name: data.session.name,
      hostName: data.session.hostName,
      isHost: data.session.isHost,
    }

    console.log('🎯 Setting session info:', sessionInfo)
    setCurrentSession(sessionInfo)
    console.log('✅ Session state updated!')
    
    return sessionInfo
  }

  const leaveSession = () => {
    setCurrentSession(null)
  }

  return (
    <SessionContext.Provider value={{
      currentSession,
      setCurrentSession,
      createSession,
      joinSession,
      leaveSession,
      isInSession: currentSession !== null,
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

// NextAuth의 useSession과 구분하기 위해 별칭 export
export const useSessionContext = useSession

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSessionContext } from './SessionContext'

export interface QueueTrack {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    images: Array<{ url: string; width: number; height: number }>
  }
  duration_ms: number
  preview_url: string | null
  external_urls: {
    spotify: string
  }
  addedAt: Date
  addedBy?: string // 나중에 세션 기능에서 사용
}

interface QueueContextType {
  queue: QueueTrack[]
  addToQueue: (track: Omit<QueueTrack, 'addedAt'>) => void
  removeFromQueue: (trackId: string) => void
  clearQueue: () => void
  moveTrack: (fromIndex: number, toIndex: number) => void
  isInQueue: (trackId: string) => boolean
  setQueue: (queue: QueueTrack[]) => void
}

const QueueContext = createContext<QueueContextType | undefined>(undefined)

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueTrack[]>([])
  const { currentSession } = useSessionContext()

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sq_queue')
      if (saved) {
        const parsed = JSON.parse(saved)
        const normalized: QueueTrack[] = parsed.map((t: any) => ({
          ...t,
          addedAt: new Date(t.addedAt),
        }))
        setQueue(normalized)
      }
    } catch {}
  }, [])

  // Persist queue to localStorage on change
  useEffect(() => {
    try {
      const serializable = queue.map(t => ({ ...t, addedAt: t.addedAt.toISOString() }))
      localStorage.setItem('sq_queue', JSON.stringify(serializable))
    } catch {}
  }, [queue])

  // 게스트가 호스트의 큐를 실시간으로 동기화
  useEffect(() => {
    if (currentSession && !currentSession.isHost) {
      const syncQueue = async () => {
        try {
          console.log('🔄 Syncing queue for guest:', currentSession.code)
          const response = await fetch(`/api/sessions/queue?code=${currentSession.code}`)
          if (response.ok) {
            const data = await response.json()
            console.log('✅ Queue synced successfully:', data.queue?.length || 0, 'tracks')
            setQueue(data.queue || [])
          } else if (response.status === 404) {
            console.log('⚠️ Session not found - clearing guest session')
            // 세션이 존재하지 않으면 게스트 세션 정리
            localStorage.removeItem('spotify_sync_guest_session')
            sessionStorage.removeItem('spotify_sync_guest_session')
            window.location.href = '/'
          } else {
            console.log('⚠️ Queue sync failed:', response.status)
          }
        } catch (error) {
          console.error('❌ Failed to sync queue:', error)
        }
      }

      // 즉시 동기화
      syncQueue()
      
      // 3초마다 동기화 (더 빠른 동기화)
      const interval = setInterval(syncQueue, 3000)
      return () => clearInterval(interval)
    }
  }, [currentSession])

  const addToQueue = async (track: Omit<QueueTrack, 'addedAt'>) => {
    const newTrack: QueueTrack = {
      ...track,
      addedAt: new Date(),
    }
    
    // 세션 상태 확인
    if (!currentSession) {
      console.log('⚠️ No active session - only adding to local queue')
      // 로컬 큐에만 추가
      setQueue(prev => {
        if (prev.some(t => t.id === track.id)) {
          return prev // 중복 추가 방지
        }
        return [...prev, newTrack]
      })
      return
    }

    // 로컬 큐에 추가
    const updatedQueue = [...queue, newTrack]
    setQueue(prev => {
      // 이미 큐에 있는 곡인지 확인
      if (prev.some(t => t.id === track.id)) {
        return prev // 중복 추가 방지
      }
      return [...prev, newTrack]
    })

    // 호스트인 경우 데이터베이스에 큐 업데이트
    if (currentSession.isHost) {
      try {
        console.log('🔄 Updating queue in database for host:', {
          code: currentSession.code,
          queueLength: updatedQueue.length
        })
        await fetch(`/api/sessions/queue?code=${currentSession.code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ queue: updatedQueue }),
        })
        console.log('✅ Queue updated in database successfully')
      } catch (error) {
        console.error('❌ Failed to update queue in database:', error)
      }
    }

    // Spotify 큐에도 추가 (호스트 기기의 실제 큐에 반영)
    try {
      console.log('🎵 Adding to Spotify queue:', {
        trackUri: `spotify:track:${track.id}`,
        sessionCode: currentSession?.code,
        isHost: currentSession?.isHost,
        fullCurrentSession: currentSession
      })

      const response = await fetch('/api/spotify/add-to-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackUri: `spotify:track:${track.id}`,
          sessionCode: currentSession?.code // 게스트가 세션에 참여한 경우 세션 코드 전달
        }),
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorData = { error: 'Unknown error occurred' }
        }
        
        console.error('❌ Failed to add to Spotify queue:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        
        const errorMessage = errorData.error || `HTTP ${response.status} 오류`
        
        // 401: 게스트는 재로그인 안내 없이 알림만, 호스트는 로그인 페이지로
        if (response.status === 401) {
          if (currentSession?.isHost) {
            alert('Spotify 인증이 만료되었습니다. 다시 로그인해 주세요.')
            window.location.href = '/api/auth/signin/spotify'
          } else {
            alert('호스트의 Spotify 인증이 만료되었습니다. 호스트가 다시 로그인해야 합니다.')
          }
          return
        } else if (response.status === 403) {
          alert(`Spotify Premium이 필요합니다.\nPremium 계정으로 로그인해주세요.`)
        } else if (response.status === 404 && errorMessage.includes('No active device')) {
          // 404 에러가 "No active device"인 경우 특별 처리
          console.log('⚠️ No active Spotify device - queue will be synced when device is available')
          // 에러 알림을 표시하지 않고 조용히 처리 (큐는 여전히 데이터베이스에 저장됨)
        } else {
          alert(`Spotify 큐 추가 실패: ${errorMessage}`)
        }
      } else {
        // 성공 응답 파싱
        try {
          const successData = await response.json()
          console.log('✅ Successfully added to Spotify queue!', successData)
        } catch (parseError) {
          // JSON 파싱 실패해도 성공으로 처리 (204 No Content 등)
          console.log('✅ Successfully added to Spotify queue! (no response body)')
        }
      }
    } catch (error) {
      console.error('❌ Error adding to Spotify queue:', error)
      alert('Spotify 큐 추가 중 오류가 발생했습니다.')
    }
  }

  const removeFromQueue = async (trackId: string) => {
    // 로컬 큐에서 제거
    const updatedQueue = queue.filter(track => track.id !== trackId)
    setQueue(updatedQueue)
    
    // 세션이 있고 호스트인 경우 데이터베이스에도 반영
    if (currentSession?.isHost) {
      try {
        console.log('🔄 Updating queue in database after removal for host:', {
          code: currentSession.code,
          removedTrackId: trackId,
          newQueueLength: updatedQueue.length
        })
        await fetch(`/api/sessions/queue?code=${currentSession.code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ queue: updatedQueue }),
        })
        console.log('✅ Queue updated in database after removal successfully')
      } catch (error) {
        console.error('❌ Failed to update queue in database after removal:', error)
      }
    }
  }

  const clearQueue = async () => {
    // 로컬 큐 클리어
    setQueue([])
    
    // 세션이 있고 호스트인 경우 데이터베이스에서도 큐 클리어
    if (currentSession?.isHost) {
      try {
        console.log('🔄 Clearing queue in database for host:', currentSession.code)
        await fetch(`/api/sessions/queue?code=${currentSession.code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ queue: [] }),
        })
        console.log('✅ Queue cleared in database successfully')
      } catch (error) {
        console.error('❌ Failed to clear queue in database:', error)
      }
    }
  }

  const moveTrack = async (fromIndex: number, toIndex: number) => {
    // 로컬 큐에서 이동
    const newQueue = [...queue]
    const [movedTrack] = newQueue.splice(fromIndex, 1)
    newQueue.splice(toIndex, 0, movedTrack)
    setQueue(newQueue)
    
    // 세션이 있고 호스트인 경우 데이터베이스에도 반영
    if (currentSession?.isHost) {
      try {
        console.log('🔄 Updating queue in database after move for host:', {
          code: currentSession.code,
          fromIndex,
          toIndex,
          newQueueLength: newQueue.length
        })
        await fetch(`/api/sessions/queue?code=${currentSession.code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ queue: newQueue }),
        })
        console.log('✅ Queue updated in database after move successfully')
      } catch (error) {
        console.error('❌ Failed to update queue in database after move:', error)
      }
    }
  }

  const isInQueue = (trackId: string) => {
    return queue.some(track => track.id === trackId)
  }

  return (
    <QueueContext.Provider value={{
      queue,
      addToQueue,
      removeFromQueue,
      clearQueue,
      moveTrack,
      isInQueue,
      setQueue,
    }}>
      {children}
    </QueueContext.Provider>
  )
}

export function useQueue() {
  const context = useContext(QueueContext)
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider')
  }
  return context
}
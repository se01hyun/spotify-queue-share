'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
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
  addToQueue: (track: Omit<QueueTrack, 'addedAt'>) => Promise<void>
  removeFromQueue: (trackId: string) => Promise<void>
  clearQueue: () => Promise<void>
  moveTrack: (fromIndex: number, toIndex: number) => Promise<void>
  isInQueue: (trackId: string) => boolean
  setQueue: (queue: QueueTrack[]) => void
  syncWithSpotifyQueue: () => Promise<void>
  manualSync: () => Promise<void>
}

const QueueContext = createContext<QueueContextType | undefined>(undefined)

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueTrack[]>([])
  const { currentSession } = useSessionContext()
  const { data: session } = useSession()
  const [isClearing, setIsClearing] = useState(false)
  const [isManualSyncing, setIsManualSyncing] = useState(false)

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

  // Spotify 큐와 웹 큐 동기화 함수
  const syncWithSpotifyQueue = async () => {
    if (!currentSession?.isHost || !session || isClearing) return

    try {
      // 1) Spotify 상태 확인 (활성 디바이스 여부 파악)
      const playerRes = await fetch('/api/spotify/queue')

      // 2) 세션 DB에서 최신 큐를 가져와 로컬 큐를 덮어써서 게스트 추가 반영
      try {
        const dbRes = await fetch(`/api/sessions/queue?code=${currentSession.code}`)
        if (dbRes.ok) {
          const data = await dbRes.json()
          const newQueue = Array.isArray(data.queue) ? data.queue : []
          const normalizedNewQueue = newQueue.map((track: any) => ({
            ...track,
            addedAt: track.addedAt ? new Date(track.addedAt) : new Date(),
          }))

          setQueue(prevQueue => {
            // 변경이 있을 때만 업데이트하여 불필요한 리렌더 방지
            const prevKey = prevQueue.map(t => t.id).join('|')
            const nextKey = normalizedNewQueue.map((t: any) => t.id).join('|')
            if (prevKey !== nextKey) {
              return normalizedNewQueue
            }
            return prevQueue
          })
        }
      } catch (e) {
        console.error('Host failed to pull DB queue:', e)
      }
    } catch (error) {
      console.error('Failed to sync (host):', error)
    }
  }

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
      let isSyncing = false
      let lastSyncTime = 0
      
      const syncQueue = async () => {
        if (isSyncing || isManualSyncing) return // 중복 동기화 방지 및 수동 동기화 중일 때는 스킵
        isSyncing = true
        
        try {
          const response = await fetch(`/api/sessions/queue?code=${currentSession.code}`)
          
          if (response.ok) {
            const data = await response.json()
            const newQueue = data.queue || []
            
            // addedAt 필드를 Date 객체로 변환
            const normalizedNewQueue = newQueue.map((track: any) => ({
              ...track,
              addedAt: track.addedAt ? new Date(track.addedAt) : new Date()
            }))
            
            // 서버의 큐로 업데이트하되, 빈 큐인 경우 주의깊게 처리
            setQueue(prevQueue => {
              // 서버에서 빈 큐를 받았고, 현재 큐에 곡이 있는 경우
              if (normalizedNewQueue.length === 0 && prevQueue.length > 0) {
                return prevQueue
              }
              
              // 그 외의 경우는 서버 큐로 업데이트
              return normalizedNewQueue
            })
            lastSyncTime = Date.now()
            
          } else if (response.status === 404) {
            // 세션이 존재하지 않으면 게스트 세션 정리
            localStorage.removeItem('spotify_sync_guest_session')
            sessionStorage.removeItem('spotify_sync_guest_session')
            window.location.href = '/'
          }
        } catch (error) {
          console.error('Failed to sync queue:', error)
        } finally {
          isSyncing = false
        }
      }

      // 즉시 동기화
      syncQueue()
      
      // 2초마다 동기화 (더 빠른 동기화)
      const interval = setInterval(syncQueue, 2000)
      return () => clearInterval(interval)
    }
  }, [currentSession, isManualSyncing])

  const addToQueue = async (track: Omit<QueueTrack, 'addedAt'>) => {
    // 중복 체크
    if (isInQueue(track.id)) {
      return
    }
    
    const newTrack: QueueTrack = {
      ...track,
      addedAt: new Date(),
    }
    
    // 세션 상태 확인
    if (!currentSession) {
      // 로컬 큐에만 추가
      setQueue(prev => {
        if (prev.some(t => t.id === track.id)) {
          return prev // 중복 추가 방지
        }
        return [...prev, newTrack]
      })
      return
    }

    // 로컬 큐에 먼저 추가
    const updatedQueue = [...queue, newTrack]
    setQueue(updatedQueue)

    // 호스트인 경우 데이터베이스에 업데이트
    if (currentSession.isHost) {
      try {
        // 데이터베이스에 저장할 큐 데이터 준비
        const queueForDB = updatedQueue.map(track => ({
          id: track.id,
          name: track.name,
          artists: track.artists,
          album: track.album,
          duration_ms: track.duration_ms,
          preview_url: track.preview_url,
          external_urls: track.external_urls,
          addedAt: track.addedAt.toISOString(),
          addedBy: 'Host'
        }))
        
        const dbResponse = await fetch(`/api/sessions/queue?code=${currentSession.code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ queue: queueForDB }),
        })
        
        if (!dbResponse.ok) {
          const errorData = await dbResponse.json().catch(() => ({}))
          console.error('Database update failed:', dbResponse.status, errorData)
        }
      } catch (error) {
        console.error('Failed to update queue in database:', error)
      }
    }

    // Spotify 큐에도 추가 (호스트/게스트 모두 처리)
    if (currentSession) {
      try {
        const isHost = currentSession.isHost && !!session
        const requestBody: any = { trackUri: `spotify:track:${track.id}` }
        if (!isHost) {
          requestBody.sessionCode = currentSession.code
          // 게스트가 추가하는 경우, 서버 DB 반영을 위해 트랙 메타데이터도 전달
          requestBody.track = {
            id: newTrack.id,
            name: newTrack.name,
            artists: newTrack.artists,
            album: newTrack.album,
            duration_ms: newTrack.duration_ms,
            preview_url: newTrack.preview_url,
            external_urls: newTrack.external_urls,
            addedAt: newTrack.addedAt.toISOString(),
            addedBy: 'Guest'
          }
        }

        const response = await fetch('/api/spotify/add-to-queue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorData = { error: 'Unknown error occurred' }
        }
        
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
            // 에러 알림을 표시하지 않고 조용히 처리 (큐는 여전히 데이터베이스에 저장됨)
          } else {
            alert(`Spotify 큐 추가 실패: ${errorMessage}`)
          }
        }

        // 게스트인 경우 서버 큐를 재동기화하여 일관성 확보
        if (!isHost) {
          try {
            await manualSync()
          } catch {}
        }
      } catch (error) {
        console.error('Error adding to Spotify queue:', error)
        // Spotify API 호출 실패해도 큐는 데이터베이스에 저장되므로 계속 진행
      }
    }
  }

  const removeFromQueue = async (trackId: string) => {
    // 로컬 큐에서 제거
    const updatedQueue = queue.filter(track => track.id !== trackId)
    setQueue(updatedQueue)
    
    // 세션이 있고 호스트인 경우 데이터베이스에도 반영
    if (currentSession?.isHost) {
      try {
        await fetch(`/api/sessions/queue?code=${currentSession.code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ queue: updatedQueue }),
        })
      } catch (error) {
        console.error('Failed to update queue in database after removal:', error)
      }
    }
  }

  const clearQueue = async () => {
    // 클리어 중 상태로 설정 (동기화 비활성화)
    setIsClearing(true)
    
    // 클리어 플래그 설정 (게스트가 빈 큐를 받았을 때 참조용)
    localStorage.setItem('sq_last_clear', Date.now().toString())
    
    // 로컬 큐 클리어
    setQueue([])
    
    // 세션이 있고 호스트인 경우 데이터베이스에서도 큐 클리어
    if (currentSession?.isHost) {
      try {
        await fetch(`/api/sessions/queue?code=${currentSession.code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ queue: [] }),
        })
      } catch (error) {
        console.error('Failed to clear queue in database:', error)
      }
    }
    
    // 클리어 완료 후 3초 후에 동기화 재활성화
    setTimeout(() => {
      setIsClearing(false)
    }, 3000)
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
        await fetch(`/api/sessions/queue?code=${currentSession.code}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ queue: newQueue }),
        })
      } catch (error) {
        console.error('Failed to update queue in database after move:', error)
      }
    }
  }

  const isInQueue = (trackId: string) => {
    return queue.some(track => track.id === trackId)
  }

  // 수동 동기화 함수 (게스트용)
  const manualSync = async () => {
    if (!currentSession || currentSession.isHost) return
    
    setIsManualSyncing(true)
    try {
      const response = await fetch(`/api/sessions/queue?code=${currentSession.code}`)
      
      if (response.ok) {
        const data = await response.json()
        const newQueue = data.queue || []
        
        // addedAt 필드를 Date 객체로 변환
        const normalizedNewQueue = newQueue.map((track: any) => ({
          ...track,
          addedAt: track.addedAt ? new Date(track.addedAt) : new Date()
        }))
        
        // 큐 업데이트
        setQueue(normalizedNewQueue)
      } else {
        console.error('Manual sync failed:', response.status)
      }
    } catch (error) {
      console.error('Manual sync error:', error)
    } finally {
      // 2초 후에 수동 동기화 상태 해제
      setTimeout(() => {
        setIsManualSyncing(false)
      }, 2000)
    }
  }

  // 호스트인 경우 주기적으로 Spotify 큐와 동기화
  useEffect(() => {
    if (currentSession?.isHost && session && !isClearing) {
      // 초기 동기화
      syncWithSpotifyQueue()
      
      // 3초마다 동기화 (더 빠른 동기화)
      const interval = setInterval(() => {
        if (!isClearing) {
          syncWithSpotifyQueue()
        }
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [currentSession?.isHost, session, isClearing])

  return (
    <QueueContext.Provider value={{
      queue,
      addToQueue,
      removeFromQueue,
      clearQueue,
      moveTrack,
      isInQueue,
      setQueue,
      syncWithSpotifyQueue,
      manualSync,
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
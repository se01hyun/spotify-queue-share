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
      console.log('🔄 Syncing with Spotify player state...')
      const response = await fetch('/api/spotify/queue')
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Spotify player data:', data)
        
        // Spotify API는 큐 정보를 직접 제공하지 않으므로
        // 웹 큐를 Spotify에 동기화하는 방향으로 작동
        if (data.hasActiveDevice) {
          console.log('🎵 Spotify device is active, maintaining web queue')
          // 웹 큐를 데이터베이스에 동기화
          try {
            await fetch(`/api/sessions/queue?code=${currentSession.code}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ queue: queue }),
            })
            console.log('✅ Synced web queue to database')
          } catch (error) {
            console.error('❌ Failed to sync web queue to database:', error)
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to sync with Spotify:', error)
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
          console.log('🔄 Syncing queue for guest:', currentSession.code)
          const response = await fetch(`/api/sessions/queue?code=${currentSession.code}`)
          console.log('📡 Guest sync response status:', response.status)
          
          if (response.ok) {
            const data = await response.json()
            const newQueue = data.queue || []
            console.log('✅ Queue synced successfully:', {
              queueLength: newQueue.length,
              tracks: newQueue.map((t: any) => ({ id: t.id, name: t.name }))
            })
            
            // addedAt 필드를 Date 객체로 변환
            const normalizedNewQueue = newQueue.map((track: any) => ({
              ...track,
              addedAt: track.addedAt ? new Date(track.addedAt) : new Date()
            }))
            
            // 서버의 큐로 업데이트하되, 빈 큐인 경우 주의깊게 처리
            setQueue(prevQueue => {
              console.log('🔄 Updating guest queue to server state:', {
                prevLength: prevQueue.length,
                newLength: normalizedNewQueue.length,
                serverQueue: normalizedNewQueue.map((t: any) => ({ id: t.id, name: t.name }))
              })
              
              // 서버에서 빈 큐를 받았고, 현재 큐에 곡이 있는 경우
              if (normalizedNewQueue.length === 0 && prevQueue.length > 0) {
                console.log('⚠️ Server returned empty queue, but local queue has tracks. Keeping local queue.')
                return prevQueue
              }
              
              // 그 외의 경우는 서버 큐로 업데이트
              return normalizedNewQueue
            })
            lastSyncTime = Date.now()
            
          } else if (response.status === 404) {
            console.log('⚠️ Session not found - clearing guest session')
            // 세션이 존재하지 않으면 게스트 세션 정리
            localStorage.removeItem('spotify_sync_guest_session')
            sessionStorage.removeItem('spotify_sync_guest_session')
            window.location.href = '/'
          } else {
            const errorText = await response.text().catch(() => 'Unknown error')
            console.log('⚠️ Queue sync failed:', response.status, errorText)
          }
        } catch (error) {
          console.error('❌ Failed to sync queue:', error)
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
      console.log('⚠️ Track already in queue, skipping:', track.name)
      return
    }
    
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

    // 로컬 큐에 먼저 추가
    const updatedQueue = [...queue, newTrack]
    setQueue(updatedQueue)

    // 호스트인 경우 데이터베이스에 업데이트
    if (currentSession.isHost) {
      try {
        console.log('🔄 Updating queue in database for host:', {
          code: currentSession.code,
          queueLength: updatedQueue.length,
          trackName: newTrack.name
        })
        
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
        
        if (dbResponse.ok) {
          console.log('✅ Queue updated in database successfully')
        } else {
          const errorData = await dbResponse.json().catch(() => ({}))
          console.error('❌ Database update failed:', dbResponse.status, errorData)
        }
      } catch (error) {
        console.error('❌ Failed to update queue in database:', error)
      }
    }

    // Spotify 큐에도 추가 (호스트 기기의 실제 큐에 반영)
    // 호스트인 경우에만 Spotify API 호출
    console.log('🔍 Checking if host should add to Spotify:', {
      hasSession: !!currentSession,
      isHost: currentSession?.isHost,
      sessionCode: currentSession?.code
    })
    
    // 호스트이고 세션이 있는 경우에만 Spotify API 호출
    if (currentSession?.isHost && session) {
      try {
        console.log('🎵 Adding to Spotify queue:', {
          trackUri: `spotify:track:${track.id}`,
          sessionCode: currentSession?.code,
          isHost: currentSession?.isHost
        })

        const response = await fetch('/api/spotify/add-to-queue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trackUri: `spotify:track:${track.id}`,
            // 호스트는 sessionCode 없이 호출
          }),
        })

        console.log('🔍 Spotify API Response Details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
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
    // 클리어 중 상태로 설정 (동기화 비활성화)
    setIsClearing(true)
    
    // 클리어 플래그 설정 (게스트가 빈 큐를 받았을 때 참조용)
    localStorage.setItem('sq_last_clear', Date.now().toString())
    
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
    
    // 클리어 완료 후 3초 후에 동기화 재활성화
    setTimeout(() => {
      setIsClearing(false)
      console.log('🔄 Queue clearing completed, sync re-enabled')
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

  // 수동 동기화 함수 (게스트용)
  const manualSync = async () => {
    if (!currentSession || currentSession.isHost) return
    
    setIsManualSyncing(true)
    try {
      console.log('🔄 Manual sync triggered by guest')
      const response = await fetch(`/api/sessions/queue?code=${currentSession.code}`)
      
      if (response.ok) {
        const data = await response.json()
        const newQueue = data.queue || []
        console.log('✅ Manual sync successful:', {
          queueLength: newQueue.length,
          tracks: newQueue.map((t: any) => ({ id: t.id, name: t.name }))
        })
        
        // addedAt 필드를 Date 객체로 변환
        const normalizedNewQueue = newQueue.map((track: any) => ({
          ...track,
          addedAt: track.addedAt ? new Date(track.addedAt) : new Date()
        }))
        
        // 큐 업데이트
        setQueue(normalizedNewQueue)
      } else {
        console.error('❌ Manual sync failed:', response.status)
      }
    } catch (error) {
      console.error('❌ Manual sync error:', error)
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
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

  const addToQueue = async (track: Omit<QueueTrack, 'addedAt'>) => {
    const newTrack: QueueTrack = {
      ...track,
      addedAt: new Date(),
    }
    
    // 로컬 큐에 추가
    setQueue(prev => {
      // 이미 큐에 있는 곡인지 확인
      if (prev.some(t => t.id === track.id)) {
        return prev // 중복 추가 방지
      }
      return [...prev, newTrack]
    })

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
        const errorData = await response.json()
        console.error('❌ Failed to add to Spotify queue:', {
          status: response.status,
          error: errorData
        })
        alert(`Spotify 큐 추가 실패: ${errorData.error || '알 수 없는 오류'}`)
      } else {
        console.log('✅ Successfully added to Spotify queue!')
      }
    } catch (error) {
      console.error('❌ Error adding to Spotify queue:', error)
      alert('Spotify 큐 추가 중 오류가 발생했습니다.')
    }
  }

  const removeFromQueue = (trackId: string) => {
    setQueue(prev => prev.filter(track => track.id !== trackId))
  }

  const clearQueue = () => {
    setQueue([])
  }

  const moveTrack = (fromIndex: number, toIndex: number) => {
    setQueue(prev => {
      const newQueue = [...prev]
      const [movedTrack] = newQueue.splice(fromIndex, 1)
      newQueue.splice(toIndex, 0, movedTrack)
      return newQueue
    })
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
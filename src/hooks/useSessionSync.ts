import { useEffect, useRef } from 'react'
import { useQueue } from '@/contexts/QueueContext'

interface SessionSyncProps {
  sessionCode: string
  isHost: boolean
}

export function useSessionSync({ sessionCode, isHost }: SessionSyncProps) {
  const { queue, setQueue } = useQueue()
  const lastSyncRef = useRef<number>(0)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const participantIdRef = useRef<string | null>(null)

  // 큐 동기화 함수
  const syncQueue = async () => {
    try {
      const response = await fetch(`/api/sessions/sync?sessionCode=${sessionCode}`)
      if (response.ok) {
        const data = await response.json()
        
        // 서버의 큐가 더 최신이면 업데이트
        if (data.lastUpdated > lastSyncRef.current) {
          // addedAt을 Date 객체로 변환
          const normalizedQueue = data.queue.map((track: any) => ({
            ...track,
            addedAt: new Date(track.addedAt)
          }))
          setQueue(normalizedQueue)
          lastSyncRef.current = data.lastUpdated
        }
        // Optionally, we could expose participantCount via a callback/context later
      }
    } catch (error) {
      console.error('큐 동기화 실패:', error)
    }
  }

  // 큐를 서버에 업로드
  const uploadQueue = async () => {
    try {
      if (!sessionCode) return
      const now = Date.now()
      if (!participantIdRef.current) {
        // Create a stable participant id per tab/session
        participantIdRef.current = `guest_${Math.random().toString(36).slice(2, 8)}_${now}`
      }
      const res = await fetch('/api/sessions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode,
          queue,
          participantId: participantIdRef.current
        })
      })
      try {
        const data = await res.json()
        lastSyncRef.current = typeof data?.lastUpdated === 'number' ? data.lastUpdated : now
      } catch {
        lastSyncRef.current = now
      }
    } catch (error) {
      console.error('큐 업로드 실패:', error)
    }
  }

  // presence 비활성화 (요청에 따라 참여자 집계 제거)

  // 큐가 변경될 때마다 서버에 업로드 (빈 큐도 업로드해 반영)
  useEffect(() => {
    if (sessionCode) {
      uploadQueue()
    }
  }, [queue, sessionCode])

  // 세션 코드가 준비되면, 로컬 큐를 최초 1회 즉시 업로드 (새로고침 복원 시 반영)
  useEffect(() => {
    if (!sessionCode) return
    // 최초 진입 시 로컬이 있으면 서버에 반영
    if (queue && queue.length > 0 && lastSyncRef.current === 0) {
      uploadQueue()
    }
  }, [sessionCode])

  // 주기적으로 서버에서 동기화 (2초마다)
  useEffect(() => {
    if (!sessionCode) return
    syncIntervalRef.current = setInterval(syncQueue, 2000)
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [sessionCode])

  return {
    syncQueue,
    uploadQueue
  }
}

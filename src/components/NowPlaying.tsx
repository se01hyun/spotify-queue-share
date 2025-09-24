'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useSessionContext } from '@/contexts/SessionContext'

interface Track {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    images: Array<{ url: string; width: number; height: number }>
  }
  duration_ms: number
}

interface NowPlayingData {
  isPlaying: boolean
  item: Track | null
  progress: number
  device?: {
    name: string
    type: string
  }
}

export default function NowPlaying() {
  const { data: session } = useSession()
  const { currentSession } = useSessionContext()
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [controlLoading, setControlLoading] = useState(false)

  const fetchNowPlaying = async () => {
    const params = !session && currentSession?.code ? `?code=${currentSession.code}` : ''

    try {
      const response = await fetch(`/api/spotify/currently-playing${params}`)
      if (response.ok) {
        const data = await response.json()
        setNowPlaying(data)
        setError(null)
      } else {
        setError('음악 정보를 가져올 수 없습니다')
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handlePlayPause = async () => {
    if (!session || !nowPlaying) return

    setControlLoading(true)
    try {
      const action = nowPlaying.isPlaying ? 'pause' : 'play'
      const response = await fetch('/api/spotify/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        // 즉시 상태 업데이트 (낙관적 업데이트)
        setNowPlaying(prev => prev ? { ...prev, isPlaying: !prev.isPlaying } : null)
        // 1초 후 실제 상태 확인
        setTimeout(fetchNowPlaying, 1000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || '재생 제어에 실패했습니다')
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setControlLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchNowPlaying()
      // 10초마다 업데이트
      const interval = setInterval(fetchNowPlaying, 10000)
      return () => clearInterval(interval)
    }
  }, [session])

  const isHost = Boolean(session)

  if (loading) {
    return (
      <div className="bg-gray-900/30 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-700 rounded-xl animate-pulse"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-900/30 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
        <div className="text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
          <button 
            onClick={fetchNowPlaying}
            className="mt-4 text-green-400 hover:text-green-300 underline"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  if (!nowPlaying?.item) {
    return (
      <div className="bg-gray-900/30 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
        <div className="text-center text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <p>현재 재생 중인 음악이 없습니다</p>
          <p className="text-sm mt-2">Spotify에서 음악을 재생해보세요</p>
        </div>
      </div>
    )
  }

  const { item, isPlaying, progress, device } = nowPlaying
  const progressPercentage = progress ? (progress / item.duration_ms) * 100 : 0

  return (
    <div className="bg-gray-900/30 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
      <h3 className="text-2xl font-bold mb-6 text-center">현재 재생 중</h3>
      
      <div className="flex items-center space-x-6">
        {/* 앨범 커버 */}
        <div className="relative">
          <img
            src={item.album.images[0]?.url || '/placeholder-album.png'}
            alt={item.album.name}
            className="w-24 h-24 rounded-xl shadow-lg"
          />
          {isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* 음악 정보 */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xl font-bold text-white truncate mb-1">
            {item.name}
          </h4>
          <p className="text-gray-400 truncate mb-2">
            {item.artists.map(artist => artist.name).join(', ')}
          </p>
          <p className="text-gray-500 text-sm truncate mb-4">
            {item.album.name}
          </p>

          {/* 프로그레스 바 */}
          <div className="space-y-2">
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div 
                className="bg-green-500 h-1 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatTime(progress || 0)}</span>
              <span>{formatTime(item.duration_ms)}</span>
            </div>
          </div>
        </div>

        {/* 재생 컨트롤 (호스트 전용) */}
        <div className="text-center">
          {isHost ? (
            <>
              <button
                onClick={handlePlayPause}
                disabled={controlLoading}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isPlaying 
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                } ${controlLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
              >
                {controlLoading ? (
                  <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : isPlaying ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              <p className="text-xs text-gray-400 mt-2">
                {isPlaying ? '일시정지' : '재생'}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-500">호스트만 재생 제어가 가능합니다</p>
          )}
          {device && (
            <p className="text-xs text-gray-500 mt-1">
              {device.name}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQueue } from '@/contexts/QueueContext'

interface Track {
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
}

interface SearchResults {
  tracks: Track[]
  total: number
  limit: number
  offset: number
}

export default function MusicSearch() {
  const { data: session } = useSession()
  const { addToQueue, isInQueue } = useQueue()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playingPreview, setPlayingPreview] = useState<string | null>(null)
  const [playLoading, setPlayLoading] = useState<string | null>(null)

  const searchMusic = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)

    try {
      const endpoint = session ? '/api/spotify/search' : '/api/spotify/search-public'
      const response = await fetch(`${endpoint}?q=${encodeURIComponent(searchQuery)}&limit=10`)
      
      if (response.ok) {
        const data = await response.json()
        setResults(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || '검색에 실패했습니다')
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 디바운스된 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2) {
        searchMusic(query)
      } else {
        setResults(null)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [query])

  const playTrack = async (track: Track) => {
    if (!session) return

    setPlayLoading(track.id)
    try {
      const response = await fetch('/api/spotify/play', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackUri: `spotify:track:${track.id}`
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`🎵 "${track.name}"이(가) Spotify에서 재생됩니다!`)
      } else {
        const errorData = await response.json()
        if (errorData.error?.includes('No active device')) {
          alert('🎵 먼저 Spotify 앱을 열어주세요!\n\n휴대폰이나 컴퓨터에서 Spotify를 실행한 후 다시 시도해보세요.')
        } else if (errorData.error?.includes('Premium required')) {
          // Premium 필요한 경우 Spotify로 리디렉션
          const confirmed = confirm(
            `🎵 "${track.name}"\n\n직접 재생하려면 Spotify Premium이 필요합니다.\nSpotify에서 이 곡을 들어보시겠어요?`
          )
          if (confirmed) {
            window.open(track.external_urls.spotify, '_blank')
          }
        } else {
          alert(`재생 실패: ${errorData.error || '알 수 없는 오류'}`)
        }
      }
    } catch (err) {
      alert('네트워크 오류가 발생했습니다')
    } finally {
      setPlayLoading(null)
    }
  }

  const openInSpotify = (track: Track) => {
    window.open(track.external_urls.spotify, '_blank')
  }

  const playPreview = async (previewUrl: string, trackId: string) => {
    if (!previewUrl) {
      alert('이 곡은 미리듣기를 지원하지 않습니다 😔\n대신 "재생" 버튼을 눌러 Spotify에서 전체 곡을 들어보세요!')
      return
    }

    if (playingPreview === trackId) {
      // 현재 재생 중인 미리듣기 중지
      setPlayingPreview(null)
      const audio = document.getElementById(`audio-${trackId}`) as HTMLAudioElement
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    } else {
      try {
        // 다른 미리듣기 중지
        if (playingPreview) {
          const prevAudio = document.getElementById(`audio-${playingPreview}`) as HTMLAudioElement
          if (prevAudio) {
            prevAudio.pause()
            prevAudio.currentTime = 0
          }
        }
        
        setPlayingPreview(trackId)
        const audio = document.getElementById(`audio-${trackId}`) as HTMLAudioElement
        if (audio) {
          await audio.play()
        }
      } catch (error) {
        console.error('미리듣기 재생 오류:', error)
        setPlayingPreview(null)
        alert('미리듣기 재생에 실패했습니다.')
      }
    }
  }

  const handleAddToQueue = (track: Track) => {
    if (isInQueue(track.id)) {
      alert(`"${track.name}"은(는) 이미 큐에 있습니다!`)
      return
    }

    addToQueue({
      id: track.id,
      name: track.name,
      artists: track.artists,
      album: track.album,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url,
      external_urls: track.external_urls,
    })
    
    alert(`🎵 "${track.name}"을(를) 큐에 추가했습니다!`)
  }

  // 게스트도 UI를 동일하게 사용 (검색은 공개 API 사용)

  return (
    <div className="bg-gray-900/30 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
      <h3 className="text-2xl font-bold mb-6 text-center">음악 검색</h3>
      
      {/* 검색 입력 */}
      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="아티스트, 곡명, 앨범을 검색하세요..."
          className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          {loading ? (
            <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <button
              type="button"
              aria-label="검색"
              onClick={() => query.trim() && searchMusic(query)}
              className="p-1 rounded hover:text-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-40"
              disabled={!query.trim()}
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* 검색 결과 */}
      {results && results.tracks.length > 0 && (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm mb-4">
            {results.total.toLocaleString()}개의 결과 중 {results.tracks.length}개 표시
          </p>
          
          {results.tracks.map((track) => (
            <div
              key={track.id}
              className="flex items-center space-x-4 bg-gray-800/30 rounded-xl p-4 hover:bg-gray-800/50 transition-colors"
            >
              {/* 앨범 커버 */}
              <img
                src={track.album.images[2]?.url || track.album.images[0]?.url || '/placeholder-album.png'}
                alt={track.album.name}
                className="w-12 h-12 rounded-lg shadow-md"
              />

              {/* 음악 정보 */}
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate">{track.name}</h4>
                <p className="text-gray-400 text-sm truncate">
                  {track.artists.map(artist => artist.name).join(', ')}
                </p>
                <p className="text-gray-500 text-xs truncate">{track.album.name}</p>
              </div>

              {/* 재생 시간 */}
              <div className="text-gray-400 text-sm">
                {formatTime(track.duration_ms)}
              </div>

              {/* 컨트롤 버튼들 */}
              <div className="flex items-center space-x-2">
                {/* 미리듣기 버튼 */}
                <button
                  onClick={() => {
                    if (track.preview_url) {
                      playPreview(track.preview_url, track.id)
                    } else {
                      // 미리듣기 없으면 Spotify에서 열기
                      openInSpotify(track)
                    }
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    track.preview_url
                      ? playingPreview === track.id
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-600/50 text-gray-500 hover:bg-gray-600/70'
                  }`}
                  title={track.preview_url ? '30초 미리듣기' : 'Spotify에서 열기'}
                >
                  {playingPreview === track.id ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* 큐에 추가 버튼 */}
                <button
                  onClick={() => handleAddToQueue(track)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isInQueue(track.id)
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title={isInQueue(track.id) ? '큐에 추가됨' : '큐에 추가'}
                >
                  {isInQueue(track.id) ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                </button>
              </div>

              {/* 숨겨진 오디오 엘리먼트 */}
              {track.preview_url && (
                <audio
                  id={`audio-${track.id}`}
                  src={track.preview_url}
                  preload="none"
                  onEnded={() => {
                    console.log('🔚 재생 완료:', track.id)
                    setPlayingPreview(null)
                  }}
                  onError={(e) => {
                    console.error('❌ 오디오 로드 에러:', track.id, e)
                    setPlayingPreview(null)
                  }}
                  onLoadStart={() => console.log('⏳ 오디오 로드 시작:', track.id)}
                  onCanPlay={() => console.log('✅ 오디오 재생 준비:', track.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 검색 결과 없음 */}
      {results && results.tracks.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p>검색 결과를 찾을 수 없습니다</p>
          <p className="text-sm mt-1">다른 검색어를 시도해보세요</p>
        </div>
      )}

      {/* 검색 안내 */}
      {!query && (
        <div className="text-center text-gray-400 py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p>좋아하는 음악을 검색해보세요</p>
          <p className="text-sm mt-1">아티스트명, 곡명, 앨범명으로 검색할 수 있습니다</p>
        </div>
      )}
    </div>
  )
}

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

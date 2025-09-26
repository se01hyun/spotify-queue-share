'use client'

import { useQueue } from '@/contexts/QueueContext'
import { useSession } from 'next-auth/react'
import { useSessionContext } from '@/contexts/SessionContext'

export default function MusicQueue() {
  const { data: session } = useSession()
  const { queue, removeFromQueue, clearQueue, syncWithSpotifyQueue, manualSync } = useQueue()
  const { currentSession } = useSessionContext()

  const openInSpotify = (spotifyUrl: string) => {
    window.open(spotifyUrl, '_blank')
  }

  const playAllInSpotify = () => {
    if (queue.length === 0) return
    const firstUrl = queue[0]?.external_urls?.spotify
    if (!firstUrl) return
    // 첫 번째 곡을 Spotify에서 열기
    openInSpotify(firstUrl)
  }

  // 게스트도 큐를 볼 수 있도록 수정
  // if (!session) return null

  return (
    <div className="bg-gray-900/30 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">Queue</h3>
        <div className="flex items-center space-x-2">
          <span className="text-gray-400 text-sm">{queue.length} tracks</span>
          {queue.length > 0 && session && (
            <>
              <button
                onClick={playAllInSpotify}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
              >
                Play in Spotify
              </button>
              <button
                onClick={() => clearQueue()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-lg mb-2">Queue is empty</p>
          <p className="text-sm">Search for music and add to the queue!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((track, index) => (
            <div
              key={`${track.id}-${index}`}
              className="flex items-center space-x-4 bg-gray-800/30 rounded-xl p-4 hover:bg-gray-800/50 transition-colors group"
            >
              {/* 순서 번호 */}
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">
                {index + 1}
              </div>

              {/* 앨범 커버 */}
              <img
                src={track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || '/placeholder-album.png'}
                alt={track.album?.name || 'Album cover'}
                className="w-12 h-12 rounded-lg shadow-md"
              />

              {/* 음악 정보 */}
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate">{track.name}</h4>
                <p className="text-gray-400 text-sm truncate">
                  {(track.artists?.map(artist => artist?.name).filter(Boolean).join(', ')) || 'Unknown artist'}
                </p>
                <p className="text-gray-500 text-xs truncate">{track.album?.name || 'Unknown album'}</p>
              </div>

              {/* 재생 시간 */}
              <div className="text-gray-400 text-sm">
                {formatTime(track.duration_ms ?? 0)}
              </div>

              {/* 컨트롤 버튼들 */}
              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Spotify에서 열기 */}
                {track.external_urls?.spotify && (
                  <button
                    onClick={() => openInSpotify(track.external_urls!.spotify)}
                    className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-colors"
                    title="Spotify에서 열기"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </button>
                )}

                {/* 큐에서 제거 */}
                <button
                  onClick={() => removeFromQueue(track.id)}
                  className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
                  title="큐에서 제거"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
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

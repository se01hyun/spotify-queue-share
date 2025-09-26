'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useSessionContext } from '@/contexts/SessionContext'
import NowPlaying from '@/components/NowPlaying'
import MusicSearch from '@/components/MusicSearch'
import MusicQueue from '@/components/MusicQueue'
import SessionManager from '@/components/SessionManager'

export default function HostPage() {
  const { data: session, status } = useSession()
  const { currentSession } = useSessionContext()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl animate-spin">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </div>
          <div className="text-white text-xl font-light">로딩 중...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-white">호스트 권한이 필요합니다</h1>
          <p className="text-gray-300 mb-6">Spotify에 로그인하여 호스트 기능을 사용하세요.</p>
          <Link href="/?welcome=1" className="inline-block px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-lg">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <Link href="/?welcome=1" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white">SpotifySync</h1>
          </Link>
          
          <div className="flex items-center space-x-4">
            {currentSession && (
              <div className="flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full">
                <span className="text-green-400 text-sm font-medium">{currentSession.code}</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">H</span>
              </div>
              <span className="text-white font-medium">호스트 사용자</span>
            </div>
            <button
              onClick={() => window.location.href = '/api/auth/signout'}
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 pb-10">
        <div className="space-y-8">
          {/* Welcome Message */}
          {currentSession && (
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">
                🎉 {currentSession.name} 세션을 호스팅 중!
              </h2>
              <p className="text-gray-300 text-lg">
                게스트들이 음악을 추가할 수 있어요. 함께 즐겨보세요!
              </p>
            </div>
          )}

          {/* Now Playing: 호스트 또는 게스트 세션 참여 시 */}
          <NowPlaying currentSession={currentSession} />
          
          {/* Session Management */}
          <SessionManager />
          
          {/* Music Search and Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <MusicSearch />
            <MusicQueue />
          </div>
        </div>
      </main>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useSessionContext } from '@/contexts/SessionContext'
import NowPlaying from '@/components/NowPlaying'
import MusicSearch from '@/components/MusicSearch'
import MusicQueue from '@/components/MusicQueue'

export default function GuestPage() {
  const { currentSession, isInSession, leaveSession } = useSessionContext()

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
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
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">G</span>
              </div>
              <span className="text-white font-medium">게스트 사용자</span>
            </div>
            <button
              onClick={() => {
                // SessionContext의 leaveSession 함수 호출
                leaveSession()
                // 홈으로 이동
                window.location.href = '/'
              }}
              className="text-red-400 hover:text-red-300 transition-colors font-medium"
            >
              세션 나가기
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
                🎉 {currentSession.name} 세션에 참여 중!
              </h2>
              <p className="text-gray-300 text-lg">
                {currentSession.hostName}님의 세션에서 함께 음악을 즐기세요!
              </p>
            </div>
          )}

          {/* Now Playing */}
          <NowPlaying currentSession={currentSession} />
          
          {/* 세션에 참여하지 않은 경우 */}
          {(!isInSession || !currentSession) && (
            <div className="max-w-md mx-auto bg-gray-800/40 rounded-2xl p-8 text-center border border-gray-600/30">
              <p className="text-gray-300 mb-4">아직 세션에 참여하지 않았어요.</p>
              <Link href="/" className="inline-block px-5 py-3 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-semibold">
                세션 참여하러 가기
              </Link>
            </div>
          )}
          
          {/* Music Search and Queue */}
          {isInSession && currentSession && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <MusicSearch />
              <MusicQueue />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

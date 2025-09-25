'use client'

import Link from 'next/link'
import { useSessionContext } from '@/contexts/SessionContext'
import MusicQueue from '@/components/MusicQueue'
import NowPlaying from '@/components/NowPlaying'

export default function GuestPage() {
  const { currentSession, isInSession } = useSessionContext()
  
  // 디버깅용 로그
  console.log('GuestPage state:', {
    isInSession,
    currentSession,
    hasCode: !!currentSession?.code
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="text-gray-300 hover:text-white transition-colors font-medium">
          ← 홈으로
        </Link>
        <h1 className="text-lg font-semibold">게스트 화면</h1>
        <div />
      </header>

      <main className="container mx-auto px-6 pb-10">
        <div className="space-y-6">
          {/* 세션 정보 표시 */}
          <div className="bg-gray-800/40 rounded-2xl p-6 border border-gray-600/30">
            <h2 className="text-xl font-bold mb-2">세션 정보</h2>
            <p className="text-gray-300">isInSession: {String(isInSession)}</p>
            <p className="text-gray-300">currentSession: {currentSession ? '있음' : '없음'}</p>
            <p className="text-gray-300">세션 코드: {currentSession?.code || '없음'}</p>
          </div>

          {/* NowPlaying 컴포넌트 */}
          <NowPlaying />
          
          {/* 세션에 참여하지 않은 경우 */}
          {(!isInSession || !currentSession) && (
            <div className="max-w-md mx-auto bg-gray-800/40 rounded-2xl p-8 text-center border border-gray-600/30">
              <p className="text-gray-300 mb-4">아직 세션에 참여하지 않았어요.</p>
              <Link href="/join" className="inline-block px-5 py-3 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-semibold">
                세션 참여하러 가기
              </Link>
            </div>
          )}
          
          {/* 세션에 참여한 경우 MusicQueue 표시 */}
          {isInSession && currentSession && <MusicQueue />}
        </div>
      </main>
    </div>
  )
}




'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useSessionContext } from '@/contexts/SessionContext'
import NowPlaying from '@/components/NowPlaying'
import MusicSearch from '@/components/MusicSearch'
import MusicQueue from '@/components/MusicQueue'
import SessionManager from '@/components/SessionManager'
import GuestJoinForm from '@/components/GuestJoinForm'
import { useSessionSync } from '@/hooks/useSessionSync'

export default function Home() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { currentSession, leaveSession } = useSessionContext()

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

  // SSR-safe: use searchParams snapshot provided by Next.js
  const forceWelcome = searchParams?.get('welcome') === '1'

  const sessionCode = currentSession?.code
  const isHost = currentSession?.isHost === true

  // 세션 동기화 활성화
  useSessionSync({ 
    sessionCode: sessionCode || '', 
    isHost 
  })

  // 호스트가 로그인했을 때 /host 페이지로 자동 리다이렉트
  useEffect(() => {
    if (session && !currentSession) {
      // 호스트가 로그인했고 세션이 없으면 /host로 리다이렉트
      router.push('/host')
    } else if (!session && currentSession && !currentSession.isHost) {
      // 게스트가 세션에 참여했으면 /guest로 리다이렉트 (단, 현재 페이지가 /guest가 아닐 때만)
      if (window.location.pathname !== '/guest') {
        router.push('/guest')
      }
    }
  }, [session, currentSession, router])

  // 대시보드 표시 조건: 게스트가 세션에 참여한 경우만
  if (currentSession && !currentSession.isHost) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
        {/* Header with Profile */}
        <header className="relative z-10 pt-8 pb-8">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-xl mr-4">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </div>
                <a href="/?welcome=1" className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent hover:opacity-90 transition-opacity">
                  SpotifySync
                </a>
                {sessionCode && (
                  <div className="ml-4 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm font-mono">
                    {sessionCode}
                  </div>
                )}
              </div>
              
              {/* User Profile */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center bg-gray-800/50 rounded-2xl px-4 py-2 backdrop-blur-sm border border-gray-700/50">
                  {session?.user?.image ? (
                    <img 
                      src={session?.user?.image || ''} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full mr-3"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">
                        {session?.user?.name?.charAt(0) || (currentSession?.isHost ? 'H' : 'G')}
                      </span>
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-white font-medium text-sm">
                      {session?.user?.name || (currentSession ? '게스트 사용자' : 'Unknown User')}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {session?.user?.email || (currentSession ? `세션: ${currentSession.code}` : '')}
                    </div>
                  </div>
                </div>
                
                {session ? (
                  <button
                    onClick={() => signOut()}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 px-4 py-2 rounded-xl transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
                  >
                    로그아웃
                  </button>
                ) : currentSession ? (
                  <button
                    onClick={() => {
                      // SessionContext 초기화
                      leaveSession()
                      // 페이지 새로고침으로 완전 초기화
                      window.location.reload()
                    }}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 px-4 py-2 rounded-xl transition-all duration-200 border border-red-500/30 hover:border-red-500/50"
                  >
                    세션 나가기
                  </button>
                ) : (
                  <button
                    onClick={() => signIn('spotify')}
                    className="bg-green-500/20 hover:bg-green-500/30 text-green-400 hover:text-green-300 px-4 py-2 rounded-xl transition-all duration-200 border border-green-500/30 hover:border-green-500/50"
                  >
                    로그인
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="relative z-10 container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Welcome Section */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                {session ? (
                  <>
                    환영합니다, <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">{session?.user?.name}</span>님! 🎵
                  </>
                ) : currentSession ? (
                  <>
                    <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">{currentSession.name}</span> 세션에 참여 중! 🎉
                  </>
                ) : (
                  '환영합니다! 🎵'
                )}
              </h2>
              <p className="text-gray-300 text-lg">
                {session ? (
                  '이제 음악 세션을 시작하거나 기존 세션에 참여할 수 있습니다.'
                ) : currentSession ? (
                  `${currentSession.hostName}님의 세션에서 함께 음악을 즐기세요!`
                ) : (
                  '음악 세션을 시작하거나 기존 세션에 참여할 수 있습니다.'
                )}
              </p>
            </div>

            {/* Session Manager - 로그인된 사용자만 */}
            {session && (
              <div className="mb-12">
                <SessionManager />
              </div>
            )}

            {/* Now Playing: 호스트 또는 게스트 세션 참여 시 */}
            {(session || (currentSession && !currentSession.isHost)) && (
              <div className="mb-12">
                <NowPlaying currentSession={currentSession} />
              </div>
            )}

            {/* Music Search */}
            <div className="mb-12">
              <MusicSearch />
            </div>

            {/* Music Queue */}
            <div className="mb-12">
              <MusicQueue />
            </div>

            {/* Session Info */}
            <div className="bg-gray-900/30 backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-300">
                    {session ? '호스트 모드' : currentSession ? '게스트 모드' : '대기 중'}
                  </span>
                </div>
                {sessionCode && (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-gray-400">세션: {sessionCode}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // 랜딩 페이지 (비로그인 상태)
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-green-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-12">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              SpotifySync
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 font-light">함께 만드는 완벽한 플레이리스트</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light mb-6 leading-relaxed">
              드라이브, 파티, 여행에서<br />
              <span className="font-semibold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">모두가 함께 음악을 즐기세요</span>
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
              실시간으로 큐를 공유하고, 누구나 쉽게 참여할 수 있는 음악 세션을 만들어보세요.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Host Card */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-gray-900/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300">
                <div className="flex items-center mb-6">
                  <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mr-4 shadow-xl">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">호스트로 시작</h3>
                    <p className="text-gray-400 text-sm">Spotify Premium 필요</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-8 leading-relaxed">
                  Spotify Premium 계정으로 로그인하고 음악을 재생하세요. 친구들을 초대해서 함께 플레이리스트를 만들어보세요.
                </p>
                <button
                  onClick={() => signIn('spotify')}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                >
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Spotify로 로그인
                  </span>
                </button>
              </div>
            </div>

            {/* Guest Card */}
            <GuestJoinForm />
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-3 text-white">실시간 동기화</h4>
              <p className="text-gray-400 leading-relaxed">모든 참가자가 실시간으로 큐를 확인하고 음악을 추가할 수 있어요</p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-3 text-white">간편한 참여</h4>
              <p className="text-gray-400 leading-relaxed">QR코드나 링크로 간단하게 세션에 참여하세요</p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-3 text-white">Spotify 연동</h4>
              <p className="text-gray-400 leading-relaxed">Spotify의 모든 음악을 검색하고 바로 재생하세요</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 mt-20">
        <div className="container mx-auto px-6 text-center">
          <div className="w-16 h-1 bg-gradient-to-r from-green-400 to-purple-600 rounded-full mx-auto mb-6"></div>
          <p className="text-gray-400">SpotifySync와 함께 더 나은 음악 경험을 만들어가세요 🎵</p>
        </div>
      </footer>
    </div>
  )
}

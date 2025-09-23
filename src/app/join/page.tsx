'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function JoinPage() {
  const [sessionCode, setSessionCode] = useState('')
  const [guestName, setGuestName] = useState('')

  const handleJoin = () => {
    // TODO: 세션 참여 로직 구현
    console.log('Joining session:', sessionCode, 'as', guestName)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.959-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.361 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white">SpotifySync</h1>
          </Link>
          <Link href="/" className="text-gray-300 hover:text-white transition-colors font-medium">
            ← 홈으로
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-4">
        <div className="max-w-md mx-auto">
          <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-gray-600/30">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-light mb-4 text-white">세션에 참여하기</h2>
              <p className="text-base text-gray-300 mb-8 leading-relaxed">
                호스트가 공유한 세션 코드를 입력하고<br />
                함께 음악을 즐겨보세요!
              </p>
            </div>

            <div className="space-y-6">
              {/* Guest Name Input */}
              <div>
                <label htmlFor="guestName" className="block text-sm font-medium mb-2 text-gray-300">
                  닉네임
                </label>
                <input
                  type="text"
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="음악을 함께 들을 닉네임을 입력하세요"
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-500 rounded-2xl text-white placeholder-gray-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-400 focus:ring-opacity-20 transition-colors text-sm shadow-sm"
                />
              </div>

              {/* Session Code Input */}
              <div>
                <label htmlFor="sessionCode" className="block text-sm font-medium mb-2 text-gray-300">
                  세션 코드
                </label>
                <input
                  type="text"
                  id="sessionCode"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  placeholder="예: ABC123"
                  className="w-full px-4 py-4 bg-gray-700/50 border border-gray-500 rounded-2xl text-white placeholder-gray-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-400 focus:ring-opacity-20 transition-colors text-center text-lg font-mono tracking-widest shadow-sm"
                  maxLength={6}
                />
              </div>

              {/* Join Button */}
              <button
                onClick={handleJoin}
                disabled={!sessionCode || !guestName}
                className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 text-base shadow-lg hover:shadow-xl"
              >
                {sessionCode && guestName ? '세션 참여하기' : '닉네임과 세션 코드를 입력하세요'}
              </button>
            </div>
          </div>
        </div>
      </main>

    </div>
  )
}

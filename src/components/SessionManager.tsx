'use client'

import { useState } from 'react'
import { useSession as useNextAuthSession } from 'next-auth/react'
import { useSessionContext } from '@/contexts/SessionContext'

export default function SessionManager() {
  const { data: authSession } = useNextAuthSession()
  const { currentSession, createSession, joinSession, leaveSession, isInSession } = useSessionContext()
  
  console.log('🔄 SessionManager render:', { 
    authSession: !!authSession, 
    currentSession, 
    isInSession 
  })
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [sessionCode, setSessionCode] = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionName.trim()) return

    setLoading(true)
    setError(null)

    try {
      await createSession(sessionName.trim())
      setSessionName('')
      setShowCreateForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🎯 Form submitted!')
    console.log('📝 Session code:', sessionCode.trim())
    console.log('📝 User name:', userName.trim())
    
    if (!sessionCode.trim() || !userName.trim()) {
      console.log('❌ Missing required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('🚀 Starting join session process...')
      const result = await joinSession(sessionCode.trim().toUpperCase(), userName.trim())
      console.log('🎉 Join session completed:', result)
      
      setSessionCode('')
      setUserName('')
      setShowJoinForm(false)
      
      console.log('📝 Form state cleared, should show session info now')
    } catch (err) {
      console.error('💥 Join session failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to join session')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveSession = () => {
    if (confirm('세션에서 나가시겠습니까?')) {
      leaveSession()
    }
  }

  // 게스트도 세션 참여 가능하도록 수정
  // if (!authSession) return null

  return (
    <div className="bg-gray-900/30 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
      <h3 className="text-2xl font-bold mb-6 text-center">세션 관리</h3>

      {/* 현재 세션 정보 */}
      {isInSession && currentSession ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xl font-bold text-green-400 mb-1">
                {currentSession.name}
              </h4>
              <p className="text-gray-300">
                세션 코드: <span className="font-mono text-lg font-bold">{currentSession.code}</span>
              </p>
              <p className="text-gray-400 text-sm">
                호스트: {currentSession.hostName} {currentSession.isHost && '(나)'}
              </p>
            </div>
            <button
              onClick={handleLeaveSession}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              나가기
            </button>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-green-400 text-sm mb-2">🎉 세션에 참여 중입니다!</p>
            <p className="text-gray-300 text-sm">
              친구들에게 세션 코드 <span className="font-mono font-bold">{currentSession.code}</span>를 공유하세요.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* 세션 생성/참여 버튼 */}
          {!showCreateForm && !showJoinForm && (
            <div className={`grid gap-2 mb-4 ${authSession ? 'grid-cols-1' : 'grid-cols-1'}`}>
              {/* 세션 생성 - 로그인된 사용자만 */}
              {authSession && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-3 py-2 rounded-lg transition-colors bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 text-sm flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-medium">세션 생성</span>
                </button>
              )}

              {/* 세션 참여 - 게스트 전용 (로그인한 호스트는 숨김) */}
              {!authSession && (
                <button
                  onClick={() => {
                    console.log('🔵 Join button clicked!')
                    setShowJoinForm(true)
                  }}
                  className="px-3 py-2 rounded-lg transition-colors bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 text-sm flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                  </svg>
                  <span className="font-medium">세션 참여</span>
                </button>
              )}
            </div>
          )}

          {/* 세션 생성 폼 */}
          {showCreateForm && (
            <form onSubmit={handleCreateSession} className="bg-gray-800/30 rounded-xl p-4 mb-4">
              <h4 className="text-base font-semibold mb-3">새 세션 만들기</h4>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  세션 이름
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="예: 드라이브 음악, 파티 플레이리스트"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600"
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading || !sessionName.trim()}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-white font-medium py-2 rounded-md transition-colors text-sm"
                >
                  {loading ? '생성 중...' : '세션 만들기'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setSessionName('')
                    setError(null)
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-sm"
                >
                  취소
                </button>
              </div>
            </form>
          )}

          {/* 세션 참여 폼 */}
          {showJoinForm && (
            <form onSubmit={handleJoinSession} className="bg-gray-800/30 rounded-xl p-4 mb-4">
              <h4 className="text-base font-semibold mb-3">세션 참여</h4>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  세션 코드
                </label>
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                  placeholder="6자리 코드 입력"
                  maxLength={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600 font-mono"
                  required
                  disabled={loading}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  표시될 이름
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="다른 사람들에게 표시될 이름"
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-600"
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading || !sessionCode.trim() || !userName.trim()}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-white font-medium py-2 rounded-md transition-colors text-sm"
                  onClick={() => console.log('🟦 Submit button clicked!')}
                >
                  {loading ? '참여 중...' : '세션 참여'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinForm(false)
                    setSessionCode('')
                    setUserName('')
                    setError(null)
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-sm"
                >
                  취소
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}

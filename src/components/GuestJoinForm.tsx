'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionContext } from '@/contexts/SessionContext'

interface GuestJoinFormProps {
  onJoinSuccess?: (sessionData: any) => void
}

export default function GuestJoinForm({ onJoinSuccess }: GuestJoinFormProps = {}) {
  const router = useRouter()
  const { joinSession } = useSessionContext()
  const [showForm, setShowForm] = useState(false)
  const [sessionCode, setSessionCode] = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // 이전 코드들 로드
  useEffect(() => {
    try {
      const savedCodes = localStorage.getItem('spotify_sync_guest_codes')
      if (savedCodes) {
        const codes = JSON.parse(savedCodes)
        setSuggestions(codes)
      }
    } catch (error) {
      console.error('이전 코드 로드 실패:', error)
    }
  }, [])

  // 코드 저장
  const saveCode = (code: string) => {
    try {
      const savedCodes = localStorage.getItem('spotify_sync_guest_codes')
      const codes = savedCodes ? JSON.parse(savedCodes) : []
      if (!codes.includes(code)) {
        const newCodes = [code, ...codes].slice(0, 5) // 최대 5개만 저장
        localStorage.setItem('spotify_sync_guest_codes', JSON.stringify(newCodes))
        setSuggestions(newCodes)
      }
    } catch (error) {
      console.error('코드 저장 실패:', error)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sessionCode.trim() || !userName.trim()) {
      setError('세션 코드와 닉네임을 모두 입력해주세요!')
      return
    }

    if (sessionCode.trim().length !== 6) {
      setError('세션 코드는 6자리여야 합니다!')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // SessionContext의 joinSession 사용
      const sessionData = await joinSession(sessionCode.trim(), userName.trim())
      
      saveCode(sessionCode.trim()) // 성공한 코드 저장
      onJoinSuccess?.(sessionData) // 기존 로직 유지 (옵셔널)
      setShowForm(false)
      setSessionCode('')
      setUserName('')
      // 게스트 전용 페이지로 이동
      router.push('/guest')
    } catch (err) {
      setError(`참여 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="group relative">
      <div aria-hidden="true" className="pointer-events-none absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
      <div className="relative bg-gray-900/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300">
        <div className="flex items-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center mr-4 shadow-xl">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">게스트로 참여</h3>
            <p className="text-gray-400 text-sm">로그인 불필요</p>
          </div>
        </div>
        
        <p className="text-gray-300 mb-8 leading-relaxed">
          세션 코드만 있으면 바로 참여할 수 있어요. 별도의 앱 설치나 로그인 없이 음악을 추가하고 즐기세요.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!showForm ? (
          <button 
            onClick={() => setShowForm(true)}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
          >
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              세션 참여하기
            </span>
          </button>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                세션 코드
              </label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => {
                  setSessionCode(e.target.value.toUpperCase())
                  setShowSuggestions(e.target.value.length > 0)
                }}
                onFocus={() => setShowSuggestions(sessionCode.length > 0 && suggestions.length > 0)}
                placeholder="6자리 코드 입력"
                maxLength={6}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono text-lg text-center"
                required
                disabled={loading}
              />
              
              {/* 자동 완성 제안 */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                  {suggestions
                    .filter(code => code.toLowerCase().includes(sessionCode.toLowerCase()))
                    .map((code, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setSessionCode(code)
                          setShowSuggestions(false)
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 font-mono text-sm border-b border-gray-700 last:border-b-0"
                      >
                        {code}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                닉네임
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="다른 사람들에게 표시될 이름"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                required
                disabled={loading}
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading || !sessionCode.trim() || !userName.trim()}
                className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-600/50 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {loading ? '참여 중...' : '세션 참여'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setSessionCode('')
                  setUserName('')
                  setError(null)
                }}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

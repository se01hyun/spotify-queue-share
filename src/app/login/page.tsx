'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [router])

  const handleSpotifyLogin = async () => {
    setIsLoading(true)
    try {
      await signIn('spotify', {
        callbackUrl: '/dashboard'
      })
    } catch (error) {
      console.error('로그인 오류:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 to-blue-600">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-2xl">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
            <span className="text-2xl">🎵</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            모두의 플레이리스트
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Spotify Premium으로 로그인하여 음악 세션을 시작하세요
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <button
              onClick={handleSpotifyLogin}
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  로그인 중...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.348-1.435-5.304-1.76-8.785-.964-.335.077-.67-.133-.746-.469-.077-.336.132-.67.469-.746 3.809-.871 7.077-.496 9.713 1.115.294.18.386.563.206.857zm1.223-2.723c-.226.367-.706.482-1.073.257-2.687-1.652-6.785-2.131-9.965-1.166-.413.125-.849-.106-.973-.52-.125-.413.106-.849.52-.973 3.632-1.102 8.147-.568 11.234 1.329.366.226.481.707.257 1.073zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.493.15-1.016-.128-1.166-.62-.149-.493.129-1.016.621-1.166 3.532-1.073 9.404-.865 13.115 1.338.445.264.590.837.326 1.282-.264.444-.837.590-1.282.325z"/>
                  </svg>
                  Spotify로 로그인
                </div>
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              로그인하면 <a href="#" className="text-green-600 hover:text-green-500">이용약관</a>과{' '}
              <a href="#" className="text-green-600 hover:text-green-500">개인정보처리방침</a>에 동의하게 됩니다.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">게스트로 참여하기</h3>
            <p className="text-sm text-gray-600 mb-4">
              이미 생성된 세션에 참여하시나요?
            </p>
            <button
              onClick={() => router.push('/join')}
              className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              세션 코드로 참여하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

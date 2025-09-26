import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Manual Token Refresh Request ===')
    
    const session = await getServerSession(authOptions)
    console.log('Current session before refresh:', {
      hasSession: !!session,
      hasToken: !!(session as any)?.accessToken,
      hasError: !!(session as any)?.error,
      user: session?.user?.name,
      expiresAt: (session as any)?.expiresAt
    })
    
    if (!session) {
      return NextResponse.json({ 
        error: 'No active session found' 
      }, { status: 401 })
    }
    
    // 세션에 에러가 있거나 토큰이 없으면 강제로 재로그인 요구
    if ((session as any)?.error || !(session as any)?.accessToken) {
      console.log('Session has error or no token, requiring re-authentication')
      return NextResponse.json({ 
        error: 'Session invalid, please re-authenticate',
        details: (session as any)?.error || 'No access token',
        requiresReauth: true
      }, { status: 401 })
    }
    
    // 세션이 정상이면 성공으로 반환
    return NextResponse.json({ 
      success: true,
      message: 'Session is valid',
      hasToken: !!(session as any)?.accessToken
    })
    
  } catch (error) {
    console.error('Error in refresh endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

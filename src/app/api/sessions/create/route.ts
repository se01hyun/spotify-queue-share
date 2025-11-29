import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}


export async function POST(request: NextRequest) {
  try {
    console.log('=== Session Create API Debug ===')
    console.log('Environment check:')
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing')
    
    const session = await getServerSession(authOptions)
    console.log('Auth session:', session ? 'Found' : 'Not found')
    
    if (!session?.user) {
      console.log('❌ Not authenticated')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { sessionName } = await request.json()
    console.log('Session name:', sessionName)

    if (!sessionName || sessionName.trim().length === 0) {
      console.log('❌ Session name is required')
      return NextResponse.json({ error: 'Session name is required' }, { status: 400 })
    }

    // 고유한 세션 코드 생성 (최대 5회 시도)
    let code = ''
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      code = generateSessionCode()
      
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('id')
        .eq('code', code)
        .single()

      if (!existingSession) {
        break // 고유한 코드 찾음
      }
      
      attempts++
    }

    if (attempts === maxAttempts) {
      return NextResponse.json({ error: 'Failed to generate unique session code' }, { status: 500 })
    }

    // users 테이블에서 해당 Spotify 사용자의 실제 ID 찾기
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('spotify_id', String(session.user.id))
      .single()

    if (userError || !existingUser) {
      console.error('❌ User not found in users table:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const hostUserId = existingUser.id
    
    // 기존 테이블 구조에 맞게 세션 생성
    console.log('Creating session with data:', {
      join_code: code,
      session_name: sessionName.trim(),
      host_user_id: hostUserId,
      original_spotify_id: String(session.user.id),
    })
    
    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        join_code: code,
        session_name: sessionName.trim(),
        host_user_id: hostUserId, // users 테이블의 실제 ID
        // 호스트의 Spotify 토큰 저장(게스트 경로 자동 갱신/사용용)
        spotify_access_token: (session as any)?.accessToken || null,
        spotify_refresh_token: (session as any)?.refreshToken || null,
      })
      .select()
      .single()

    if (sessionError) {
      console.error('❌ Session creation error:', sessionError)
      console.error('Error details:', JSON.stringify(sessionError, null, 2))
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }
    
    console.log('✅ Session created successfully:', newSession)

    // 호스트를 참가자로 추가
    const { error: participantError } = await supabase
      .from('session_participants')
      .insert({
        session_id: newSession.id,
        guest_nickname: session.user.name || 'Host',
      })

    if (participantError) {
      console.error('Participant creation error:', participantError)
      // 세션 생성은 성공했으므로 계속 진행
    }

    return NextResponse.json({
      success: true,
      session: {
        id: newSession.id,
        code: newSession.join_code,
        name: newSession.session_name,
        hostName: session.user.name || 'Unknown Host',
        createdAt: newSession.created_at,
      }
    })

  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

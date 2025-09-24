import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { sessionName } = await request.json()

    if (!sessionName || sessionName.trim().length === 0) {
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
        .eq('join_code', code)
        .single()

      if (!existingSession) {
        break // 고유한 코드 찾음
      }
      
      attempts++
    }

    if (attempts === maxAttempts) {
      return NextResponse.json({ error: 'Failed to generate unique session code' }, { status: 500 })
    }

    // 세션 생성
    const { data: newSession, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        join_code: code,
        session_name: sessionName.trim(),
        host_user_id: session.user.id,
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Session creation error:', sessionError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

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

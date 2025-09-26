import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    let payload: any = {}
    try {
      payload = await request.json()
    } catch (e) {
      console.error('join: invalid JSON body')
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { sessionCode, userName } = payload

    if (!sessionCode || sessionCode.trim().length !== 6) {
      return NextResponse.json({ error: 'Valid 6-character session code is required' }, { status: 400 })
    }

    if (!userName || userName.trim().length === 0) {
      return NextResponse.json({ error: 'User name is required' }, { status: 400 })
    }

    // 세션 찾기
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('join_code', sessionCode.toUpperCase())
      .is('ended_at', null)
      .single()

    if (sessionError || !sessionData) {
      console.error('join: session lookup failed', sessionError)
      return NextResponse.json({ error: 'Session not found or inactive', details: sessionError?.message || null }, { status: 404 })
    }

    const finalUserName = userName.trim()

    // 이미 참여했는지 확인 (닉네임으로)
    const { data: existingParticipant, error: existingError } = await supabase
      .from('session_participants')
      .select('id')
      .eq('session_id', sessionData.id)
      .eq('guest_nickname', finalUserName)
      .is('left_at', null)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      // PGRST116 is postgrest "Results contain 0 rows" when single()
      console.error('join: existing participant check failed', existingError)
    }

    if (existingParticipant) {
      // 이미 참여한 경우 세션 정보만 반환
      return NextResponse.json({
        success: true,
        session: {
          id: sessionData.id,
          code: sessionData.join_code,
          name: sessionData.session_name,
          hostName: 'Host',
          isHost: false,
        }
      })
    }

    // 참가자로 추가
    const { error: participantError } = await supabase
      .from('session_participants')
      .insert({
        session_id: sessionData.id,
        guest_nickname: finalUserName,
      })

    if (participantError) {
      console.error('Participant join error:', participantError)
      return NextResponse.json({ error: 'Failed to join session', details: participantError.message, code: participantError.code }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session: {
        id: sessionData.id,
        code: sessionData.join_code,
        name: sessionData.session_name,
        hostName: 'Host',
        isHost: false,
      }
    })

  } catch (error: any) {
    console.error('Error joining session:', error)
    const msg = typeof error?.message === 'string' ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

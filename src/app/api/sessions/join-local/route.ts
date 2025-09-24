import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

// 임시 메모리 저장소 (create-local에서 생성된 세션들)
declare global {
  var sessions: Map<string, any> | undefined
}

const sessions = globalThis.sessions || new Map()
globalThis.sessions = sessions

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { sessionCode, userName } = await request.json()

    console.log('🔍 Join request:', { sessionCode, userName })
    console.log('📊 Available sessions:', Array.from(sessions.keys()))

    if (!sessionCode || sessionCode.trim().length !== 6) {
      return NextResponse.json({ error: 'Valid 6-character session code is required' }, { status: 400 })
    }

    if (!userName || userName.trim().length === 0) {
      return NextResponse.json({ error: 'User name is required' }, { status: 400 })
    }

    // 세션 찾기
    const sessionData = sessions.get(sessionCode.toUpperCase())
    console.log('🔎 Found session:', sessionData ? 'YES' : 'NO')
    
    if (!sessionData) {
      console.log('❌ Session not found for code:', sessionCode.toUpperCase())
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const finalUserName = userName.trim()
    const userId = session?.user?.id || null

    // 이미 참여했는지 확인
    const existingParticipant = sessionData.participants.find(
      (p: any) => p.user_name === finalUserName || p.user_id === userId
    )

    if (existingParticipant) {
      return NextResponse.json({
        success: true,
        session: {
          id: sessionData.id,
          code: sessionData.code,
          name: sessionData.name,
          hostName: sessionData.host_name,
          isHost: existingParticipant.is_host,
        }
      })
    }

    // 참가자로 추가
    sessionData.participants.push({
      user_id: userId,
      user_name: finalUserName,
      is_host: false,
      joined_at: new Date().toISOString(),
    })

    // 업데이트된 세션 저장
    sessions.set(sessionCode.toUpperCase(), sessionData)

    return NextResponse.json({
      success: true,
      session: {
        id: sessionData.id,
        code: sessionData.code,
        name: sessionData.name,
        hostName: sessionData.host_name,
        isHost: false,
      }
    })

  } catch (error) {
    console.error('Error joining session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

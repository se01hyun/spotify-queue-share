import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

// 임시 메모리 저장소 (실제 서비스에서는 사용하지 마세요!)
declare global {
  var sessions: Map<string, any> | undefined
}

const sessions = globalThis.sessions || new Map()
globalThis.sessions = sessions

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

    // 고유한 세션 코드 생성
    let code = ''
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      code = generateSessionCode()
      if (!sessions.has(code)) {
        break
      }
      attempts++
    }

    if (attempts === maxAttempts) {
      return NextResponse.json({ error: 'Failed to generate unique session code' }, { status: 500 })
    }

    // 메모리에 세션 저장
    const sessionId = `session_${Date.now()}`
    const newSession = {
      id: sessionId,
      code,
      name: sessionName.trim(),
      host_id: session.user.id,
      host_name: session.user.name || 'Unknown Host',
      created_at: new Date().toISOString(),
      participants: [
        {
          user_id: session.user.id,
          user_name: session.user.name || 'Unknown Host',
          is_host: true,
        }
      ],
      queue: []
    }

    sessions.set(code, newSession)

    return NextResponse.json({
      success: true,
      session: {
        id: newSession.id,
        code: newSession.code,
        name: newSession.name,
        hostName: newSession.host_name,
        createdAt: newSession.created_at,
      }
    })

  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

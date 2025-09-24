import { NextRequest, NextResponse } from 'next/server'

// 전역 세션 저장소 확인
declare global {
  var sessions: Map<string, any> | undefined
}

const sessions = globalThis.sessions || new Map()

export async function GET(request: NextRequest) {
  const allSessions = Array.from(sessions.entries()).map(([code, data]) => ({
    code,
    name: data.name,
    participants: data.participants?.length || 0,
  }))

  return NextResponse.json({
    totalSessions: sessions.size,
    sessions: allSessions,
  })
}







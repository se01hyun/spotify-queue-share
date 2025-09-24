export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for per-session queues and last update timestamp
declare global {
  // sessionCode -> { queue, lastUpdated, participants }
  // queue items should have serializable dates (ISO strings) for addedAt
  // We normalize on GET to Date objects in the client hook
  var sessionQueues: Map<string, { queue: any[]; lastUpdated: number; participants: Set<string> }> | undefined
}

const sessionQueues = globalThis.sessionQueues || new Map<string, { queue: any[]; lastUpdated: number; participants: Set<string> }>()
globalThis.sessionQueues = sessionQueues

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl?.searchParams || new URL(request.url).searchParams
    const sessionCode = (searchParams.get('sessionCode') || '').toUpperCase()

    if (!sessionCode || sessionCode.length !== 6) {
      return NextResponse.json({ error: 'Valid sessionCode (6 chars) is required' }, { status: 400 })
    }

    const entry = sessionQueues.get(sessionCode) || { queue: [], lastUpdated: 0, participants: new Set<string>() }
    return NextResponse.json({
      queue: entry.queue,
      lastUpdated: entry.lastUpdated,
      participantCount: entry.participants.size,
    }, { status: 200 })
  } catch (error: any) {
    console.error('GET /api/sessions/sync error:', error)
    // Fail-soft: return empty state to keep UI functional while logging server error
    return NextResponse.json({ queue: [], lastUpdated: 0 }, { status: 200 })
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const { sessionCode, queue, participantId, presenceOnly } = body

    if (!sessionCode || typeof sessionCode !== 'string' || sessionCode.trim().length !== 6) {
      return NextResponse.json({ error: 'Valid sessionCode (6 chars) is required' }, { status: 400 })
    }

    if (!presenceOnly && !Array.isArray(queue)) {
      return NextResponse.json({ error: 'queue must be an array' }, { status: 400 })
    }

    const normalizedQueue = Array.isArray(queue)
      ? queue.map((t) => ({
          ...t,
          // Ensure addedAt is ISO string for serialization
          addedAt: typeof t?.addedAt === 'string' ? t.addedAt : new Date(t?.addedAt ?? Date.now()).toISOString(),
        }))
      : []

    const code = sessionCode.toUpperCase()
    const now = Date.now()
    const existing = sessionQueues.get(code) || { queue: [], lastUpdated: 0, participants: new Set<string>() }
    if (!presenceOnly) {
      existing.queue = normalizedQueue
      existing.lastUpdated = now
    }
    if (participantId && typeof participantId === 'string') {
      existing.participants.add(participantId)
    }
    sessionQueues.set(code, existing)

    // participantId reserved for future auditing; not used now
    return NextResponse.json({ success: true, lastUpdated: existing.lastUpdated, participantCount: existing.participants.size }, { status: 200 })
  } catch (error: any) {
    console.error('POST /api/sessions/sync error:', error)
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

 

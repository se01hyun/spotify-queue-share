import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('=== Supabase Test API ===')
    console.log('Environment check:')
    console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing')

    // 테이블 존재 여부 확인
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .limit(1)

    console.log('Sessions table test:', sessionsError ? 'Error' : 'Success')
    if (sessionsError) {
      console.error('Sessions error:', sessionsError)
    }

    const { data: participants, error: participantsError } = await supabase
      .from('session_participants')
      .select('*')
      .limit(1)

    console.log('Session participants table test:', participantsError ? 'Error' : 'Success')
    if (participantsError) {
      console.error('Participants error:', participantsError)
    }

    const { data: queue, error: queueError } = await supabase
      .from('session_queue')
      .select('*')
      .limit(1)

    console.log('Session queue table test:', queueError ? 'Error' : 'Success')
    if (queueError) {
      console.error('Queue error:', queueError)
    }

    return NextResponse.json({
      success: true,
      tables: {
        sessions: sessionsError ? { error: sessionsError.message } : { success: true, count: sessions?.length || 0 },
        session_participants: participantsError ? { error: participantsError.message } : { success: true, count: participants?.length || 0 },
        session_queue: queueError ? { error: queueError.message } : { success: true, count: queue?.length || 0 },
      }
    })

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // sessions 테이블 구조 확인
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .limit(1)

    console.log('Sessions table structure check:', sessionsError ? 'Error' : 'Success')
    if (sessionsError) {
      console.error('Sessions error:', sessionsError)
    } else if (sessions && sessions.length > 0) {
      console.log('Sessions table columns:', Object.keys(sessions[0]))
    }

    return NextResponse.json({
      success: true,
      sessions: {
        error: sessionsError?.message,
        columns: sessions && sessions.length > 0 ? Object.keys(sessions[0]) : [],
        sample: sessions && sessions.length > 0 ? sessions[0] : null
      }
    })

  } catch (error) {
    console.error('Schema check error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

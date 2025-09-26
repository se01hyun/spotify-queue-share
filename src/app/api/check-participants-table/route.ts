import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // session_participants 테이블 존재 여부 확인
    const { data: participants, error: participantsError } = await supabase
      .from('session_participants')
      .select('*')
      .limit(1)

    console.log('Session participants table check:', participantsError ? 'Error' : 'Success')
    if (participantsError) {
      console.error('Participants error:', participantsError)
    } else if (participants && participants.length > 0) {
      console.log('Session participants table columns:', Object.keys(participants[0]))
    }

    return NextResponse.json({
      success: true,
      session_participants: {
        error: participantsError?.message,
        columns: participants && participants.length > 0 ? Object.keys(participants[0]) : [],
        sample: participants && participants.length > 0 ? participants[0] : null,
        exists: !participantsError
      }
    })

  } catch (error) {
    console.error('Session participants table check error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

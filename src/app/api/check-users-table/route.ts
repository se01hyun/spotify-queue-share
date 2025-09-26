import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // users 테이블 존재 여부 확인
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1)

    console.log('Users table check:', usersError ? 'Error' : 'Success')
    if (usersError) {
      console.error('Users error:', usersError)
    } else if (users && users.length > 0) {
      console.log('Users table columns:', Object.keys(users[0]))
    }

    return NextResponse.json({
      success: true,
      users: {
        error: usersError?.message,
        columns: users && users.length > 0 ? Object.keys(users[0]) : [],
        sample: users && users.length > 0 ? users[0] : null,
        exists: !usersError
      }
    })

  } catch (error) {
    console.error('Users table check error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

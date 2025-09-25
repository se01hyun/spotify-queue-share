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
    const body = await request.json()
    const { sessionCode } = body

    console.log('⏭️ Next Track API called:', {
      sessionCode,
      hasSessionCode: !!sessionCode
    })

    let accessToken: string | null = null

    // 세션 코드가 있으면 DB에서 호스트 토큰 가져오기 (게스트 요청)
    if (sessionCode) {
      console.log('🔍 Looking up session in DB for next track:', sessionCode.toUpperCase())
      
      const { data: dbSession, error: dbError } = await supabase
        .from('sessions')
        .select('spotify_access_token, spotify_refresh_token')
        .eq('join_code', sessionCode.toUpperCase())
        .is('ended_at', null)
        .single()
      
      if (!dbSession) {
        console.log('❌ Session not found in DB for next track')
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      accessToken = (dbSession as any)?.spotify_access_token
    } else {
      // 호스트 요청인 경우 NextAuth 세션에서 토큰 가져오기
      const session = await getServerSession(authOptions)
      accessToken = (session as any)?.accessToken
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    // Spotify API로 다음 곡 재생
    console.log('⏭️ Making Spotify API request for next track')

    const response = await fetch('https://api.spotify.com/v1/me/player/next', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Spotify API error skipping to next track:', errorData)
      
      if (response.status === 404) {
        return NextResponse.json({ 
          error: 'No active device found. Please open Spotify on your device first.' 
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: errorData.error?.message || 'Failed to skip to next track' 
      }, { status: response.status })
    }

    console.log('✅ Successfully skipped to next track!')
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Error skipping to next track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

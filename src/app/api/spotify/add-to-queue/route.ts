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
    const { trackUri, sessionCode } = body

    console.log('🎵 Add to Queue API called:', {
      trackUri,
      sessionCode,
      hasSessionCode: !!sessionCode
    })

    if (!trackUri) {
      return NextResponse.json({ error: 'trackUri is required' }, { status: 400 })
    }

    let accessToken: string | null = null

    // 세션 코드가 있으면 DB에서 호스트 토큰 가져오기 (게스트 요청)
    if (sessionCode) {
      console.log('🔍 Looking up session in DB:', sessionCode.toUpperCase())
      
      const { data: dbSession, error: dbError } = await supabase
        .from('sessions')
        .select('spotify_access_token, spotify_refresh_token')
        .eq('join_code', sessionCode.toUpperCase())
        .is('ended_at', null)
        .single()
      
      console.log('📊 DB query result:', {
        hasData: !!dbSession,
        hasError: !!dbError,
        error: dbError,
        hasToken: !!(dbSession as any)?.spotify_access_token
      })
      
      if (!dbSession) {
        console.log('❌ Session not found in DB')
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      accessToken = (dbSession as any)?.spotify_access_token
    } else {
      // 호스트 요청인 경우 NextAuth 세션에서 토큰 가져오기
      const session = await getServerSession(authOptions)
      console.log('👤 NextAuth session:', { hasSession: !!session, hasToken: !!(session as any)?.accessToken })
      accessToken = (session as any)?.accessToken
    }

    console.log('🔑 Access token status:', { hasToken: !!accessToken })

    if (!accessToken) {
      console.log('❌ No access token available')
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    // Spotify API로 큐에 곡 추가
    console.log('🎵 Making Spotify API request:', {
      url: 'https://api.spotify.com/v1/me/player/queue',
      method: 'POST',
      trackUri,
      hasAccessToken: !!accessToken
    })

    const response = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(trackUri)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Spotify Add to Queue error:', response.status, errorData)
      
      if (response.status === 404) {
        return NextResponse.json({ 
          error: 'No active device found. Please open Spotify on your device first.' 
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: errorData.error?.message || 'Failed to add track to queue' 
      }, { status: response.status })
    }

    // 큐에 추가 후 현재 재생 상태 확인
    const playerResponse = await fetch('https://api.spotify.com/v1/me/player', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    if (playerResponse.ok) {
      const playerData = await playerResponse.json()
      console.log('🎵 Current player state after adding to queue:', {
        isPlaying: playerData.is_playing,
        currentTrack: playerData.item?.name,
        queueLength: playerData.queue?.length || 'unknown'
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error adding track to queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

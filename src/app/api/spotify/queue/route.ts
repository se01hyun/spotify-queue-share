import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const code = (url.searchParams.get('code') || '').toUpperCase()
    
    console.log('=== Spotify Queue API Debug ===')
    console.log('Request URL:', request.url)
    console.log('Session code:', code)

    let accessToken: string | null = null

    if (code && code.length === 6) {
      console.log('Fetching token from DB for session code:', code)
      const { data: dbSession, error: dbError } = await supabase
        .from('sessions')
        .select('spotify_access_token')
        .eq('join_code', code)
        .is('ended_at', null)
        .single()
      
      console.log('DB query result:', { dbSession, dbError })
      accessToken = (dbSession as any)?.spotify_access_token || null
    } else {
      console.log('Fetching token from NextAuth session')
      const session = await getServerSession(authOptions)
      console.log('NextAuth session:', session ? 'exists' : 'null')
      console.log('Session accessToken:', (session as any)?.accessToken ? 'exists' : 'null')
      accessToken = (session as any)?.accessToken || null
    }

    console.log('Final accessToken:', accessToken ? 'exists' : 'null')

    if (!accessToken) {
      console.log('No access token found, returning 401')
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    console.log('Calling Spotify API for player state...')
    
    // Spotify API로 현재 재생 상태만 가져오기 (큐 API는 존재하지 않음)
    const playerResponse = await fetch('https://api.spotify.com/v1/me/player', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    console.log('Spotify player API response status:', playerResponse.status)

    if (playerResponse.status === 204 || playerResponse.status === 202) {
      console.log('No active device')
      return NextResponse.json({ 
        hasActiveDevice: false,
        queue: [],
        currentlyPlaying: null
      })
    }

    if (!playerResponse.ok) {
      const errorText = await playerResponse.text()
      console.error('Spotify player API error:', playerResponse.status, playerResponse.statusText, errorText)
      return NextResponse.json({ error: 'Spotify API error', details: errorText }, { status: playerResponse.status })
    }

    const playerData = await playerResponse.json()
    
    // Spotify API는 큐 정보를 직접 제공하지 않으므로 빈 큐 반환
    // 실제 큐 관리는 웹 애플리케이션에서 담당
    return NextResponse.json({
      hasActiveDevice: true,
      queue: [], // 항상 빈 큐 반환 (웹에서 관리)
      currentlyPlaying: playerData.item,
      isPlaying: playerData.is_playing,
      device: playerData.device
    })
  } catch (error) {
    console.error('Error fetching Spotify queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

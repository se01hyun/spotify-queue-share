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

    let accessToken: string | null = null

    if (code && code.length === 6) {
      const { data: dbSession } = await supabase
        .from('sessions')
        .select('spotify_access_token')
        .eq('join_code', code)
        .is('ended_at', null)
        .single()
      
      accessToken = (dbSession as any)?.spotify_access_token || null
    } else {
      const session = await getServerSession(authOptions)
      accessToken = (session as any)?.accessToken || null
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }
    
    // Spotify API로 현재 재생 상태만 가져오기 (큐 API는 존재하지 않음)
    const playerResponse = await fetch('https://api.spotify.com/v1/me/player', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (playerResponse.status === 204 || playerResponse.status === 202) {
      return NextResponse.json({ 
        hasActiveDevice: false,
        queue: [],
        currentlyPlaying: null
      })
    }

    if (!playerResponse.ok) {
      const errorText = await playerResponse.text()
      console.error('Spotify player API error:', playerResponse.status, errorText)
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

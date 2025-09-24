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

    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (response.status === 204 || response.status === 202) {
      return NextResponse.json({ isPlaying: false, item: null })
    }

    if (!response.ok) {
      console.error('Spotify API error:', response.status, response.statusText)
      return NextResponse.json({ error: 'Spotify API error' }, { status: response.status })
    }

    const data = await response.json()
    
    return NextResponse.json({
      isPlaying: data.is_playing,
      item: data.item,
      progress: data.progress_ms,
      device: data.device,
    })
  } catch (error) {
    console.error('Error fetching currently playing:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}







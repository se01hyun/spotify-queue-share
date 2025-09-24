import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
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






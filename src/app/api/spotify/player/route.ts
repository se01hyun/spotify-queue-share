import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    const { action } = await request.json()

    if (!['play', 'pause'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const endpoint = action === 'play' 
      ? 'https://api.spotify.com/v1/me/player/play'
      : 'https://api.spotify.com/v1/me/player/pause'

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 204) {
      return NextResponse.json({ success: true, action })
    }

    if (response.status === 404) {
      return NextResponse.json({ 
        error: 'No active device found. Please open Spotify on a device first.' 
      }, { status: 404 })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Spotify API error:', response.status, errorData)
      return NextResponse.json({ 
        error: errorData.error?.message || 'Spotify API error' 
      }, { status: response.status })
    }

    return NextResponse.json({ success: true, action })
  } catch (error) {
    console.error('Error controlling playback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}






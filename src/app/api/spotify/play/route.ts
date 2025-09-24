import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    const { trackUri } = await request.json()

    if (!trackUri) {
      return NextResponse.json({ error: 'Track URI is required' }, { status: 400 })
    }

    // Spotify Play API 호출
    const response = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: [trackUri]
      }),
    })

    if (response.status === 204) {
      return NextResponse.json({ success: true, message: '재생 시작됨' })
    }

    if (response.status === 404) {
      return NextResponse.json({ 
        error: 'No active device found. Please open Spotify on a device first.' 
      }, { status: 404 })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Spotify Play API error:', response.status, errorData)
      return NextResponse.json({ 
        error: errorData.error?.message || 'Failed to play track' 
      }, { status: response.status })
    }

    return NextResponse.json({ success: true, message: '재생 시작됨' })
  } catch (error) {
    console.error('Error playing track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}







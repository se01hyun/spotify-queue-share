import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// GET: 디바이스 상태 확인
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    if (response.status === 204) {
      // 204는 디바이스가 있지만 재생 중이지 않음을 의미
      return NextResponse.json({ 
        device: null,
        hasActiveDevice: true 
      })
    }

    if (response.status === 404) {
      // 404는 활성 디바이스가 없음을 의미
      return NextResponse.json({ 
        device: null,
        hasActiveDevice: false 
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Spotify API error:', response.status, errorData)
      return NextResponse.json({ 
        error: errorData.error?.message || 'Spotify API error' 
      }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({
      device: data.device,
      hasActiveDevice: !!data.device
    })
  } catch (error) {
    console.error('Error checking device status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 재생/일시정지 제어
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







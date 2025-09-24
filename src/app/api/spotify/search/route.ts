import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'track'
    const limit = searchParams.get('limit') || '20'
    const offset = searchParams.get('offset') || '0'

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    // Spotify Search API 호출
    const spotifyUrl = new URL('https://api.spotify.com/v1/search')
    spotifyUrl.searchParams.set('q', query)
    spotifyUrl.searchParams.set('type', type)
    spotifyUrl.searchParams.set('limit', limit)
    spotifyUrl.searchParams.set('offset', offset)
    spotifyUrl.searchParams.set('market', 'KR') // 한국 시장으로 제한

    const response = await fetch(spotifyUrl.toString(), {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    })

    if (!response.ok) {
      console.error('Spotify Search API error:', response.status, response.statusText)
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({ 
        error: errorData.error?.message || 'Spotify API error' 
      }, { status: response.status })
    }

    const data = await response.json()
    
    return NextResponse.json({
      tracks: data.tracks?.items || [],
      total: data.tracks?.total || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
  } catch (error) {
    console.error('Error searching music:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}







import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]/route'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function refreshSpotifyAccessToken(refreshToken: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to refresh token (${res.status}): ${text}`)
  }

  return await res.json() as { access_token: string; expires_in?: number; scope?: string; token_type?: string }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trackUri, sessionCode, track } = body

    console.log('🎵 Add to Queue API called:', {
      trackUri,
      sessionCode,
      hasSessionCode: !!sessionCode
    })

    if (!trackUri) {
      return NextResponse.json({ error: 'trackUri is required' }, { status: 400 })
    }

    let accessToken: string | null = null
    let refreshToken: string | null = null
    let sessionId: string | null = null

    // 세션 코드가 있으면 DB에서 호스트 토큰 가져오기 (게스트 요청)
    if (sessionCode) {
      console.log('🔍 Looking up session in DB:', sessionCode.toUpperCase())
      
      const { data: dbSession, error: dbError } = await supabase
        .from('sessions')
        .select('id, spotify_access_token, spotify_refresh_token')
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

      sessionId = (dbSession as any)?.id || null
      accessToken = (dbSession as any)?.spotify_access_token
      refreshToken = (dbSession as any)?.spotify_refresh_token

      // 토큰이 없고 refresh_token만 있다면 즉시 갱신 시도
      if (!accessToken && refreshToken) {
        try {
          const refreshed = await refreshSpotifyAccessToken(refreshToken)
          accessToken = refreshed.access_token
          if (sessionId && accessToken) {
            await supabase
              .from('sessions')
              .update({ spotify_access_token: accessToken })
              .eq('id', sessionId)
          }
        } catch (e) {
          console.error('❌ Token refresh failed before request:', e)
        }
      }
    } else {
      // 호스트 요청인 경우 NextAuth 세션에서 토큰 가져오기
      const session = await getServerSession(authOptions)
      console.log('👤 NextAuth session:', { 
        hasSession: !!session, 
        hasToken: !!(session as any)?.accessToken,
        hasError: !!(session as any)?.error,
        sessionError: (session as any)?.error,
        user: session?.user?.name,
        fullSession: session
      })
      
      if (!session) {
        console.error('❌ No session found')
        return NextResponse.json({ 
          error: 'No active session. Please log in first.',
          requiresLogin: true
        }, { status: 401 })
      }
      
      accessToken = (session as any)?.accessToken
      
      // 세션에 에러가 있으면 로깅
      if ((session as any)?.error) {
        console.error('❌ Session has error:', (session as any)?.error)
        return NextResponse.json({ 
          error: 'Authentication error. Please log in again.',
          details: (session as any)?.error,
          requiresLogin: true
        }, { status: 401 })
      }
    }

    console.log('🔑 Access token status:', { 
      hasToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'None'
    })

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

    let response = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(trackUri)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    console.log('📡 Spotify API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    })

    // 401이면 세션코드 경로에서 refresh_token으로 한 번 재시도
    if (response.status === 401 && refreshToken) {
      try {
        console.log('🔄 401 from Spotify - attempting token refresh and retry')
        const refreshed = await refreshSpotifyAccessToken(refreshToken)
        accessToken = refreshed.access_token
        if (sessionId && accessToken) {
          await supabase
            .from('sessions')
            .update({ spotify_access_token: accessToken })
            .eq('id', sessionId)
        }
        response = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(trackUri)}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        })
      } catch (e) {
        console.error('❌ Retry after refresh failed:', e)
      }
    }

    if (!response.ok) {
      let errorData: any = {}
      let responseText = ''
      try {
        responseText = await response.text()
        errorData = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError)
        errorData = { message: 'Unknown error occurred', rawResponse: responseText }
      }
      
      console.error('Spotify Add to Queue error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        responseText,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (response.status === 404) {
        return NextResponse.json({ 
          error: 'No active device found. Please open Spotify on your device first.' 
        }, { status: 404 })
      }
      
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Spotify authentication expired. Please log in again.',
          requiresLogin: !sessionCode // 호스트만 재로그인 요구
        }, { status: 401 })
      }
      
      if (response.status === 403) {
        return NextResponse.json({ 
          error: 'Spotify Premium required for queue management.' 
        }, { status: 403 })
      }
      
      return NextResponse.json({ 
        error: errorData.error?.message || errorData.message || `Spotify API error (${response.status})` 
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

    // 게스트 요청이면 DB의 session_queue에도 트랙 반영 (웹 큐 동기화 보장)
    if (sessionCode && sessionId && track) {
      try {
        const item = {
          session_id: sessionId,
          track_id: track.id,
          track_name: track.name,
          track_artists: track.artists,
          track_album: track.album,
          track_duration_ms: track.duration_ms,
          track_preview_url: track.preview_url,
          track_spotify_url: track.external_urls?.spotify,
          added_by_user_id: null,
          added_by_name: track.addedBy || 'Guest',
          position: 999999 // 맨 뒤로 (정렬 시 뒤로 가도록 큰 수)
        }
        const { error: insertError } = await supabase
          .from('session_queue')
          .insert([item])
        if (insertError) {
          console.error('❌ Failed to persist guest track to DB:', insertError)
        } else {
          console.log('✅ Guest track persisted to DB')
        }
      } catch (e) {
        console.error('❌ Error persisting guest track to DB:', e)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error adding track to queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

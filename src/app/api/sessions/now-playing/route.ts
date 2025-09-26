import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const code = (url.searchParams.get('code') || '').toUpperCase()
    
    console.log('=== Now Playing API Debug ===')
    console.log('Session code:', code)

    if (!code || code.length !== 6) {
      console.log('❌ Invalid session code:', code)
      return NextResponse.json({ error: 'Invalid session code' }, { status: 400 })
    }

    // 세션 찾기 (refresh 토큰도 함께 조회)
    let session: any = null
    let sessionError: any = null
    {
      const res = await supabase
        .from('sessions')
        .select('id, spotify_access_token, spotify_refresh_token')
        .eq('join_code', code)
        .is('ended_at', null)
        .single()
      session = res.data
      sessionError = res.error
    }

    // 일부 환경에서 컬럼명이 code 인 케이스 대비해 한번 더 시도
    if (!session) {
      const res2 = await supabase
        .from('sessions')
        .select('id, spotify_access_token, spotify_refresh_token')
        .eq('code', code)
        .is('ended_at', null)
        .single()
      if (res2.data) session = res2.data
      if (!sessionError) sessionError = res2.error
    }

    if (sessionError || !session) {
      console.error('❌ Session not found (join_code/code both failed):', sessionError)
      // Fail-soft: 게스트 UI가 깨지지 않도록 200으로 비활성 상태 반환
      return NextResponse.json({ 
        hasActiveDevice: false,
        isPlaying: false,
        item: null,
        progress: 0
      }, { status: 200 })
    }

    console.log('✅ Session found:', session.id)

    // 호스트의 Spotify 액세스 토큰이 있는지 확인
    if (!session.spotify_access_token && !session.spotify_refresh_token) {
      console.log('⚠️ No Spotify access token for host')
      return NextResponse.json({ 
        hasActiveDevice: false,
        isPlaying: false,
        item: null,
        progress: 0
      })
    }

    // Spotify 토큰 갱신 유틸
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
      return await res.json() as { access_token: string }
    }

    // Spotify API로 현재 재생 상태 가져오기 (401 시 1회 토큰 갱신 후 재시도)
    try {
      let accessToken = session.spotify_access_token as string | null
      let playerResponse = await fetch('https://api.spotify.com/v1/me/player', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      console.log('Spotify player API response status:', playerResponse.status)

      // 401인 경우 refresh_token으로 갱신 후 1회 재시도
      if (playerResponse.status === 401 && session.spotify_refresh_token) {
        try {
          console.log('🔄 Spotify 401 - attempting token refresh')
          const refreshed = await refreshSpotifyAccessToken(session.spotify_refresh_token as unknown as string)
          accessToken = refreshed.access_token
          // DB 최신 토큰 저장
          await supabase
            .from('sessions')
            .update({ spotify_access_token: accessToken })
            .eq('id', session.id)
          // 재시도
          playerResponse = await fetch('https://api.spotify.com/v1/me/player', {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          console.log('Spotify player API response status after refresh:', playerResponse.status)
        } catch (e) {
          console.error('❌ Token refresh failed:', e)
        }
      }

      if (playerResponse.status === 204 || playerResponse.status === 202) {
        console.log('No active device')
        return NextResponse.json({ 
          hasActiveDevice: false,
          isPlaying: false,
          item: null,
          progress: 0
        })
      }

      if (!playerResponse.ok) {
        const errorText = await playerResponse.text()
        console.error('Spotify player API error:', playerResponse.status, playerResponse.statusText, errorText)
        return NextResponse.json({ error: 'Spotify API error', details: errorText }, { status: playerResponse.status })
      }

      const playerData = await playerResponse.json()
      
      console.log('✅ Now playing data retrieved:', {
        isPlaying: playerData.is_playing,
        trackName: playerData.item?.name,
        deviceName: playerData.device?.name
      })

      return NextResponse.json({
        hasActiveDevice: true,
        isPlaying: playerData.is_playing,
        item: playerData.item,
        progress: playerData.progress_ms || 0,
        device: playerData.device
      })
    } catch (error) {
      console.error('❌ Error calling Spotify API:', error)
      return NextResponse.json({ error: 'Failed to fetch from Spotify' }, { status: 500 })
    }
  } catch (error) {
    console.error('❌ Error in now-playing API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

// Public search via Spotify Client Credentials (no user login required)
// Requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in environment

async function getAppAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET')
  }

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  })

  if (!tokenRes.ok) {
    const text = await tokenRes.text()
    throw new Error(`Failed to get app token: ${tokenRes.status} ${text}`)
  }

  const tokenJson = await tokenRes.json()
  return tokenJson.access_token as string
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const limit = Math.min(Number(searchParams.get('limit') || '10'), 20)
    const offset = Math.max(Number(searchParams.get('offset') || '0'), 0)

    if (!q.trim()) {
      return NextResponse.json({ error: '검색어(q)가 필요합니다' }, { status: 400 })
    }

    const accessToken = await getAppAccessToken()

    const res = await fetch(
      `https://api.spotify.com/v1/search?${new URLSearchParams({ q, type: 'track', limit: String(limit), offset: String(offset) }).toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        // Force edge-friendly behavior
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Spotify 검색 실패: ${res.status} ${text}` }, { status: 500 })
    }

    const data = await res.json()

    // Normalize to our frontend shape
    const items = (data.tracks?.items || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      artists: (t.artists || []).map((a: any) => ({ name: a.name })),
      album: {
        name: t.album?.name,
        images: t.album?.images || [],
      },
      duration_ms: t.duration_ms,
      preview_url: t.preview_url || null,
      external_urls: { spotify: t.external_urls?.spotify },
    }))

    return NextResponse.json({
      tracks: items,
      total: data.tracks?.total || 0,
      limit,
      offset,
    })
  } catch (err: any) {
    console.error('search-public error:', err)
    return NextResponse.json({ error: err?.message || '서버 오류' }, { status: 500 })
  }
}








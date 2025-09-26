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
    
    console.log('=== Queue Sync API Debug ===')
    console.log('Session code:', code)

    if (!code || code.length !== 6) {
      console.log('❌ Invalid session code:', code)
      return NextResponse.json({ error: 'Invalid session code' }, { status: 400 })
    }

    // 세션 찾기
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('join_code', code)
      .is('ended_at', null)
      .single()

    if (sessionError || !session) {
      console.error('❌ Session not found:', sessionError)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    console.log('✅ Session found:', session.id)

    // session_queue 테이블에서 큐 데이터 가져오기
    const { data: queueItems, error: queueError } = await supabase
      .from('session_queue')
      .select('*')
      .eq('session_id', session.id)
      .order('position', { ascending: true })

    if (queueError) {
      console.error('❌ Queue fetch error:', queueError)
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
    }

    console.log('📊 Queue items from DB:', queueItems?.length || 0, 'items')
    console.log('📊 Raw queue items:', queueItems)

    const queueData = (queueItems || []).map((q: any) => {
      const artists = Array.isArray(q.track_artists)
        ? q.track_artists
        : (typeof q.track_artists === 'string' ? [q.track_artists] : [])
      const album = typeof q.track_album === 'object' && q.track_album !== null
        ? q.track_album
        : { name: q.track_album || 'Unknown album', images: [] as any[] }
      return {
        id: q.track_id,
        name: q.track_name || 'Unknown title',
        artists: artists.map((a: any) => (typeof a === 'string' ? { name: a } : a)).filter(Boolean),
        album: {
          name: album?.name || 'Unknown album',
          images: Array.isArray(album?.images) ? album.images : [],
        },
        duration_ms: q.track_duration_ms ?? 0,
        preview_url: q.track_preview_url || null,
        external_urls: { spotify: q.track_spotify_url || null },
        addedAt: q.created_at ? new Date(q.created_at).toISOString() : new Date().toISOString(),
        addedBy: q.added_by_name || 'Unknown'
      }
    })
    console.log('Queue data for session (normalized):', queueData)

    return NextResponse.json({ queue: queueData })
  } catch (error) {
    console.error('Error fetching queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const code = (url.searchParams.get('code') || '').toUpperCase()
    const { queue } = await request.json()
    
    console.log('=== Update Queue API Debug ===')
    console.log('Session code:', code)
    console.log('Queue length:', queue?.length || 0)
    console.log('Queue tracks:', queue?.map((q: any) => ({ id: q.id, name: q.name })) || [])

    if (!code || code.length !== 6) {
      console.log('❌ Invalid session code:', code)
      return NextResponse.json({ error: 'Invalid session code' }, { status: 400 })
    }

    // 세션 찾기
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('join_code', code)
      .is('ended_at', null)
      .single()

    if (sessionError || !session) {
      console.error('❌ Session not found:', sessionError)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    console.log('✅ Session found for update:', session.id)

    // 기존 큐 삭제
    const { error: deleteError } = await supabase
      .from('session_queue')
      .delete()
      .eq('session_id', session.id)

    if (deleteError) {
      console.error('❌ Error deleting old queue:', deleteError)
      return NextResponse.json({ error: 'Failed to clear old queue' }, { status: 500 })
    }

    // 새 큐 데이터 삽입
    if (queue && queue.length > 0) {
      const queueItems = queue.map((item: any, index: number) => ({
        session_id: session.id,
        track_id: item.id || item.track_id,
        track_name: item.name || item.track_name,
        track_artists: item.artists || item.track_artists,
        track_album: item.album || item.track_album,
        track_duration_ms: item.duration_ms || item.track_duration_ms,
        track_preview_url: item.preview_url || item.track_preview_url,
        track_spotify_url: item.external_urls?.spotify || item.track_spotify_url,
        added_by_user_id: item.added_by_user_id || null,
        added_by_name: item.added_by_name || 'Unknown',
        position: index
      }))

      const { error: insertError } = await supabase
        .from('session_queue')
        .insert(queueItems)

      if (insertError) {
        console.error('❌ Error inserting new queue:', insertError)
        return NextResponse.json({ error: 'Failed to update queue' }, { status: 500 })
      }
    }

    console.log('✅ Queue updated successfully for session:', code)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error updating queue:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

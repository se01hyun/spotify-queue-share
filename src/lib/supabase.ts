import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ikhqonotdjhstxnrcvld.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Database types (will be generated later)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          spotify_id: string
          display_name: string | null
          email: string | null
          profile_image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          spotify_id: string
          display_name?: string | null
          email?: string | null
          profile_image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          spotify_id?: string
          display_name?: string | null
          email?: string | null
          profile_image_url?: string | null
          created_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          host_user_id: string
          session_name: string
          created_at: string
          ended_at: string | null
          join_code: string
          spotify_access_token: string | null
          spotify_refresh_token: string | null
          spotify_expires_at: string | null
          host_spotify_device_id: string | null
        }
        Insert: {
          id?: string
          host_user_id: string
          session_name?: string
          created_at?: string
          ended_at?: string | null
          join_code: string
          spotify_access_token?: string | null
          spotify_refresh_token?: string | null
          spotify_expires_at?: string | null
          host_spotify_device_id?: string | null
        }
        Update: {
          id?: string
          host_user_id?: string
          session_name?: string
          created_at?: string
          ended_at?: string | null
          join_code?: string
          spotify_access_token?: string | null
          spotify_refresh_token?: string | null
          spotify_expires_at?: string | null
          host_spotify_device_id?: string | null
        }
      }
      added_tracks: {
        Row: {
          id: string
          session_id: string
          spotify_track_id: string
          track_name: string
          artist_name: string
          album_cover_url: string | null
          added_by_guest_id: string | null
          added_at: string
          is_played: boolean
          play_order: number | null
        }
        Insert: {
          id?: string
          session_id: string
          spotify_track_id: string
          track_name: string
          artist_name: string
          album_cover_url?: string | null
          added_by_guest_id?: string | null
          added_at?: string
          is_played?: boolean
          play_order?: number | null
        }
        Update: {
          id?: string
          session_id?: string
          spotify_track_id?: string
          track_name?: string
          artist_name?: string
          album_cover_url?: string | null
          added_by_guest_id?: string | null
          added_at?: string
          is_played?: boolean
          play_order?: number | null
        }
      }
      session_participants: {
        Row: {
          id: string
          session_id: string
          guest_nickname: string
          joined_at: string
          left_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          guest_nickname?: string
          joined_at?: string
          left_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          guest_nickname?: string
          joined_at?: string
          left_at?: string | null
        }
      }
    }
  }
}

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

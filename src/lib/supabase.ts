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
          session_name: string
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
      session_queue: {
        Row: {
          id: string
          session_id: string
          track_id: string
          track_name: string
          track_artists: any // JSONB type
          track_album: any // JSONB type
          track_duration_ms: number
          track_preview_url: string | null
          track_spotify_url: string
          added_by_user_id: string | null
          added_by_name: string
          added_at: string
          position: number
        }
        Insert: {
          id?: string
          session_id: string
          track_id: string
          track_name: string
          track_artists: any
          track_album: any
          track_duration_ms: number
          track_preview_url?: string | null
          track_spotify_url: string
          added_by_user_id?: string | null
          added_by_name: string
          added_at?: string
          position?: number
        }
        Update: {
          id?: string
          session_id?: string
          track_id?: string
          track_name?: string
          track_artists?: any
          track_album?: any
          track_duration_ms?: number
          track_preview_url?: string | null
          track_spotify_url?: string
          added_by_user_id?: string | null
          added_by_name?: string
          added_at?: string
          position?: number
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
          guest_nickname: string
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
    Enums: {
      // Add enums here if needed in the future
    }
  }
}

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

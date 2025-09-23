#!/usr/bin/env node

/**
 * Database Setup Script for Spotify Queue Share
 * This script creates all necessary tables and sets up Row Level Security (RLS) policies
 */

import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const SUPABASE_URL = 'https://ikhqonotdjhstxnrcvld.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY // This needs to be set

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  console.log('Please set it with your Supabase service role key')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function createUsersTable() {
  console.log('📝 Creating users table...')
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Create users table for Spotify Queue Share
      CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          spotify_id TEXT UNIQUE NOT NULL,
          display_name TEXT,
          email TEXT UNIQUE,
          profile_image_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Add RLS (Row Level Security) policies
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

      -- Policy: Users can read their own profile
      DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
      CREATE POLICY "Users can view own profile" ON public.users
          FOR SELECT USING (auth.uid() = id);

      -- Policy: Users can update their own profile
      DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
      CREATE POLICY "Users can update own profile" ON public.users
          FOR UPDATE USING (auth.uid() = id);

      -- Create index on spotify_id for faster lookups
      CREATE INDEX IF NOT EXISTS idx_users_spotify_id ON public.users(spotify_id);
    `
  })

  if (error) {
    console.error('❌ Error creating users table:', error)
    return false
  }
  
  console.log('✅ Users table created successfully')
  return true
}

async function createSessionsTable() {
  console.log('📝 Creating sessions table...')
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Create sessions table
      CREATE TABLE IF NOT EXISTS public.sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          host_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          session_name TEXT DEFAULT 'My Music Session',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ended_at TIMESTAMP WITH TIME ZONE,
          join_code TEXT UNIQUE NOT NULL,
          spotify_access_token TEXT, -- Will be encrypted at app level
          spotify_refresh_token TEXT, -- Will be encrypted at app level
          spotify_expires_at TIMESTAMP WITH TIME ZONE,
          host_spotify_device_id TEXT
      );

      -- Enable RLS
      ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

      -- Policy: Host can manage their own sessions
      DROP POLICY IF EXISTS "Host can manage own sessions" ON public.sessions;
      CREATE POLICY "Host can manage own sessions" ON public.sessions
          USING (auth.uid() = host_user_id);

      -- Policy: Anyone can read active sessions by join_code (for guests)
      DROP POLICY IF EXISTS "Anyone can read sessions by join_code" ON public.sessions;
      CREATE POLICY "Anyone can read sessions by join_code" ON public.sessions
          FOR SELECT USING (ended_at IS NULL);

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_sessions_host_user_id ON public.sessions(host_user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_join_code ON public.sessions(join_code);
      CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at);
    `
  })

  if (error) {
    console.error('❌ Error creating sessions table:', error)
    return false
  }
  
  console.log('✅ Sessions table created successfully')
  return true
}

async function createAddedTracksTable() {
  console.log('📝 Creating added_tracks table...')
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Create added_tracks table
      CREATE TABLE IF NOT EXISTS public.added_tracks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
          spotify_track_id TEXT NOT NULL,
          track_name TEXT NOT NULL,
          artist_name TEXT NOT NULL,
          album_cover_url TEXT,
          added_by_guest_id UUID, -- FK to session_participants, nullable for anonymous
          added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          is_played BOOLEAN DEFAULT FALSE,
          play_order INTEGER
      );

      -- Enable RLS
      ALTER TABLE public.added_tracks ENABLE ROW LEVEL SECURITY;

      -- Policy: Anyone can read tracks for active sessions
      DROP POLICY IF EXISTS "Anyone can read tracks for active sessions" ON public.added_tracks;
      CREATE POLICY "Anyone can read tracks for active sessions" ON public.added_tracks
          FOR SELECT USING (
              EXISTS (
                  SELECT 1 FROM public.sessions 
                  WHERE sessions.id = added_tracks.session_id 
                  AND sessions.ended_at IS NULL
              )
          );

      -- Policy: Anyone can add tracks to active sessions
      DROP POLICY IF EXISTS "Anyone can add tracks to active sessions" ON public.added_tracks;
      CREATE POLICY "Anyone can add tracks to active sessions" ON public.added_tracks
          FOR INSERT WITH CHECK (
              EXISTS (
                  SELECT 1 FROM public.sessions 
                  WHERE sessions.id = added_tracks.session_id 
                  AND sessions.ended_at IS NULL
              )
          );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_added_tracks_session_id ON public.added_tracks(session_id);
      CREATE INDEX IF NOT EXISTS idx_added_tracks_spotify_track_id ON public.added_tracks(spotify_track_id);
      CREATE INDEX IF NOT EXISTS idx_added_tracks_added_at ON public.added_tracks(added_at);
      CREATE INDEX IF NOT EXISTS idx_added_tracks_play_order ON public.added_tracks(play_order);
    `
  })

  if (error) {
    console.error('❌ Error creating added_tracks table:', error)
    return false
  }
  
  console.log('✅ Added_tracks table created successfully')
  return true
}

async function createSessionParticipantsTable() {
  console.log('📝 Creating session_participants table...')
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      -- Create session_participants table
      CREATE TABLE IF NOT EXISTS public.session_participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
          guest_nickname TEXT DEFAULT '익명 참가자',
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          left_at TIMESTAMP WITH TIME ZONE
      );

      -- Enable RLS
      ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

      -- Policy: Anyone can read participants for active sessions
      DROP POLICY IF EXISTS "Anyone can read participants for active sessions" ON public.session_participants;
      CREATE POLICY "Anyone can read participants for active sessions" ON public.session_participants
          FOR SELECT USING (
              EXISTS (
                  SELECT 1 FROM public.sessions 
                  WHERE sessions.id = session_participants.session_id 
                  AND sessions.ended_at IS NULL
              )
          );

      -- Policy: Anyone can join active sessions
      DROP POLICY IF EXISTS "Anyone can join active sessions" ON public.session_participants;
      CREATE POLICY "Anyone can join active sessions" ON public.session_participants
          FOR INSERT WITH CHECK (
              EXISTS (
                  SELECT 1 FROM public.sessions 
                  WHERE sessions.id = session_participants.session_id 
                  AND sessions.ended_at IS NULL
              )
          );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON public.session_participants(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_participants_joined_at ON public.session_participants(joined_at);
    `
  })

  if (error) {
    console.error('❌ Error creating session_participants table:', error)
    return false
  }
  
  console.log('✅ Session_participants table created successfully')
  return true
}

async function enableRealtimeForTables() {
  console.log('📡 Enabling realtime for tables...')
  
  const tables = ['sessions', 'added_tracks', 'session_participants']
  
  for (const table of tables) {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER PUBLICATION supabase_realtime ADD TABLE public.${table};`
    })
    
    if (error) {
      console.warn(`⚠️  Warning: Could not enable realtime for ${table}:`, error.message)
    } else {
      console.log(`✅ Realtime enabled for ${table}`)
    }
  }
}

async function setupDatabase() {
  console.log('🚀 Starting database setup for Spotify Queue Share...\n')
  
  try {
    // Create tables in dependency order
    const results = await Promise.all([
      createUsersTable(),
      // Sessions depends on users, so create it after
    ])
    
    if (results[0]) {
      await createSessionsTable()
      
      // Create remaining tables that depend on sessions
      await Promise.all([
        createAddedTracksTable(),
        createSessionParticipantsTable()
      ])
    }
    
    // Enable realtime
    await enableRealtimeForTables()
    
    console.log('\n✅ Database setup completed successfully!')
    console.log('🎵 Your Spotify Queue Share database is ready!')
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error)
    process.exit(1)
  }
}

// Run the setup
setupDatabase()

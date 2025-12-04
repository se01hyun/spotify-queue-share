-- 사용자 테이블 (호스트 정보)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spotify_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 세션 테이블
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  join_code VARCHAR(6) UNIQUE NOT NULL,
  session_name TEXT NOT NULL,
  host_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  spotify_access_token TEXT,
  spotify_refresh_token TEXT,
  spotify_expires_at TIMESTAMP WITH TIME ZONE,
  host_spotify_device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- 세션 참가자 테이블
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  guest_nickname TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE
);

-- 세션 큐 테이블 (실시간 협업 플레이리스트)
CREATE TABLE IF NOT EXISTS session_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  track_artists JSONB NOT NULL,
  track_album JSONB NOT NULL,
  track_duration_ms INTEGER NOT NULL,
  track_preview_url TEXT,
  track_spotify_url TEXT NOT NULL,
  added_by_user_id TEXT,
  added_by_name TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  position INTEGER NOT NULL DEFAULT 0
);

-- 추가된 트랙 이력 테이블 (재생 이력 관리)
CREATE TABLE IF NOT EXISTS added_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  spotify_track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_cover_url TEXT,
  added_by_guest_id UUID,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_played BOOLEAN DEFAULT false,
  play_order INTEGER
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_spotify_id ON users(spotify_id);
CREATE INDEX IF NOT EXISTS idx_sessions_join_code ON sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_sessions_host_user_id ON sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ended_at ON sessions(ended_at);
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_queue_session_id ON session_queue(session_id);
CREATE INDEX IF NOT EXISTS idx_session_queue_position ON session_queue(session_id, position);
CREATE INDEX IF NOT EXISTS idx_added_tracks_session_id ON added_tracks(session_id);
CREATE INDEX IF NOT EXISTS idx_added_tracks_is_played ON added_tracks(session_id, is_played);

-- RLS (Row Level Security) 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE added_tracks ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 (세션 코드로 참여)
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Sessions are viewable by everyone" ON sessions FOR SELECT USING (true);
CREATE POLICY "Session participants are viewable by everyone" ON session_participants FOR SELECT USING (true);
CREATE POLICY "Session queue is viewable by everyone" ON session_queue FOR SELECT USING (true);
CREATE POLICY "Added tracks are viewable by everyone" ON added_tracks FOR SELECT USING (true);

-- 사용자는 본인 정보만 수정 가능
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- 세션 생성은 인증된 사용자만
CREATE POLICY "Authenticated users can create sessions" ON sessions FOR INSERT WITH CHECK (
  auth.uid() = host_user_id
);

-- 호스트만 세션 수정 가능
CREATE POLICY "Hosts can update their sessions" ON sessions FOR UPDATE USING (
  auth.uid() = host_user_id
);

-- 누구나 세션에 참여 가능
CREATE POLICY "Anyone can join sessions" ON session_participants FOR INSERT WITH CHECK (true);

-- 본인만 참여 기록 삭제 가능 (나가기)
CREATE POLICY "Participants can leave sessions" ON session_participants FOR DELETE USING (true);

-- 세션 참가자만 큐에 추가 가능
CREATE POLICY "Session participants can add to queue" ON session_queue FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM session_participants 
    WHERE session_id = session_queue.session_id 
    AND left_at IS NULL
  )
);

-- 호스트는 모든 곡 삭제 가능, 게스트는 본인이 추가한 곡만 삭제 가능
CREATE POLICY "Users can remove tracks" ON session_queue FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM sessions 
    WHERE id = session_queue.session_id 
    AND auth.uid() = host_user_id
  )
  OR added_by_user_id = auth.uid()::text
);

-- 세션 참가자만 트랙 이력 추가 가능
CREATE POLICY "Participants can add track history" ON added_tracks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM session_participants 
    WHERE session_id = added_tracks.session_id 
    AND left_at IS NULL
  )
);

-- 호스트는 모든 트랙 이력 관리 가능
CREATE POLICY "Hosts can manage track history" ON added_tracks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM sessions 
    WHERE id = added_tracks.session_id 
    AND auth.uid() = host_user_id
  )
);
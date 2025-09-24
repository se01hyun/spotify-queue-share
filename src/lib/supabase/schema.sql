-- 세션 테이블
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 세션 참가자 테이블
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id TEXT,
  user_name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_host BOOLEAN DEFAULT false
);

-- 세션 큐 테이블
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(code);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_queue_session_id ON session_queue(session_id);
CREATE INDEX IF NOT EXISTS idx_session_queue_position ON session_queue(session_id, position);

-- RLS (Row Level Security) 정책
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_queue ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있도록 (세션 코드로 참여)
CREATE POLICY "Sessions are viewable by everyone" ON sessions FOR SELECT USING (true);
CREATE POLICY "Session participants are viewable by everyone" ON session_participants FOR SELECT USING (true);
CREATE POLICY "Session queue is viewable by everyone" ON session_queue FOR SELECT USING (true);

-- 세션 생성은 인증된 사용자만
CREATE POLICY "Authenticated users can create sessions" ON sessions FOR INSERT WITH CHECK (auth.uid()::text = host_id);

-- 호스트만 세션 수정 가능
CREATE POLICY "Hosts can update their sessions" ON sessions FOR UPDATE USING (auth.uid()::text = host_id);

-- 누구나 세션에 참여 가능
CREATE POLICY "Anyone can join sessions" ON session_participants FOR INSERT WITH CHECK (true);

-- 본인만 참여 기록 삭제 가능
CREATE POLICY "Users can leave sessions" ON session_participants FOR DELETE USING (auth.uid()::text = user_id OR user_id IS NULL);

-- 세션 참가자만 큐에 추가 가능
CREATE POLICY "Session participants can add to queue" ON session_queue FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM session_participants 
    WHERE session_id = session_queue.session_id 
    AND (user_id = auth.uid()::text OR user_id IS NULL)
  )
);

-- 본인이 추가한 곡만 삭제 가능 (호스트는 모든 곡 삭제 가능)
CREATE POLICY "Users can remove their own tracks or hosts can remove any" ON session_queue FOR DELETE USING (
  auth.uid()::text = added_by_user_id 
  OR added_by_user_id IS NULL
  OR EXISTS (
    SELECT 1 FROM sessions 
    WHERE id = session_queue.session_id 
    AND host_id = auth.uid()::text
  )
);







🎵 모두의 플레이리스트: 공동 음악 큐 서비스 PRD
1. 개요 (Introduction)
본 문서는 '모두의 플레이리스트' 서비스의 개발 요구사항을 정의합니다. 본 서비스는 다수의 사용자가 각자의 기기에서 Spotify Premium 계정을 통해 음악을 검색하고 현재 재생 중인 플레이리스트에 추가하여, 특정 호스트의 기기에서 해당 음악을 공동으로 감상할 수 있도록 돕는 웹 애플리케이션(PWA)입니다.
2. 문제 정의 (Problem Statement)
현재 음악 감상 환경에서는 여러 명이 함께 음악을 고르기 어렵습니다.
기기 의존성: 주로 한 사람의 휴대폰으로만 음악을 틀어, 다른 사람이 곡을 바꾸거나 추가하려면 기기를 건네받아야 하는 번거로움이 있습니다.
선곡의 비효율성: 여러 명이 모인 자리에서 원하는 곡을 추가하려면 계속 부탁하거나 기기를 돌려야 합니다.
중복 및 누락: 어떤 곡이 이미 추가되었는지 확인하기 어렵고, 이로 인해 중복 선곡 문제가 발생하며, 선곡 기록이 남지 않아 아쉬움이 있습니다.
소외감: 특정 한 사람에게 선곡이 전담되어, 모두가 함께 음악을 즐기는 재미가 줄어드는 경향이 있습니다.
3. 목표 (Goals)
쉬운 참여: 누구나 쉽게 자신의 기기에서 음악을 검색하고 큐에 추가할 수 있도록 하여 음악 선곡의 장벽을 낮춥니다.
실시간 협업: 모든 참가자가 실시간으로 플레이리스트를 공동으로 관리하고 완성하는 협업 경험을 제공합니다.
편의성 증대: 별도의 앱 설치 없이 웹앱(PWA) 형태로 접근 가능하게 하여 사용 편의성을 극대화합니다.
기록 및 분석: 선곡 이력을 데이터베이스에 저장하여 중복 선곡을 방지하고, 향후 사용자 행동 분석 및 맞춤형 기능 개발의 기반을 마련합니다.
4. 핵심 기능 (Key Features)
4.1. 호스트 기능
세션(방) 생성 및 관리:
Spotify Premium 계정으로 로그인 (OAuth 2.0).
새로운 음악 세션(방) 생성.
생성된 세션의 고유 링크 또는 QR 코드 생성 및 공유.
세션 시작/종료.
음악 재생 제어:
세션 내 추가된 음악의 현재 재생 큐 확인.
(선택 사항) 다음 곡 스킵, 이전 곡 재생, 일시 정지/재생 기능 (Spotify API를 통한 제어).
(선택 사항) 세션 내 게스트 활동(추가된 곡 등) 실시간 확인.
세션 기록 관리:
이전 세션의 플레이리스트 및 참여자 기록 확인.
4.2. 게스트 기능
세션 접속:
호스트가 공유한 링크 또는 QR 코드를 통해 세션에 접속 (로그인 불필요, 익명 참여 가능).
(선택 사항) 닉네임 설정으로 누가 곡을 추가했는지 표시.
음악 검색:
Spotify API를 통해 실시간으로 음악 검색 기능 제공.
검색 결과(곡명, 아티스트, 앨범 커버 등) 표시.
음악 큐 추가:
검색된 음악을 현재 세션의 재생 큐에 추가.
추가된 곡이 호스트의 Spotify 재생 큐에 실시간으로 반영되는 것 확인.
큐 확인:
현재 세션의 재생 큐 목록 실시간 확인 (추가된 곡, 순서 등).
(선택 사항) 자신이 추가한 곡 하이라이트.
4.3. 공통 기능
PWA (Progressive Web App):
웹 브라우저에서 접속 가능하며, 필요시 홈 화면에 추가하여 앱처럼 사용 가능.
오프라인 캐싱 (향후 고려).
실시간 동기화:
게스트가 곡을 추가하면 호스트 기기의 큐에 실시간 반영.
모든 참여자가 업데이트된 큐 목록을 실시간으로 확인.
중복 선곡 방지:
이미 큐에 추가된 곡은 추가 버튼 비활성화 또는 경고 메시지 표시.
(선택 사항) 최근 1시간 이내 재생된 곡은 추가 제한 등.
5. 사용자 경험 (User Experience - UX)
간결한 UI: 검색창, 검색 결과, 큐 목록 등 핵심 기능에 집중한 직관적인 인터페이스.
쉬운 접근성: 링크/QR 코드 공유를 통한 낮은 진입 장벽.
피드백: 곡 추가 시 성공/실패 여부에 대한 명확한 시각적/텍스트 피드백 제공.
모바일 최적화: PWA 특성을 살려 모바일 환경에서 사용하기 편리하도록 디자인.
6. 기술 스택 (Technical Stack)
프런트엔드 (웹앱):
프레임워크: React (or Vue.js, Svelte)
상태 관리: Recoil (or Zustand, Jotai)
스타일링: Tailwind CSS (or Styled Components, Emotion)
배포: Vercel (or Netlify)
백엔드 (서버):
언어/런타임: Node.js (with Express.js or Fastify)
배포: AWS Lambda (Serverless), Heroku, Render 등
데이터베이스 (DB):
플랫폼: Supabase (PostgreSQL 기반)
주요 테이블: sessions, users, added_tracks, session_participants
외부 API:
음악 서비스: Spotify Web API (Authentication, Search, Player Control (Add to Queue, Start/Resume Playback))
QR 코드 생성: (선택 사항) QR Code Generation Library/API
7. 데이터베이스 스키마 (Supabase Schema Draft)
sessions 테이블 (세션 정보)
id (UUID, PK)
host_user_id (UUID, FK to users.id)
session_name (Text, Nullable, Default: "My Music Session")
created_at (Timestamp with Time Zone, Default: now())
ended_at (Timestamp with Time Zone, Nullable)
join_code (Text, Unique, Short, e.g., "ABCD12") - QR/Link에 사용
spotify_access_token (Text, Encrypted, Sensitive)
spotify_refresh_token (Text, Encrypted, Sensitive)
spotify_expires_at (Timestamp with Time Zone)
host_spotify_device_id (Text, Nullable) - 호스트의 현재 재생 기기 ID
users 테이블 (호스트 사용자 정보)
id (UUID, PK, FK from auth.users)
spotify_id (Text, Unique)
display_name (Text, Nullable)
email (Text, Unique, Nullable)
profile_image_url (Text, Nullable)
created_at (Timestamp with Time Zone, Default: now())
added_tracks 테이블 (세션에 추가된 곡 기록)
id (UUID, PK)
session_id (UUID, FK to sessions.id)
spotify_track_id (Text)
track_name (Text)
artist_name (Text)
album_cover_url (Text, Nullable)
added_by_guest_id (UUID, FK to session_participants.id, Nullable, for anonymous users)
added_at (Timestamp with Time Zone, Default: now())
is_played (Boolean, Default: false)
play_order (Integer, Nullable) - 큐에서의 순서 (향후 정렬 기능 고려)
session_participants 테이블 (세션 참여자 기록)
id (UUID, PK)
session_id (UUID, FK to sessions.id)
guest_nickname (Text, Nullable, Default: "익명 참가자")
joined_at (Timestamp with Time Zone, Default: now())
left_at (Timestamp with Time Zone, Nullable)
(선택 사항) user_agent (Text), ip_address (Text) - 추적용
8. 서드파티 통합 (Third-Party Integrations)
Supabase:
Authentication (호스트 로그인)
Realtime (세션 큐 실시간 업데이트)
Database (모든 서비스 데이터 저장)
Storage (향후 이미지/오디오 파일 저장 시)
Spotify Web API:
OAuth 2.0 (사용자 인증)
Search API (곡 검색)
Player API (재생 큐 추가, 재생 제어)
9. 보안 및 개인정보 보호 (Security & Privacy)
Spotify 토큰 보안: Access/Refresh Token은 백엔드에서 안전하게 관리하며, DB 저장 시 반드시 암호화하여 저장합니다.
SSL/TLS: 모든 통신은 HTTPS를 통해 암호화됩니다.
개인정보 최소화: 게스트는 별도 로그인 없이 익명으로 참여할 수 있도록 하여 개인정보 수집을 최소화합니다. 호스트 정보는 Spotify 계정 연동에 필요한 최소한의 정보만 수집합니다.
접근 제어: 각 세션은 고유한 join_code를 통해서만 접근 가능하도록 합니다.
10. 향후 확장 가능성 (Future Enhancements)
세션 내 채팅 기능: 게스트와 호스트 간 간단한 메시지 교환.
추천 시스템: 세션 기록을 바탕으로 음악 추천.
테마 및 분위기: 세션에 테마(드라이브, 파티 등) 설정 기능.
투표 기능: 다음 곡에 대한 투표 기능 추가.
프리미엄 기능: 광고 제거, 추가 통계 기능 등.
다국어 지원: 글로벌 사용자 고려.

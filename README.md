# 🎵 Spotify Queue Share

드라이브, 여행, 파티에서 모두가 함께 음악을 즐길 수 있는 **실시간 음악 큐 공유 웹앱**입니다.  
링크나 QR 코드로 접속해 누구나 노래를 검색하고 추가할 수 있으며, 별도의 앱 설치나 로그인 없이 바로 참여할 수 있습니다.  

A collaborative real-time music queue web app for drives, trips, and parties.  
Anyone can join via **link or QR code** to search, add, and manage songs — no login or app installation required.  

---

## ✨ Features (기능)
- 📱 **실시간 음악 큐 / Real-time music queue**  
  여러 사용자가 동시에 곡을 추가할 수 있음
- 🎶 **Spotify 연동 / Spotify integration**  
  노래 정보를 가져오고 중복 추가를 방지
- 🔍 **검색 및 추가 / Search & add**  
  제목이나 가수명으로 쉽게 검색 후 추가
- 🗑 **큐 관리 / Manage queue**  
  호스트가 노래 삭제, 순서 변경 가능
- 🚗 **드라이브 & 파티 최적화 / Perfect for drives & parties**  

---

## 🛠 Tech Stack (기술 스택)
- **Frontend:** Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS  
- **Backend:** Next.js API Routes (Serverless Functions)  
- **Database:** Supabase (PostgreSQL)  
- **Authentication:** NextAuth.js (Spotify OAuth Provider)  
- **Real-time:** Supabase Realtime  
- **Other:** Spotify Web API, PWA (Progressive Web App)  

---

## 🚀 Getting Started (시작하기)

**Clone the repo / 저장소 클론**
```bash
git clone https://github.com/se01hyun/spotify-queue-share.git
cd spotify-queue-share
```

### 🔧 Environment Setup (환경 설정)

1. **Copy environment template / 환경 설정 템플릿 복사**
```bash
cp .env.example .env.local
```

2. **Get API Keys / API 키 획득**

   **Supabase Keys:**
   - Visit [Supabase Dashboard](https://supabase.com/dashboard/project/ikhqonotdjhstxnrcvld/settings/api)
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

   **Spotify Keys:**
   - Visit [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications)
   - Create new app and get `Client ID` → `SPOTIFY_CLIENT_ID`
   - Get `Client Secret` → `SPOTIFY_CLIENT_SECRET`

   **NextAuth Secret:**
   ```bash
   openssl rand -base64 32
   ```
   Copy generated value → `NEXTAUTH_SECRET`

3. **Install dependencies / 의존성 설치**
```bash
pnpm install
```

4. **Run development server / 개발 서버 실행**
```bash
pnpm dev
```

Visit `http://localhost:3003` to see the app.

---

## 🚀 Deployment (배포)

This project is configured for deployment on **Vercel**:

```bash
pnpm build
```

The Next.js App Router and API Routes will be automatically deployed as serverless functions on Vercel.

**Environment Variables in Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

---

## 📝 Notes (참고사항)

- **Port:** Development server runs on port `3003` (see `package.json`)
- **Database:** Uses Supabase for PostgreSQL database and real-time subscriptions
- **Authentication:** NextAuth.js handles Spotify OAuth authentication
- **Real-time Sync:** Supabase Realtime is used for live queue updates
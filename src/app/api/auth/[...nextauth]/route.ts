import NextAuth, { AuthOptions } from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'
import { SupabaseAdapter } from '@auth/supabase-adapter'

// Spotify OAuth scopes for playlist management
const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'streaming'
].join(' ')

// Debug environment variables
console.log('Environment check:', {
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? 'Set' : 'Missing',
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? 'Set' : 'Missing',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Set' : 'Missing'
})

// 세션 설정을 더 안정적으로 만들기
const sessionConfig = {
  strategy: 'jwt' as const,
  maxAge: 30 * 24 * 60 * 60, // 30일
  updateAge: 24 * 60 * 60, // 24시간마다 업데이트
}

// 토큰 갱신 함수
async function refreshAccessToken(token: any) {
  try {
    console.log("=== Starting token refresh ===");
    console.log("Refresh token exists:", !!token.refreshToken);
    console.log("Client ID exists:", !!process.env.SPOTIFY_CLIENT_ID);
    console.log("Client Secret exists:", !!process.env.SPOTIFY_CLIENT_SECRET);
    
    if (!token.refreshToken) {
      console.error("No refresh token available");
      return {
        ...token,
        error: "NoRefreshToken",
      }
    }
    
    const url = "https://accounts.spotify.com/api/token"
    
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
      method: "POST",
    })

    console.log("Refresh response status:", response.status);
    const refreshedTokens = await response.json()
    console.log("Refresh response data:", refreshedTokens);

    if (!response.ok) {
      console.error("Token refresh failed:", {
        status: response.status,
        statusText: response.statusText,
        error: refreshedTokens
      });
      
      // Refresh token이 만료된 경우
      if (response.status === 400 && refreshedTokens.error === 'invalid_grant') {
        console.error("Refresh token expired, user needs to re-authenticate");
        return {
          ...token,
          error: "RefreshTokenExpired",
        }
      }
      
      throw refreshedTokens
    }

    console.log("Token refreshed successfully");

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Date.now() / 1000 + refreshedTokens.expires_in,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
      // Clear any previous errors
      error: undefined,
    }
  } catch (error) {
    console.error("Error refreshing access token", error)

    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}

export const authOptions: AuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
        },
      },
    }),
  ],
  session: sessionConfig,
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  // adapter: SupabaseAdapter({
  //   url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  // }),
  callbacks: {
    async session({ session, token }) {
      if (token?.accessToken) {
        session.accessToken = token.accessToken as string
      }
      if (token?.refreshToken) {
        session.refreshToken = token.refreshToken as string
      }
      if (token?.sub) {
        session.user.id = token.sub
      }
      if (token?.error) {
        (session as any).error = token.error as string
      }
      return session
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        // Clear any previous errors
        delete token.error
      }

      // Store Spotify user data
      if (profile) {
        token.spotifyId = profile.id
        token.displayName = profile.display_name
        token.email = profile.email
        token.profileImageUrl = profile.images?.[0]?.url
      }

      // 토큰 갱신 로직 - 더 관대하게 설정
      if (token.expiresAt && token.refreshToken) {
        const currentTime = Date.now()
        const tokenExpiryTime = token.expiresAt * 1000
        const timeUntilExpiry = tokenExpiryTime - currentTime

        // 토큰이 만료되었거나 10분 이내에 만료될 예정인 경우
        if (timeUntilExpiry < 10 * 60 * 1000) {
          console.log('Token expiring soon, refreshing...')
          return await refreshAccessToken(token)
        }
      }
      
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

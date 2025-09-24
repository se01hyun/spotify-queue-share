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
      return session
    },
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and refresh_token to the token right after signin
      console.log("--- JWT Callback ---");
      console.log("Account:", account);
      console.log("Profile:", profile);
      console.log("Initial Token:", token);

      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }

      // Store Spotify user data
      if (profile) {
        token.spotifyId = profile.id
        token.displayName = profile.display_name
        token.email = profile.email
        token.profileImageUrl = profile.images?.[0]?.url
      }

      console.log("Final Token:", token);
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt' as const,
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    refreshToken?: string
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      spotifyId?: string
      displayName?: string
    }
  }

  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    spotifyId?: string
    displayName?: string
    profileImageUrl?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    spotifyId?: string
    displayName?: string
    profileImageUrl?: string
  }
}

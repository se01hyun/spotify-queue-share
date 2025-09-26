import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    refreshToken?: string
    error?: string
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
    error?: string
  }

  interface Profile {
    id: string
    display_name: string
    email: string
    images?: Array<{
      url: string
      height: number | null
      width: number | null
    }>
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
    error?: string
  }
}

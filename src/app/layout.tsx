import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { getServerSession } from 'next-auth/next'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { QueueProvider } from '@/contexts/QueueContext'
import { SessionProvider as SessionContextProvider } from '@/contexts/SessionContext'
import './globals.css'
import HomeButton from '@/components/HomeButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SpotifySync - Collaborative Music Queue',
  description: 'Real-time music queue sharing web app for drives, trips, and parties',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  return (
    <html lang="ko">
      <body className={inter.className}>
        <SessionProvider session={session}>
          <SessionContextProvider>
            <QueueProvider>
              <HomeButton />
              {children}
            </QueueProvider>
          </SessionContextProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

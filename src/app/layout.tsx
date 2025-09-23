import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { getServerSession } from 'next-auth/next'
import { SessionProvider } from '@/components/providers/SessionProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '모두의 플레이리스트 - 공동 음악 큐 서비스',
  description: '드라이브, 여행, 파티에서 모두가 함께 음악을 즐길 수 있는 실시간 음악 큐 공유 웹앱',
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
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}

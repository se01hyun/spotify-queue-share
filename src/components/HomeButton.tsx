'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

export default function HomeButton() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Hide only on the true landing screen (/?welcome=1)
  if (pathname === '/' && searchParams.get('welcome') === '1') {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Link
        href="/?welcome=1"
        className="inline-flex items-center justify-center w-10 h-10 transition-opacity hover:opacity-80"
        aria-label="홈으로"
      >
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" />
        </svg>
      </Link>
    </div>
  )
}



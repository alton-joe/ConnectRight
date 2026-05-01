import type { Metadata } from 'next'
import './globals.css'
import GlobalHeader from '@/components/layout/GlobalHeader'
import Providers from '@/components/layout/Providers'

export const metadata: Metadata = {
  title: 'ConnectRight',
  description: 'Find the right match. Connect and chat in real time.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-black text-white antialiased">
        <Providers>
          <GlobalHeader />
          {children}
        </Providers>
      </body>
    </html>
  )
}

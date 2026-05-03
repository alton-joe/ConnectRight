import type { Metadata, Viewport } from 'next'
import './globals.css'
import GlobalHeader from '@/components/layout/GlobalHeader'
import Providers from '@/components/layout/Providers'
import PWARegistration from '@/components/layout/PWARegistration'

export const metadata: Metadata = {
  title: 'ConnectRight',
  description: 'Find the right match. Connect and chat in real time.',
  manifest: '/manifest.json',
  applicationName: 'ConnectRight',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ConnectRight',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
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
        <PWARegistration />
      </body>
    </html>
  )
}

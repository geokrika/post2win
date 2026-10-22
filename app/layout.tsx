import './globals.css'
import React from 'react'
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#020617',
}

export const metadata: Metadata = {
  title: 'NEXUS UGC Jackpot',
  description: 'NEXUS Progressive UGC Jackpot Platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NEXUS Jackpot',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="el" translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body suppressHydrationWarning className="bg-slate-950 min-h-screen text-white antialiased">
        {children}
      </body>
    </html>
  )
}
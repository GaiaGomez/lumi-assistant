// ============================================================
// ROOT LAYOUT — envuelve TODA la app
// Aquí van: fuentes, metadata global, configuración PWA para iPad
// ============================================================

import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

// metadata: lo que ve el navegador (tab title, descripción, PWA config)
export const metadata: Metadata = {
  title: 'Lu Assistant',
  description: 'Tu asistente clínico personal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lu Assistant',
  },
}

// viewport: desactiva zoom en iPad — la app se controla con touch
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#7c6f64',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <head>
        {/* Estas meta tags hacen que Safari en iPad trate la app como nativa */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
      </head>
      <body className={`${geist.className} h-full antialiased bg-stone-50 text-stone-800`}>
        {children}
      </body>
    </html>
  )
}

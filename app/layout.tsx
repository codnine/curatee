import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import './crm.css'
import { SiteHeader, CookieBanner, SiteFooter } from '@/components/site-chrome'
import { AuthFlowProvider } from '@/components/auth-flow'

export const metadata: Metadata = {
  title: 'Curate AI — Intelligent AI chatbot',
  description: 'An approachable AI chatbot for everyday questions, business ideas, and getting started.',
  icons: { icon: '/mark.svg' },
}

export const viewport: Viewport = { themeColor: '#0b0b0b', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ClerkProvider><html lang="en"><body><AuthFlowProvider><SiteHeader />{children}<SiteFooter /><CookieBanner /></AuthFlowProvider></body></html></ClerkProvider>
}

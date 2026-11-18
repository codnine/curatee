import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import './crm.css'
import { SiteHeader, CookieBanner, SiteFooter } from '@/components/site-chrome'
import { AuthFlowProvider } from '@/components/auth-flow'

export const metadata: Metadata = {
  title: 'Curate AI — Something great is curating',
  description: 'A new chapter is taking shape. Curate AI will be back soon.',
  icons: { icon: '/mark.svg' },
}

export const viewport: Viewport = { themeColor: '#000000', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ClerkProvider><html lang="en"><body><AuthFlowProvider><SiteHeader />{children}<SiteFooter /><CookieBanner /></AuthFlowProvider></body></html></ClerkProvider>
}

import type { Metadata } from 'next'
import './globals.css'
import { SiteHeader, CookieBanner, SiteFooter } from '@/components/site-chrome'

export const metadata: Metadata = {
  title: 'CURATE AI — Branding for brands just getting started',
  description: 'Real branding within reach of every new and small brand. Made by JACK IT in Colombo, Sri Lanka.',
  icons: { icon: '/mark.svg' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader />{children}<SiteFooter /><CookieBanner /></body></html>
}

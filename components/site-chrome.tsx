'use client'
import Link from 'next/link'
import { useState } from 'react'
import { AuthFlowLink } from '@/components/auth-flow'

export function SiteHeader() { return <header className="site-header"><Link href="/" className="wordmark"><span>CURATE AI</span></Link><nav><Link href="/branding">Branding</Link><Link href="/portfolio">Portfolio</Link><Link href="/journal">Journal</Link><AuthFlowLink className="nav-account" href="/account">My account</AuthFlowLink><AuthFlowLink className="nav-book" href="/book">Book a call</AuthFlowLink></nav></header> }
export function SiteFooter() { return <footer><div><span className="wordmark footer-mark"><span>CURATE AI</span></span><p>Branding for brands just getting started.<br />Colombo, Sri Lanka.</p></div><div className="footer-links"><Link href="/about">About</Link><Link href="/branding">Branding</Link><Link href="/book">Book a call</Link><Link href="/account">My account</Link><Link href="/privacy">Privacy</Link></div><div className="footer-bottom">© {new Date().getFullYear()} CURATE AI</div></footer> }
export function CookieBanner() { const [visible, setVisible] = useState(true); if (!visible) return null; return <aside className="cookie"><p>We use essential cookies to keep your account and session working securely.</p><div><button onClick={() => setVisible(false)} className="button">Accept all</button><button onClick={() => setVisible(false)} className="text-button">Essential only</button></div></aside> }

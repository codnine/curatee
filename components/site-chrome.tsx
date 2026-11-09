'use client'
import Link from 'next/link'
import { useState } from 'react'

export function SiteHeader() { return <header className="site-header"><Link href="/" className="wordmark"><span>CURATE AI</span><small>BY JACK IT</small></Link><nav><Link href="/branding">Branding</Link><Link href="/portfolio">Portfolio</Link><Link href="/journal">Journal</Link><Link className="nav-book" href="/book">Book a call</Link></nav></header> }
export function SiteFooter() { return <footer><div><span className="wordmark footer-mark"><span>CURATE AI</span><small>BY JACK IT</small></span><p>Branding for brands just getting started.<br />Colombo, Sri Lanka.</p></div><div className="footer-links"><Link href="/about">About</Link><Link href="/branding">Branding</Link><Link href="/book">Book a call</Link></div><div className="footer-bottom">© {new Date().getFullYear()} CURATE AI <span>Made by JACK IT</span></div></footer> }
export function CookieBanner() { const [visible, setVisible] = useState(true); if (!visible) return null; return <aside className="cookie"><p>We use essential cookies to make the site work, and a little analytics to see what&apos;s useful.</p><div><button onClick={() => setVisible(false)} className="button">Accept all</button><button onClick={() => setVisible(false)} className="text-button">Essential only</button></div></aside> }

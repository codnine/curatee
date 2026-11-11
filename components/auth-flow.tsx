'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useSignIn, useSignUp, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type AuthMode = 'signup' | 'login'
type AuthRequest = { mode: AuthMode; returnTo: string; sourcePage: string }
type AuthContextValue = { openAuth: (mode?: AuthMode, returnTo?: string, sourcePage?: string) => void }
const AuthContext = createContext<AuthContextValue | null>(null)

function safeReturnTo(value: string) {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/account'
}

export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useUser()
  const [request, setRequest] = useState<AuthRequest | null>(null)
  const openAuth = useCallback((mode: AuthMode = 'signup', returnTo = '/account', sourcePage = '/') => {
    setRequest({ mode, returnTo: safeReturnTo(returnTo), sourcePage })
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    const params = new URLSearchParams(window.location.search)
    const mode = params.get('auth')
    if (mode === 'signup' || mode === 'login') {
      const returnTo = safeReturnTo(params.get('returnTo') ?? '/account')
      window.history.replaceState(null, '', window.location.pathname)
      if (isSignedIn) {
        router.replace(returnTo)
        router.refresh()
      } else {
        openAuth(mode, returnTo, params.get('sourcePage') ?? window.location.pathname)
      }
    }
  }, [isLoaded, isSignedIn, openAuth, router])

  const close = useCallback(() => setRequest(null), [])
  const complete = useCallback((destination: string) => {
    setRequest(null)
    router.replace(safeReturnTo(destination))
    router.refresh()
  }, [router])

  return <AuthContext.Provider value={{ openAuth }}>
    {children}
    {request && <AuthDialog request={request} close={close} complete={complete} isLoaded={isLoaded} isSignedIn={Boolean(isSignedIn)} />}
  </AuthContext.Provider>
}

function useAuthFlow() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthFlowProvider is missing.')
  return value
}

export function AuthFlowLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  const { openAuth } = useAuthFlow()
  const { isLoaded, isSignedIn } = useUser()
  if (isLoaded && isSignedIn) return <Link href={href} className={className}>{children}</Link>
  return <button type="button" className={`auth-nav-button ${className}`} onClick={() => openAuth('signup', href, window.location.pathname)}>{children}</button>
}

export function AuthFlowButton({ href, children, className = '', mode = 'signup' }: { href: string; children: ReactNode; className?: string; mode?: AuthMode }) {
  const { openAuth } = useAuthFlow()
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  return <button type="button" className={className} onClick={() => {
    if (isLoaded && isSignedIn) router.push(href)
    else openAuth(mode, href, window.location.pathname)
  }}>{children}</button>
}

type ProfileDraft = {
  fullName: string
  phone: string
  businessName: string
  businessDescription: string
  source: string
  consent: boolean
  website: string
}

function AuthDialog({ request, close, complete, isLoaded, isSignedIn }: {
  request: AuthRequest
  close: () => void
  complete: (destination: string) => void
  isLoaded: boolean
  isSignedIn: boolean
}) {
  const { signUp } = useSignUp()
  const { signIn } = useSignIn()
  const [mode, setMode] = useState<AuthMode>(request.mode)
  const [stage, setStage] = useState<'details' | 'verify'>('details')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [login, setLogin] = useState({ email: '', password: '' })
  const [profile, setProfile] = useState<ProfileDraft>({ fullName: '', phone: '', businessName: '', businessDescription: '', source: '', consent: false, website: '' })
  const dialogRef = useRef<HTMLDivElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => { emailRef.current?.focus() }, [mode, stage])
  const finishSignUp = async () => {
    const response = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, sourcePage: request.sourcePage }),
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error ?? 'We could not save your profile.')
    complete(request.returnTo)
  }

  const submitSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isLoaded || !signUp) return
    setBusy(true)
    setError('')
    try {
      const [firstName, ...lastParts] = profile.fullName.trim().split(/\s+/)
      const result = await signUp.password({
        emailAddress: login.email,
        password: login.password,
        firstName,
        lastName: lastParts.join(' ') || firstName,
      })
      if (result.error) throw new Error(result.error.message)
      if (signUp.status === 'complete') {
        await signUp.finalize()
        await finishSignUp()
      } else {
        await signUp.verifications.sendEmailCode()
        setStage('verify')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not create your account. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const verifySignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isLoaded || !signUp) return
    setBusy(true)
    setError('')
    try {
      const result = await signUp.verifications.verifyEmailCode({ code: code.trim() })
      if (result.error) throw new Error(result.error.message)
      if (signUp.status !== 'complete') throw new Error('That code did not finish account verification. Please check it and try again.')
      await signUp.finalize()
      await finishSignUp()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not verify that code.')
    } finally {
      setBusy(false)
    }
  }

  const submitSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isLoaded || !signIn) return
    setBusy(true)
    setError('')
    try {
      const result = await signIn.password({ emailAddress: login.email, password: login.password })
      if (result.error) throw new Error(result.error.message)
      if (signIn.status !== 'complete') throw new Error('This account needs another verification step. Contact the Curate AI team for help signing in.')
      await signIn.finalize()
      complete(request.returnTo)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not sign you in. Check your details and try again.')
    } finally {
      setBusy(false)
    }
  }

  const onDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') close()
    if (event.key === 'Tab' && dialogRef.current) {
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
  }

  if (!isLoaded || isSignedIn) return null
  return <div className="auth-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <div className="auth-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-description" onKeyDown={onDialogKeyDown}>
      <div className="auth-dialog-top"><span className="eyebrow">CURATE AI / YOUR ACCOUNT</span><button type="button" className="auth-close" aria-label="Close account dialog" onClick={close}>×</button></div>
      <h2 id="auth-title" className="auth-title">{stage === 'verify' ? 'CHECK YOUR EMAIL.' : mode === 'signup' ? 'LET’S GET TO KNOW YOU.' : 'WELCOME BACK.'}</h2>
      <p id="auth-description" className="auth-description">{stage === 'verify' ? `Enter the verification code sent to ${login.email}.` : mode === 'signup' ? 'Create your account to request a package, get a quote, or book a call.' : 'Sign in to continue to your Curate AI account.'}</p>

      {stage !== 'verify' && <div className="auth-tabs" role="tablist" aria-label="Account options">
        <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError('') }}>Create account</button>
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError('') }}>Log in</button>
      </div>}

      {stage === 'verify' ? <form className="crm-form" onSubmit={verifySignUp}>
        <label className="crm-field"><span>Email verification code</span><input ref={emailRef} className="crm-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify email'}</button>
        <button type="button" className="auth-back" onClick={() => { setStage('details'); setError('') }}>Back to details</button>
      </form> : mode === 'login' ? <form className="crm-form" onSubmit={submitSignIn}>
        <label className="crm-field"><span>Email address</span><input ref={emailRef} className="crm-input" type="email" autoComplete="email" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} required /></label>
        <label className="crm-field"><span>Password</span><input className="crm-input" type="password" autoComplete="current-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} required /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
      </form> : <form className="crm-form" onSubmit={submitSignUp}>
        <label className="crm-field"><span>Full name</span><input className="crm-input" autoComplete="name" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} required minLength={2} maxLength={120} /></label>
        <div className="crm-field-row">
          <label className="crm-field"><span>Email address</span><input ref={emailRef} className="crm-input" type="email" autoComplete="email" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} required /></label>
          <label className="crm-field"><span>Phone number</span><input className="crm-input" type="tel" autoComplete="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} required minLength={5} maxLength={40} /></label>
        </div>
        <label className="crm-field"><span>Password</span><input className="crm-input" type="password" autoComplete="new-password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} required minLength={8} /></label>
        <label className="crm-field"><span>Business name</span><input className="crm-input" autoComplete="organization" value={profile.businessName} onChange={(event) => setProfile({ ...profile, businessName: event.target.value })} required maxLength={120} /></label>
        <label className="crm-field"><span>What does your business do?</span><textarea className="crm-input crm-textarea" value={profile.businessDescription} onChange={(event) => setProfile({ ...profile, businessDescription: event.target.value })} required minLength={10} maxLength={2000} rows={3} /></label>
        <label className="crm-field"><span>How did you hear about us?</span><input className="crm-input" value={profile.source} onChange={(event) => setProfile({ ...profile, source: event.target.value })} required maxLength={120} /></label>
        <label className="crm-consent"><input type="checkbox" checked={profile.consent} onChange={(event) => setProfile({ ...profile, consent: event.target.checked })} required /><span>I agree to the <Link href="/privacy" target="_blank">Privacy Policy</Link> and consent to Curate AI using these details to manage my account and requests.</span></label>
        <div className="crm-honeypot" aria-hidden="true"><label>Leave this field empty<input tabIndex={-1} autoComplete="off" name="website" value={profile.website} onChange={(event) => setProfile({ ...profile, website: event.target.value })} /></label></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="auth-legal">Your password is handled securely by Clerk. We never store it in the Curate AI database.</p>
      </form>}
    </div>
  </div>
}

'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

function useSubmission() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return { busy, setBusy, error, setError }
}

export function RequestForm({ packageSlug, packageName, type, sourcePage }: { packageSlug: string; packageName: string; type: 'package' | 'quote'; sourcePage: string }) {
  const { busy, setBusy, error, setError } = useSubmission()
  const [brief, setBrief] = useState('')
  const [website, setWebsite] = useState('')
  const [done, setDone] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ package: packageSlug, details: type, brief, sourcePage, website }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'We could not save this request.')
      setEmailSent(Boolean(result.emailSent))
      setDone(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not save this request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) return <div className="form-success" role="status"><span className="eyebrow">REQUEST RECEIVED</span><h2>We’ll take it from here.</h2><p>{emailSent ? 'Your request is safely saved and a confirmation email has been sent. Track its status and updates from your account.' : 'Your request is safely saved. We could not send the confirmation email right now, but you can track its status and updates from your account.'}</p><Link className="button" href="/account">View my account</Link></div>
  return <form className="crm-form wide-form" onSubmit={submit}>
    <div className="request-summary"><span className="eyebrow">{type === 'quote' ? 'QUOTE REQUEST' : 'PACKAGE REQUEST'}</span><strong>{packageName}</strong><span className="request-summary-note">Your details are linked to your registered account.</span></div>
    <label className="crm-field"><span>{type === 'quote' ? 'What would you like a quote for?' : 'Tell us what you need'}</span><textarea className="crm-input crm-textarea" rows={7} minLength={10} maxLength={3000} required value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="A few details about your business, goals, or the project would help us get started." /></label>
    <div className="crm-honeypot" aria-hidden="true"><label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="submit" className="button" disabled={busy}>{busy ? 'Sending…' : type === 'quote' ? 'Request a quote' : 'Send package request'}</button>
  </form>
}

const appointmentTimes = Array.from({ length: 17 }, (_, index) => {
  const minutes = 9 * 60 + index * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

function sriLankaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function BookingForm() {
  const { busy, setBusy, error, setError } = useSubmission()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [notes, setNotes] = useState('')
  const [website, setWebsite] = useState('')
  const [message, setMessage] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, time, notes, sourcePage: '/book', website }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'We could not save this call request.')
      setMessage(result.emailSent ? 'Your request is saved. A confirmation has been sent to your email.' : 'Your request is safely saved. The confirmation email may be delayed; you can track the booking in your account.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not save this call request. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (message) return <div className="form-success" role="status"><span className="eyebrow">CALL REQUESTED</span><h2>We’ll be in touch.</h2><p>{message}</p><Link className="button" href="/account">View my account</Link></div>
  return <form className="crm-form wide-form" onSubmit={submit}>
    <p className="form-intro">Choose a convenient time for a 30-minute call. All times are shown in Sri Lanka time.</p>
    <div className="crm-field-row">
      <label className="crm-field"><span>Date</span><input className="crm-input" type="date" min={sriLankaToday()} value={date} onChange={(event) => { const value = event.target.value; setDate(value); setError(value && new Date(`${value}T00:00:00Z`).getUTCDay() === 0 ? 'Calls are available Monday to Saturday.' : '') }} required /></label>
      <label className="crm-field"><span>Time</span><select className="crm-input" value={time} onChange={(event) => setTime(event.target.value)} required>{appointmentTimes.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
    </div>
    <label className="crm-field"><span>Anything you’d like us to know? <small>Optional</small></span><textarea className="crm-input crm-textarea" rows={4} maxLength={1500} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    <div className="crm-honeypot" aria-hidden="true"><label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="submit" className="button" disabled={busy}>{busy ? 'Booking…' : 'Request this time'}</button>
  </form>
}

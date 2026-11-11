'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export function CompleteProfileForm({ returnTo }: { returnTo: string }) {
  const router = useRouter()
  const [fields, setFields] = useState({ fullName: '', phone: '', businessName: '', businessDescription: '', source: '', consent: false })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, sourcePage: '/complete-profile', website: '' }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'We could not save your profile.')
      router.replace(returnTo)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not save your profile.')
    } finally {
      setBusy(false)
    }
  }

  return <form className="crm-form wide-form" onSubmit={submit}>
    <label className="crm-field"><span>Full name</span><input className="crm-input" autoComplete="name" value={fields.fullName} onChange={(event) => setFields({ ...fields, fullName: event.target.value })} required minLength={2} /></label>
    <div className="crm-field-row"><label className="crm-field"><span>Phone number</span><input className="crm-input" type="tel" autoComplete="tel" value={fields.phone} onChange={(event) => setFields({ ...fields, phone: event.target.value })} required minLength={5} /></label><label className="crm-field"><span>Business name</span><input className="crm-input" autoComplete="organization" value={fields.businessName} onChange={(event) => setFields({ ...fields, businessName: event.target.value })} required /></label></div>
    <label className="crm-field"><span>What does your business do?</span><textarea className="crm-input crm-textarea" rows={3} minLength={10} value={fields.businessDescription} onChange={(event) => setFields({ ...fields, businessDescription: event.target.value })} required /></label>
    <label className="crm-field"><span>How did you hear about us?</span><input className="crm-input" value={fields.source} onChange={(event) => setFields({ ...fields, source: event.target.value })} required /></label>
    <label className="crm-consent"><input type="checkbox" checked={fields.consent} onChange={(event) => setFields({ ...fields, consent: event.target.checked })} required /><span>I agree to the <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a> and consent to Curate AI using these details to manage my account and requests.</span></label>
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
  </form>
}

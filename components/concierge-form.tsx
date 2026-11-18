'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'

type ConciergeResponse = {
  reply?: unknown
  error?: unknown
}

export function ConciergeForm() {
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const message = prompt.trim()
    if (!message || isLoading) return

    setIsLoading(true)
    setAnswer('')
    setError('')

    try {
      const response = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const result = (await response.json().catch(() => null)) as ConciergeResponse | null

      if (!response.ok) {
        throw new Error(typeof result?.error === 'string' ? result.error : 'The concierge could not respond. Please try again.')
      }

      if (typeof result?.reply !== 'string' || !result.reply.trim()) {
        throw new Error('The concierge could not respond. Please try again.')
      }

      setAnswer(result.reply.trim())
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'The concierge could not respond. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="concierge-widget">
      <form className="concierge" onSubmit={handleSubmit} aria-busy={isLoading}>
        <textarea
          aria-label="Tell Curate AI about your business or event"
          maxLength={1200}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="I run a small bakery and nobody finds us online..."
          rows={2}
          value={prompt}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !prompt.trim()}>
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
      <p className="concierge-note">Your message is sent to an AI service to generate a suggestion. Please don&apos;t include confidential details. <Link href="/privacy">Privacy policy</Link>.</p>

      {isLoading && <p className="concierge-message" role="status">One moment—I&apos;m thinking through what fits best.</p>}
      {error && <p className="concierge-message concierge-error" role="alert">{error}</p>}
      {answer && (
        <section className="concierge-result" aria-atomic="true" aria-live="polite">
          <span className="eyebrow">A CURATED DIRECTION</span>
          <p>{answer}</p>
          <div className="concierge-links">
            <Link href="/branding">Explore packages</Link>
            <Link href="/book">Talk to the team</Link>
          </div>
        </section>
      )}
    </div>
  )
}

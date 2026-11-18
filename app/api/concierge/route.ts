import { generateText } from 'ai'
import { z } from 'zod'
import { checkFormRateLimit } from '@/lib/forms'
import { hasSameOrigin } from '@/lib/http'
import { packages } from '@/lib/branding'

const conciergeRequestSchema = z.object({
  message: z.string().trim().min(3).max(1200),
})

const packageContext = Object.values(packages)
  .map((item) => `- ${item.name}: ${item.summary} Includes: ${item.benefits.join(', ')}.`)
  .join('\n')

const systemPrompt = `You are Curate AI's brand concierge, helping small businesses and early-stage brands in Sri Lanka find a useful next step. Be warm, practical, and concise.

Current branding packages:
${packageContext}

Recommend a package only when the visitor's needs fit the listed details. If you need more context, ask one clear follow-up question. Never invent prices, timelines, deliverables, guarantees, or availability. If someone asks about event or PR services not described here, say the team can discuss their needs on a call rather than claiming a service is available. Do not claim to book appointments or submit requests. Keep replies to 2–4 short sentences and point visitors to the package or call links on the page when useful.`

export const maxDuration = 30

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return Response.json({ error: 'Request origin is not allowed.' }, { status: 403 })
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0)

  if (Number.isFinite(contentLength) && contentLength > 8192) {
    return Response.json({ error: 'Please shorten your message and try again.' }, { status: 413 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Please enter a few details about your business or event.' }, { status: 400 })
  }

  const parsed = conciergeRequestSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: 'Please enter a few details about your business or event.' }, { status: 400 })
  }

  if (!await checkFormRateLimit('concierge', 8)) {
    return Response.json({ error: 'Please wait a minute before asking again.' }, { status: 429 })
  }

  try {
    const { text } = await generateText({
      model: 'openai/gpt-5.4-mini',
      system: systemPrompt,
      prompt: parsed.data.message,
      maxOutputTokens: 240,
    })

    if (!text.trim()) {
      return Response.json({ error: 'I could not put together a suggestion. Please try again.' }, { status: 503 })
    }

    return Response.json({ reply: text.trim() })
  } catch (error) {
    console.error('[v0] Concierge response generation failed', error)
    return Response.json({ error: 'The concierge is unavailable right now. Please try again in a moment.' }, { status: 503 })
  }
}

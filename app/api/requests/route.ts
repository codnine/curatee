import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profiles, requestUpdates, requests, sheetSyncOutbox } from '@/lib/db/schema'
import { checkFormRateLimit, cleanSourcePage } from '@/lib/forms'
import { hasSameOrigin, honeypotTriggered } from '@/lib/http'
import { flushSheetOutbox } from '@/lib/sheets'
import { packages } from '@/lib/branding'

const requestInput = z.object({
  package: z.enum(['starter', 'basic', 'premium']),
  details: z.enum(['package', 'quote']),
  brief: z.string().trim().min(10).max(3000),
  sourcePage: z.string().optional(),
  website: z.string().optional(),
})

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 })
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in to submit a request.' }, { status: 401 })

  try {
    const input = requestInput.safeParse(await request.json())
    if (!input.success) return NextResponse.json({ error: 'Check the package and request details.' }, { status: 400 })
    if (honeypotTriggered(input.data.website)) return NextResponse.json({ ok: true })
    if (!await checkFormRateLimit('request', 6)) return NextResponse.json({ error: 'Please wait a minute before sending another request.' }, { status: 429 })
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
    if (!profile) return NextResponse.json({ error: 'Complete your profile before requesting a package.' }, { status: 409 })

    const packageName = packages[input.data.package].name
    const sourcePage = cleanSourcePage(input.data.sourcePage, '/branding')
    const createdAt = new Date()
    const [created] = await db.transaction(async (tx) => {
      const [item] = await tx.insert(requests).values({
        userId,
        package: input.data.package,
        details: input.data.details === 'quote' ? 'Quote request' : 'Package request',
        brief: input.data.brief,
        status: 'received',
        sourcePage,
        updatedAt: createdAt,
      }).returning()
      await tx.insert(requestUpdates).values({ userId, requestId: item.id, status: 'received', note: 'Your request has been received.' })
      await tx.insert(sheetSyncOutbox).values({
        userId,
        eventType: 'request',
        payload: { timestamp: createdAt.toISOString(), fullName: profile.fullName, phone: profile.phone, email: profile.email, business: profile.businessName, package: packageName, sourcePage, notes: input.data.brief, status: 'Received', recordId: item.id },
      })
      return [item]
    })

    try { await flushSheetOutbox(userId) } catch { /* The database outbox retains the request for scheduled retry. */ }
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'We could not save your request right now. Please try again.' }, { status: 500 })
  }
}

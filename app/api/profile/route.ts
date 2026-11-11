import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { profiles, sheetSyncOutbox } from '@/lib/db/schema'
import { checkFormRateLimit, cleanSourcePage } from '@/lib/forms'
import { hasSameOrigin, honeypotTriggered } from '@/lib/http'
import { flushSheetOutbox } from '@/lib/sheets'

const profileInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(40),
  businessName: z.string().trim().min(2).max(120),
  businessDescription: z.string().trim().min(10).max(2000),
  source: z.string().trim().min(2).max(120),
  consent: z.literal(true),
  sourcePage: z.string().optional(),
  website: z.string().optional(),
})

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 })
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })

  try {
    const input = profileInput.safeParse(await request.json())
    if (!input.success) return NextResponse.json({ error: 'Please complete all required registration fields.' }, { status: 400 })
    if (honeypotTriggered(input.data.website)) return NextResponse.json({ ok: true })
    if (!await checkFormRateLimit('registration', 5)) return NextResponse.json({ error: 'Please wait a minute before trying again.' }, { status: 429 })

    const user = await currentUser()
    const email = user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress
    if (!email) return NextResponse.json({ error: 'Your account needs a verified email address.' }, { status: 400 })
    const sourcePage = cleanSourcePage(input.data.sourcePage)
    const created = await db.transaction(async (tx) => {
      const [profile] = await tx.insert(profiles).values({
        id: userId,
        fullName: input.data.fullName,
        email,
        phone: input.data.phone,
        businessName: input.data.businessName,
        businessDescription: input.data.businessDescription,
        source: input.data.source,
        consent: true,
        updatedAt: new Date(),
      }).onConflictDoNothing().returning({ id: profiles.id })
      if (profile) {
        await tx.insert(sheetSyncOutbox).values({
          userId,
          eventType: 'registration',
          payload: { timestamp: new Date().toISOString(), fullName: input.data.fullName, phone: input.data.phone, email, business: input.data.businessName, package: '', sourcePage, notes: input.data.businessDescription },
        })
      }
      return Boolean(profile)
    })

    if (created) {
      try { await flushSheetOutbox(userId) } catch { /* The database outbox retains the registration for the scheduled retry. */ }
    }
    return NextResponse.json({ ok: true, created }, { status: created ? 201 : 200 })
  } catch {
    return NextResponse.json({ error: 'We could not save your registration right now. Please try again.' }, { status: 500 })
  }
}

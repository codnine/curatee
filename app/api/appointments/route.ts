import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { appointments, profiles, sheetSyncOutbox } from '@/lib/db/schema'
import { notifyBooking } from '@/lib/email'
import { checkFormRateLimit, cleanSourcePage } from '@/lib/forms'
import { hasSameOrigin, honeypotTriggered } from '@/lib/http'
import { flushSheetOutbox } from '@/lib/sheets'

const appointmentInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):(00|30)$/),
  notes: z.string().trim().max(1500).default(''),
  sourcePage: z.string().optional(),
  website: z.string().optional(),
})

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 })
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in to book a call.' }, { status: 401 })

  try {
    const input = appointmentInput.safeParse(await request.json())
    if (!input.success) return NextResponse.json({ error: 'Choose a date and time to continue.' }, { status: 400 })
    if (honeypotTriggered(input.data.website)) return NextResponse.json({ ok: true })
    if (!await checkFormRateLimit('appointment', 4)) return NextResponse.json({ error: 'Please wait a minute before requesting another call.' }, { status: 429 })

    const calendarDate = new Date(`${input.data.date}T00:00:00Z`)
    const startsAt = new Date(`${input.data.date}T${input.data.time}:00+05:30`)
    const minutesSinceMidnight = Number(input.data.time.slice(0, 2)) * 60 + Number(input.data.time.slice(3, 5))
    const isValidCalendarDate = !Number.isNaN(calendarDate.getTime()) && calendarDate.toISOString().slice(0, 10) === input.data.date
    const isWithinBusinessHours = minutesSinceMidnight >= 9 * 60 && minutesSinceMidnight <= 17 * 60
    if (!isValidCalendarDate || calendarDate.getUTCDay() === 0 || !isWithinBusinessHours || Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) return NextResponse.json({ error: 'Choose an available future weekday between 9:00 and 17:00 Sri Lanka time.' }, { status: 400 })
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
    if (!profile) return NextResponse.json({ error: 'Complete your profile before booking a call.' }, { status: 409 })

    const sourcePage = cleanSourcePage(input.data.sourcePage, '/book')
    const endsAt = new Date(startsAt.getTime() + 30 * 60_000)
    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(741204)`)
      const [conflict] = await tx.select({ id: appointments.id }).from(appointments).where(and(
        ne(appointments.status, 'cancelled'),
        sql`${appointments.startsAt} < ${endsAt}`,
        sql`${appointments.startsAt} + (${appointments.durationMinutes} * interval '1 minute') > ${startsAt}`,
      )).limit(1)
      if (conflict) return null

      const [item] = await tx.insert(appointments).values({ userId, startsAt, durationMinutes: 30, status: 'requested', notes: input.data.notes, sourcePage }).returning()
      await tx.insert(sheetSyncOutbox).values({
        userId,
        eventType: 'appointment',
        payload: { timestamp: new Date().toISOString(), fullName: profile.fullName, phone: profile.phone, email: profile.email, business: profile.businessName, package: '', sourcePage, notes: `${input.data.notes}${input.data.notes ? '\n' : ''}Requested: ${startsAt.toISOString()}`, status: 'Requested', recordId: item.id },
      })
      return item
    })
    if (!created) return NextResponse.json({ error: 'That time was just booked. Please choose another slot.' }, { status: 409 })

    const results = await Promise.allSettled([
      flushSheetOutbox(userId),
      notifyBooking({ name: profile.fullName, email: profile.email, startsAt, notes: input.data.notes }),
    ])
    const emailSent = results[1].status === 'fulfilled' && results[1].value.customerEmailSent
    return NextResponse.json({ ok: true, id: created.id, emailSent }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'We could not save your booking request right now. Please try again.' }, { status: 500 })
  }
}

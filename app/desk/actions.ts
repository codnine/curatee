'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-guards'
import { db } from '@/lib/db'
import { appointments, profiles, requestUpdates, requests, sheetSyncOutbox } from '@/lib/db/schema'
import { isRequestStatus, statusLabels } from '@/lib/forms'
import { notifyRequestStatus, sendEmail } from '@/lib/email'
import { packages } from '@/lib/branding'
import { flushSheetOutbox } from '@/lib/sheets'

const idSchema = z.string().uuid()
const appointmentStatuses = ['requested', 'confirmed', 'completed', 'cancelled'] as const

export async function updateRequestStatus(formData: FormData) {
  await requireAdmin()
  const parsedId = idSchema.safeParse(formData.get('requestId'))
  const status = formData.get('status')
  const note = z.string().trim().max(1000).parse(formData.get('note') ?? '')
  if (!parsedId.success || !isRequestStatus(status)) throw new Error('Invalid request status update.')

  const [item] = await db.select().from(requests).where(eq(requests.id, parsedId.data)).limit(1)
  if (!item) throw new Error('Request not found.')
  if (item.status === status && !note) return
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, item.userId)).limit(1)
  const updatedAt = new Date()
  const statusText = statusLabels[status]
  await db.transaction(async (tx) => {
    const [request] = await tx.update(requests).set({ status, updatedAt }).where(and(eq(requests.id, item.id), eq(requests.userId, item.userId))).returning()
    if (!request) throw new Error('Request not found.')
    await tx.insert(requestUpdates).values({ userId: item.userId, requestId: item.id, status, note: note || `Your request is now ${statusText.toLowerCase()}.` })
    await tx.insert(sheetSyncOutbox).values({
      userId: item.userId,
      eventType: 'request',
      payload: { timestamp: updatedAt.toISOString(), fullName: profile?.fullName ?? '', phone: profile?.phone ?? '', email: profile?.email ?? '', business: profile?.businessName ?? '', package: item.package, sourcePage: '/desk', notes: note || `Status updated to ${statusText}.`, status: statusText, recordId: item.id },
    })
  })
  if (profile) {
    try { await notifyRequestStatus({ name: profile.fullName, email: profile.email, packageName: packages[item.package as keyof typeof packages]?.name ?? item.package, requestType: item.details === 'Quote request' ? 'quote' : 'package', status, note }) } catch { /* Persisted status is authoritative; email failures do not roll it back. */ }
  }
  try { await flushSheetOutbox(item.userId) } catch { /* The outbox retries automatically. */ }
  revalidatePath('/desk')
  revalidatePath('/account')
}

export async function updateAppointmentStatus(formData: FormData) {
  await requireAdmin()
  const parsedId = idSchema.safeParse(formData.get('appointmentId'))
  const status = formData.get('status')
  if (!parsedId.success || typeof status !== 'string' || !(appointmentStatuses as readonly string[]).includes(status)) throw new Error('Invalid booking status update.')

  const [item] = await db.select().from(appointments).where(eq(appointments.id, parsedId.data)).limit(1)
  if (!item) throw new Error('Booking not found.')
  if (item.status === status) return
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, item.userId)).limit(1)
  const updatedAt = new Date()
  await db.transaction(async (tx) => {
    await tx.update(appointments).set({ status, updatedAt }).where(and(eq(appointments.id, item.id), eq(appointments.userId, item.userId)))
    await tx.insert(sheetSyncOutbox).values({
      userId: item.userId,
      eventType: 'appointment',
      payload: { timestamp: updatedAt.toISOString(), fullName: profile?.fullName ?? '', phone: profile?.phone ?? '', email: profile?.email ?? '', business: profile?.businessName ?? '', package: '', sourcePage: '/desk', notes: item.notes, status, recordId: item.id },
    })
  })
  if (profile) {
    const time = new Intl.DateTimeFormat('en-LK', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Colombo' }).format(item.startsAt)
    try { await sendEmail(profile.email, `Your Curate AI call is ${status.replaceAll('_', ' ')}`, `Hi ${profile.fullName},\n\nYour 30-minute call request for ${time} (Sri Lanka time) is now ${status.replaceAll('_', ' ')}.${status === 'confirmed' ? ' We look forward to speaking with you.' : ''}\n\nCurate AI`) } catch { /* Persisted status is authoritative; email failures do not roll it back. */ }
  }
  try { await flushSheetOutbox(item.userId) } catch { /* The outbox retries automatically. */ }
  revalidatePath('/desk')
  revalidatePath('/account')
}

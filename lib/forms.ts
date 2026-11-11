import { createHash } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { formRateLimits } from '@/lib/db/schema'

export const requestStatuses = ['received', 'reviewing', 'in_progress', 'ready_for_review', 'delivered'] as const
export type RequestStatus = (typeof requestStatuses)[number]
export const statusLabels: Record<RequestStatus, string> = {
  received: 'Received',
  reviewing: 'Reviewing',
  in_progress: 'In progress',
  ready_for_review: 'Ready for review',
  delivered: 'Delivered',
}

export function cleanSourcePage(value: unknown, fallback = '/') {
  if (typeof value !== 'string' || value.length > 180 || !/^\/[A-Za-z0-9/_-]*(?:\?[A-Za-z0-9%&=_-]*)?$/.test(value)) return fallback
  return value
}

export async function checkFormRateLimit(formKey: string, limit = 8) {
  const requestHeaders = await headers()
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',') ?? []
  const ip = requestHeaders.get('x-real-ip')?.trim() || forwarded[forwarded.length - 1]?.trim() || 'unknown'
  const salt = process.env.CLERK_SECRET_KEY ?? process.env.CRON_SECRET
  if (!salt) throw new Error('A server-side rate-limit secret is required.')
  const keyHash = createHash('sha256').update(`${salt}:${formKey}:${ip}`).digest('hex')
  const now = new Date()
  const expiredBefore = new Date(now.getTime() - 60_000)
  const [row] = await db.insert(formRateLimits).values({ keyHash, windowStartedAt: now, hitCount: 1 }).onConflictDoUpdate({
    target: formRateLimits.keyHash,
    set: {
      hitCount: sql`CASE WHEN ${formRateLimits.windowStartedAt} <= ${expiredBefore} THEN 1 ELSE ${formRateLimits.hitCount} + 1 END`,
      windowStartedAt: sql`CASE WHEN ${formRateLimits.windowStartedAt} <= ${expiredBefore} THEN ${now} ELSE ${formRateLimits.windowStartedAt} END`,
    },
  }).returning({ hitCount: formRateLimits.hitCount, windowStartedAt: formRateLimits.windowStartedAt })
  return row.hitCount <= limit
}

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && (requestStatuses as readonly string[]).includes(value)
}

export async function getProfileForUser(userId: string) {
  const { profiles } = await import('@/lib/db/schema')
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
  return profile ?? null
}

import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'

export async function requireSignedIn(returnTo: string) {
  const { userId } = await auth()
  if (!userId)   redirect(`/complete-profile?returnTo=${encodeURIComponent(returnTo)}`)
  return userId
}

export async function requireProfile(userId: string, returnTo: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1)
  if (!profile) redirect(`/complete-profile?returnTo=${encodeURIComponent(returnTo)}`)
  return profile
}

export async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) redirect('/?auth=login&returnTo=%2Fdesk')
  const user = await currentUser()
  const configuredAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const adminEmail = 'admin@curateai.online'
  const isAdmin = configuredAdmin === adminEmail && Boolean(user?.emailAddresses.some((email) => email.emailAddress.toLowerCase() === adminEmail))
  if (!isAdmin) redirect('/')
  return { userId, user }
}

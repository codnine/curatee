import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { CompleteProfileForm } from '@/components/complete-profile-form'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'

function safeReturnTo(value?: string) { return value?.startsWith('/') && !value.startsWith('//') ? value : '/account' }

export default async function CompleteProfilePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo: requestedDestination } = await searchParams
  const returnTo = safeReturnTo(requestedDestination)
  const { userId } = await auth()
  if (!userId) redirect(`/?auth=signup&returnTo=${encodeURIComponent(returnTo)}`)
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, userId)).limit(1)
  if (profile) redirect(returnTo)
  return <main><section className="page crm-page"><span className="eyebrow">CURATE AI / COMPLETE PROFILE</span><h1 className="page-title">A LITTLE ABOUT YOU.</h1><p className="lead">Add the details we need to help with your business and keep your requests together.</p><CompleteProfileForm returnTo={returnTo} /></section></main>
}

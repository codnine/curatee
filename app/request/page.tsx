import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { packages } from '@/lib/branding'
import { requireProfile } from '@/lib/auth-guards'
import { RequestForm } from '@/components/customer-forms'
import { cleanSourcePage } from '@/lib/forms'

export default async function RequestPage({ searchParams }: { searchParams: Promise<{ package?: string; type?: string; sourcePage?: string }> }) {
  const { package: packageSlug = 'starter', type = 'package', sourcePage: rawSourcePage } = await searchParams
  if (!Object.hasOwn(packages, packageSlug) || (type !== 'package' && type !== 'quote')) redirect('/branding')
  const sourcePage = cleanSourcePage(rawSourcePage, '/request')
  const returnTo = `/request?package=${encodeURIComponent(packageSlug)}&type=${type}&sourcePage=${encodeURIComponent(sourcePage)}`
  const { userId } = await auth()
  if (!userId) redirect(`/?auth=signup&returnTo=${encodeURIComponent(returnTo)}&sourcePage=${encodeURIComponent(sourcePage)}`)
  await requireProfile(userId, returnTo)
  const tier = packages[packageSlug as keyof typeof packages]

  return <main><section className="page crm-page">
    <span className="eyebrow">CURATE AI / {type === 'quote' ? 'GET A QUOTE' : 'PACKAGE REQUEST'}</span>
    <h1 className="page-title">LET’S TALK.</h1>
    <p className="lead">Share a little about what you need. Your request will be saved to your account so you can follow its progress.</p>
    <RequestForm packageSlug={packageSlug as keyof typeof packages} packageName={tier.name} type={type} sourcePage={sourcePage} />
  </section></main>
}

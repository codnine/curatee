import Link from 'next/link'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { requireProfile, requireSignedIn } from '@/lib/auth-guards'
import { db } from '@/lib/db'
import { appointments, requestUpdates, requests } from '@/lib/db/schema'
import { statusLabels, type RequestStatus } from '@/lib/forms'

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' }).format(value)
}

export default async function AccountPage() {
  const userId = await requireSignedIn('/account')
  const profile = await requireProfile(userId, '/account')
  const [userRequests, userAppointments] = await Promise.all([
    db.select().from(requests).where(eq(requests.userId, userId)).orderBy(desc(requests.createdAt)),
    db.select().from(appointments).where(eq(appointments.userId, userId)).orderBy(desc(appointments.startsAt)),
  ])
  const ids = userRequests.map((request) => request.id)
  const updates = ids.length ? await db.select().from(requestUpdates).where(and(eq(requestUpdates.userId, userId), inArray(requestUpdates.requestId, ids))).orderBy(desc(requestUpdates.createdAt)) : []
  const updatesByRequest = new Map<string, typeof updates>()
  for (const update of updates) updatesByRequest.set(update.requestId, [...(updatesByRequest.get(update.requestId) ?? []), update])

  return <main><section className="page account-page">
    <span className="eyebrow">CURATE AI / YOUR ACCOUNT</span>
    <h1 className="page-title">GOOD TO SEE YOU.</h1>
    <p className="lead">Your requests, progress, and call bookings in one place.</p>
    <div className="account-welcome"><div><span className="eyebrow">YOUR PROFILE</span><h2>{profile.fullName}</h2><p>{profile.businessName} · {profile.email}</p></div><Link className="button outline" href="/branding">Explore packages</Link></div>

    <div className="account-sections">
      <section className="account-section" aria-labelledby="requests-heading">
        <div className="section-label"><span className="eyebrow">01 / PROJECT TRACKER</span><h2 id="requests-heading">Your requests</h2></div>
        {userRequests.length ? <div className="tracker-list">{userRequests.map((item) => {
          const history = updatesByRequest.get(item.id) ?? []
          const currentIndex = Math.max(0, ['received', 'reviewing', 'in_progress', 'ready_for_review', 'delivered'].indexOf(item.status))
          return <article className="tracker-card" key={item.id}>
            <div className="tracker-card-head"><div><span className="eyebrow">{item.details === 'Quote request' ? 'QUOTE' : 'PACKAGE'} / {item.package}</span><h3>{item.package.charAt(0).toUpperCase() + item.package.slice(1)}</h3></div><span className="status-pill">{statusLabels[item.status as RequestStatus] ?? item.status}</span></div>
            <p className="tracker-brief">{item.brief}</p>
            <ol className="status-track" aria-label={`Request status: ${statusLabels[item.status as RequestStatus] ?? item.status}`}>
              {(['received', 'reviewing', 'in_progress', 'ready_for_review', 'delivered'] as const).map((status, index) => <li key={status} className={index <= currentIndex ? 'complete' : ''}><span aria-hidden="true" />{statusLabels[status]}</li>)}
            </ol>
            <div className="timeline"><span className="eyebrow">LATEST UPDATES</span>{history.length ? history.map((update) => <div className="timeline-item" key={update.id}><span className="timeline-dot" /><div><strong>{statusLabels[update.status as RequestStatus] ?? update.status}</strong>{update.note && <p>{update.note}</p>}<time dateTime={update.createdAt.toISOString()}>{formatDate(update.createdAt)}</time></div></div>) : <p className="muted-copy">No updates yet.</p>}</div>
          </article>
        })}</div> : <div className="empty-state"><h3>No requests yet.</h3><p>When you request a package or quote, it will show up here.</p><Link className="text-link" href="/branding">Browse packages</Link></div>}
      </section>

      <section className="account-section" aria-labelledby="appointments-heading">
        <div className="section-label"><span className="eyebrow">02 / CALLS</span><h2 id="appointments-heading">Your bookings</h2></div>
        {userAppointments.length ? <div className="tracker-list">{userAppointments.map((appointment) => <article className="appointment-card" key={appointment.id}>
          <div className="tracker-card-head"><div><span className="eyebrow">30-MINUTE INTRODUCTORY CALL</span><h3>{formatDate(appointment.startsAt)} <small>Sri Lanka time</small></h3></div><span className="status-pill">{appointment.status.replaceAll('_', ' ')}</span></div>
          {appointment.notes && <p className="tracker-brief">{appointment.notes}</p>}
          <p className="muted-copy">Requested {formatDate(appointment.createdAt)}. We’ll email you if the team updates this booking.</p>
        </article>)}</div> : <div className="empty-state"><h3>No calls booked.</h3><p>Choose a time to talk through your goals with the team.</p><Link className="button" href="/book">Book a call</Link></div>}
      </section>
    </div>
  </section></main>
}

import { desc, inArray } from 'drizzle-orm'
import { requireAdmin } from '@/lib/auth-guards'
import { db } from '@/lib/db'
import { appointments, profiles, requests } from '@/lib/db/schema'
import { BookingStatusForm, RequestStatusForm } from '@/components/desk-status-form'

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' }).format(value)
}

export default async function DeskPage() {
  await requireAdmin()
  const [allRequests, allAppointments] = await Promise.all([
    db.select().from(requests).orderBy(desc(requests.createdAt)),
    db.select().from(appointments).orderBy(desc(appointments.startsAt)),
  ])
  const profileIds = [...new Set([...allRequests.map((item) => item.userId), ...allAppointments.map((item) => item.userId)])]
  const allProfiles = profileIds.length ? await db.select().from(profiles).where(inArray(profiles.id, profileIds)) : []
  const profileById = new Map(allProfiles.map((profile) => [profile.id, profile]))

  return <main><section className="page desk-page">
    <span className="eyebrow">CURATE AI / PRIVATE ADMIN</span>
    <h1 className="page-title">THE DESK.</h1>
    <p className="lead">Review customer requests and keep each client updated. Only the configured admin email can access this page.</p>
    <section className="desk-section" aria-labelledby="desk-requests"><div className="section-label"><span className="eyebrow">01 / INTAKE</span><h2 id="desk-requests">Package requests</h2></div>
      {allRequests.length ? <div className="desk-list">{allRequests.map((item) => {
        const profile = profileById.get(item.userId)
        return <article className="desk-card" key={item.id}>
          <div className="desk-card-head"><div><span className="eyebrow">{item.package} / {item.details}</span><h3>{profile?.businessName ?? 'Business profile unavailable'}</h3><p>{profile?.fullName} · {profile?.email} · {profile?.phone}</p></div><time dateTime={item.createdAt.toISOString()}>{formatDate(item.createdAt)}</time></div>
          <p className="desk-brief">{item.brief}</p>
          <RequestStatusForm requestId={item.id} status={item.status} />
        </article>
      })}</div> : <p className="muted-copy">No customer requests yet.</p>}
    </section>

    <section className="desk-section" aria-labelledby="desk-appointments"><div className="section-label"><span className="eyebrow">02 / SCHEDULE</span><h2 id="desk-appointments">Call bookings</h2></div>
      {allAppointments.length ? <div className="desk-list">{allAppointments.map((item) => {
        const profile = profileById.get(item.userId)
        return <article className="desk-card" key={item.id}>
          <div className="desk-card-head"><div><span className="eyebrow">{formatDate(item.startsAt)} / SRI LANKA TIME</span><h3>{profile?.businessName ?? 'Business profile unavailable'}</h3><p>{profile?.fullName} · {profile?.email} · {profile?.phone}</p></div><span className="status-pill">{item.status.replaceAll('_', ' ')}</span></div>
          {item.notes && <p className="desk-brief">{item.notes}</p>}
          <BookingStatusForm appointmentId={item.id} status={item.status} />
        </article>
      })}</div> : <p className="muted-copy">No call bookings yet.</p>}
    </section>
  </section></main>
}

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { BookingForm } from '@/components/customer-forms'
import { requireProfile } from '@/lib/auth-guards'

export default async function BookPage(){const {userId}=await auth();if(!userId)redirect('/?auth=signup&returnTo=%2Fbook');await requireProfile(userId,'/book');return <main><section className="page crm-page"><span className="eyebrow">CURATE AI / BOOK A CALL</span><h1 className="page-title">Let&apos;s make<br/>a start.</h1><p className="lead">Pick a time for a 30-minute conversation. All times are Sri Lanka time, Monday to Saturday.</p><BookingForm /></section></main>}

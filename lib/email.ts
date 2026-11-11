import { Resend } from 'resend'

type EmailDelivery = { customerEmailSent: boolean; adminEmailSent: boolean }

function getSender() {
  const domain = process.env.RESEND_EMAIL_DOMAIN
  if (!domain) throw new Error('The Resend email domain is not configured.')
  return `Curate AI <hello@${domain}>`
}

function getAccountUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
  return `${host ? `https://${host}` : 'http://localhost:3000'}/account`
}

export async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Resend is not configured.')
  const resend = new Resend(apiKey)
  const result = await resend.emails.send({ from: getSender(), to, subject, text })
  if (result.error) throw new Error(result.error.message)
  return result
}

async function sendCustomerAndAdmin(customerEmail: { to: string; subject: string; text: string }, adminEmail: { subject: string; text: string }): Promise<EmailDelivery> {
  const address = process.env.ADMIN_EMAIL
  const results = await Promise.allSettled([
    sendEmail(customerEmail.to, customerEmail.subject, customerEmail.text),
    address ? sendEmail(address, adminEmail.subject, adminEmail.text) : Promise.reject(new Error('The admin notification address is not configured.')),
  ])
  return {
    customerEmailSent: results[0].status === 'fulfilled',
    adminEmailSent: results[1].status === 'fulfilled',
  }
}

export async function notifyRegistration(input: { name: string; email: string; phone: string; businessName: string; businessDescription: string }) {
  const accountUrl = getAccountUrl()
  return sendCustomerAndAdmin(
    {
      to: input.email,
      subject: 'Welcome to Curate AI',
      text: `Hi ${input.name},\n\nYour Curate AI account is ready. You can request a branding package, ask for a quote, book a call, and track updates from your account.\n\nYour account: ${accountUrl}\n\nCurate AI`,
    },
    {
      subject: `New Curate AI registration from ${input.name}`,
      text: `A new customer completed registration.\n\nName: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone}\nBusiness: ${input.businessName}\nBusiness description: ${input.businessDescription}`,
    },
  )
}

export async function notifyRequestReceived(input: { name: string; email: string; phone: string; businessName: string; packageName: string; requestType: 'package' | 'quote'; brief: string; requestId: string; sourcePage: string }) {
  const requestLabel = input.requestType === 'quote' ? `quote for ${input.packageName}` : `${input.packageName} package request`
  const accountUrl = getAccountUrl()
  return sendCustomerAndAdmin(
    {
      to: input.email,
      subject: `We received your ${input.requestType === 'quote' ? 'quote request' : 'package request'}`,
      text: `Hi ${input.name},\n\nWe received your ${requestLabel}. Our team will review the details and follow up with you. You can track progress from your account.\n\nYour account: ${accountUrl}\n\nCurate AI`,
    },
    {
      subject: `New ${input.requestType} request from ${input.name}`,
      text: `A new ${input.requestType} request was submitted.\n\nRequest ID: ${input.requestId}\nName: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone}\nBusiness: ${input.businessName}\nPackage: ${input.packageName}\nSource page: ${input.sourcePage}\n\nProject brief:\n${input.brief}`,
    },
  )
}

export async function notifyBooking(input: { name: string; email: string; startsAt: Date; notes: string }): Promise<EmailDelivery> {
  const time = new Intl.DateTimeFormat('en-LK', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Colombo' }).format(input.startsAt)
  return sendCustomerAndAdmin(
    {
      to: input.email,
      subject: 'Your Curate AI call request',
      text: `Hi ${input.name},\n\nWe received your request for a 30-minute call on ${time} (Sri Lanka time). We will confirm the time by email.\n\n${input.notes ? `Notes: ${input.notes}\n\n` : ''}Curate AI`,
    },
    {
      subject: `New call request from ${input.name}`,
      text: `${input.name} (${input.email}) requested a 30-minute call for ${time} (Sri Lanka time).\n\n${input.notes || 'No additional notes were provided.'}`,
    },
  )
}

export async function notifyRequestStatus(input: { name: string; email: string; packageName: string; requestType: 'package' | 'quote'; status: string; note: string }) {
  const { statusLabels } = await import('@/lib/forms')
  const friendlyStatus = statusLabels[input.status as keyof typeof statusLabels] ?? input.status
  const requestLabel = input.requestType === 'quote' ? `quote for ${input.packageName}` : `${input.packageName} package`
  await sendEmail(input.email, `Your Curate AI request is ${friendlyStatus.toLowerCase()}`, `Hi ${input.name},\n\nYour ${requestLabel} request is now: ${friendlyStatus}.${input.note ? `\n\nUpdate from the team: ${input.note}` : ''}\n\nYou can follow the full timeline in your account: ${getAccountUrl()}\n\nCurate AI`)
}

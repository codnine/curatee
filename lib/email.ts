import { Resend } from 'resend'

function getSender() {
  const domain = process.env.RESEND_EMAIL_DOMAIN
  if (!domain) throw new Error('The Resend email domain is not configured.')
  return `Curate AI <hello@${domain}>`
}

export async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Resend is not configured.')
  const resend = new Resend(apiKey)
  const result = await resend.emails.send({ from: getSender(), to, subject, text })
  if (result.error) throw new Error(result.error.message)
  return result
}

export async function notifyBooking(input: { name: string; email: string; startsAt: Date; notes: string }) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) throw new Error('The admin notification address is not configured.')
  const time = new Intl.DateTimeFormat('en-LK', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Colombo' }).format(input.startsAt)
  const messages = await Promise.allSettled([
    sendEmail(input.email, 'Your Curate AI call request', `Hi ${input.name},\n\nWe received your request for a 30-minute call on ${time} (Sri Lanka time). We will confirm the time by email.\n\n${input.notes ? `Notes: ${input.notes}\n\n` : ''}Curate AI`),
    sendEmail(adminEmail, `New call request from ${input.name}`, `${input.name} (${input.email}) requested a 30-minute call for ${time} (Sri Lanka time).\n\n${input.notes || 'No additional notes were provided.'}`),
  ])
  if (messages.some((message) => message.status === 'rejected')) throw new Error('One or more booking emails could not be sent.')
}

export async function notifyRequestStatus(input: { name: string; email: string; packageName: string; status: string; note: string }) {
  const { statusLabels } = await import('@/lib/forms')
  const friendlyStatus = statusLabels[input.status as keyof typeof statusLabels] ?? input.status
  await sendEmail(input.email, `Your Curate AI request is ${friendlyStatus.toLowerCase()}`, `Hi ${input.name},\n\nYour ${input.packageName} request is now: ${friendlyStatus}.${input.note ? `\n\nUpdate from the team: ${input.note}` : ''}\n\nYou can follow the full timeline in your account at ${process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'the Curate AI site'}/account.\n\nCurate AI`)
}

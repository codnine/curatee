export const metadata = { title: 'Privacy Policy Draft | Curate AI', description: 'A working draft describing how Curate AI handles customer account and request information.' }

export default function PrivacyPage() {
  return <main><section className="page privacy-page">
    <span className="eyebrow">CURATE AI / WORKING DRAFT</span>
    <h1 className="page-title">PRIVACY, WITH CARE.</h1>
    <p className="lead">Last updated: November 2026. This draft is a starting point for review, not legal advice or a final policy.</p>
    <div className="body-copy privacy-copy">
      <section><h2>Information we collect</h2><p>When you create an account or contact Curate AI, we collect the name, email address, phone number, business name, business description, referral source, and any project details you provide. We also store package requests, status updates, and requested call times.</p></section>
      <section><h2>How we use it</h2><p>We use this information to create and secure your account, respond to enquiries, manage project requests, arrange calls, send service-related updates, and maintain our business records. We do not ask for payment card information on these forms.</p></section>
      <section><h2>AI concierge</h2><p>When you use the homepage concierge, the text you enter is sent to Vercel AI Gateway and its selected model provider to generate a reply. Curate AI does not store concierge messages in its app database. Please do not include confidential or sensitive information. If you submit an account or service request, those details are handled as described in this policy.</p></section>
      <section><h2>Service providers</h2><p>Account sign-in is handled by Clerk. Account and request data is stored in a managed PostgreSQL database. Relevant enquiry and booking details are synchronized to a restricted Google Sheet for team operations. Resend is used to deliver transactional email. These providers process information on our behalf to provide their services.</p></section>
      <section><h2>Retention and security</h2><p>We retain information for as long as needed to manage your account, service requests, and business obligations. We use access controls and server-side safeguards to protect account and request data. No internet service can guarantee absolute security.</p></section>
      <section><h2>Your choices</h2><p>You may ask to access, correct, or delete your account information, subject to records we must retain. You may also ask questions about this policy through the contact channels provided on the Curate AI site.</p></section>
      <section><h2>Policy review</h2><p>This policy must be reviewed and completed by the Curate AI business owner before production use, including confirming the business address, contact email, retention periods, applicable legal requirements, and any analytics or cookie technologies enabled on the site.</p></section>
    </div>
  </section></main>
}

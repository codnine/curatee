# Curate AI

Curate AI is a Sri Lanka-focused AI chatbot and creative services site. The site keeps its existing visual identity while adding managed customer accounts, requests, call bookings, an account tracker, and a private team desk.

## Main routes

- `/` — Curate AI landing page
- `/branding` and `/branding/[tier]` — service packages and request/quote actions
- `/book` — authenticated call booking, weekdays from 9:00 to 17:00 Sri Lanka time
- `/account` — private profile, request status history, and bookings
- `/desk` — private admin workspace for `admin@curateai.online`
- `/privacy` — privacy policy draft for review before publication

## Integrations and environment variables

Configure these in the Vercel project environment. Never commit secret values or copy them into source files.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser SDK configuration |
| `CLERK_SECRET_KEY` | Server-side Clerk session verification |
| `DATABASE_URL` | Neon Postgres connection used by Drizzle |
| `RESEND_API_KEY` | Server-side transactional email delivery |
| `RESEND_EMAIL_DOMAIN` | Verified sending domain; mail is sent from `hello@<domain>` |
| `GOOGLE_SHEET_ID` | Spreadsheet that receives registration, request, and booking rows |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account identity used by the server |
| `GOOGLE_PRIVATE_KEY` | Server-only private key for that service account |
| `ADMIN_EMAIL` | Must be `admin@curateai.online` to enable the admin desk |
| `CRON_SECRET` | Protects the scheduled spreadsheet retry endpoint |

Share the target spreadsheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as an editor. The app creates the `Registrations`, `Requests`, and `Appointments` tabs and their headers when first needed. It writes an event ID in the first column and checks it before retrying, so a repeated delivery does not append duplicate rows. Database transactions add a durable outbox record before attempting Sheets delivery; failed deliveries retry with backoff and the Vercel cron runs daily as a recovery path.

## Data and access

- Clerk owns authentication and session cookies; this app uses email and password.
- Neon Postgres stores profiles, requests, request status history, appointments, rate-limit hashes, and the Sheets outbox.
- Every customer-data query is scoped to the signed-in Clerk user. `/desk` is separately guarded on the server by the exact admin email.
- Request and booking endpoints validate input, enforce same-origin requests, rate-limit by a one-way hash of the client IP, and use a hidden honeypot field.
- Resend sends booking confirmations to the customer and admin. Admin status changes email the customer.

## Spreadsheet retry schedule

`vercel.json` schedules `GET /api/cron/sheets` once per day. The route requires `Authorization: Bearer $CRON_SECRET`. User actions also attempt to flush their own queued rows immediately. A spreadsheet permission or availability error does not discard the database record; the outbox records the error and schedules exponential backoff.

## Privacy policy

`/privacy` is a draft, not legal advice. Review the retention, contact, and jurisdiction details before publishing it as a final policy.

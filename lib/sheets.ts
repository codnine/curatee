import { google } from 'googleapis'
import { and, asc, eq, isNull, lte } from 'drizzle-orm'
import { db, pool } from '@/lib/db'
import { profiles, sheetSyncOutbox } from '@/lib/db/schema'

const tabs = ['Registrations', 'Requests', 'Appointments'] as const
type SheetTab = (typeof tabs)[number]
type SheetsApi = ReturnType<typeof google.sheets>
type OutboxEvent = typeof sheetSyncOutbox.$inferSelect
type OutboxAttempt = Pick<OutboxEvent, 'id' | 'userId' | 'attempts'>
type SheetPayload = {
  timestamp?: string
  fullName?: string
  phone?: string
  email?: string
  business?: string
  package?: string
  sourcePage?: string
  notes?: string
  status?: string
  recordId?: string
}

const sheetHeaders = ['Event ID', 'Timestamp', 'Full name', 'Phone', 'Email', 'Business', 'Package', 'Source page', 'Notes', 'Status', 'Record ID']
const outboxLockKey = 741203

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  if (!email || !privateKey || !spreadsheetId) throw new Error('Google Sheets credentials are not configured.')
  const auth = new google.auth.GoogleAuth({ credentials: { client_email: email, private_key: privateKey }, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  return { api: google.sheets({ version: 'v4', auth }), spreadsheetId }
}

async function ensureTabs(api: SheetsApi, spreadsheetId: string) {
  const response = await api.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' })
  const existing = new Set(response.data.sheets?.map((sheet) => sheet.properties?.title).filter((title): title is string => Boolean(title)))
  const missing = tabs.filter((tab) => !existing.has(tab))
  if (missing.length) {
    await api.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) } })
  }
  await Promise.all(tabs.map(async (tab) => {
    const header = await api.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'!A1:K1` })
    if (!header.data.values?.[0]?.length) {
      await api.spreadsheets.values.update({ spreadsheetId, range: `'${tab}'!A1:K1`, valueInputOption: 'RAW', requestBody: { values: [sheetHeaders] } })
    }
  }))
}

function tabFor(eventType: string): SheetTab {
  if (eventType === 'registration') return 'Registrations'
  if (eventType === 'request') return 'Requests'
  if (eventType === 'appointment') return 'Appointments'
  throw new Error('Unsupported spreadsheet event.')
}

function valuesFor(id: string, payload: SheetPayload) {
  return [[id, payload.timestamp ?? new Date().toISOString(), payload.fullName ?? '', payload.phone ?? '', payload.email ?? '', payload.business ?? '', payload.package ?? '', payload.sourcePage ?? '', payload.notes ?? '', payload.status ?? '', payload.recordId ?? '']]
}

async function appendIfMissing(api: SheetsApi, spreadsheetId: string, tab: SheetTab, id: string, payload: SheetPayload) {
  const existing = await api.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'!A:A` })
  if (existing.data.values?.some((row) => row[0] === id)) return
  await api.spreadsheets.values.append({ spreadsheetId, range: `'${tab}'!A:K`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: valuesFor(id, payload) } })
}

async function flushSheetOutboxUnlocked(userId?: string, batchSize = 10) {
  const now = new Date()
  const filters = [isNull(sheetSyncOutbox.deliveredAt), lte(sheetSyncOutbox.nextRetryAt, now)]
  if (userId) filters.push(eq(sheetSyncOutbox.userId, userId))
  const events = await db.select().from(sheetSyncOutbox).where(and(...filters)).orderBy(asc(sheetSyncOutbox.createdAt)).limit(batchSize)
  if (!events.length) return { delivered: 0, failed: 0 }

  let api: SheetsApi
  let spreadsheetId: string
  try {
    const client = getSheetsClient()
    api = client.api
    spreadsheetId = client.spreadsheetId
    await ensureTabs(api, spreadsheetId)
  } catch (error) {
    await deferEvents(events, error)
    return { delivered: 0, failed: events.length }
  }

  let delivered = 0
  let failed = 0
  for (const event of events) {
    try {
      const [profile] = await db.select().from(profiles).where(eq(profiles.id, event.userId)).limit(1)
      const base = event.payload as SheetPayload
      const payload = { ...base, ...(profile ? { fullName: profile.fullName, phone: profile.phone, email: profile.email, business: profile.businessName } : {}) }
      await appendIfMissing(api, spreadsheetId, tabFor(event.eventType), event.id, payload)
      await db.update(sheetSyncOutbox).set({ deliveredAt: new Date(), lastError: null }).where(and(eq(sheetSyncOutbox.id, event.id), eq(sheetSyncOutbox.userId, event.userId)))
      delivered += 1
    } catch (error) {
      await deferEvents([event], error)
      failed += 1
    }
  }
  return { delivered, failed }
}

export async function flushSheetOutbox(userId?: string, batchSize = 10) {
  const connection = await pool.connect()
  let locked = false
  try {
    const result = await connection.query<{ locked: boolean }>('SELECT pg_try_advisory_lock($1) AS locked', [outboxLockKey])
    locked = result.rows[0]?.locked === true
    if (!locked) return { delivered: 0, failed: 0 }
    return await flushSheetOutboxUnlocked(userId, batchSize)
  } finally {
    if (locked) {
      try {
        await connection.query('SELECT pg_advisory_unlock($1)', [outboxLockKey])
      } catch {
        // Closing the connection releases the session-level lock if PostgreSQL is already unavailable.
      }
    }
    connection.release()
  }
}

async function deferEvents(events: OutboxAttempt[], error: unknown) {
  const safeMessage = error instanceof Error ? error.message.slice(0, 500) : 'Spreadsheet delivery failed.'
  for (const event of events) {
    const attempts = event.attempts + 1
    const delayMs = Math.min(6 * 60 * 60_000, 60_000 * 2 ** Math.min(attempts - 1, 8))
    await db.update(sheetSyncOutbox).set({ attempts, lastError: safeMessage, nextRetryAt: new Date(Date.now() + delayMs) }).where(and(eq(sheetSyncOutbox.id, event.id), eq(sheetSyncOutbox.userId, event.userId)))
  }
}

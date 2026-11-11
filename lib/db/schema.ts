import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  businessName: text('business_name').notNull(),
  businessDescription: text('business_description').notNull(),
  source: text('source').notNull(),
  consent: boolean('consent').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const requests = pgTable('requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  package: text('package').notNull(),
  details: text('details').notNull(),
  brief: text('brief').notNull().default(''),
  status: text('status').notNull().default('received'),
  sourcePage: text('source_page').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const requestUpdates = pgTable('request_updates', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  requestId: uuid('request_id').notNull(),
  status: text('status').notNull(),
  note: text('note').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const appointments = pgTable('appointments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(30),
  status: text('status').notNull().default('requested'),
  notes: text('notes').notNull().default(''),
  sourcePage: text('source_page').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sheetSyncOutbox = pgTable('sheet_sync_outbox', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),
  attempts: integer('attempts').notNull().default(0),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const formRateLimits = pgTable('form_rate_limits', {
  keyHash: text('key_hash').primaryKey(),
  windowStartedAt: timestamp('window_started_at', { withTimezone: true }).notNull(),
  hitCount: integer('hit_count').notNull().default(1),
})

export const schema = { profiles, requests, requestUpdates, appointments, sheetSyncOutbox, formRateLimits }

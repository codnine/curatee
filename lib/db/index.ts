import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { schema } from './schema'

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL

const globalForDb = globalThis as typeof globalThis & { curatePool?: Pool }
export const pool = globalForDb.curatePool ?? new Pool({ ...(connectionString ? { connectionString } : {}), max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 8_000 })
if (process.env.NODE_ENV !== 'production') globalForDb.curatePool = pool

export const db = drizzle(pool, { schema })

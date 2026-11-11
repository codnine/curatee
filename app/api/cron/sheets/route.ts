import { NextResponse } from 'next/server'
import { flushSheetOutbox } from '@/lib/sheets'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  try {
    return NextResponse.json(await flushSheetOutbox(undefined, 50))
  } catch {
    return NextResponse.json({ error: 'The queued spreadsheet sync could not run.' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { drawRowToWinner, drawRowToParticipants } from '@/lib/drawFormat'

export const dynamic = 'force-dynamic'

// Η πιο πρόσφατη κλήρωση. Όλοι οι browsers την ελέγχουν, ώστε να δουν το αποτέλεσμα ακόμα κι αν δεν την ξεκίνησαν οι ίδιοι.
export async function GET(req: Request) {
  try {
    const seen = new URL(req.url).searchParams.get('seen')
    const row = await prisma.draw_results.findFirst({ orderBy: { drawn_at: 'desc' } })
    if (!row || row.id === seen) return NextResponse.json({ success: true, draw: null })
    return NextResponse.json({
      success: true,
      draw: { winner: drawRowToWinner(row), participants: drawRowToParticipants(row) },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

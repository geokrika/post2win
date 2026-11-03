import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { drawRowToWinner } from '@/lib/drawFormat'

export const dynamic = 'force-dynamic'

// Ιστορικό νικητών: διαβάζεται από τον πίνακα draw_results (πραγματικοί νικητές κάθε κλήρωσης)
export async function GET() {
  try {
    const rows = await prisma.draw_results.findMany({
      orderBy: { drawn_at: 'desc' },
      take: 50,
    })
    const history = rows.map((r: any) => ({ ...drawRowToWinner(r), id: r.id }))
    return NextResponse.json({ success: true, history })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

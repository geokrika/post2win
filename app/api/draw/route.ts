import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { winnerPrize } = body

    ;(global as any).jackpotAmount = 50.0

    return NextResponse.json({
      success: true,
      message: 'Η κλήρωση ολοκληρώθηκε με επιτυχία.',
      winnerPrize,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Σφάλμα κατά την εκτέλεση της κλήρωσης.' },
      { status: 500 }
    )
  }
}
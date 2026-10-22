import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('id')

    let user = null
    if (userId) {
      user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          full_name: true,
          email: true,
          wallet_balance: true,
        },
      })
    }

    // Ανάγνωση του ενεργού Jackpot απευθείας από τη βάση (draw_rounds)
    const activeRound = await prisma.draw_rounds.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { starts_at: 'desc' },
    })

    const currentJackpot = activeRound?.current_jackpot 
      ? Number(activeRound.current_jackpot) 
      : 100.00

    return NextResponse.json({
      success: true,
      user: user ? {
        ...user,
        wallet_balance: Number(user.wallet_balance || 0),
      } : null,
      jackpot: currentJackpot,
    }, { status: 200 })

  } catch (error: any) {
    console.error('USER ME API ERROR:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
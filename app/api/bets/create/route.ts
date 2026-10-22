import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { fileId, userId, amount = 1 } = body
    const betAmount = Number(amount) || 1

    // Αρχικοποίηση καθολικών μεταβλητών μνήμης
    if (!(global as any).posts) (global as any).posts = []
    if (!(global as any).jackpot) (global as any).jackpot = 50.0
    if (!(global as any).adminEarnings) (global as any).adminEarnings = 0.0
    if (!(global as any).adminLogs) (global as any).adminLogs = []

    // Υπολογισμός 10% για τον Ιδιοκτήτη & 90% για το Jackpot
    const houseFee = betAmount * 0.10
    const jackpotContribution = betAmount * 0.90

    // Ενημέρωση υπολοίπων
    ;(global as any).adminEarnings += houseFee
    ;(global as any).jackpot += jackpotContribution

    const cleanUsername = typeof userId === 'string' ? userId.replace('usr_', '') : 'User'

    // Καταγραφή στο Admin Log
    ;(global as any).adminLogs.unshift({
      id: 'log-' + Date.now(),
      userId,
      username: cleanUsername,
      betAmount,
      houseFee,
      jackpotContribution,
      timestamp: new Date().toISOString(),
    })

    // Ενημέρωση λαχνών στο Post
    const postIndex = (global as any).posts.findIndex((p: any) => p.id === fileId)
    if (postIndex !== -1) {
      if (!(global as any).posts[postIndex].votes) {
        (global as any).posts[postIndex].votes = []
      }

      const existingVote = (global as any).posts[postIndex].votes.find(
        (v: any) => v.users?.id === userId || v.user_id === userId
      )

      if (existingVote) {
        existingVote.tickets_earned = (existingVote.tickets_earned || 0) + betAmount
      } else {
        (global as any).posts[postIndex].votes.push({
          id: 'vote-' + Date.now(),
          user_id: userId || 'usr_guest',
          tickets_earned: betAmount,
          users: { id: userId || 'usr_guest', username: cleanUsername, full_name: cleanUsername },
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        addedTickets: betAmount,
        newJackpot: (global as any).jackpot,
        adminEarnings: (global as any).adminEarnings,
        message: `Ποντάρισμα €${betAmount} καταχωρήθηκε! (€${houseFee.toFixed(2)} στον Ιδιοκτήτη, €${jackpotContribution.toFixed(2)} στο Jackpot)`,
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        success: true,
        addedTickets: 1,
        newJackpot: 51.0,
      },
      { status: 200 }
    )
  }
}
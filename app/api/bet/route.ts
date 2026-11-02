import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_BET = 100 // ίδιο με τις επιλογές του BetButton

class BetError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = String(body.userId || '')
    const postId = String(body.postId || body.fileId || '')
    const amount = Number(body.amount)

    if (!UUID.test(userId) || !UUID.test(postId)) {
      return NextResponse.json({ success: false, error: 'Λείπουν ή είναι άκυρες παράμετροι (userId / postId)' }, { status: 400 })
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_BET) {
      return NextResponse.json({ success: false, error: `Το ποντάρισμα πρέπει να είναι ακέραιο από 1 έως ${MAX_BET}€` }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Το post πρέπει να υπάρχει και να είναι ενεργό
      const post = await tx.posts.findUnique({ where: { id: postId }, select: { id: true, is_active: true } })
      if (!post || !post.is_active) {
        throw new BetError('Το post δεν είναι πλέον ενεργό', 409)
      }

      // 2. Ατομική αφαίρεση: περνάει ΜΟΝΟ αν το υπόλοιπο φτάνει (όχι διπλά κλικ, όχι δωρεάν χρήματα)
      const charged = await tx.users.updateMany({
        where: { id: userId, wallet_balance: { gte: amount } },
        data: { wallet_balance: { decrement: amount } },
      })
      if (charged.count === 0) {
        const exists = await tx.users.findUnique({ where: { id: userId }, select: { id: true } })
        throw new BetError(exists ? 'Ανεπαρκές υπόλοιπο' : 'Ο χρήστης δεν βρέθηκε', exists ? 402 : 404)
      }

      // 3. Καταγραφή λαχνών
      const vote = await tx.votes.create({
        data: {
          post_id: postId,
          user_id: userId,
          amount: amount,
          tickets_earned: BigInt(amount),
        },
        include: { users: { select: { id: true, username: true, full_name: true, email: true } } },
      })

      const user = await tx.users.findUnique({ where: { id: userId }, select: { wallet_balance: true } })

      // 4. Jackpot = 50€ + 90% των λαχνών του τρέχοντος γύρου (ίδια λογική με το /api/feed)
      const activePosts = await tx.posts.findMany({
        where: { is_active: true },
        select: { created_at: true, votes: { select: { tickets_earned: true, created_at: true } } },
      })
      let tickets = 0
      for (const p of activePosts) {
        for (const v of p.votes) {
          if (!v.created_at || !p.created_at || v.created_at >= p.created_at) tickets += Number(v.tickets_earned) || 0
        }
      }

      return {
        newBalance: Number(user?.wallet_balance ?? 0),
        jackpot: Number((50 + tickets * 0.9).toFixed(2)),
        vote: { ...vote, tickets_earned: Number(vote.tickets_earned), amount: Number(vote.amount) },
      }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    if (err instanceof BetError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status })
    }
    console.error('Bet API Exception:', err)
    return NextResponse.json({ success: false, error: 'Σφάλμα πονταρίσματος' }, { status: 500 })
  }
}

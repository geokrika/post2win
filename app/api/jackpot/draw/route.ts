import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminRequest, isCronRequest } from '@/lib/adminAuth'
import { getAthensParts, isScheduledDrawAllowed } from '@/lib/drawTime'
import { drawRowToWinner, drawRowToParticipants } from '@/lib/drawFormat'

export const dynamic = 'force-dynamic'

type DrawKind = 'SCHEDULED' | 'MANUAL'

const displayName = (u: any, fallback: string) =>
  u?.username || u?.full_name || (u?.email ? String(u.email).split('@')[0] : fallback)

async function executeDraw(kind: DrawKind) {
  // Προγραμματισμένη κλήρωση: μία φορά την ημέρα (ώρα Αθήνας). Η μοναδικότητα του draw_day στη βάση το εγγυάται.
  const drawDay = kind === 'SCHEDULED' ? getAthensParts().day : null

  if (drawDay) {
    const existing = await prisma.draw_results.findUnique({ where: { draw_day: drawDay }, select: { id: true } })
    if (existing) {
      return { success: false, executed: false, alreadyExecuted: true, message: 'Η σημερινή κλήρωση έχει ήδη γίνει.' }
    }
  }

  // 1. Ενεργά posts + δημιουργός + λαχνοί/υποστηρικτές
  const rawActivePosts = await prisma.posts.findMany({
    where: { is_active: true },
    include: { users: true, votes: { include: { users: true } } },
  })

  // Μετράμε μόνο λαχνούς μετά τη δημιουργία του post (ίδια λογική με το /api/feed)
  const ticketsOf = (p: any) => (p.votes || []).reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 1), 0)
  const allActivePosts = rawActivePosts.map((p: any) => ({
    ...p,
    votes: (p.votes || []).filter(
      (v: any) => !v.created_at || !p.created_at || new Date(v.created_at) >= new Date(p.created_at)
    ),
  }))

  // Στην κλήρωση μπαίνουν ΜΟΝΟ posts με τουλάχιστον 1 λαχνό. Τα υπόλοιπα μένουν ενεργά για τον επόμενο γύρο.
  const activePosts = allActivePosts.filter((p: any) => ticketsOf(p) > 0)

  if (activePosts.length < 4) {
    return {
      success: false,
      executed: false,
      message: `Απαιτούνται τουλάχιστον 4 posts με λαχνούς. Βρέθηκαν ${activePosts.length}/4. Η κλήρωση αναβάλλεται.`,
      activeCount: activePosts.length,
    }
  }

  // 2. Κάλπη λαχνών (κάθε λαχνός = μία συμμετοχή του post)
  const ticketPool: any[] = []
  activePosts.forEach((post: any) => {
    const n = ticketsOf(post)
    for (let i = 0; i < n; i++) ticketPool.push(post)
  })

  // 3. Jackpot: 50€ βάση + 0.90€ ανά λαχνό. 70% δημιουργός, 30% υποστηρικτές
  const totalJackpot = Number((50.0 + ticketPool.length * 0.9).toFixed(2))
  const creatorPrize = Number((totalJackpot * 0.7).toFixed(2))
  const supportersPool = Number((totalJackpot * 0.3).toFixed(2))

  // 4. Κλήρωση με βάση τους λαχνούς
  const winningPost: any = ticketPool[Math.floor(Math.random() * ticketPool.length)]
  const winnerUser = winningPost.users
  const winnerName = displayName(winnerUser, 'Winner')

  // 5. Υποστηρικτές του νικητήριου post (ένας ανά χρήστη, με άθροισμα λαχνών)
  const winningTickets = ticketsOf(winningPost)
  const supMap = new Map<string, { userId: string | null; username: string; tickets: number; prizeWon: number }>()
  for (const v of winningPost.votes || []) {
    const key = v.users?.id || v.user_id || `anon-${supMap.size}`
    const cur = supMap.get(key) || { userId: v.users?.id || v.user_id || null, username: displayName(v.users, 'Supporter'), tickets: 0, prizeWon: 0 }
    cur.tickets += Number(v.tickets_earned) || 1
    supMap.set(key, cur)
  }
  const supportersList = Array.from(supMap.values()).map((s) => ({
    ...s,
    prizeWon: winningTickets > 0 ? Number(((s.tickets / winningTickets) * supportersPool).toFixed(2)) : 0,
  }))

  const participants = activePosts.map((p: any) => ({
    id: p.id,
    title: p.title,
    text_content: p.text_content,
    users: { username: displayName(p.users, 'Player') },
    votes: [{ tickets_earned: ticketsOf(p) }],
  }))

  const activePostIds = activePosts.map((p: any) => p.id)

  // 6. Μία transaction: κλείσιμο posts + πληρωμές + αποθήκευση αποτελέσματος
  let record: any
  try {
    record = await prisma.$transaction(async (tx) => {
      const closed = await tx.posts.updateMany({
        where: { id: { in: activePostIds }, is_active: true },
        data: { is_active: false },
      })
      if (closed.count !== activePostIds.length) throw new Error('DRAW_ALREADY_EXECUTED')

      if (winnerUser?.id) {
        await tx.users.update({ where: { id: winnerUser.id }, data: { wallet_balance: { increment: creatorPrize } } })
      }
      for (const sup of supportersList) {
        if (sup.userId && sup.prizeWon > 0) {
          await tx.users.update({ where: { id: sup.userId }, data: { wallet_balance: { increment: sup.prizeWon } } })
        }
      }

      return tx.draw_results.create({
        data: {
          draw_day: drawDay,
          kind,
          winning_post_id: winningPost.id,
          winner_user_id: winnerUser?.id || null,
          winner_name: winnerName,
          post_title: winningPost.title || 'Untitled Post',
          post_text: winningPost.text_content || '',
          post_media: winningPost.file_url || null,
          total_jackpot: totalJackpot,
          creator_prize: creatorPrize,
          supporters_pool: supportersPool,
          total_tickets: ticketPool.length,
          total_posts: activePosts.length,
          supporters: supportersList,
          participants,
        },
      })
    })
  } catch (e: any) {
    // P2002 = παραβίαση μοναδικότητας draw_day → άλλο αίτημα πρόλαβε. Η transaction έχει ακυρωθεί ολόκληρη.
    if (e?.message === 'DRAW_ALREADY_EXECUTED' || e?.code === 'P2002') {
      return { success: false, executed: false, alreadyExecuted: true, message: 'Η κλήρωση έχει ήδη εκτελεστεί.' }
    }
    throw e
  }

  return {
    success: true,
    executed: true,
    message: 'Η κλήρωση ολοκληρώθηκε με επιτυχία βάσει λαχνών!',
    drawId: record.id,
    winner: { ...drawRowToWinner(record), file_type: winningPost.file_type || null },
    totalPostsCount: activePosts.length,
    totalTicketsCount: ticketPool.length,
    drawPosts: drawRowToParticipants(record),
  }
}

// Μόνο POST.
//  - Απλός χρήστης (browser): μόνο 21:00-21:10 ώρα Αθήνας, μία φορά την ημέρα.
//  - Cron με CRON_SECRET: από 21:00 και μετά, μία φορά την ημέρα.
//  - Admin (x-admin-secret): χειροκίνητη κλήρωση οποτεδήποτε (δεν μπλοκάρει την ημερήσια).
export async function POST(req: Request) {
  try {
    const admin = isAdminRequest(req)
    const cron = isCronRequest(req)

    let kind: DrawKind = 'SCHEDULED'
    if (admin) {
      kind = 'MANUAL'
    } else if (!isScheduledDrawAllowed(cron)) {
      return NextResponse.json(
        {
          success: false,
          executed: false,
          outsideWindow: true,
          message: 'Η κλήρωση γίνεται καθημερινά στις 21:00.',
          error: 'Outside draw window',
        },
        { status: 403 }
      )
    }

    const result = await executeDraw(kind)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Draw error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Draw error' }, { status: 500 })
  }
}

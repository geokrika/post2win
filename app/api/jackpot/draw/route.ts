import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function executeDraw() {
  // 1. Φέρνουμε τα ενεργά posts μαζί με τον δημιουργό (users) & τους λαχνούς/υποστηρικτές (votes)
  const rawActivePosts = await prisma.posts.findMany({
    where: { is_active: true },
    include: {
      users: true,
      votes: {
        include: { users: true },
      },
    },
  })

  // Μετράμε μόνο λαχνούς που έγιναν ΜΕΤΑ τη δημιουργία του post (ίδια λογική με το /api/feed)
  const activePosts = rawActivePosts.map((p: any) => ({
    ...p,
    votes: (p.votes || []).filter(
      (v: any) => !v.created_at || !p.created_at || new Date(v.created_at) >= new Date(p.created_at)
    ),
  }))

  // 🛑 Κανόνας: Απαιτούνται τουλάχιστον 4 ενεργά posts
  if (activePosts.length < 4) {
    return {
      success: false,
      executed: false,
      message: `Απαιτούνται τουλάχιστον 4 ενεργά posts. Βρέθηκαν ${activePosts.length}/4. Η κλήρωση αναβάλλεται.`,
      activeCount: activePosts.length,
    }
  }

  // 2. Δημιουργία της "Κάλπης" Λαχνών (Ticket Weighted Pool)
  const ticketPool: { postId: string; post: any }[] = []

  activePosts.forEach((post: any) => {
    const postVotes = post.votes || []
    const totalPostTickets = postVotes.reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 1), 0)
    const ticketsCount = totalPostTickets > 0 ? totalPostTickets : 1

    // Προσθέτουμε το post στην κάλπη όσες φορές όσες και οι λαχνοί του
    for (let i = 0; i < ticketsCount; i++) {
      ticketPool.push({ postId: post.id, post })
    }
  })

  if (ticketPool.length === 0) {
    return {
      success: false,
      executed: false,
      message: 'Δεν βρέθηκαν λαχνοί για την πραγματοποίηση της κλήρωσης.',
    }
  }

  // 💰 Δυναμικός Υπολογισμός Jackpot (€50 βάση + €0.90 ανά λαχνό)
  const totalJackpot = Number((50.00 + ticketPool.length * 0.90).toFixed(2))
  const creatorPrize = Number((totalJackpot * 0.70).toFixed(2))
  const supportersPool = Number((totalJackpot * 0.30).toFixed(2))

  // 3. 🎟️ ΚΛΗΡΩΣΗ ΜΕ ΛΑΧΝΟΥΣ (Weighted Selection)
  const winningTicketIndex = Math.floor(Math.random() * ticketPool.length)
  const winningTicket = ticketPool[winningTicketIndex]
  const winningPost: any = winningTicket.post
  const winnerUser = winningPost?.users

  // 4. Υπολογισμός μεριδίου για τους Υποστηρικτές του ΝΙΚΗΤΗΡΙΟΥ post
  const winningVotes = winningPost?.votes || []
  const winningPostTickets = winningVotes.reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 1), 0)

  const supportersList = winningVotes.map((v: any) => {
    const supUser = v.users || {}
    const supName = supUser.username || supUser.full_name || (supUser.email ? supUser.email.split('@')[0] : 'Supporter')
    const userTickets = Number(v.tickets_earned) || 1
    const prizeWon = winningPostTickets > 0 ? Number(((userTickets / winningPostTickets) * supportersPool).toFixed(2)) : 0

    return {
      userId: supUser.id,
      username: supName,
      tickets: userTickets,
      prizeWon: prizeWon,
    }
  })

  // 5. Database Transaction: Ενημέρωση Υπολοίπων & Κλείσιμο Κύκλου (is_active = false)
  const activePostIds = activePosts.map((p: any) => p.id)

  try {
    await prisma.$transaction(async (tx) => {
      // Κλείνουμε τα posts ΜΟΝΟ αν είναι ακόμα ενεργά. Αν άλλο αίτημα πρόλαβε, count != length → ακύρωση.
      const closed = await tx.posts.updateMany({
        where: { id: { in: activePostIds }, is_active: true },
        data: { is_active: false },
      })
      if (closed.count !== activePostIds.length) {
        throw new Error('DRAW_ALREADY_EXECUTED')
      }

      // Πίστωση Δημιουργού (70%)
      if (winnerUser?.id) {
        await tx.users.update({
          where: { id: winnerUser.id },
          data: { wallet_balance: { increment: creatorPrize } },
        })
      }

      // Πίστωση Υποστηρικτών (30% αναλογικά)
      for (const sup of supportersList) {
        if (sup.userId && sup.prizeWon > 0) {
          await tx.users.update({
            where: { id: sup.userId },
            data: { wallet_balance: { increment: sup.prizeWon } },
          })
        }
      }
    })
  } catch (e: any) {
    if (e?.message === 'DRAW_ALREADY_EXECUTED') {
      return {
        success: false,
        executed: false,
        alreadyExecuted: true,
        message: 'Η κλήρωση έχει ήδη εκτελεστεί.',
      }
    }
    throw e
  }

  const winnerName = winnerUser?.username || winnerUser?.full_name || (winnerUser?.email ? winnerUser.email.split('@')[0] : 'Winner')

  return {
    success: true,
    executed: true,
    message: 'Η κλήρωση ολοκληρώθηκε με επιτυχία βάσει λαχνών!',
    winner: {
      id: winningPost.id,
      winner_name: winnerName,
      winner_id: winnerUser?.id,
      post_title: winningPost.title || 'Untitled Post',
      post_text: winningPost.text_content || '',
      post_media: winningPost.file_url || null,
      file_type: winningPost.file_type || null,
      total_jackpot: totalJackpot,
      creator_prize: creatorPrize,
      supporters_pool: supportersPool,
      supporters: supportersList,
      date: new Date().toLocaleString('el-GR'),
    },
    totalPostsCount: activePosts.length,
    totalTicketsCount: ticketPool.length,
    drawPosts: activePosts.map((p: any) => ({
      id: p.id,
      title: p.title,
      text_content: p.text_content,
      users: {
        username: p.users?.username || p.users?.full_name || (p.users?.email ? p.users.email.split('@')[0] : 'Player'),
      },
      votes: (p.votes || []).map((v: any) => ({ tickets_earned: Number(v.tickets_earned) || 1 })),
    })),
  }
}

export async function GET() {
  try {
    const result = await executeDraw()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Draw error' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const result = await executeDraw()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Draw error' }, { status: 500 })
  }
}
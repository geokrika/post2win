import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function executeDraw() {
  // 1. Φέρνουμε τα ενεργά posts μαζί με τον δημιουργό (users) & τους λαχνούς/υποστηρικτές (votes)
  const activePosts = await prisma.posts.findMany({
    where: { is_active: true },
    include: {
      users: true,
      votes: {
        include: { users: true },
      },
    },
  })

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
  // Κάθε entry στο ticketPool ανήκει σε ένα συγκεκριμένο post
  const ticketPool: { postId: string; post: any }[] = []

  activePosts.forEach((post: any) => {
    const postVotes = post.votes || []
    const totalPostTickets = postVotes.reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 1), 0)
    const ticketsCount = totalPostTickets > 0 ? totalPostTickets : 1

    // Προσθέτουμε το post στην κάλπη όσες φορές όσες και οι λαχνοί του!
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

  // 3. 🎟️ ΚΛΗΡΩΣΗ ΜΕ ΛΑΧΝΟΥΣ: Επιλογή τυχαίου λαχνού από την κάλπη (Weighted Selection)
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

  const transactionQueries: any[] = [
    prisma.posts.updateMany({
      where: { id: { in: activePostIds } },
      data: { is_active: false },
    }),
  ]

  // Πίστωση Δημιουργού (70%)
  if (winnerUser?.id) {
    transactionQueries.push(
      prisma.users.update({
        where: { id: winnerUser.id },
        data: { wallet_balance: { increment: creatorPrize } },
      })
    )
  }

  // Πίστωση Υποστηρικτών (30% αναλογικά)
  supportersList.forEach((sup: any) => {
    if (sup.userId && sup.prizeWon > 0) {
      transactionQueries.push(
        prisma.users.update({
          where: { id: sup.userId },
          data: { wallet_balance: { increment: sup.prizeWon } },
        })
      )
    }
  })

  await prisma.$transaction(transactionQueries)

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
  }
}

export async function GET() {
  try {
    const result = await executeDraw()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const result = await executeDraw()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
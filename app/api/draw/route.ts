import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function executeDraw() {
  // 1. Φέρνουμε τα ενεργά posts μαζί με δημιουργό (users) και υποστηρικτές (votes)
  const activePosts = await prisma.posts.findMany({
    where: {
      is_active: true,
    },
    include: {
      users: true,
      votes: {
        include: {
          users: true,
        },
      },
    },
  })

  if (activePosts.length < 4) {
    return {
      success: false,
      executed: false,
      message: `Απαιτούνται τουλάχιστον 4 ενεργά posts. Βρέθηκαν ${activePosts.length}/4. Η κλήρωση αναβάλλεται.`,
      activeCount: activePosts.length,
    }
  }

  // 2. Επιλογή τυχαίου νικητή
  const randomIndex = Math.floor(Math.random() * activePosts.length)
  const winningPost: any = activePosts[randomIndex]
  const winnerUser = winningPost?.users

  // 3. Υπολογισμός συνολικού Jackpot και υποστηρικτών νικητή
  const postVotes = winningPost?.votes || []
  const totalTickets = postVotes.reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 1), 0)
  
  // Υπολογισμός Jackpot Pool (50€ βάση + 0.90€ ανά λαχνό)
  const totalJackpot = Number((50.00 + totalTickets * 0.90).toFixed(2))
  const creatorPrize = Number((totalJackpot * 0.70).toFixed(2))
  const supportersPool = Number((totalJackpot * 0.30).toFixed(2))

  // 4. Επεξεργασία λίστας Υποστηρικτών με τα κέρδη τους
  const supportersList = postVotes.map((v: any) => {
    const supUser = v.users || {}
    const supName = supUser.username || supUser.full_name || (supUser.email ? supUser.email.split('@')[0] : 'Supporter')
    const userTickets = Number(v.tickets_earned) || 1
    const prizeWon = totalTickets > 0 ? Number(((userTickets / totalTickets) * supportersPool).toFixed(2)) : 0

    return {
      userId: supUser.id,
      username: supName,
      tickets: userTickets,
      prizeWon: prizeWon,
    }
  })

  // 5. Ενημέρωση Βάσης Δεδομένων
  const activePostIds = activePosts.map((p: any) => p.id)

  await prisma.$transaction([
    prisma.posts.updateMany({
      where: { id: { in: activePostIds } },
      data: { is_active: false },
    }),
    ...(winnerUser
      ? [
          prisma.users.update({
            where: { id: winnerUser.id },
            data: { wallet_balance: { increment: creatorPrize } },
          }),
        ]
      : []),
  ])

  const winnerName = winnerUser?.username || winnerUser?.full_name || (winnerUser?.email ? winnerUser.email.split('@')[0] : 'Winner')

  return {
    success: true,
    executed: true,
    message: 'Η κλήρωση ολοκληρώθηκε με επιτυχία!',
    winner: {
      id: winningPost.id,
      winner_name: winnerName,
      winner_id: winnerUser?.id,
      post_title: winningPost.title || 'Untitled Post',
      post_text: winningPost.text_content || '',
      post_media: winningPost.file_url || null,
      total_jackpot: totalJackpot,
      creator_prize: creatorPrize,
      supporters_pool: supportersPool,
      supporters: supportersList, // 🟢 Πλήρης λίστα υποστηρικτών με ονόματα & ποσά
      date: new Date().toLocaleString('el-GR'),
    },
    totalPostsCount: activePosts.length,
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
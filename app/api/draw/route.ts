import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function executeDraw() {
  // 1. Φέρνουμε όλα τα ενεργά posts που έχουν ΤΟΥΛΑΧΙΣΤΟΝ 1 λαχνό (>0)
  // 🟢 Χρήση `prisma.posts` (πληθυντικός)
  const activePosts = await prisma.posts.findMany({
    where: {
      status: 'ACTIVE',
      ticketsCount: {
        gt: 0, // 🟢 Μόνο posts με αγορασμένους λαχνούς
      },
    },
    include: {
      author: true,
      tickets: true,
    },
  })

  // 2. Έλεγχος αν υπάρχουν τουλάχιστον 4 posts
  if (activePosts.length < 4) {
    return {
      success: false,
      executed: false,
      message: `Απαιτούνται τουλάχιστον 4 posts με λαχνούς. Βρέθηκαν ${activePosts.length}/4. Η κλήρωση αναβάλλεται για την επόμενη ώρα.`,
      activeCount: activePosts.length,
    }
  }

  // 3. Συγκέντρωση όλων των εγκύρων tickets από τα ενεργά posts (με ρητό τύπο : any)
  const allTickets = activePosts.flatMap((post: any) => post.tickets || [])

  if (allTickets.length === 0) {
    return {
      success: false,
      executed: false,
      message: 'Δεν βρέθηκαν αγορασμένοι λαχνοί στα ενεργά posts.',
    }
  }

  // 4. Επιλογή τυχαίου νικητήριου λαχνού
  const randomIndex = Math.floor(Math.random() * allTickets.length)
  const winningTicket = allTickets[randomIndex]

  // 5. Βρίσκουμε το post και τον χρήστη που κέρδισε (με ρητό τύπο : any)
  const winningPost = activePosts.find((p: any) => p.id === winningTicket.postId)
  const winnerUser = winningPost?.author

  // 6. Ενημέρωση των posts στη βάση (με ρητό τύπο : any)
  const activePostIds = activePosts.map((p: any) => p.id)

  await prisma.$transaction([
    // 🟢 Χρήση `prisma.posts` (πληθυντικός)
    prisma.posts.updateMany({
      where: { id: { in: activePostIds } },
      data: { status: 'COMPLETED' },
    }),
    // Πίστωση του νικητή (+50€ στο wallet_balance)
    ...(winnerUser
      ? [
          prisma.users.update({
            where: { id: winnerUser.id },
            data: {
              wallet_balance: {
                increment: 50.0,
              },
            },
          }),
        ]
      : []),
  ])

  return {
    success: true,
    executed: true,
    message: 'Η κλήρωση ολοκληρώθηκε με επιτυχία!',
    winner: {
      postId: winningPost?.id,
      userId: winnerUser?.id,
      username: winnerUser?.username,
      ticketId: winningTicket.id,
    },
    totalPostsCount: activePosts.length,
    totalTicketsCount: allTickets.length,
  }
}

// 🟢 GET Endpoint: Καλείται αυτόματα από το Vercel Cron κάθε ακριβώς ώρα (:00)
export async function GET() {
  try {
    const result = await executeDraw()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Draw Execution Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Σφάλμα κατά την εκτέλεση της κλήρωσης.' },
      { status: 500 }
    )
  }
}

// 🟢 POST Endpoint: Για χειροκίνητη κλήρωση αν χρειαστεί από το Admin Panel
export async function POST() {
  try {
    const result = await executeDraw()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Draw Execution Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Σφάλμα κατά την εκτέλεση της κλήρωσης.' },
      { status: 500 }
    )
  }
}
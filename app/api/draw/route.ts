import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function executeDraw() {
  // 1. Φέρνουμε όλα τα ενεργά posts που έχουν ΤΟΥΛΑΧΙΣΤΟΝ 1 λαχνό (>0)
  const activePosts = await prisma.post.findMany({
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

  // 3. Συγκέντρωση όλων των εγκύρων tickets από τα ενεργά posts
  const allTickets = activePosts.flatMap((post) => post.tickets)

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

  // 5. Βρίσκουμε το post και τον χρήστη που κέρδισε
  const winningPost = activePosts.find((p) => p.id === winningTicket.postId)
  const winnerUser = winningPost?.author

  // 6. Ενημέρωση των posts στη βάση (κλείσιμο της τρέχουσας κλήρωσης)
  const activePostIds = activePosts.map((p) => p.id)

  await prisma.$transaction([
    // Αλλαγή status των συμμετεχόντων posts σε COMPLETED
    prisma.post.updateMany({
      where: { id: { in: activePostIds } },
      data: { status: 'COMPLETED' },
    }),
    // Πίστωση του νικητή (παράδειγμα: +50€ στο wallet_balance αν υπάρχει ο χρήστης)
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
export async function GET(req: Request) {
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
export async function POST(req: Request) {
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
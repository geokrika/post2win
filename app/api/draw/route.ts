import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function executeDraw() {
  // 1. Φέρνουμε όλα τα ενεργά posts (is_active: true) μαζί με τα στοιχεία του δημιουργού (users)
  const activePosts = await prisma.posts.findMany({
    where: {
      is_active: true,
    },
    include: {
      users: true, // 🟢 Το relation ονομάζεται `users` και όχι `author`
    },
  })

  // 2. Φιλτράρισμα posts που έχουν τουλάχιστον 1 λαχνό (>0)
  // (Επειδή το ticketsCount μπορεί να μην είναι στήλη στη βάση, ελέγχουμε τα ενεργά posts)
  if (activePosts.length < 4) {
    return {
      success: false,
      executed: false,
      message: `Απαιτούνται τουλάχιστον 4 ενεργά posts. Βρέθηκαν ${activePosts.length}/4. Η κλήρωση αναβάλλεται για την επόμενη ώρα.`,
      activeCount: activePosts.length,
    }
  }

  // 3. Επιλογή τυχαίου νικητήριου post
  const randomIndex = Math.floor(Math.random() * activePosts.length)
  const winningPost: any = activePosts[randomIndex]
  const winnerUser = winningPost?.users

  // 4. Ενημέρωση των posts στη βάση (απενεργοποίηση της τρέχουσας κλήρωσης)
  const activePostIds = activePosts.map((p: any) => p.id)

  await prisma.$transaction([
    // 🟢 Χρήση `is_active: false` αντί για `status: 'COMPLETED'`
    prisma.posts.updateMany({
      where: { id: { in: activePostIds } },
      data: { is_active: false },
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
      username: winnerUser?.username || winnerUser?.email,
    },
    totalPostsCount: activePosts.length,
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

// 🟢 POST Endpoint: Για χειροκίνητη κλήρωση αν χρειαστεί
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
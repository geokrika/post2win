import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function executeDraw() {
  // 1. Φέρνουμε όλα τα ενεργά posts μαζί με τους δημιουργούς τους (users)
  const activePosts = await prisma.posts.findMany({
    where: {
      is_active: true,
    },
    include: {
      users: true,
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

  // 2. Επιλογή τυχαίου νικητήριου post
  const randomIndex = Math.floor(Math.random() * activePosts.length)
  const winningPost: any = activePosts[randomIndex]
  const winnerUser = winningPost?.users

  // 3. Υπολογισμός Jackpot & Μοιρασιάς (70% Creator / 30% Supporters)
  const totalJackpot = 50.00 // Ή το δυναμικό ποσό από τη βάση σου
  const creatorPrize = Number((totalJackpot * 0.70).toFixed(2))
  const supportersPool = Number((totalJackpot * 0.30).toFixed(2))

  // 4. Ενημέρωση των posts στη βάση (is_active: false)
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
            data: {
              wallet_balance: {
                increment: creatorPrize,
              },
            },
          }),
        ]
      : []),
  ])

  // 5. Επιστροφή ΟΛΩΝ των πραγματικών δεδομένων στο Frontend
  const winnerName = winnerUser?.username || winnerUser?.full_name || (winnerUser?.email ? winnerUser.email.split('@')[0] : 'User')

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
      supporters: [], // Αν υπάρχουν votes/supporters στη βάση, περνούν εδώ
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
    console.error('Draw Execution Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Σφάλμα κατά την εκτέλεση της κλήρωσης.' },
      { status: 500 }
    )
  }
}

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
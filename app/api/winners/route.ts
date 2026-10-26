import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Φέρνουμε τα ολοκληρωμένα (ανενεργά) posts που είχαν νικητή
    const completedPosts = await prisma.posts.findMany({
      where: {
        is_active: false,
      },
      include: {
        users: true,
        votes: {
          include: {
            users: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 20, // Επιστρέφει τους τελευταίους 20 νικητές
    })

    const history = completedPosts.map((post: any) => {
      const winnerUser = post.users
      const postVotes = post.votes || []
      const totalTickets = postVotes.reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 1), 0)
      
      const totalJackpot = Number((50.00 + totalTickets * 0.90).toFixed(2))
      const creatorPrize = Number((totalJackpot * 0.70).toFixed(2))
      const supportersPool = Number((totalJackpot * 0.30).toFixed(2))

      const supporters = postVotes.map((v: any) => ({
        username: v.users?.username || v.users?.full_name || (v.users?.email ? v.users.email.split('@')[0] : 'Supporter'),
        tickets: Number(v.tickets_earned) || 1,
        prizeWon: totalTickets > 0 ? Number(((Number(v.tickets_earned || 1) / totalTickets) * supportersPool).toFixed(2)) : 0,
      }))

      return {
        id: post.id,
        winner_name: winnerUser?.username || winnerUser?.full_name || (winnerUser?.email ? winnerUser.email.split('@')[0] : 'Winner'),
        post_title: post.title || 'Untitled Post',
        post_text: post.text_content || '',
        post_media: post.file_url || null,
        total_jackpot: totalJackpot,
        creator_prize: creatorPrize,
        supporters_pool: supportersPool,
        supporters: supporters,
        date: post.created_at ? new Date(post.created_at).toLocaleString('el-GR') : '',
      }
    })

    return NextResponse.json({ success: true, history })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
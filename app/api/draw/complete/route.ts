import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const { winningPostId, totalJackpot } = await req.json()

    if (!winningPostId) {
      return NextResponse.json({ success: false, error: 'Missing winningPostId' }, { status: 400 })
    }

    const jackpot = Number(totalJackpot) || 50.00
    const winnerShare = Number((jackpot * 0.70).toFixed(2)) // 70% στον Creator
    const supportersShare = Number((jackpot * 0.30).toFixed(2)) // 30% στους Supporters

    // 1. Φέρνουμε το νικητήριο post μαζί με τα votes/πονταρίσματα
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*, users(*), votes(*, users(*))')
      .eq('id', winningPostId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
    }

    // 2. Πίστωση 70% στον Νικητή / Δημιουργό
    const creatorId = post.user_id || post.users?.id
    if (creatorId) {
      const { data: creator } = await supabase.from('users').select('wallet_balance').eq('id', creatorId).single()
      const currentBal = Number(creator?.wallet_balance) || 0
      const newBal = Number((currentBal + winnerShare).toFixed(2))

      await supabase
        .from('users')
        .update({ wallet_balance: newBal })
        .eq('id', creatorId)
    }

    // 3. Υπολογισμός & Πίστωση 30% στους Υποστηρικτές
    const votes = post.votes || []
    const totalTickets = votes.reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 1), 0)

    const supportersList: any[] = []

    if (totalTickets > 0 && votes.length > 0) {
      const pricePerTicket = supportersShare / totalTickets

      for (const vote of votes) {
        const supporterId = vote.user_id || vote.users?.id
        const ticketsCount = Number(vote.tickets_earned) || 1
        const earnedAmount = Number((ticketsCount * pricePerTicket).toFixed(2))

        if (supporterId) {
          const { data: suppUser } = await supabase.from('users').select('wallet_balance').eq('id', supporterId).single()
          const suppBal = Number(suppUser?.wallet_balance) || 0
          const newSuppBal = Number((suppBal + earnedAmount).toFixed(2))

          await supabase
            .from('users')
            .update({ wallet_balance: newSuppBal })
            .eq('id', supporterId)
        }

        supportersList.push({
          username: vote.users?.username || vote.users?.full_name || 'User',
          tickets: ticketsCount,
          earnedAmount: earnedAmount,
        })
      }
    }

    // 4. Αλλαγή status των posts της κλήρωσης σε 'COMPLETED'
    await supabase
      .from('posts')
      .update({ status: 'COMPLETED' })
      .eq('status', 'ACTIVE')

    return NextResponse.json({
      success: true,
      winnerPrize: winnerShare,
      supportersPrize: supportersShare,
      supportersList: supportersList,
    })

  } catch (err: any) {
    console.error('Error in draw complete API:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
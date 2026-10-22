import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    // Υποστήριξη είτε για fileId είτε για postId
    const userId = body.userId
    const targetPostId = body.fileId || body.postId
    const betAmount = Number(body.amount) || 1.00
    const tickets = Number(body.ticketsEarned) || betAmount

    if (!userId || !targetPostId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or postId' },
        { status: 400 }
      )
    }

    // 1. Βρίσκουμε το UUID του post
    let realPostId = targetPostId
    const { data: postData } = await supabase
      .from('posts')
      .select('id')
      .eq('id', targetPostId)
      .maybeSingle()

    if (postData?.id) {
      realPostId = postData.id
    } else {
      const { data: hashPost } = await supabase
        .from('posts')
        .select('id')
        .eq('hash_id', targetPostId)
        .maybeSingle()
      if (hashPost?.id) realPostId = hashPost.id
    }

    // 2. Έλεγχος υπολοίπου χρήστη
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('wallet_balance, username')
      .eq('id', userId)
      .maybeSingle()

    if (userErr || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const currentBalance = Number(user.wallet_balance) || 0
    if (currentBalance < betAmount) {
      return NextResponse.json(
        { success: false, error: `Ανεπαρκές υπόλοιπο (€${currentBalance.toFixed(2)})` },
        { status: 400 }
      )
    }

    // 3. Αφαίρεση χρημάτων
    const newBalance = Number((currentBalance - betAmount).toFixed(2))
    const { error: balErr } = await supabase
      .from('users')
      .update({ wallet_balance: newBalance })
      .eq('id', userId)

    if (balErr) {
      return NextResponse.json(
        { success: false, error: `Wallet update error: ${balErr.message}` },
        { status: 500 }
      )
    }

    // 4. Εγγραφή στο votes
    const { data: newVote, error: voteErr } = await supabase
      .from('votes')
      .insert({
        id: userId,
        post_id: realPostId,
        tickets_earned: tickets,
      })
      .select('id, user_id, post_id, tickets_earned')
      .maybeSingle()

    if (voteErr) {
      // Επαναφορά χρημάτων
      await supabase.from('users').update({ wallet_balance: currentBalance }).eq('id', userId)
      return NextResponse.json(
        { success: false, error: `Vote error: ${voteErr.message}` },
        { status: 500 }
      )
    }

    // 5. Ενημέρωση post status
    await supabase.from('posts').update({ status: 'ACTIVE' }).eq('id', realPostId)

    // 6. Υπολογισμός νέου Jackpot (50€ + 90% των συνολικών tickets)
    const { data: activePosts } = await supabase
      .from('posts')
      .select('votes(tickets_earned)')
      .or('status.eq.ACTIVE,status.is.null')

    let totalTickets = 0
    if (activePosts) {
      activePosts.forEach((p: any) => {
        p.votes?.forEach((v: any) => {
          totalTickets += Number(v.tickets_earned) || 0
        })
      })
    }

    const updatedJackpot = Number((50.00 + totalTickets * 0.90).toFixed(2))

    return NextResponse.json({
      success: true,
      newBalance: newBalance,
      jackpot: updatedJackpot,
      vote: {
        ...newVote,
        users: { id: userId, username: user.username || 'User' }
      },
    })

  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server exception' },
      { status: 500 }
    )
  }
}
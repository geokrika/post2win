import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, amount, ticketsEarned } = body
    
    const targetPostId = body.postId || body.fileId
    const ticketsCount = Math.max(1, Number(amount) || Number(ticketsEarned) || 1)

    if (!targetPostId || !userId || userId === 'undefined' || userId === 'null') {
      return NextResponse.json({ success: false, error: 'Λείπουν παράμετροι (userId / postId)' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Ανάκτηση τρέχοντος υπολοίπου χρήστη
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, username, full_name, email, wallet_balance')
      .eq('id', userId)
      .single()

    if (userErr || !user) {
      return NextResponse.json({ success: false, error: 'Ο χρήστης δεν βρέθηκε' }, { status: 404 })
    }

    let currentBalance = Number(user.wallet_balance)

    // 🔄 ΑΥΤΟΜΑΤΗ ΕΠΑΝΑΦΟΡΑ ΣΤΑ 100€ ΑΝ ΤΟ ΥΠΟΛΟΙΠΟ ΔΕΝ ΦΤΑΝΕΙ
    if (isNaN(currentBalance) || currentBalance < ticketsCount) {
      currentBalance = 100.0
    }

    // 2. Υπολογισμός νέου υπολοίπου
    let newBalance = currentBalance - ticketsCount

    // Αν πέσει κάτω από 1€ μετά το ποντάρισμα, επαναφορά στα 100€
    if (newBalance < 1) {
      newBalance = 100.0
    }

    // 3. Ενημέρωση νέου υπολοίπου στη βάση Supabase
    await supabase.from('users').update({ wallet_balance: newBalance }).eq('id', userId)

    // 4. ΕΓΓΡΑΦΗ ΥΠΟΣΤΗΡΙΚΤΗ ΣΤΟΝ ΠΙΝΑΚΑ VOTES (Περιλαμβάνει amount & tickets_earned)
    const { data: newVote, error: voteErr } = await supabase
      .from('votes')
      .insert({
        post_id: targetPostId,
        user_id: userId,
        amount: ticketsCount,          // 👈 Προσθήκη για την ικανοποίηση του NOT NULL constraint
        tickets_earned: ticketsCount,
      })
      .select('*, users(id, username, full_name, email)')
      .single()

    if (voteErr) {
      console.error('Error inserting vote/supporter:', voteErr)
      return NextResponse.json({ success: false, error: voteErr.message }, { status: 500 })
    }

    // 5. Υπολογισμός νέου Jackpot Pool
    const { data: allVotes } = await supabase.from('votes').select('amount, tickets_earned')
    const totalJackpot = allVotes 
      ? allVotes.reduce((acc, v) => acc + (Number(v.amount || v.tickets_earned) || 1), 0) 
      : 50.0

    const supporterData = newVote || {
      post_id: targetPostId,
      user_id: userId,
      amount: ticketsCount,
      tickets_earned: ticketsCount,
      users: {
        username: user.username,
        full_name: user.full_name,
        email: user.email,
      }
    }

    return NextResponse.json({
      success: true,
      newBalance: newBalance,
      jackpot: totalJackpot,
      vote: supporterData,
    })
  } catch (err: any) {
    console.error('Bet API Exception:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
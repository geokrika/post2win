import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST() {
  try {
    // 1. Φέρνουμε όλα τα ενεργά posts
    const { data: rawPosts, error: postsError } = await supabase
      .from('posts')
      .select('*, users(id, username, full_name, email)')
      .eq('is_active', true)

    if (postsError || !rawPosts || rawPosts.length === 0) {
      return NextResponse.json({ success: false, error: 'No active posts found' }, { status: 400 })
    }

    // 2. Επιλογή νικητήριου post
    const winningPost = rawPosts[Math.floor(Math.random() * rawPosts.length)]
    const activePostIds = rawPosts.map((p) => p.id)

    // 3. Ανάκτηση όλων των votes
    const { data: rawVotes } = await supabase
      .from('votes')
      .select('*, users(id, username, full_name, email, wallet_balance)')
      .in('post_id', activePostIds)

    const votesList = rawVotes || []
    const totalTickets = votesList.reduce((acc, v) => acc + (Number(v.tickets_earned) || 1), 0)
    const totalJackpot = Number((50.00 + totalTickets * 0.90).toFixed(2))

    // 💰 ΥΠΟΛΟΓΙΣΜΟΣ ΜΟΙΡΑΣΜΑΤΟΣ (70% Creator / 30% Supporters)
    const creatorPrize = Number((totalJackpot * 0.70).toFixed(2))
    const supportersPool = Number((totalJackpot * 0.30).toFixed(2))

    // 4. Πίστωση στον Δημιουργό (70%)
    let creatorNewBalance = creatorPrize
    if (winningPost.user_id) {
      const { data: creatorUser } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', winningPost.user_id)
        .single()

      const currentBal = Number(creatorUser?.wallet_balance || 100)
      creatorNewBalance = Number((currentBal + creatorPrize).toFixed(2))

      await supabase
        .from('users')
        .update({ wallet_balance: creatorNewBalance })
        .eq('id', winningPost.user_id)
    }

    // 5. Πίστωση στους Υποστηρικτές του Νικητήριου Post (30%)
    const winningVotes = votesList.filter((v) => v.post_id === winningPost.id)
    const winningPostTickets = winningVotes.reduce((acc, v) => acc + (Number(v.tickets_earned) || 1), 0)

    const supportersSummary: any[] = []

    if (winningPostTickets > 0 && supportersPool > 0) {
      for (const vote of winningVotes) {
        const voterId = vote.user_id
        if (!voterId) continue

        const voterTickets = Number(vote.tickets_earned) || 1
        // Αναλογικό μερίδιο υποστηρικτή
        const supporterShare = Number(((voterTickets / winningPostTickets) * supportersPool).toFixed(2))

        const { data: voterUser } = await supabase
          .from('users')
          .select('wallet_balance, username, full_name, email')
          .eq('id', voterId)
          .single()

        if (voterUser) {
          const currentVoterBal = Number(voterUser.wallet_balance || 100)
          const updatedVoterBal = Number((currentVoterBal + supporterShare).toFixed(2))

          // Ενημέρωση υπολοίπου υποστηρικτή στη βάση
          await supabase
            .from('users')
            .update({ wallet_balance: updatedVoterBal })
            .eq('id', voterId)

          supportersSummary.push({
            username: voterUser.username || voterUser.full_name || voterUser.email?.split('@')[0] || 'Player',
            tickets: voterTickets,
            prizeWon: supporterShare
          })
        }
      }
    }

    // 6. Αρχειοθέτηση των posts για τον νέο γύρο
    await supabase
      .from('posts')
      .update({ is_active: false })
      .in('id', activePostIds)

    const author = winningPost.users || {}
    const winnerName = author.username || author.full_name || author.email?.split('@')[0] || 'User'

    return NextResponse.json({
      success: true,
      winner: {
        id: winningPost.user_id,
        username: winnerName,
        postTitle: winningPost.title || 'Untitled Post',
        postText: winningPost.text_content || '',
        postMedia: winningPost.file_url || null,
        totalJackpot: totalJackpot,
        creatorPrize: creatorPrize,
        supportersPool: supportersPool,
        newBalance: creatorNewBalance,
        supporters: supportersSummary
      }
    })

  } catch (err: any) {
    console.error('Draw Execution Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
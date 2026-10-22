import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    // 1. Ανάκτηση ΜΟΝΟ των ΕΝΕΡΓΩΝ Posts (is_active = true)
    const { data: rawPosts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (postsError || !rawPosts) {
      return NextResponse.json({ success: true, posts: [], jackpot: 50.00 })
    }

    const postsList = rawPosts
    const activePostIds = postsList.map((p) => p.id)

    // 2. Ανάκτηση Votes ΜΟΝΟ για τα ενεργά posts
    let votesList: any[] = []
    if (activePostIds.length > 0) {
      const { data: rawVotes } = await supabase
        .from('votes')
        .select('*')
        .in('post_id', activePostIds)
      
      votesList = rawVotes || []
    }

    // 3. Ανάκτηση Users
    const usersMap = new Map()
    try {
      const { data: rawUsers } = await supabase.from('users').select('id, username, full_name, email')
      if (rawUsers) {
        rawUsers.forEach((u) => usersMap.set(u.id, u))
      }
    } catch (e) {}

    let totalTicketsCount = 0

    // 4. Μορφοποίηση Posts & Μηδενισμός παλιών votes αν το post μόλις επανήλθε
    const formattedPosts = postsList.map((post) => {
      const author = usersMap.get(post.user_id) || {}
      const authorUsername = 
        author.username || 
        author.full_name || 
        (author.email ? author.email.split('@')[0] : null) || 
        'User'

      // Φιλτράρουμε μόνο τα votes που έγιναν ΜΕΤΑ την τελευταία ενεργοποίηση/repost του post
      const postVotes = votesList.filter((v) => {
        if (v.post_id !== post.id) return false
        // Αν το vote έγινε πριν την ημερομηνία επαναφοράς (created_at), το αγνοούμε για τον νέο γύρο
        return new Date(v.created_at) >= new Date(post.created_at)
      })

      const formattedVotes = postVotes.map((v) => {
        const voter = usersMap.get(v.user_id) || {}
        const tickets = Number(v.tickets_earned) || 1
        totalTicketsCount += tickets

        const voterUsername = 
          voter.username || 
          voter.full_name || 
          (voter.email ? voter.email.split('@')[0] : null) || 
          'Player'

        return {
          id: v.id || 'v-' + Math.random(),
          tickets_earned: tickets,
          user_id: v.user_id,
          users: {
            username: voterUsername,
            full_name: voterUsername
          }
        }
      })

      return {
        ...post,
        title: post.title || null,
        text_content: post.text_content || '',
        users: {
          username: authorUsername,
          full_name: authorUsername
        },
        votes: formattedVotes // 👈 Θα είναι [] (0 tickets) αν μόλις έγινε repost!
      }
    })

    const calculatedJackpot = Number((50.00 + totalTicketsCount * 0.90).toFixed(2))

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      jackpot: calculatedJackpot
    })

  } catch (err: any) {
    console.error('Feed Route Error:', err)
    return NextResponse.json({ success: true, posts: [], jackpot: 50.00 })
  }
}
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Φόρτωση ΟΛΩΝ των εγγεγραμμένων χρηστών από το Auth της Supabase
    let authUsers: any[] = []
    try {
      const { data: authData } = await supabase.auth.admin.listUsers()
      if (authData && authData.users) {
        authUsers = authData.users
      }
    } catch (e) {
      console.log('Admin Auth List error, fallback to table query')
    }

    // 2. Φόρτωση χρηστών από πίνακες users / profiles με όλα τα πιθανά πεδία υπολοίπου
    const { data: usersData } = await supabase.from('users').select('*')
    const { data: profilesData } = await supabase.from('profiles').select('*')

    // 3. Φόρτωση δημοσιεύσεων & votes
    const { data: posts } = await supabase.from('posts').select('*')
    const { data: votes } = await supabase.from('votes').select('*')

    const postsList = posts || []
    const votesList = votes || []
    const tableUsers = profilesData?.length ? profilesData : (usersData || [])

    const userMap = new Map<string, any>()

    // Βοηθητική συνάρτηση ακριβούς εξαγωγής υπολοίπου
    const extractBalance = (obj: any): number => {
      if (!obj) return 0
      const val = obj.wallet_balance ?? obj.balance ?? obj.credits ?? obj.tokens ?? obj.wallet ?? 0
      return Number(val) || 0
    }

    // Α) Προσθήκη από το Auth της Supabase (Όλοι οι εγγεγραμμένοι)
    authUsers.forEach((u: any) => {
      const bal = extractBalance(u.user_metadata) || extractBalance(u)
      userMap.set(String(u.id), {
        id: u.id,
        username: u.user_metadata?.username || u.user_metadata?.full_name || u.email || `Χρήστης #${String(u.id).substring(0, 6)}`,
        balance: bal,
        created_at: u.created_at,
      })
    })

    // Β) Προσθήκη/Συμπλήρωση από τους πίνακες users/profiles
    tableUsers.forEach((u: any) => {
      const uid = String(u.id)
      const existing = userMap.get(uid) || {}
      const dbBal = extractBalance(u)

      userMap.set(uid, {
        id: uid,
        username: u.username || u.name || u.email || existing.username || `Χρήστης #${uid.substring(0, 6)}`,
        balance: dbBal > 0 ? dbBal : (existing.balance || 0),
        created_at: u.created_at || existing.created_at,
      })
    })

    // Γ) Εξαγωγή χρηστών από τα Posts αν λείπουν
    postsList.forEach((p: any) => {
      const uid = String(p.user_id || p.author_id || p.username || 'guest')
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          id: uid,
          username: p.username || p.author_name || `Χρήστης #${uid.substring(0, 6)}`,
          balance: 0,
          created_at: p.created_at,
        })
      }
    })

    // 📊 Υπολογισμός στατιστικών ανά χρήστη
    const detailedUsers = Array.from(userMap.values()).map((u) => {
      const userAllPosts = postsList.filter(
        (p: any) => String(p.user_id || p.author_id || p.username) === String(u.id)
      )

      const userActivePosts = userAllPosts.filter(
        (p: any) => p.is_active === true || p.is_active === 1
      )

      // 💰 Ακριβής υπολογισμός συγκεντρωμένων ποσών στα ενεργά posts
      const activePostIds = new Set(userActivePosts.map((p: any) => String(p.id)))
      const totalAmountOnUserPosts = votesList
        .filter((v: any) => activePostIds.has(String(v.post_id)))
        .reduce((sum: number, v: any) => {
          const voteVal = v.amount ?? v.tickets_earned ?? v.votes ?? v.price ?? 0
          return sum + (Number(voteVal) || 0)
        }, 0)

      return {
        id: u.id,
        username: u.username,
        balance: Number((u.balance || 0).toFixed(2)),
        isLive: userActivePosts.length > 0,
        activePostsCount: userActivePosts.length,
        totalPostsHistory: userAllPosts.length,
        totalAmountOnUserPosts: Number(totalAmountOnUserPosts.toFixed(2)),
      }
    })

    // 💰 Γενικά Στατιστικά
    const activePosts = postsList.filter((p: any) => p.is_active === true || p.is_active === 1)
    const activePostIds = new Set(activePosts.map((p: any) => String(p.id)))

    const currentPoolRevenue = votesList
      .filter((v: any) => activePostIds.has(String(v.post_id)))
      .reduce((sum: number, v: any) => {
        const voteVal = v.amount ?? v.tickets_earned ?? v.votes ?? v.price ?? 0
        return sum + (Number(voteVal) || 0)
      }, 0)

    const totalAllTimeRevenue = votesList.reduce((sum: number, v: any) => {
      const voteVal = v.amount ?? v.tickets_earned ?? v.votes ?? v.price ?? 0
      return sum + (Number(voteVal) || 0)
    }, 0)

    const BASE_JACKPOT = 50.0
    const currentJackpot = BASE_JACKPOT + currentPoolRevenue * 0.90
    const currentProfit = currentPoolRevenue * 0.10
    const totalProfit = totalAllTimeRevenue * 0.10
    const totalHistoricalJackpot = totalAllTimeRevenue * 0.90 + BASE_JACKPOT

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: detailedUsers.length,
        currentJackpot: Number(currentJackpot.toFixed(2)),
        totalHistoricalJackpot: Number(totalHistoricalJackpot.toFixed(2)),
        currentProfit: Number(currentProfit.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
      },
      users: detailedUsers,
    })
  } catch (err: any) {
    console.error('Admin Stats API Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
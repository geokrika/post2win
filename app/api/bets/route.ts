import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { fileId, userId, amount = 1 } = body
    const betAmount = Number(amount) || 1

    const houseFee = betAmount * 0.10
    const jackpotContribution = betAmount * 0.90

    if (!(global as any).posts) (global as any).posts = []
    if ((global as any).jackpot === undefined) (global as any).jackpot = 50.0
    if ((global as any).adminEarnings === undefined) (global as any).adminEarnings = 0.0

    ;(global as any).adminEarnings += houseFee
    ;(global as any).jackpot += jackpotContribution

    const cleanUsername = typeof userId === 'string' ? userId.replace('usr_', '') : 'User'

    const postIndex = (global as any).posts.findIndex((p: any) => p.id === fileId)
    if (postIndex !== -1) {
      if (!(global as any).posts[postIndex].votes) {
        (global as any).posts[postIndex].votes = []
      }

      const existingVote = (global as any).posts[postIndex].votes.find(
        (v: any) => v.users?.id === userId || v.user_id === userId
      )

      if (existingVote) {
        existingVote.tickets_earned = (existingVote.tickets_earned || 0) + betAmount
      } else {
        (global as any).posts[postIndex].votes.push({
          id: 'vote-' + Date.now(),
          user_id: userId || 'usr_guest',
          tickets_earned: betAmount,
          users: { id: userId || 'usr_guest', username: cleanUsername, full_name: cleanUsername },
        })
      }
    }

    try {
      const { Client } = await import('pg')
      const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL

      if (connectionString) {
        const client = new Client({
          connectionString,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 3000,
        })

        await client.connect()

        await client.query(`
          CREATE TABLE IF NOT EXISTS admin_revenues (
            id SERIAL PRIMARY KEY,
            user_id TEXT,
            bet_amount NUMERIC,
            house_fee NUMERIC,
            jackpot_contribution NUMERIC,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `)

        await client.query(
          `INSERT INTO admin_revenues (user_id, bet_amount, house_fee, jackpot_contribution) VALUES ($1, $2, $3, $4)`,
          [cleanUsername, betAmount, houseFee, jackpotContribution]
        )

        await client.end()
      }
    } catch (dbErr) {
      console.warn('Supabase DB write skipped (used memory):', dbErr)
    }

    return NextResponse.json(
      {
        success: true,
        addedTickets: betAmount,
        newJackpot: (global as any).jackpot,
        adminEarnings: (global as any).adminEarnings,
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
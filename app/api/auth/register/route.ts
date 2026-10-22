import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    
    const username = body?.username?.trim() || ''
    const fullName = body?.fullName?.trim() || username
    const email = body?.email?.trim() || `${username.toLowerCase()}@nexus.local`
    const phone = body?.phone?.trim() || null
    const password = body?.password || 'default_password'

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Το όνομα χρήστη είναι υποχρεωτικό' },
        { status: 400 }
      )
    }

    // 1. Έλεγχος αν υπάρχει ήδη ο χρήστης
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { username: username },
          { email: email },
          ...(phone ? [{ phone_number: phone }] : [])
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Ο χρήστης με αυτό το username ή email υπάρχει ήδη' },
        { status: 400 }
      )
    }

    // 2. Παραγωγή μοναδικού player_id
    const generatedPlayerId = 'PL' + Math.floor(100000 + Math.random() * 900000)

    // 3. Εγγραφή στη Supabase με ΟΛΑ τα υποχρεωτικά πεδία της Prisma
    const newUser = await prisma.users.create({
      data: {
        player_id: generatedPlayerId,
        username: username, // 👈 Προστέθηκε το υποχρεωτικό πεδίο
        email: email,
        phone_number: phone,
        password_hash: password,
        full_name: fullName,
        default_display_identity: username || fullName,
        wallet_balance: 100.00,
        is_verified: true,
      },
    })

    return NextResponse.json({ success: true, user: newUser }, { status: 200 })

  } catch (error: any) {
    console.error('REGISTER API ERROR:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
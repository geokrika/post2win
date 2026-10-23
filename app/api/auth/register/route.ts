import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    
    const username = body?.username?.trim() || ''
    const fullName = body?.fullName?.trim() || username
    const email = body?.email?.trim() || ''
    const phone = body?.phone?.trim() || null
    const password = body?.password || ''

    if (!username || !email) {
      return NextResponse.json(
        { success: false, error: 'Το username και το email είναι υποχρεωτικά' },
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

    // 2. Παραγωγή μοναδικού UUID & Player ID
    let authUserId: string = crypto.randomUUID()
    const generatedPlayerId = 'PL' + Math.floor(100000 + Math.random() * 900000)

    // 3. Δημιουργία στο Supabase Auth (αν χρησιμοποιείται)
    try {
      const { data: authData } = await supabase.auth.admin.createUser({
        email: email,
        password: password || 'DefaultPassword123!',
        email_confirm: true,
        user_metadata: { username, full_name: fullName }
      })

      if (authData?.user?.id) {
        authUserId = authData.user.id
      }
    } catch (sbErr) {
      console.warn('Supabase Auth Warning:', sbErr)
    }

    // 4. Κανονική Εγγραφή στη Βάση Δεδομένων με ΟΛΑ τα στοιχεία
    const newUser = await prisma.users.create({
      data: {
        id: authUserId as any,
        player_id: generatedPlayerId,
        username: username,
        email: email,
        phone_number: phone,
        password_hash: password,
        full_name: fullName,
        default_display_identity: username || fullName,
        wallet_balance: 100.00,
        is_verified: true,
      },
    })

    console.log('✅ USER REGISTERED FULLY IN DATABASE:', newUser)

    return NextResponse.json({ success: true, user: newUser }, { status: 200 })

  } catch (error: any) {
    console.error('❌ REGISTER ERROR:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
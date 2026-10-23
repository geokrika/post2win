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

    // 2. Παραγωγή έγκυρου UUID αν δεν επιστρέψει το Supabase
    let authUserId = crypto.randomUUID()

    // 3. Προσπάθεια εγγραφής στο Supabase Auth
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { username, full_name: fullName }
      })

      if (authData?.user?.id) {
        authUserId = authData.user.id
      } else if (authError) {
        console.warn('Supabase Auth Admin Warning:', authError.message)
      }
    } catch (sbErr) {
      console.warn('Supabase Auth Client Error:', sbErr)
    }

    // 4. Παραγωγή player_id
    const generatedPlayerId = 'PL' + Math.floor(100000 + Math.random() * 900000)

    // 5. Εγγραφή στη βάση μέσω Prisma
    const newUser = await prisma.users.create({
      data: {
        id: authUserId, // Εγγυημένο UUID (είτε από Supabase Auth είτε γνησίως παράγωγο)
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

    console.log('✅ NEW USER CREATED IN DATABASE:', newUser.id, newUser.username)

    return NextResponse.json({ success: true, user: newUser }, { status: 200 })

  } catch (error: any) {
    console.error('❌ REGISTER API PRISMA ERROR:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
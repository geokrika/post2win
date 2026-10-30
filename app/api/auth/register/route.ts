import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  console.log('--- 🚀 REGISTER PROCESS STARTED ---')
  try {
    const body = await req.json().catch(() => ({}))
    console.log('📥 Request Body:', { username: body?.username, email: body?.email })

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

    // 1. Έλεγχος αν υπάρχει ήδη ο χρήστης στην Prisma
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { username: username },
          { email: email }
        ]
      }
    })

    if (existingUser) {
      console.log('⚠️ User already exists in DB:', existingUser.username)
      return NextResponse.json(
        { success: false, error: 'Ο χρήστης με αυτό το username ή email υπάρχει ήδη στη βάση' },
        { status: 400 }
      )
    }

    // 🔒 2. Hashing του κωδικού πρόσβασης (Bcrypt με 10 rounds)
    const hashedPassword = password ? await bcrypt.hash(password, 10) : ''

    // 3. Παραγωγή UUID & Player ID
    let authUserId: string = crypto.randomUUID()
    const generatedPlayerId = 'PL' + Math.floor(100000 + Math.random() * 900000)

    // 4. Εγγραφή στο Supabase Auth
    try {
      console.log('🔄 Creating user in Supabase Auth...')
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password || 'DefaultPassword123!',
        email_confirm: true,
        user_metadata: { username, full_name: fullName }
      })

      if (authData?.user?.id) {
        authUserId = authData.user.id
        console.log('✅ Supabase Auth Created ID:', authUserId)
      } else if (authError) {
        console.warn('⚠️ Supabase Auth Error (continuing to DB):', authError.message)
      }
    } catch (sbErr) {
      console.warn('⚠️ Supabase Auth Exception:', sbErr)
    }

    // 5. Εγγραφή στη Βάση Δεδομένων μέσω Prisma (με το hashedPassword)
    console.log('🔄 Creating user in PostgreSQL via Prisma...')
    const newUser = await prisma.users.create({
      data: {
        id: authUserId as any,
        player_id: generatedPlayerId,
        username: username,
        email: email,
        phone_number: phone,
        password_hash: hashedPassword, // 🟢 Αποθήκευση του Hashed password
        full_name: fullName,
        default_display_identity: username || fullName,
        wallet_balance: 100.00,
        is_verified: true,
      },
    })

    console.log('✅ USER SUCCESSFULLY CREATED IN DB WITH HASHED PASSWORD:', newUser.id)

    // Μην επιστρέφεις το password_hash στο frontend response για λόγους ασφαλείας
    const { password_hash, ...userWithoutPassword } = newUser as any

    return NextResponse.json({ success: true, user: userWithoutPassword }, { status: 200 })

  } catch (error: any) {
    console.error('❌ REGISTER API PRISMA ERROR:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
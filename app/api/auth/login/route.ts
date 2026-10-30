import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const identifier = body?.identifier?.trim() || body?.email?.trim() || ''
    const password = body?.password || ''

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Παρακαλώ συμπληρώστε στοιχεία σύνδεσης και κωδικό' },
        { status: 400 }
      )
    }

    // 1. Αναζήτηση χρήστη με βάση email, username, display identity ή τηλέφωνο
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
          { default_display_identity: identifier },
          { phone_number: identifier }
        ]
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Λανθασμένο email/username ή κωδικός πρόσβασης' },
        { status: 401 }
      )
    }

    // 🔒 2. Επαλήθευση Hash Κωδικού Πρόσβασης
    const storedHash = user.password_hash || ''
    
    // Αν ο χρήστης δεν έχει password_hash στη βάση
    if (!storedHash) {
      return NextResponse.json(
        { success: false, error: 'Δεν έχει οριστεί κωδικός πρόσβασης για αυτόν τον λογαριασμό' },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, storedHash)

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Λανθασμένο email/username ή κωδικός πρόσβασης' },
        { status: 401 }
      )
    }

    // 3. Αφαίρεση του password_hash πριν την επιστροφή του χρήστη στο frontend
    const { password_hash, ...safeUser } = user as any

    return NextResponse.json({ success: true, user: safeUser }, { status: 200 })

  } catch (error: any) {
    console.error('LOGIN API ERROR:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Login failed' },
      { status: 500 }
    )
  }
}
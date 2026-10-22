import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const identifier = body?.identifier?.trim() || body?.email?.trim() || ''

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'Παρακαλώ συμπληρώστε email' },
        { status: 400 }
      )
    }

    // Αναζήτηση με βάση τα πεδία email ή default_display_identity
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { email: identifier },
          { default_display_identity: identifier },
          { phone_number: identifier }
        ]
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Ο χρήστης δεν βρέθηκε στη βάση' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, user }, { status: 200 })

  } catch (error: any) {
    console.error('LOGIN API ERROR:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Login failed' },
      { status: 500 }
    )
  }
}
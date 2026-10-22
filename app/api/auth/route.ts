import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const { username, password, full_name, email, phone } = await req.json()

    if (!username) {
      return NextResponse.json(
        { error: 'Το Username είναι υποχρεωτικό.' },
        { status: 400 }
      )
    }

    // 1. Έλεγχος αν υπάρχει ήδη ο χρήστης
    const existingUser = await prisma.users.findFirst({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Το username χρησιμοποιείται ήδη.' },
        { status: 400 }
      )
    }

    // Δημιουργία μοναδικού player_id
    const generatedPlayerId = `PLY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`

    // 2. Προετοιμασία δεδομένων χρήστη (περιλαμβάνει το player_id)
    const userData: any = {
      username,
      full_name: full_name || username,
      player_id: generatedPlayerId, // 👈 Προσθήκη του υποχρεωτικού πεδίου player_id
      wallet_balance: 100.00,
    }

    if (email) userData.email = email
    if (phone) userData.phone = phone

    // 3. Δημιουργία νέου χρήστη
    const newUser = await prisma.users.create({
      data: userData,
    })

    return NextResponse.json({ success: true, user: newUser })
  } catch (error: any) {
    console.error('Register API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Σφάλμα κατά την εγγραφή.' },
      { status: 500 }
    )
  }
}
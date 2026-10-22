import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// Τυχαία παραγωγή Hash ID 8 χαρακτήρων
function generateHashId() {
  return Math.random().toString(36).substring(2, 10)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, textContent, mediaType, fileUrl } = body

    if (!userId || !textContent) {
      return NextResponse.json(
        { error: 'Ο χρήστης και ο τίτλος/κείμενο είναι υποχρεωτικά.' },
        { status: 400 }
      )
    }

    const hashId = generateHashId()

    const newFile = await prisma.user_files.create({
      data: {
        user_id: userId,
        text_content: textContent,
        media_type: mediaType || 'NONE',
        file_url: fileUrl || null,
        hash_id: hashId,
      },
      include: {
        users: {
          select: { id: true, username: true, full_name: true },
        },
      },
    })

    return NextResponse.json(newFile, { status: 201 })
  } catch (error: any) {
    console.error('Create Post API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Σφάλμα κατά τη δημιουργία της δημοσίευσης.' },
      { status: 500 }
    )
  }
}
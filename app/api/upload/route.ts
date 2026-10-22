import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function GET() {
  try {
    const posts = await prisma.user_files.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            full_name: true,
            email: true,
          },
        },
        votes: {
          include: {
            users: {
              select: {
                id: true,
                username: true,
                full_name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ success: true, files: posts, posts }, { status: 200 })
  } catch (err: any) {
    console.error('GET UPLOAD API ERROR:', err)
    return NextResponse.json({ success: false, error: err.message, files: [], posts: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const title = body?.title || ''
    const textContent = body?.textContent || body?.text_content || ''
    const userId = body?.userId || body?.user_id

    const fullText = title.trim() ? `${title.trim()}\n\n${textContent.trim()}` : textContent.trim()

    if (!fullText.trim()) {
      return NextResponse.json({ success: false, error: 'Το κείμενο είναι υποχρεωτικό.' }, { status: 400 })
    }

    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, error: 'Απαιτείται έγκυρο UUID χρήστη για τη δημιουργία δημοσίευσης.' },
        { status: 400 }
      )
    }

    const hashId = Math.random().toString(36).substring(2, 8).toUpperCase()

    const newPost = await prisma.user_files.create({
      data: {
        hash_id: hashId,
        text_content: fullText,
        media_type: body?.mediaType || body?.media_type || 'NONE',
        file_url: body?.fileUrl || body?.file_url || null,
        user_id: userId,
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            full_name: true,
            email: true,
          },
        },
        votes: true,
      },
    })

    return NextResponse.json({ success: true, post: newPost }, { status: 200 })

  } catch (error: any) {
    console.error('POST UPLOAD API ERROR:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Σφάλμα εγγραφής στη βάση' }, { status: 500 })
  }
}
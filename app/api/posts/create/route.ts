import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, title, textContent, fileUrl, fileType } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Απαιτείται αναγνωριστικό χρήστη (User ID)' }, { status: 400 })
    }

    // 1. Επιβεβαίωση ότι ο χρήστης υπάρχει κανονικά στη βάση
    const user = await prisma.users.findUnique({
      where: { id: String(userId) }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Ο χρήστης δεν βρέθηκε στη βάση. Παρακαλώ συνδεθείτε ξανά.' },
        { status: 404 }
      )
    }

    // 2. Καταχώρηση του Post με το πραγματικό ID του χρήστη
    const newPost = await prisma.posts.create({
      data: {
        user_id: user.id,
        title: title || '',
        text_content: textContent || '',
        file_url: fileUrl || '',
        file_type: fileType || 'image',
        is_active: true,
      },
      include: {
        users: {
          select: {
            username: true,
            full_name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json({ success: true, post: newPost })

  } catch (err: any) {
    console.error('❌ CREATE POST ERROR:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { originalPostId, userId } = await req.json()

    if (!originalPostId || !userId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 })
    }

    // Φέρνουμε το αρχικό post
    const originalPost = await prisma.posts.findUnique({
      where: { id: originalPostId },
    })

    if (!originalPost) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
    }

    // 🟢 Δημιουργία ΝΕΟΥ post για τον τρέχοντα κύκλο με 0 λαχνούς (is_active: true)
    const newPost = await prisma.posts.create({
      data: {
        user_id: userId,
        title: originalPost.title,
        text_content: originalPost.text_content,
        file_url: originalPost.file_url,
        file_type: originalPost.file_type,
        is_active: true,
      },
    })

    return NextResponse.json({ success: true, post: newPost })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
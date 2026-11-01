import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Η "επαναφορά" ΔΕΝ ξανανοίγει το παλιό post (θα κρατούσε τους παλιούς λαχνούς).
// Δημιουργεί ΝΕΟ post με το ίδιο περιεχόμενο και 0 λαχνούς. Το παλιό μένει στο ιστορικό.
export async function POST(request: Request) {
  try {
    const { postId, userId } = await request.json()

    if (!postId || !userId) {
      return NextResponse.json({ success: false, error: 'Missing postId or userId' }, { status: 400 })
    }

    const original = await prisma.posts.findUnique({ where: { id: postId } })

    if (!original || original.user_id !== userId) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
    }

    if (original.is_active) {
      return NextResponse.json({ success: false, error: 'Το post είναι ήδη ενεργό' }, { status: 409 })
    }

    const newPost = await prisma.posts.create({
      data: {
        user_id: userId,
        title: original.title,
        text_content: original.text_content,
        file_url: original.file_url,
        file_type: original.file_type,
        is_active: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Post reactivated successfully',
      post: { ...newPost, votes: [], ticketsCount: 0 },
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

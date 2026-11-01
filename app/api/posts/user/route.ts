import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Ιστορικό posts του χρήστη (πίνακας `posts`, ΟΧΙ `user_files`)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 })
    }

    const posts = await prisma.posts.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ success: true, posts })
  } catch (err: any) {
    console.error('Error fetching user posts:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

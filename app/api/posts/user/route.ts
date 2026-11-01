import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function serializeBigInt(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  )
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    const rawPosts = await prisma.user_files.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        users: true,
        votes: true,
      },
    })

    const posts = serializeBigInt(rawPosts)

    return NextResponse.json({ success: true, posts })
  } catch (err: any) {
    console.error('Error fetching user posts:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
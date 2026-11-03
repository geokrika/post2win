import { NextResponse } from 'next/server'
import { deletePostForUser } from '@/lib/deletePost'

export const dynamic = 'force-dynamic'

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    return await deletePostForUser(searchParams.get('postId'), searchParams.get('userId'))
  } catch (err: any) {
    console.error('Delete post error:', err)
    return NextResponse.json({ success: false, error: 'Σφάλμα κατά τη διαγραφή' }, { status: 500 })
  }
}

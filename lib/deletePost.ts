import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Διαγραφή post ΜΟΝΟ από τον ιδιοκτήτη του (επιλογή του χρήστη). Διαγράφεται οριστικά από τη βάση.
// Το ιστορικό νικητών δεν επηρεάζεται: κρατά δικό του snapshot στον πίνακα draw_results.
export async function deletePostForUser(postId: string | null, userId: string | null) {
  if (!postId || !userId || !UUID.test(postId) || !UUID.test(userId)) {
    return NextResponse.json({ success: false, error: 'Λείπει ή είναι άκυρο το postId / userId' }, { status: 400 })
  }

  const post = await prisma.posts.findUnique({
    where: { id: postId },
    select: { id: true, user_id: true, is_active: true, _count: { select: { votes: true } } },
  })

  if (!post) {
    return NextResponse.json({ success: false, error: 'Το post δεν βρέθηκε' }, { status: 404 })
  }
  if (post.user_id !== userId) {
    return NextResponse.json({ success: false, error: 'Δεν έχεις δικαίωμα διαγραφής αυτού του post' }, { status: 403 })
  }
  // Ενεργό post με λαχνούς συμμετέχει στην επόμενη κλήρωση. Η διαγραφή θα έκαιγε τα χρήματα των υποστηρικτών.
  if (post.is_active && post._count.votes > 0) {
    return NextResponse.json(
      { success: false, error: 'Το post έχει λαχνούς και συμμετέχει στην επόμενη κλήρωση. Μπορείς να το διαγράψεις μετά την κλήρωση.' },
      { status: 409 }
    )
  }

  await prisma.$transaction([
    prisma.votes.deleteMany({ where: { post_id: postId } }),
    prisma.posts.delete({ where: { id: postId } }),
  ])

  return NextResponse.json({ success: true, message: 'Το post διαγράφηκε επιτυχώς' })
}

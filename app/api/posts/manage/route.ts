import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json({ success: false, error: 'Missing postId' }, { status: 400 })
    }

    // Δημιουργία Supabase Client με Service Role Key για πλήρη δικαιώματα διαγραφής
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Διαγραφή των σχετικών ψήφων/πονταρισμάτων (αποφυγή foreign key errors)
    const { error: votesError } = await supabase
      .from('votes')
      .delete()
      .eq('post_id', postId)

    if (votesError) {
      console.error('Error deleting related votes:', votesError)
    }

    // 2. Διαγραφή του δημοσιεύματος από τη βάση
    const { error: postError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (postError) {
      console.error('Error deleting post:', postError)
      return NextResponse.json({ success: false, error: postError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Post and associated votes deleted successfully',
    })
  } catch (err: any) {
    console.error('Server error during deletion:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
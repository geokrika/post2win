import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: Request) {
  try {
    const { postId, userId } = await request.json()

    if (!postId || !userId) {
      return NextResponse.json({ success: false, error: 'Missing postId or userId' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Ενημέρωση του post σε ενεργό στον τρέχοντα κύκλο
    const { error } = await supabase
      .from('posts')
      .update({ is_active: true })
      .eq('id', postId)
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Post reactivated successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
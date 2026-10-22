import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { userId, username, title, textContent, fileUrl, fileType } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    // 1. ΔΟΚΙΜΑΖΟΥΜΕ ΠΡΩΤΑ ΝΑ ΒΡΟΥΜΕ Η ΝΑ ΦΤΙΑΞΟΥΜΕ ΤΟΝ ΧΡΗΣΤΗ
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert(
        { 
          id: String(userId), 
          username: username || 'Anonymous' 
        }, 
        { onConflict: 'id' }
      )
      .select()

    if (userError) {
      console.error('User sync failed completely:', userError)
      return NextResponse.json({ 
        success: false, 
        error: `Δεν ήταν δυνατός ο συγχρονισμός του χρήστη (${userError.message})` 
      }, { status: 400 })
    }

    // 2. ΕΙΣΑΓΩΓΗ ΤΟΥ POST
    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          user_id: String(userId),
          title: title || '',
          text_content: textContent || '',
          file_url: fileUrl || '',
          file_type: fileType || 'image',
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      console.error('Post insertion error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, post: data[0] })
  } catch (err: any) {
    console.error('Error creating post:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
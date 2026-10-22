import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { userId, username, title, textContent, fileUrl, fileType } = body

    // 1. Έλεγχος αν υπάρχει το userId
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    // 2. Εξασφαλίζουμε ότι ο χρήστης υπάρχει στον πίνακα "users" (UPSERT)
    // Αυτό αποτρέπει το foreign key constraint error!
    const { error: userError } = await supabase
      .from('users')
      .upsert(
        { 
          id: userId, 
          username: username || 'Anonymous' 
        }, 
        { onConflict: 'id' }
      )

    if (userError) {
      console.error('Error syncing user:', userError)
      return NextResponse.json({ success: false, error: `User sync failed: ${userError.message}` }, { status: 400 })
    }

    // 3. Δημιουργία του Post
    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          user_id: userId,
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
      throw error
    }

    return NextResponse.json({ success: true, post: data[0] })
  } catch (err: any) {
    console.error('Error creating post:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
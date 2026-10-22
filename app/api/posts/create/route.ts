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

    // 1. ΣΥΓΧΡΟΝΙΣΜΟΣ ΧΡΗΣΤΗ: Το userId αντιστοιχίζεται στη στήλη "id" του πίνακα users
    const { error: userError } = await supabase
      .from('users')
      .upsert(
        { 
          id: String(userId), // 👈 Εδώ μπαίνει στη στήλη 'id' του users
          username: username || 'Anonymous'
        }, 
        { onConflict: 'id' }
      )

    if (userError) {
      console.error('User sync failed:', userError)
      return NextResponse.json({ 
        success: false, 
        error: `Σφάλμα συγχρονισμού χρήστη: ${userError.message}` 
      }, { status: 400 })
    }

    // 2. ΔΗΜΙΟΥΡΓΙΑ POST: Το userId μπαίνει στη στήλη "user_id" του πίνακα posts
    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          user_id: String(userId), // 👈 Εδώ μπαίνει στη στήλη 'user_id' του posts
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
      console.error('Post creation error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, post: data[0] })
  } catch (err: any) {
    console.error('Error creating post:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
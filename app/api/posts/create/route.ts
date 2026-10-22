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

    // 1. ΕΛΕΓΧΟΣ ΑΝ ΥΠΑΡΧΕΙ ΗΔΗ Ο ΧΡΗΣΤΗΣ
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', String(userId))
      .maybeSingle()

    // 2. ΑΝ ΔΕΝ ΥΠΑΡΧΕΙ, ΔΗΜΙΟΥΡΓΟΥΜΕ ΕΓΓΡΑΦΗ ΜΕ ΜΟΝΑΔΙΚΟ FALLBACK USERNAME
    if (!existingUser) {
      // Παράγουμε ένα μοναδικό username αν το δοσμένο προκαλεί σύγκρουση
      const safeUsername = username 
        ? `${username}_${String(userId).slice(0, 4)}` 
        : `User_${String(userId).slice(0, 6)}`

      const { error: insertUserError } = await supabase
        .from('users')
        .insert([
          { 
            id: String(userId), 
            username: safeUsername 
          }
        ])

      if (insertUserError) {
        console.error('User creation failed:', insertUserError)
        return NextResponse.json({ 
          success: false, 
          error: `Σφάλμα συγχρονισμού χρήστη: ${insertUserError.message}` 
        }, { status: 400 })
      }
    }

    // 3. ΔΗΜΙΟΥΡΓΙΑ ΤΟΥ POST
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
      console.error('Post creation error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, post: data[0] })
  } catch (err: any) {
    console.error('Error creating post:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
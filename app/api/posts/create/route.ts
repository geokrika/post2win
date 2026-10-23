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

    const currentUsername = username || 'Anonymous'

    // 1. ΕΛΕΓΧΟΣ ΑΝ ΥΠΑΡΧΕΙ Ο ΧΡΗΣΤΗΣ
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', String(userId))
      .maybeSingle()

    if (!existingUser) {
      // Αν δεν υπάρχει, τον δημιουργούμε με το κανονικό του username
      const { error: insertError } = await supabase
        .from('users')
        .insert([{ id: String(userId), username: currentUsername }])

      // Αν φάει conflict στο username (επειδή το έχει άλλος), βάζουμε ένα μοναδικό suffix
      if (insertError) {
        await supabase
          .from('users')
          .insert([{ id: String(userId), username: `${currentUsername}_${String(userId).slice(0, 4)}` }])
      }
    } else if (existingUser.username !== currentUsername) {
      // Αν υπάρχει αλλά άλλαξε το username του, το ενημερώνουμε
      await supabase
        .from('users')
        .update({ username: currentUsername })
        .eq('id', String(userId))
    }

    // 2. ΔΗΜΙΟΥΡΓΙΑ ΤΟΥ POST
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
      throw error
    }

    return NextResponse.json({ success: true, post: data[0] })
  } catch (err: any) {
    console.error('Error creating post:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
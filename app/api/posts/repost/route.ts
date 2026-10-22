import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const { userId, title, text_content, file_url, media_type } = await req.json()

    // Δημιουργούμε νέο ενεργό post για τον τρέχοντα γύρο
    const { data: newPost, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        title: title,
        text_content: text_content,
        file_url: file_url,
        media_type: media_type,
        status: 'ACTIVE',
        hash_id: Math.random().toString(36).substring(2, 9),
      })
      .select('*, users(*), votes(*)')
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, post: newPost })

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
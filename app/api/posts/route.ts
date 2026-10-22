import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DEFAULT_USER_ID = 'fa50bfff-6d9c-4bee-8a79-06487b11abfd'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    let { userId, title, textContent, mediaType, fileUrl } = body

    if (!title || !textContent) {
      return NextResponse.json(
        { success: false, error: 'Ο τίτλος και η περιγραφή είναι υποχρεωτικά πεδία.' },
        { status: 400 }
      )
    }

    if (!userId || userId === 'undefined' || userId === 'null') {
      userId = DEFAULT_USER_ID
    }

    // 1. ΕΥΡΕΣΗ UUID ΧΡΗΣΤΗ
    let realUserId: string = DEFAULT_USER_ID

    if (UUID_REGEX.test(userId)) {
      const { data: uById } = await supabase.from('users').select('id').eq('id', userId).maybeSingle()
      if (uById?.id) realUserId = uById.id
    } else {
      const { data: uByPlayer } = await supabase.from('users').select('id').eq('player_id', userId).maybeSingle()
      if (uByPlayer?.id) realUserId = uByPlayer.id
    }

    // 2. ΔΗΜΙΟΥΡΓΙΑ HASH ID
    const hashId = 'post-' + Math.random().toString(36).substring(2, 9)

    // 3. ΕΓΓΡΑΦΗ ΣΤΟΝ ΠΙΝΑΚΑ POSTS
    const postPayload: any = {
      user_id: realUserId,
      title: title,
      text_content: textContent,
      file_url: fileUrl || null,
      file_type: mediaType ? mediaType.toLowerCase() : 'none',
      hash_id: hashId,
      status: 'ACTIVE'
    }

    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert(postPayload)
      .select('*, users(id, username)')
      .maybeSingle()

    if (insertError) {
      console.error('Supabase Insert Post Error:', insertError)
      return NextResponse.json(
        { success: false, error: `Σφάλμα βάσης δεδομένων: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      post: newPost || {
        id: hashId,
        user_id: realUserId,
        title: title,
        text_content: textContent,
        file_url: fileUrl || null,
        file_type: mediaType ? mediaType.toLowerCase() : 'none',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        users: { id: realUserId, username: 'Player' },
        votes: []
      }
    })

  } catch (err: any) {
    console.error('API /api/posts Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Εσωτερικό σφάλμα διακομιστή' },
      { status: 500 }
    )
  }
}
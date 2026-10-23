import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { userId, title, textContent, mediaType, fileUrl } = body

    // 1. ΕΛΕΓΧΟΣ ΑΠΑΡΑΙΤΗΤΩΝ ΠΕΔΙΩΝ
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Μη εξουσιοδοτημένη ενέργεια. Απαιτείται αναγνωριστικό χρήστη.' },
        { status: 401 }
      )
    }

    if (!title || !textContent) {
      return NextResponse.json(
        { success: false, error: 'Ο τίτλος και η περιγραφή είναι υποχρεωτικά πεδία.' },
        { status: 400 }
      )
    }

    // 2. ΕΛΕΓΧΟΣ ΥΠΑΡΞΗΣ ΧΡΗΣΤΗ (Ζητάμε ΜΟΝΟ id και username)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', String(userId))
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Ο χρήστης δεν βρέθηκε στη βάση δεδομένων. Παρακαλώ συνδεθείτε ξανά.' },
        { status: 404 }
      )
    }

    // 3. ΕΓΓΡΑΦΗ ΣΤΟΝ ΠΙΝΑΚΑ POSTS & JOIN ΜΕ ΤΟ USERS (Μόνο id, username)
    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert([
        {
          user_id: user.id,
          title,
          text_content: textContent,
          file_url: fileUrl || null,
          file_type: mediaType ? mediaType.toLowerCase() : 'none',
          status: 'ACTIVE'
        }
      ])
      .select('*, users(id, username)')
      .single()

    if (insertError) {
      console.error('Supabase Insert Error:', insertError)
      return NextResponse.json(
        { success: false, error: `Σφάλμα κατά την αποθήκευση: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      post: newPost
    })

  } catch (err: any) {
    console.error('API Error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Εσωτερικό σφάλμα διακομιστή' },
      { status: 500 }
    )
  }
}
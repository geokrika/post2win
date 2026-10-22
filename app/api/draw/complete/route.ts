import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Εξασφαλίζει ότι το route δεν θα προσπαθήσει να γίνει static prerender στο Build
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    // 1. Διάβασμα μεταβλητών περιβάλλοντος
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // 2. Έλεγχος αν υπάρχουν οι μεταβλητές
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase environment variables' },
        { status: 500 }
      )
    }

    // 3. Δημιουργία του Supabase client ΜΟΝΟ κατά την κλήση του API (runtime)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 4. Διάβασμα του body από το αίτημα
    const body = await req.json().catch(() => ({}))

    /* 
      Εδώ μπαίνει η λογική ολοκλήρωσης του Draw.
      Προσαρμόζεις τους ελέγχους/queries ανάλογα με τις ανάγκες σου.
    */

    return NextResponse.json({
      success: true,
      message: 'Draw completed successfully',
      data: body,
    })
  } catch (error: any) {
    console.error('Error in /api/draw/complete:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
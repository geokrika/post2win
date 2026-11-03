import { DRAW_TIMEZONE } from '@/lib/drawTime'

// Μετατρέπει μια εγγραφή του πίνακα draw_results στη μορφή που περιμένει το UI
// (κάρτα νικητή, SlotDrawModal, Ιστορικό Νικητών).
export function drawRowToWinner(row: any) {
  return {
    id: row.winning_post_id || row.id,
    draw_id: row.id,
    drawn_at: row.drawn_at instanceof Date ? row.drawn_at.toISOString() : row.drawn_at,
    winner_name: row.winner_name || 'Winner',
    winner_id: row.winner_user_id || null,
    post_title: row.post_title || 'Untitled Post',
    post_text: row.post_text || '',
    post_media: row.post_media || null,
    total_jackpot: Number(row.total_jackpot),
    creator_prize: Number(row.creator_prize),
    supporters_pool: Number(row.supporters_pool),
    total_tickets: row.total_tickets,
    total_posts: row.total_posts,
    supporters: Array.isArray(row.supporters) ? row.supporters : [],
    date: new Date(row.drawn_at).toLocaleString('el-GR', { timeZone: DRAW_TIMEZONE }),
  }
}

export function drawRowToParticipants(row: any) {
  return Array.isArray(row.participants) ? row.participants : []
}

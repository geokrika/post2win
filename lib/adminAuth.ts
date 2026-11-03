import crypto from 'crypto'

// Ελέγχει το header `x-admin-secret` έναντι της μεταβλητής περιβάλλοντος ADMIN_SECRET.
// Αν το ADMIN_SECRET δεν έχει οριστεί, ΚΑΝΕΝΑΣ δεν θεωρείται admin.
export function isAdminRequest(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET || ''
  if (secret.length < 8) return false

  const provided = req.headers.get('x-admin-secret') || ''
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Για εξωτερικό cron (Vercel Cron ή cron-job.org): header  Authorization: Bearer <CRON_SECRET>
export function isCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET || ''
  if (secret.length < 8) return false
  const provided = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

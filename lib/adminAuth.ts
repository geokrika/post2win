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

// Η κλήρωση επιτρέπεται στους απλούς χρήστες ΜΟΝΟ γύρω από την αλλαγή ώρας (UTC):
// από xx:59:45 έως xx:00:59. Ο admin μπορεί οποτεδήποτε.
export function isInsideDrawWindow(now: Date = new Date()): boolean {
  const m = now.getUTCMinutes()
  const s = now.getUTCSeconds()
  return (m === 59 && s >= 45) || m === 0
}

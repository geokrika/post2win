// Η κλήρωση γίνεται 1 φορά την ημέρα, στις 21:00 ώρα Ελλάδας (Europe/Athens, με αυτόματη αλλαγή θερινής/χειμερινής ώρας).
export const DRAW_TIMEZONE = 'Europe/Athens'
export const DRAW_HOUR = 21
export const CLIENT_WINDOW_MINUTES = 10 // οι browsers μπορούν να ξεκινήσουν την κλήρωση 21:00 - 21:10

export function getAthensParts(now: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: DRAW_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const p: Record<string, string> = {}
  for (const part of fmt.formatToParts(now)) p[part.type] = part.value
  return {
    day: `${p.year}-${p.month}-${p.day}`, // π.χ. 2026-11-03
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  }
}

// Επιτρέπεται η προγραμματισμένη κλήρωση τώρα;
//  - browsers: 21:00:00 - 21:09:59
//  - αξιόπιστος καλών (cron με μυστικό): από 21:00 μέχρι τα μεσάνυχτα (αν έχασε το ακριβές λεπτό)
export function isScheduledDrawAllowed(trusted: boolean, now: Date = new Date()): boolean {
  const { hour, minute } = getAthensParts(now)
  if (trusted) return hour >= DRAW_HOUR
  return hour === DRAW_HOUR && minute < CLIENT_WINDOW_MINUTES
}

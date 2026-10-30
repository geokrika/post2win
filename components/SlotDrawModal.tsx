'use client'

import { useState, useEffect, useRef } from 'react'

interface SlotDrawModalProps {
  isOpen: boolean
  jackpotAmount: number
  posts: any[]
  serverWinner?: any // 🟢 Ο πραγματικός νικητής από το Backend API
  onClose: () => void
  onDrawComplete: (winningPost: any, supporters: any[]) => void
  lang?: 'el' | 'en'
}

export default function SlotDrawModal({
  isOpen,
  jackpotAmount,
  posts,
  serverWinner,
  onClose,
  onDrawComplete,
  lang = 'el',
}: SlotDrawModalProps) {
  const [phase, setPhase] = useState<'warmup' | 'spinning' | 'winner'>('warmup')
  const [ticketPool, setTicketPool] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(70)

  const isEn = lang === 'en'
  const isCompletedRef = useRef(false)
  const startTimeRef = useRef<number | null>(null)

  // 🎟️ 1. Δημιουργία Weighted Pool (200 λαχνοί = 200 εγγραφές στον κύλινδρο)
  useEffect(() => {
    if (!posts || posts.length === 0) return

    const pool: any[] = []
    posts.forEach((post) => {
      const votes = post.votes || []
      const postTickets = votes.reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 1), 0)
      const count = postTickets > 0 ? postTickets : 1

      // Προσθήκη του post στην κάλπη όσες φορές όσες και οι λαχνοί του
      for (let i = 0; i < count; i++) {
        pool.push(post)
      }
    })

    // Ανακάτεμα (Shuffle) του pool για τυχαία εναλλαγή κατά την περιστροφή
    const shuffledPool = pool.sort(() => Math.random() - 0.5)
    setTicketPool(shuffledPool)
  }, [posts])

  const totalTickets = ticketPool.length

  // ⏱️ 2. Διαχείριση Χρόνου & Φάσεων (70 δευτερόλεπτα)
  useEffect(() => {
    if (!isOpen || ticketPool.length === 0) {
      startTimeRef.current = null
      return
    }

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now()
      isCompletedRef.current = false
    }

    const TOTAL_DURATION = 70000

    const timerInterval = setInterval(() => {
      if (!startTimeRef.current) return

      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, Math.ceil((TOTAL_DURATION - elapsed) / 1000))
      setSecondsLeft(remaining)

      if (elapsed < 10000) {
        setPhase('warmup')
      } else if (elapsed < 50000) {
        setPhase('spinning')
      } else if (elapsed < 70000) {
        setPhase('winner')
      } else {
        clearInterval(timerInterval)
        if (!isCompletedRef.current) {
          isCompletedRef.current = true
          const finalWinner = serverWinner || ticketPool[0]
          onDrawComplete(finalWinner, finalWinner?.votes || [])
        }
      }
    }, 200)

    return () => clearInterval(timerInterval)
  }, [isOpen, ticketPool, serverWinner])

  // 🎰 3. Animation Περιστροφής πάνω στο Weighted Ticket Pool
  useEffect(() => {
    if (!isOpen || phase !== 'spinning' || ticketPool.length === 0) return

    let speed = 60
    let timeoutId: NodeJS.Timeout

    const spin = () => {
      setCurrentIndex((prev) => (prev + 1) % ticketPool.length)

      if (secondsLeft <= 25 && secondsLeft > 20) {
        speed += 10
      }

      timeoutId = setTimeout(spin, speed)
    }

    timeoutId = setTimeout(spin, speed)
    return () => clearTimeout(timeoutId)
  }, [isOpen, phase, secondsLeft, ticketPool.length])

  if (!isOpen || !posts || posts.length === 0) return null

  // 🎯 Ο νικητής στη φάση 'winner' είναι ΑΠΟΚΛΕΙΣΤΙΚΑ ο serverWinner
  const activePost = phase === 'winner' ? (serverWinner || ticketPool[0]) : ticketPool[currentIndex]

  const authorName =
    activePost?.users?.username ||
    activePost?.users?.full_name ||
    (activePost?.users?.email ? activePost.users.email.split('@')[0] : 'Player')

  const postIdDisplay = activePost?.id
    ? String(activePost.id).substring(0, 8).toUpperCase()
    : 'TKT-' + Math.floor(1000 + Math.random() * 9000)

  const activePostTickets = activePost?.votes
    ? activePost.votes.reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 1), 0)
    : 1

  const getDisplaySeconds = () => {
    if (phase === 'warmup') return Math.max(1, secondsLeft - 60)
    if (phase === 'spinning') return Math.max(1, secondsLeft - 20)
    return Math.max(1, secondsLeft)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-500 rounded-3xl p-6 max-w-lg w-full text-center shadow-[0_0_70px_rgba(245,158,11,0.5)] relative overflow-hidden">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-red-500/20 hover:border-red-500 transition-all flex items-center justify-center font-bold text-sm cursor-pointer"
        >
          ✕
        </button>

        {/* HEADER - ΣΤΑΤΙΣΤΙΚΑ */}
        <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-950/80 border border-slate-800 p-3 rounded-2xl pr-8">
          <div className="text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {isEn ? 'JACKPOT' : 'ΤΖΑΚΠΟΤ'}
            </span>
            <span className="text-base font-black text-amber-400 font-mono">
              €{jackpotAmount.toFixed(2)}
            </span>
          </div>

          <div className="text-center border-x border-slate-800 px-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {isEn ? 'POSTS' : 'ΔΗΜΟΣΙΕΥΣΕΙΣ'}
            </span>
            <span className="text-base font-black text-indigo-400 font-mono">
              📝 {posts.length}
            </span>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">
              {isEn ? 'TOTAL TICKETS' : 'ΣΥΝ. ΛΑΧΝΟΙ'}
            </span>
            <span className="text-base font-black text-emerald-400 font-mono">
              🎟️ {totalTickets}
            </span>
          </div>
        </div>

        {/* SLOTS REEL */}
        <div className="relative bg-slate-950 border-4 border-amber-500/70 rounded-2xl p-5 my-3 shadow-2xl overflow-hidden min-h-[260px] flex flex-col justify-center items-center">
          
          <div className="absolute top-2 left-3 right-3 flex justify-between text-[10px] font-mono text-amber-500/60 font-bold">
            <span>[ REEL ACTIVE ]</span>
            <span>[ WEIGHTED: {activePostTickets} TKT ]</span>
          </div>

          {phase === 'warmup' && (
            <div className="flex flex-col items-center justify-center animate-fade-in">
              <span className="text-5xl block mb-2 animate-bounce">📢</span>
              <h3 className="text-lg font-black text-amber-400">
                {isEn ? 'PREPARING SLOT CYLINDER...' : 'ΠΡΟΕΤΟΙΜΑΣΙΑ ΚΥΛΙΝΔΡΟΥ...'}
              </h3>
              <p className="text-xs text-slate-400 my-1">
                {isEn ? 'Loading tickets proportionally into reel' : 'Φόρτωση λαχνών αναλογικά στον κύλινδρο'}
              </p>
              <div className="mt-3 bg-amber-500/20 border border-amber-500/40 px-5 py-2 rounded-full text-amber-300 text-lg font-black font-mono shadow-inner">
                ⏳ {getDisplaySeconds()}s
              </div>
            </div>
          )}

          {phase === 'spinning' && (
            <div className="w-full flex flex-col items-center justify-center space-y-2">
              <div className="w-full bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border-y-2 border-amber-500/50 py-4 px-3 rounded-xl shadow-inner relative animate-pulse">
                
                <h2 className="text-2xl font-black text-amber-400 tracking-wide mb-1">
                  👤 {authorName}
                </h2>

                <p className="text-sm font-extrabold text-white truncate max-w-xs mx-auto my-1">
                  "{activePost?.title || activePost?.text_content || 'Untitled Post'}"
                </p>

                <div className="flex justify-center items-center gap-2 mt-2">
                  <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md">
                    #{postIdDisplay}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md">
                    🎟️ {activePostTickets} {isEn ? 'Tickets' : 'Λαχνοί'}
                  </span>
                </div>

              </div>

              <div className="mt-2 flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 px-4 py-1.5 rounded-full text-amber-300 text-xs font-bold font-mono">
                <span>🎰 {isEn ? 'Spinning Tickets:' : 'Περιστροφή Λαχνών:'}</span>
                <span className="text-amber-400 font-black text-sm">{getDisplaySeconds()}s</span>
              </div>
            </div>
          )}

          {phase === 'winner' && (
            <div className="flex flex-col items-center justify-center animate-fade-in w-full">
              <span className="text-4xl block mb-1 animate-bounce">👑</span>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/20 border border-emerald-500/40 px-3 py-0.5 rounded-full mb-2">
                {isEn ? 'WINNING TICKET DRAWN' : 'Ο ΝΙΚΗΤΗΡΙΟΣ ΛΑΧΝΟΣ ΚΛΗΡΩΘΗΚΕ'}
              </span>

              <div className="bg-emerald-950/60 border border-emerald-500/50 p-4 rounded-2xl w-full my-1 text-center">
                <h2 className="text-2xl font-black text-emerald-300">
                  👤 {authorName}
                </h2>

                <p className="text-xs font-bold text-white truncate my-1">
                  "{activePost?.title || activePost?.text_content || 'Winning Post'}"
                </p>

                <div className="flex justify-center items-center gap-2 mt-2">
                  <span className="text-[11px] font-mono font-bold text-emerald-400 bg-slate-950 border border-emerald-500/40 px-2.5 py-0.5 rounded-md">
                    ID: #{postIdDisplay}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-md">
                    🎟️ {activePostTickets} {isEn ? 'Tickets' : 'Λαχνοί'}
                  </span>
                </div>
              </div>

              <div className="mt-2 text-[11px] font-mono text-emerald-400 font-bold bg-slate-900 border border-emerald-500/30 px-3 py-1 rounded-xl">
                💰 {isEn ? 'Closing in:' : 'Ολοκλήρωση σε:'} {getDisplaySeconds()}s
              </div>
            </div>
          )}

        </div>

        <p className="text-[11px] text-slate-400">
          {isEn
            ? 'Provably fair slot draw engine • 70% Creator / 30% Supporters'
            : 'Μηχανή κλήρωσης Jackpot • 70% Δημιουργός / 30% Υποστηρικτές'}
        </p>

      </div>
    </div>
  )
}
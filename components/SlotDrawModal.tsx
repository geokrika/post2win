'use client'

import { useState, useEffect, useRef } from 'react'

interface SlotDrawModalProps {
  isOpen: boolean
  jackpotAmount: number
  posts: any[]
  onClose: () => void
  onDrawComplete: (winningPost: any, supporters: any[]) => void
  lang?: 'el' | 'en'
}

export default function SlotDrawModal({
  isOpen,
  jackpotAmount,
  posts,
  onClose,
  onDrawComplete,
  lang = 'el',
}: SlotDrawModalProps) {
  const [phase, setPhase] = useState<'warmup' | 'spinning' | 'winner'>('warmup')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [winner, setWinner] = useState<any | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(70)

  const isEn = lang === 'en'
  const isCompletedRef = useRef(false)
  const winnerRef = useRef<any | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // Υπολογισμός Συνολικών Λαχνών (Total Tickets)
  const totalTickets = posts.reduce((acc, post) => {
    const votes = post.votes || []
    const postTickets = votes.reduce((vAcc: number, v: any) => vAcc + (Number(v.tickets_earned) || 1), 0)
    return acc + (postTickets > 0 ? postTickets : 1)
  }, 0)

  // 🎟️ Δημιουργία Weighted Pool για την επιλογή νικητή βάσει λαχνών
  const pickWeightedWinner = () => {
    const ticketPool: any[] = []
    posts.forEach((post) => {
      const votes = post.votes || []
      const postTickets = votes.reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 1), 0)
      const count = postTickets > 0 ? postTickets : 1
      for (let i = 0; i < count; i++) {
        ticketPool.push(post)
      }
    })
    if (ticketPool.length === 0) return posts[0]
    const randomIndex = Math.floor(Math.random() * ticketPool.length)
    return ticketPool[randomIndex]
  }

  useEffect(() => {
    if (!isOpen || !posts || posts.length === 0) {
      startTimeRef.current = null
      return
    }

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now()
      isCompletedRef.current = false
      winnerRef.current = null
      setWinner(null)
    }

    const TOTAL_DURATION = 70000 // 70 δευτερόλεπτα

    const timerInterval = setInterval(() => {
      if (!startTimeRef.current) return

      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, Math.ceil((TOTAL_DURATION - elapsed) / 1000))
      
      setSecondsLeft(remaining)

      // 1. Προετοιμασία (0 - 10s)
      if (elapsed < 10000) {
        setPhase('warmup')
      } 
      // 2. Περιστροφή (10s - 50s)
      else if (elapsed < 50000) {
        setPhase('spinning')
      } 
      // 3. Ανακοίνωση Νικητή (50s - 70s)
      else if (elapsed < 70000) {
        if (!winnerRef.current) {
          const picked = pickWeightedWinner()
          winnerRef.current = picked
          setWinner(picked)
        }
        setPhase('winner')
      } 
      // 4. Ολοκλήρωση
      else {
        clearInterval(timerInterval)
        if (!isCompletedRef.current) {
          isCompletedRef.current = true
          const finalWinner = winnerRef.current || posts[0]
          onDrawComplete(finalWinner, finalWinner?.votes || [])
        }
      }
    }, 200)

    return () => {
      clearInterval(timerInterval)
    }
  }, [isOpen, posts])

  // Animation Περιστροφής (Reel Spin)
  useEffect(() => {
    if (!isOpen || phase !== 'spinning') return

    let speed = 70
    let timeoutId: NodeJS.Timeout

    const spin = () => {
      setCurrentIndex((prev) => (prev + 1) % posts.length)

      if (secondsLeft <= 25 && secondsLeft > 20) {
        speed += 12
      }

      timeoutId = setTimeout(spin, speed)
    }

    timeoutId = setTimeout(spin, speed)

    return () => clearTimeout(timeoutId)
  }, [isOpen, phase, secondsLeft, posts.length])

  const handleManualClose = () => {
    startTimeRef.current = null
    onClose()
  }

  if (!isOpen || !posts || posts.length === 0) return null

  const activePost = phase === 'winner' ? (winner || winnerRef.current || posts[0]) : posts[currentIndex]
  
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
        
        {/* ΚΟΥΜΠΙ ΕΞΟΔΟΥ */}
        <button
          onClick={handleManualClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-red-500/20 hover:border-red-500 transition-all flex items-center justify-center font-bold text-sm cursor-pointer"
          title={isEn ? 'Close' : 'Έξοδος'}
        >
          ✕
        </button>

        {/* Glow Effects */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* 1. HEADER - ΣΤΑΤΙΣΤΙΚΑ */}
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

        {/* 2. ΚΥΛΙΝΔΡΟΣ ΚΛΗΡΩΤΙΔΑΣ (SLOTS REEL) */}
        <div className="relative bg-slate-950 border-4 border-amber-500/70 rounded-2xl p-5 my-3 shadow-2xl overflow-hidden min-h-[260px] flex flex-col justify-center items-center">
          
          {/* Indicators */}
          <div className="absolute top-2 left-3 right-3 flex justify-between text-[10px] font-mono text-amber-500/60 font-bold">
            <span>[ REEL ACTIVE ]</span>
            <span>[ TICKET WEIGHTED ]</span>
          </div>

          {/* ΦΑΣΗ 1: ΠΡΟΕΤΟΙΜΑΣΙΑ */}
          {phase === 'warmup' && (
            <div className="flex flex-col items-center justify-center animate-fade-in">
              <span className="text-5xl block mb-2 animate-bounce">📢</span>
              <h3 className="text-lg font-black text-amber-400">
                {isEn ? 'PREPARING SLOT CYLINDER...' : 'ΠΡΟΕΤΟΙΜΑΣΙΑ ΚΥΛΙΝΔΡΟΥ...'}
              </h3>
              <p className="text-xs text-slate-400 my-1">
                {isEn ? 'Loading active tickets & posts into reel' : 'Φόρτωση δημοσιεύσεων & λαχνών στον κύλινδρο'}
              </p>
              <div className="mt-3 bg-amber-500/20 border border-amber-500/40 px-5 py-2 rounded-full text-amber-300 text-lg font-black font-mono shadow-inner">
                ⏳ {getDisplaySeconds()}s
              </div>
            </div>
          )}

          {/* ΦΑΣΗ 2: ΠΕΡΙΣΤΡΟΦΗ ΚΥΛΙΝΔΡΟΥ (ONOMA - ΚΩΔΙΚΟΣ - ΤΙΤΛΟΣ) */}
          {phase === 'spinning' && (
            <div className="w-full flex flex-col items-center justify-center space-y-2">
              <div className="w-full bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border-y-2 border-amber-500/50 py-4 px-3 rounded-xl shadow-inner relative animate-pulse">
                
                {/* 👤 ΟΝΟΜΑ ΔΗΜΙΟΥΡΓΟΥ */}
                <h2 className="text-2xl font-black text-amber-400 tracking-wide mb-1">
                  👤 {authorName}
                </h2>

                {/* 📝 ΤΙΤΛΟΣ POST */}
                <p className="text-sm font-extrabold text-white truncate max-w-xs mx-auto my-1">
                  "{activePost?.title || activePost?.text_content || 'Untitled Post'}"
                </p>

                {/* 🆔 ΚΩΔΙΚΟΣ & 🎟️ ΛΑΧΝΟΙ */}
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

          {/* ΦΑΣΗ 3: ΟΘΟΝΗ ΝΙΚΗΤΗ */}
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

        {/* FOOTER */}
        <p className="text-[11px] text-slate-400">
          {isEn
            ? 'Provably fair slot draw engine • 70% Creator / 30% Supporters'
            : 'Μηχανή κλήρωσης Jackpot • 70% Δημιουργός / 30% Υποστηρικτές'}
        </p>

      </div>
    </div>
  )
}
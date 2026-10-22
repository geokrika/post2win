'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface HeaderProps {
  user: any
  jackpotAmount: number
  lang: 'el' | 'en'
  showMyPostsOnly?: boolean
  postsCount?: number
  onLanguageToggle: () => void
  onLoginClick: () => void
  onRegisterClick: () => void
  onLogoutClick: () => void
  onCreatePostClick?: () => void
  onMyPostsClick?: () => void
}

export default function Header({
  user,
  jackpotAmount,
  lang,
  onLanguageToggle,
  onLoginClick,
  onRegisterClick,
  onLogoutClick,
}: HeaderProps) {
  const initialBalance = user?.wallet_balance !== undefined && !isNaN(Number(user.wallet_balance))
    ? Number(user.wallet_balance)
    : 100

  const [currentBalance, setCurrentBalance] = useState<number>(initialBalance)

  useEffect(() => {
    if (user?.wallet_balance !== undefined && !isNaN(Number(user.wallet_balance))) {
      setCurrentBalance(Number(user.wallet_balance))
    }
  }, [user?.wallet_balance])

  // 🔔 Ακούει το custom event "wallet_updated" από το BetButton/page.tsx
  useEffect(() => {
    const handleWalletUpdate = (e: CustomEvent) => {
      const val = Number(e.detail)
      if (!isNaN(val)) {
        setCurrentBalance(val)
      }
    }

    window.addEventListener('wallet_updated', handleWalletUpdate as EventListener)
    return () => {
      window.removeEventListener('wallet_updated', handleWalletUpdate as EventListener)
    }
  }, [])

  const isEn = lang === 'en'

  const displayUsername = 
    user?.username || 
    user?.full_name || 
    user?.name || 
    (user?.email ? user.email.split('@')[0] : 'User')

  const safeBalance = !isNaN(Number(currentBalance)) ? Number(currentBalance) : 0
  const safeJackpot = !isNaN(Number(jackpotAmount)) ? Number(jackpotAmount) : 50

  return (
    <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        
        {/* ΑΡΙΣΤΕΡΑ: LOGO, JACKPOT & ΙΣΤΟΡΙΚΟ */}
        <div className="flex items-center flex-wrap gap-3 sm:gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎰</span>
            <span className="font-black text-lg bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent hidden sm:inline">
              UGC Jackpot
            </span>
          </Link>

          {/* JACKPOT */}
          <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              🏆 Jackpot:
            </span>
            <span className="text-sm font-black text-amber-300 font-mono">
              €{safeJackpot.toFixed(2)}
            </span>
          </div>

          {/* ΙΣΤΟΡΙΚΟ POSTS (Ανακατεύθυνση στη σελίδα /my-posts) */}
          {user && (
            <Link
              href="/my-posts"
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30"
            >
              <span>👤</span>
              <span>{isEn ? 'My History' : 'Το Ιστορικό μου'}</span>
            </Link>
          )}
        </div>

        {/* ΔΕΞΙΑ: ΓΛΩΣΣΑ, WALLET, USERNAME & LOGOUT */}
        <div className="flex items-center gap-2.5">
          
          {/* ΓΛΩΣΣΑ */}
          <button
            type="button"
            onClick={onLanguageToggle}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
          >
            {lang === 'el' ? '🇬🇷 EL' : '🇬🇧 EN'}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              
              {/* WALLET BALANCE */}
              <div className="bg-emerald-950/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-emerald-400 shadow-sm">
                💰 €{safeBalance.toFixed(2)}
              </div>

              {/* USERNAME (Κλικ για μετάβαση στο /my-posts) */}
              <Link
                href="/my-posts"
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 hidden md:block transition"
              >
                {displayUsername}
              </Link>

              {/* LOGOUT BUTTON */}
              <button
                type="button"
                onClick={onLogoutClick}
                className="bg-red-500/15 hover:bg-red-600 hover:text-white text-red-400 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title={isEn ? 'Logout' : 'Αποσύνδεση'}
              >
                <span>🚪</span>
                <span className="hidden sm:inline">{isEn ? 'Logout' : 'Έξοδος'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLoginClick}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition border border-slate-700 cursor-pointer"
              >
                {isEn ? 'Login' : 'Σύνδεση'}
              </button>
              <button
                type="button"
                onClick={onRegisterClick}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs transition shadow-md shadow-amber-500/10 cursor-pointer"
              >
                {isEn ? 'Register' : 'Εγγραφή'}
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  )
}
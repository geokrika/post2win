'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import CreatePostModal from '@/components/CreatePostModal'
import BetButton from '@/components/BetButton'
import WinnersHistoryModal from '@/components/WinnersHistoryModal'
import SlotDrawModal from '@/components/SlotDrawModal'
import MyPostsModal from '@/components/MyPostsModal'

const AuthModal = dynamic(() => import('@/components/AuthModal'), {
  ssr: false,
})

export default function HomePage() {
  const [userHistoryPosts, setUserHistoryPosts] = useState<any[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [jackpotAmount, setJackpotAmount] = useState<number>(50.00)
  const [posts, setPosts] = useState<any[]>([])
  const [lang, setLang] = useState<'el' | 'en'>('el')
  
  const [showMyPostsOnly, setShowMyPostsOnly] = useState(false)
  const [lastWinner, setLastWinner] = useState<any>(null)
  const [winnersHistory, setWinnersHistory] = useState<any[]>([])

  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isSlotDrawOpen, setIsSlotDrawOpen] = useState(false)
  const [isMyPostsOpen, setIsMyPostsOpen] = useState(false)
  
  // ⏱️ Συγχρονισμένη αντίστροφη μέτρηση μέχρι το επόμενο top of the hour (:00)
  const [timeLeft, setTimeLeft] = useState<number>(3600)
  const [drawCancelledMessage, setDrawCancelledMessage] = useState<string | null>(null)

  const handleOpenLogin = () => {
    setIsCreatePostOpen(false)
    setAuthMode('login')
    setIsAuthOpen(true)
  }

  const handleOpenRegister = () => {
    setIsCreatePostOpen(false)
    setAuthMode('register')
    setIsAuthOpen(true)
  }

  const handleOpenCreatePost = () => {
    setIsAuthOpen(false)
    if (!user) {
      setAuthMode('register')
      setIsAuthOpen(true)
      return
    }
    setIsCreatePostOpen(true)
  }

  // 🟢 Υπολογισμός ενεργών posts που έχουν ΤΟΥΛΑΧΙΣΤΟΝ 1 λαχνό (>0)
  const getActivePostsWithTicketsCount = (postsList: any[]) => {
    if (!Array.isArray(postsList)) return 0
    return postsList.filter((p) => {
      const tickets = p.ticketsCount ?? p.votes?.reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 0), 0) ?? 0
      return (p.status === 'ACTIVE' || !p.status) && tickets > 0
    }).length
  }

  const getCleanUsername = (uObj: any) => {
    if (!uObj) return ''
    if (typeof uObj === 'string' && uObj.trim() !== '') {
      return uObj.trim() === 'You' ? (user?.username || 'User') : uObj.trim()
    }

    const username = uObj.username || uObj.full_name || uObj.name
    if (username && String(username).trim() !== '' && String(username).trim() !== 'You') {
      return String(username).trim()
    }

    if (uObj.email && typeof uObj.email === 'string') {
      return uObj.email.split('@')[0]
    }
    
    return user?.username || 'User'
  }

  const extractTitleAndBody = (post: any) => {
    if (post.title) {
      return { title: post.title, body: post.text_content || '' }
    }
    const rawText = post.text_content || ''
    if (rawText.includes('\n\n')) {
      const parts = rawText.split('\n\n')
      return { title: parts[0], body: parts.slice(1).join('\n\n') }
    }
    return { title: null, body: rawText }
  }

  const refreshUserData = async (userId: string) => {
    if (!userId) return
    try {
      const userRes = await fetch(`/api/user/me?id=${userId}`, { cache: 'no-store' }).catch(() => null)
      if (userRes && userRes.ok) {
        const freshUser = await userRes.json().catch(() => null)
        if (freshUser && freshUser.id) {
          setUser(freshUser)
          localStorage.setItem('ugc_user', JSON.stringify(freshUser))
        }
      }
    } catch (err) {
      console.error('Error refreshing user data:', err)
    }
  }

  const fetchFeedData = async () => {
    try {
      const res = await fetch('/api/feed', { 
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      }).catch(() => null)

      if (!res || !res.ok) return
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) return

      const data = await res.json().catch(() => null)
      if (!data) return

      let fetchedPosts: any[] = []
      if (Array.isArray(data.posts)) {
        fetchedPosts = data.posts
      } else if (Array.isArray(data.files)) {
        fetchedPosts = data.files
      }

      setPosts(fetchedPosts)
      localStorage.setItem('ugc_posts', JSON.stringify(fetchedPosts))

      if (data.jackpot !== undefined && data.jackpot !== null && !isNaN(Number(data.jackpot))) {
        setJackpotAmount(Number(data.jackpot))
      }

    } catch (err) {
      console.error('Error in fetchFeedData:', err)
    }
  }

 const executeJackpotDraw = async () => {
    try {
      const res = await fetch('/api/draw', { method: 'POST' })
      const data = await res.json().catch(() => null)

      if (data && data.success && data.executed && data.winner) {
        const winnerData = data.winner // 🟢 Παίρνουμε τον πραγματικό νικητή από το API

        setLastWinner(winnerData)
        localStorage.setItem('ugc_last_winner', JSON.stringify(winnerData))

        setWinnersHistory((prev) => {
          const updated = [winnerData, ...prev]
          localStorage.setItem('ugc_winners_history', JSON.stringify(updated))
          return updated
        })

        setPosts([])
        setJackpotAmount(50.00)
        localStorage.removeItem('ugc_posts')

        if (user?.id) refreshUserData(user.id)
        await fetchFeedData()
      } else if (data && !data.executed) {
        setDrawCancelledMessage(`⚠️ ${data.message}`)
      }
    } catch (err) {
      console.error('Error executing draw:', err)
    }
  }

  useEffect(() => {
    setIsMounted(true)

    const savedLang = localStorage.getItem('ugc_lang') as 'el' | 'en'
    if (savedLang) setLang(savedLang)

    const savedUser = localStorage.getItem('ugc_user')
    if (savedUser) {
      try { 
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
        if (parsedUser?.id) refreshUserData(parsedUser.id)
      } catch (e) {}
    }

    const savedLastWinner = localStorage.getItem('ugc_last_winner')
    if (savedLastWinner) {
      try { setLastWinner(JSON.parse(savedLastWinner)) } catch (e) {}
    }

    const savedHistory = localStorage.getItem('ugc_winners_history')
    if (savedHistory) {
      try { setWinnersHistory(JSON.parse(savedHistory)) } catch (e) {}
    }

    fetchFeedData()

    // 🟢 1. Συνάρτηση υπολογισμού δευτερολέπτων μέχρι την επόμενη ακριβώς ώρα (:00)
    const getSecondsUntilNextHour = () => {
      const now = new Date()
      const nextHour = new Date(now)
      nextHour.setMinutes(0, 0, 0)
      nextHour.setHours(nextHour.getHours() + 1)
      return Math.max(1, Math.floor((nextHour.getTime() - now.getTime()) / 1000))
    }

    // 🟢 2. Έλεγχος & Εκτέλεση Κλήρωσης
    const handleHourBoundary = async () => {
      try {
        const res = await fetch('/api/feed', { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        const currentPosts = data?.posts || []

        const postsWithTickets = currentPosts.filter((p: any) => {
          const tickets = p.ticketsCount ?? p.votes?.reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 0), 0) ?? 0
          return tickets > 0
        })

        if (postsWithTickets.length >= 4) {
          setDrawCancelledMessage(null)
          setIsSlotDrawOpen(true)
        } else {
          setDrawCancelledMessage(
            lang === 'en'
              ? `⚠️ Draw postponed: Requires at least 4 active posts with tickets (currently ${postsWithTickets.length}/4).`
              : `⚠️ Η κλήρωση αναβλήθηκε: Απαιτούνται τουλάχιστον 4 ενεργά posts με λαχνούς (αυτή τη στιγμή ${postsWithTickets.length}/4).`
          )
        }
      } catch (e) {
        console.error('Boundary check error:', e)
      }
    }

    // Αρχική ρύθμιση συγχρονισμένου χρόνου
    setTimeLeft(getSecondsUntilNextHour())

    // 🟢 3. Interval που ενημερώνεται βάσει του πραγματικού ρολογιού (UTC)
    const timerInterval = setInterval(() => {
      const remainingSeconds = getSecondsUntilNextHour()
      setTimeLeft(remainingSeconds)

      // Όταν φτάσει στην αλλαγή της ώρας
      if (remainingSeconds <= 1 || remainingSeconds >= 3599) {
        handleHourBoundary()
      }
    }, 1000)

    const feedInterval = setInterval(() => {
      fetchFeedData()
    }, 4000)

    return () => {
      clearInterval(timerInterval)
      clearInterval(feedInterval)
    }
  }, [lang])

  useEffect(() => {
    if (user?.id) {
      fetch(`/api/posts/user?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.posts) setUserHistoryPosts(data.posts)
        })
        .catch(() => {})
    }
  }, [user?.id, posts])

  const toggleLanguage = () => {
    const newLang = lang === 'el' ? 'en' : 'el'
    setLang(newLang)
    localStorage.setItem('ugc_lang', newLang)
  }

  // 🟢 Μορφοποίηση Ώρας σε HH:MM:SS ή MM:SS
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60

    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleBetSuccess = async (targetFileId: string, newBal: number, newJackpot: number, newVote?: any) => {
    const betAmount = newVote?.tickets_earned ? Number(newVote.tickets_earned) : 1

    const currentBal = Number(user?.wallet_balance ?? 100)
    const calculatedBal = !isNaN(Number(newBal)) ? Number(newBal) : Math.max(0, currentBal - betAmount)

    if (user) {
      const updatedUser = { ...user, wallet_balance: calculatedBal }
      setUser(updatedUser)
      localStorage.setItem('ugc_user', JSON.stringify(updatedUser))
    }
    window.dispatchEvent(new CustomEvent('wallet_updated', { detail: calculatedBal }))

    const currentJackpot = Number(jackpotAmount || 50)
    const calculatedJackpot = !isNaN(Number(newJackpot)) && Number(newJackpot) > 0 
      ? Number(newJackpot) 
      : Number((currentJackpot + betAmount * 0.90).toFixed(2))
    
    setJackpotAmount(calculatedJackpot)

    const activeUsername = 
      user?.username || 
      user?.full_name || 
      user?.name || 
      (user?.email ? user.email.split('@')[0] : 'Player')

    setPosts((prevPosts) => {
      const updated = prevPosts.map((post) => {
        if (post.id === targetFileId || post.hash_id === targetFileId) {
          const currentVotes = post.votes || []

          const addedVote = newVote || {
            id: 'v-' + Date.now(),
            tickets_earned: betAmount,
            user_id: user?.id || user?.player_id,
            users: {
              username: activeUsername,
              full_name: activeUsername
            }
          }

          return {
            ...post,
            votes: [...currentVotes, addedVote]
          }
        }
        return post
      })

      localStorage.setItem('ugc_posts', JSON.stringify(updated))
      return updated
    })

    await fetchFeedData()
  }

  const renderSupportersList = (postVotes: any[]) => {
    if (!postVotes || postVotes.length === 0) {
      return (
        <span className="text-[11px] text-slate-500 italic">
          {lang === 'en' ? 'No supporters yet. Be the first!' : 'Δεν υπάρχουν ακόμα υποστηρικτές. Γίνε ο πρώτος!'}
        </span>
      )
    }

    const supportersMap: { [key: string]: { name: string; totalAmount: number } } = {}

    postVotes.forEach((v: any) => {
      const rawUser = v.users || v.user || {}
      
      const supporterName = 
        rawUser.username || 
        rawUser.full_name || 
        rawUser.name || 
        (rawUser.email ? rawUser.email.split('@')[0] : null) || 
        getCleanUsername(rawUser) || 
        (typeof rawUser === 'string' && rawUser.trim() !== '' ? rawUser.trim() : 'Player')

      const amount = Number(v.tickets_earned) || 1

      if (!supportersMap[supporterName]) {
        supportersMap[supporterName] = { name: supporterName, totalAmount: 0 }
      }
      supportersMap[supporterName].totalAmount += amount
    })

    const supportersList = Object.values(supportersMap)

    return (
      <div className="flex flex-wrap gap-2 pt-1">
        {supportersList.map((sup, idx) => (
          <div 
            key={`sup-${idx}`}
            className="flex items-center gap-1.5 bg-slate-950 border border-amber-500/30 px-2.5 py-1 rounded-xl shadow-sm"
          >
            <span className="text-xs text-slate-300 font-medium">👤 {sup.name}:</span>
            <span className="text-xs font-black text-emerald-400 font-mono">
              €{sup.totalAmount.toFixed(2)} ({sup.totalAmount} 🎟️)
            </span>
          </div>
        ))}
      </div>
    )
  }

  const handleDrawComplete = async (winningPost: any, fallbackSupportersList: any[]) => {
    setIsSlotDrawOpen(false)
    await executeJackpotDraw()
  }

  if (!isMounted) return null

  const isEn = lang === 'en'
  const activePostsCount = getActivePostsWithTicketsCount(posts)

  const myPostsCount = user?.id
    ? posts.filter((p) => p.user_id === user.id || p.users?.id === user.id).length
    : 0

  const displayedPosts = showMyPostsOnly && user?.id
    ? posts.filter((p) => p.user_id === user.id || p.users?.id === user.id)
    : posts

  return (
    <main className="min-h-screen bg-slate-950 text-white pb-16" suppressHydrationWarning>
      
      <Header
        user={user}
        jackpotAmount={jackpotAmount}
        lang={lang}
        showMyPostsOnly={showMyPostsOnly}
        postsCount={myPostsCount}
        onLanguageToggle={toggleLanguage}
        onLoginClick={handleOpenLogin}
        onRegisterClick={handleOpenRegister}
        onLogoutClick={() => { 
          localStorage.removeItem('ugc_user')
          setUser(null)
          window.location.reload()
        }}
        onCreatePostClick={handleOpenCreatePost}
        onMyPostsClick={() => setShowMyPostsOnly((prev) => !prev)}
      />

      <div className="max-w-4xl mx-auto px-4 mt-6">
        
        {drawCancelledMessage && (
          <div className="bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs p-4 rounded-2xl mb-6 flex justify-between items-center shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-lg">📢</span>
              <span>{drawCancelledMessage}</span>
            </div>
            <button 
              onClick={() => setDrawCancelledMessage(null)}
              className="text-amber-400 hover:text-white font-bold text-sm ml-3 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {showMyPostsOnly && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-400 mb-6 flex items-center justify-between">
            <span>{isEn ? 'Showing only your posts.' : 'Προβάλλονται μόνο οι δικές σας δημοσιεύσεις.'}</span>
            <button
              onClick={() => setShowMyPostsOnly(false)}
              className="underline font-bold hover:text-amber-300 cursor-pointer"
            >
              {isEn ? 'Show All' : 'Εμφάνιση Όλων'}
            </button>
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center bg-slate-900/90 border border-amber-500/30 p-4 rounded-2xl mb-6 gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-spin">⏳</span>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                {isEn ? 'Next Hourly Draw in:' : 'Επόμενη Ωριαία Κλήρωση σε:'}
              </span>
              <span className="text-xl font-black text-amber-400 font-mono tracking-widest">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-4 py-2 rounded-xl text-xs border border-amber-500/20 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <span suppressHydrationWarning>
                {isEn ? `📜 Winners History (${winnersHistory.length})` : `📜 Ιστορικό Νικητών (${winnersHistory.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* 🏆 ΚΑΡΤΑ ΝΙΚΗΤΗ ΤΕΛΕΥΤΑΙΑΣ ΚΛΗΡΩΣΗΣ */}
        {lastWinner && (
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border-2 border-amber-500 p-5 rounded-2xl mb-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-2 right-3 text-3xl">👑</div>
            
            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider" suppressHydrationWarning>
                {isEn ? `🏆 Last Draw Winner (${lastWinner.date || ''})` : `🏆 Νικητής Τελευταίας Κλήρωσης (${lastWinner.date || ''})`}
              </span>
              <span className="text-xs font-mono text-amber-300 bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full font-bold" suppressHydrationWarning>
                Jackpot Pool: €{(Number(lastWinner.total_jackpot) || 50).toFixed(2)}
              </span>
            </div>

            <h3 className="text-xl font-black text-white" suppressHydrationWarning>
              👤 {lastWinner.winner_name || (isEn ? 'Winner' : 'Νικητής')}
            </h3>

            {/* ΤΙΤΛΟΣ & ΚΕΙΜΕΝΟ ΝΙΚΗΤΗΡΙΟΥ POST */}
            <div className="my-3 bg-black/40 p-3 rounded-xl border border-slate-800">
              {lastWinner.post_title && (
                <h4 className="text-sm font-extrabold text-amber-300 mb-1" suppressHydrationWarning>
                  "{lastWinner.post_title}"
                </h4>
              )}
              
              {lastWinner.post_text && (
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-line" suppressHydrationWarning>
                  {lastWinner.post_text}
                </p>
              )}

              {lastWinner.post_media && (
                <div className="mt-2.5 rounded-lg overflow-hidden border border-slate-800 max-h-40 flex items-center justify-center bg-black">
                  <img src={lastWinner.post_media} alt="Winner asset" className="max-h-40 w-full object-contain" />
                </div>
              )}
            </div>

            {/* 💰 ΑΝΑΛΥΣΗ ΚΕΡΔΩΝ: 70% CREATOR & 30% SUPPORTERS */}
            <div className="grid grid-cols-2 gap-2 my-3 text-xs">
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block">🎨 Creator Prize (70%):</span>
                <span className="text-sm font-black text-emerald-300 font-mono">
                  €{(Number(lastWinner.creator_prize) || 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-indigo-950/40 border border-indigo-500/30 p-2.5 rounded-xl">
                <span className="text-[10px] text-indigo-400 font-bold uppercase block">👥 Supporters Pool (30%):</span>
                <span className="text-sm font-black text-indigo-300 font-mono">
                  €{(Number(lastWinner.supporters_pool) || 0).toFixed(2)}
                </span>
              </div>
            </div>

           {/* 👥 ΨΗΦΟΦΟΡΟΙ / ΥΠΟΣΤΗΡΙΖΟΝΤΕΣ ΝΙΚΗΤΗ */}
          {lastWinner.supporters && lastWinner.supporters.length > 0 && (
              <div className="mb-2 text-left border-t border-slate-800 pt-2">
                <span className="text-[10px] text-amber-400 font-bold uppercase block mb-1.5">
                 👥 {isEn ? 'Winning Supporters & Earnings:' : 'Υποστηρικτές & Κέρδη:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {lastWinner.supporters.map((sup: any, idx: number) => {
                    // 🟢 Καθαρισμός ονόματος υποστηρικτή
                     const supporterName = sup.username || sup.name || sup.full_name || (sup.email ? sup.email.split('@')[0] : 'Supporter')
        
                 return (
                   <div
                        key={`sup-win-${idx}`}
                        className="bg-slate-950 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                    >
                        <span className="text-slate-300 font-medium">👤 {supporterName}:</span>
                        <span className="text-emerald-400 font-black font-mono">
                          +€{(Number(sup.prizeWon || sup.amount) || 0).toFixed(2)}
                        </span>
                        {sup.tickets && (
                           <span className="text-[10px] text-slate-500 font-mono">
                             ({sup.tickets} 🎟️)
                           </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
            )} 
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight" suppressHydrationWarning>
              {isEn ? '🔥 Live Content Feed' : '🔥 Ζωντανή Ροή Περιεχομένου'}
            </h1>
            <p className="text-xs text-slate-400 font-medium" suppressHydrationWarning>
              {isEn ? `Active Posts with Tickets in Pool: ${activePostsCount}/4 min` : `Ενεργά δημοσιεύματα με λαχνούς στην κλήρωση: ${activePostsCount}/4 ελάχιστο`}
            </p>
          </div>

          <button
            onClick={handleOpenCreatePost}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span>✨</span>
            <span suppressHydrationWarning>{isEn ? 'New Post' : 'Νέο Δημοσίευμα'}</span>
          </button>
        </div>

        {displayedPosts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <span className="text-4xl block mb-3">📭</span>
            <p className="text-slate-400 text-sm font-semibold" suppressHydrationWarning>
              {showMyPostsOnly
                ? (isEn ? 'You have no posts in this draw cycle.' : 'Δεν έχετε δημοσιεύσεις σε αυτόν τον κύκλο.')
                : (isEn ? 'No posts found in this draw cycle yet.' : 'Δεν υπάρχουν ακόμα δημοσιεύματα σε αυτόν τον κύκλο.')}
            </p>
            <button
              onClick={handleOpenCreatePost}
              className="mt-4 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-4 py-2 rounded-xl text-xs border border-amber-500/20 cursor-pointer"
              suppressHydrationWarning
            >
              {isEn ? 'Be the first to post!' : 'Γίνε ο πρώτος που θα δημοσιεύσει!'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedPosts.map((post) => {
              const { title, body } = extractTitleAndBody(post)
              const authorName = getCleanUsername(post.users) || 'User'

              const postVotes = post.votes || []
              const totalTickets = postVotes.reduce((acc: number, v: any) => acc + (Number(v.tickets_earned) || 0), 0)

              return (
                <div
                  key={`post-${post.id || post.hash_id}`}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all shadow-xl flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center font-black text-xs text-slate-950 shadow-md">
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-200 block leading-tight">
                            {authorName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {post.created_at ? new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-xs font-black text-amber-400 font-mono">
                          🎟️ {totalTickets}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold" suppressHydrationWarning>
                          {isEn ? 'Tickets' : 'Λαχνοί'}
                        </span>
                      </div>
                    </div>

                    {title && (
                      <h2 className="text-lg font-extrabold text-amber-300 mt-2 mb-1">
                        {title}
                      </h2>
                    )}

                    {body && (
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                        {body}
                      </p>
                    )}

                    {post.file_url && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-slate-800 bg-black/50 max-h-96 flex items-center justify-center">
                        {post.file_type?.startsWith('video') ? (
                          <video src={post.file_url} controls className="max-h-96 w-full object-contain" />
                        ) : (
                          <img src={post.file_url} alt="Post asset" className="max-h-96 w-full object-contain" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-3">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-xs font-bold text-amber-400" suppressHydrationWarning>
                        {isEn ? '👥 Supporters & Bets' : '👥 Υποστηρικτές & Πονταρίσματα'}
                      </span>

                      <BetButton
                        fileId={post.id || post.hash_id}
                        userId={user?.id}
                        userBalance={user?.wallet_balance ?? 100}
                        onRequireLogin={handleOpenLogin}
                        onBetSuccess={(newBal, newJackpot, newVote) => {
                          handleBetSuccess(post.id || post.hash_id, newBal, newJackpot, newVote)
                        }}
                      />
                    </div>

                    {renderSupportersList(post.votes || [])}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AuthModal 
        isOpen={isAuthOpen} 
        lang={lang} 
        mode={authMode} 
        onClose={() => setIsAuthOpen(false)}
        onSwitchMode={(mode) => setAuthMode(mode)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser)
          localStorage.setItem('ugc_user', JSON.stringify(loggedUser))
          setIsAuthOpen(false)
        }}
      />

      <CreatePostModal 
        isOpen={isCreatePostOpen} 
        lang={lang} 
        userId={user?.id || user?.player_id}
        onClose={() => setIsCreatePostOpen(false)}
        onSuccess={(newPost) => {
          setIsCreatePostOpen(false)
          if (newPost) {
            setPosts((prevPosts) => {
              const updated = [newPost, ...prevPosts]
              localStorage.setItem('ugc_posts', JSON.stringify(updated))
              return updated
            })
          }
          fetchFeedData()
        }}
      />

      <WinnersHistoryModal 
        history={winnersHistory} 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        lang={lang}
      />

      <SlotDrawModal 
        isOpen={isSlotDrawOpen} 
        jackpotAmount={jackpotAmount} 
        posts={posts}
        onClose={() => setIsSlotDrawOpen(false)}
        onDrawComplete={handleDrawComplete}
        lang={lang}
      />

      <MyPostsModal 
        isOpen={isMyPostsOpen} 
        userId={user?.id}
        onClose={() => setIsMyPostsOpen(false)}
        onPostDeleted={() => fetchFeedData()}
        lang={lang}
      />
    </main>
  )
}
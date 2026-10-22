'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    currentJackpot: 0,
    totalHistoricalJackpot: 0,
    currentProfit: 0,
    totalProfit: 0,
  })
  const [users, setUsers] = useState<any[]>([])
  const [filterLive, setFilterLive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        if (data.stats) setStats(data.stats)
        if (data.users) setUsers(data.users)
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleForceDraw = async () => {
    if (!confirm('Είστε σίγουροι ότι θέλετε να εκτελέσετε αναγκαστική κλήρωση Jackpot τώρα;')) {
      return
    }

    setDrawing(true)
    try {
      const res = await fetch('/api/jackpot/draw', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        alert(`🏆 Η κλήρωση ολοκληρώθηκε! Νικητής: ${data.winner?.username || 'Κανένας'}`)
        fetchStats()
      } else {
        alert(`Αποτυχία κλήρωσης: ${data.error}`)
      }
    } catch (err) {
      alert('Σφάλμα κατά την εκτέλεση της κλήρωσης')
    } finally {
      setDrawing(false)
    }
  }

  const displayedUsers = filterLive ? users.filter((u) => u.isLive) : users

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-black text-amber-400">🛡️ Admin Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Επισκόπηση εσόδων, κληρώσεων και διαχείριση χρηστών
          </p>
        </div>

        <Link
          href="/"
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs border border-slate-700 transition"
        >
          🏠 Επιστροφή στο Feed
        </Link>
      </div>

      {/* STATS CARDS GRID */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 font-mono">⏳ Φόρτωση στατιστικών...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-bold">👥 ΣΥΝΟΛΙΚΟΙ ΧΡΗΣΤΕΣ</span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                  Live
                </span>
              </div>
              <div className="text-3xl font-black text-white">{stats.totalUsers}</div>
              <p className="text-[10px] text-slate-500 mt-2">Εγγεγραμμένοι λογαριασμοί στη Supabase</p>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 p-5 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-amber-400 font-bold block mb-1">🎯 ΤΡΕΧΟΝ JACKPOT</span>
              <span className="text-2xl font-black text-amber-400">€{stats.currentJackpot.toFixed(2)}</span>
              <p className="text-[10px] text-slate-500 mt-2">Ενεργός κύκλος κλήρωσης</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-bold block mb-1">🏆 ΣΥΝΟΛΟ JACKPOTS</span>
              <span className="text-2xl font-black text-emerald-400">€{stats.totalHistoricalJackpot.toFixed(2)}</span>
              <p className="text-[10px] text-slate-500 mt-2">Όλοι οι κύκλοι συνολικά</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-bold block mb-1">💵 ΚΕΡΔΟΣ (ΤΡΕΧΟΝ)</span>
              <span className="text-2xl font-black text-cyan-400">€{stats.currentProfit.toFixed(2)}</span>
              <p className="text-[10px] text-slate-500 mt-2">10% από τον τρέχοντα κύκλο</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-bold block mb-1">💰 ΣΥΝΟΛΙΚΟ ΚΕΡΔΟΣ</span>
              <span className="text-2xl font-black text-purple-400">€{stats.totalProfit.toFixed(2)}</span>
              <p className="text-[10px] text-slate-500 mt-2">10% από όλες τις εισπράξεις</p>
            </div>
          </div>

          {/* TABLE OF USERS WITH ALL COLUMNS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  📊 Διαχείριση Χρηστών & Δραστηριότητα
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Εμφάνιση {displayedUsers.length} από {users.length} συνολικά χρήστες
                </p>
              </div>

              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setFilterLive(false)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    !filterLive
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👥 Όλοι οι Χρήστες ({users.length})
                </button>
                <button
                  onClick={() => setFilterLive(true)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    filterLive
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🟢</span>
                  <span>Μόνο Ενεργοί ({users.filter((u) => u.isLive).length})</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                  <tr>
                    <th className="p-3">Χρήστης</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Υπόλοιπο (€)</th>
                    <th className="p-3 text-center">Ενεργά Posts</th>
                    <th className="p-3 text-center">Σύνολο Posts</th>
                    <th className="p-3 text-right">Ποσό στα Posts (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        {filterLive
                          ? 'Δεν υπάρχει κανένας ενεργός χρήστης αυτή τη στιγμή.'
                          : 'Δεν βρέθηκαν χρήστες.'}
                      </td>
                    </tr>
                  ) : (
                    displayedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-bold text-slate-200">
                          {u.username}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.isLive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {u.isLive ? '🟢 LIVE' : '⚪ Offline'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-cyan-400">
                          €{(u.balance || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-amber-400">
                          {u.activePostsCount}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-400">
                          {u.totalPostsHistory || 0}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          €{u.totalAmountOnUserPosts.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ADMIN ACTIONS */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white">⚡ Χειροκίνητη Εκτέλεση Κλήρωσης</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ολοκληρώνει τον τρέχοντα κύκλο, αναδεικνύει νικητή και μηδενίζει το τρέχον Jackpot.
          </p>
        </div>

        <button
          onClick={handleForceDraw}
          disabled={drawing}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
        >
          {drawing ? 'Εκτέλεση...' : '🎰 FORCE DRAW NOW'}
        </button>
      </div>
    </div>
  )
}
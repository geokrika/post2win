'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function MyPostsPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reactivatingId, setReactivatingId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedUser = localStorage.getItem('ugc_user')
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        setUser(parsed)
        fetchUserPosts(parsed.id)
      } catch (e) {
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserPosts = async (userId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/posts/user?userId=${userId}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.posts) {
        setPosts(data.posts)
      }
    } catch (err) {
      console.error('Error loading posts:', err)
    } finally {
      setLoading(false)
    }
  }

  // ΕΠΑΝΑΔΗΜΟΣΙΕΥΣΗ (Re-activate)
  const handleReactivate = async (postId: string) => {
    if (!user) return
    setReactivatingId(postId)

    try {
      const res = await fetch('/api/posts/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, userId: user.id }),
      })
      const data = await res.json()

      if (data.success) {
        // Ενημέρωση τοπικά στο UI
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, is_active: true } : p))
        )
        if (typeof window !== 'undefined') {
          window.alert('🚀 Το post έγινε ξανά ενεργό και εμφανίζεται στην αρχική σελίδα!')
        }
      } else {
        if (typeof window !== 'undefined') {
          window.alert(`Αποτυχία: ${data.error}`)
        }
      }
    } catch (err) {
      console.error('Error reactivating post:', err)
    } finally {
      setReactivatingId(null)
    }
  }

  // ΔΙΑΓΡΑΦΗ
  const handleDelete = async (postId: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το post;')) {
      return
    }

    setDeletingId(postId)

    try {
      const res = await fetch(`/api/posts/manage?postId=${postId}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        setPosts((prev) => prev.filter((p) => p.id !== postId))

        if (typeof window !== 'undefined') {
          const savedPosts = localStorage.getItem('ugc_posts')
          if (savedPosts) {
            try {
              const parsed = JSON.parse(savedPosts)
              const updated = parsed.filter((p: any) => p.id !== postId && p.hash_id !== postId)
              localStorage.setItem('ugc_posts', JSON.stringify(updated))
            } catch (e) {}
          }
        }
      } else {
        if (typeof window !== 'undefined') {
          window.alert(data.error || 'Αποτυχία διαγραφής')
        }
      }
    } catch (err: any) {
      console.error('Error deleting post:', err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-amber-400">📝 Το Ιστορικό των Posts μου</h1>
          <p className="text-xs text-slate-400 mt-1">
            Διαχείριση, επαναδημοσίευση και διαγραφή των posts σας
          </p>
        </div>

        <Link
          href="/"
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs border border-slate-700"
        >
          🏠 Επιστροφή στο Feed
        </Link>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="text-center py-16 text-slate-500 font-mono">⏳ Φόρτωση δημοσιεύσεων...</div>
      ) : !user ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
          <p className="text-slate-400 text-sm font-semibold mb-4">
            Παρακαλώ συνδεθείτε για να δείτε το ιστορικό σας.
          </p>
          <Link href="/" className="bg-amber-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs">
            Σύνδεση
          </Link>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800">
          <span className="text-4xl block mb-2">📭</span>
          <p className="text-slate-400 text-sm font-semibold">
            Δεν βρέθηκαν δημοσιεύσεις στο ιστορικό σας.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between gap-3 hover:border-slate-700 transition"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-slate-500">
                    #{String(post.id).substring(0, 8).toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {post.created_at ? new Date(post.created_at).toLocaleString() : ''}
                  </span>
                </div>

                {post.title && (
                  <h2 className="text-base font-extrabold text-amber-300 mb-1">
                    {post.title}
                  </h2>
                )}

                <p className="text-xs text-slate-300 whitespace-pre-line line-clamp-3">
                  {post.text_content || post.caption || ''}
                </p>
              </div>

              {/* ACTIONS */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-800/80">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    post.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {post.is_active ? '● Ενεργός Κύκλος' : 'Ολοκληρώθηκε'}
                </span>

                <div className="flex items-center gap-2">
                  {/* ΚΟΥΜΠΙ ΕΠΑΝΑΔΗΜΟΣΙΕΥΣΗΣ (Εμφανίζεται μόνο αν δεν είναι active) */}
                  {!post.is_active && (
                    <button
                      onClick={() => handleReactivate(post.id)}
                      disabled={reactivatingId === post.id}
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                    >
                      <span>🔄</span>
                      <span>
                        {reactivatingId === post.id ? 'Ενεργοποίηση...' : 'Επαναδημοσίευση'}
                      </span>
                    </button>
                  )}

                  {/* ΚΟΥΜΠΙ ΔΙΑΓΡΑΦΗΣ */}
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                  >
                    <span>🗑️</span>
                    <span>{deletingId === post.id ? 'Διαγραφή...' : 'Διαγραφή'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
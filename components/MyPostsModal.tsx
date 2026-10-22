'use client'

import { useState, useEffect } from 'react'

interface MyPostsModalProps {
  isOpen: boolean
  userId?: string
  onClose: () => void
  onPostDeleted?: () => void
  lang?: 'el' | 'en'
}

export default function MyPostsModal({
  isOpen,
  userId,
  onClose,
  onPostDeleted,
  lang = 'el',
}: MyPostsModalProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isEn = lang === 'en'

  // Φόρτωση των posts του χρήστη απευθείας από τη βάση
  const fetchMyPosts = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/posts/user?userId=${userId}`, { cache: 'no-store' })
      const data = await res.json()
      if (data.posts) {
        setPosts(data.posts)
      }
    } catch (err) {
      console.error('Error loading user posts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && userId) {
      fetchMyPosts()
    }
  }, [isOpen, userId])

  // Διαγραφή Post από τη βάση
  const handleDeletePost = async (postId: string) => {
    if (!confirm(isEn ? 'Are you sure you want to delete this post?' : 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το post;')) {
      return
    }

    setDeletingId(postId)

    try {
      const res = await fetch(`/api/posts/delete?postId=${postId}&userId=${userId}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (data.success) {
        // Αφαίρεση από το τοπικό state
        setPosts((prev) => prev.filter((p) => p.id !== postId))
        if (onPostDeleted) onPostDeleted()
      } else {
        alert(data.error || 'Αποτυχία διαγραφής')
      }
    } catch (err) {
      console.error('Error deleting post:', err)
      alert('Σφάλμα κατά τη διαγραφή')
    } finally {
      setDeletingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative">
        
        {/* HEADER */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
            📝 {isEn ? 'My Post History' : 'Το Ιστορικό των Posts μου'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-lg p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* LIST OF POSTS */}
        <div className="overflow-y-auto my-4 space-y-4 pr-1 flex-1">
          {loading ? (
            <div className="text-center py-12 text-slate-500 font-mono">
              ⏳ {isEn ? 'Loading posts from database...' : 'Φόρτωση δημοσιεύσεων από τη βάση...'}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              📭 {isEn ? 'No posts found in your history.' : 'Δεν βρέθηκαν δημοσιεύσεις στο ιστορικό σας.'}
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between gap-3 hover:border-slate-700 transition"
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
                    <h3 className="text-base font-extrabold text-amber-300 mb-1">
                      {post.title}
                    </h3>
                  )}

                  <p className="text-xs text-slate-300 whitespace-pre-line line-clamp-3">
                    {post.text_content || post.caption || ''}
                  </p>
                </div>

                {/* FOOTER & DELETE BUTTON */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-900">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    post.is_active 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {post.is_active 
                      ? (isEn ? '● Active Pool' : '● Ενεργός Κύκλος') 
                      : (isEn ? 'Drawn / History' : 'Ολοκληρώθηκε')}
                  </span>

                  <button
                    onClick={() => handleDeletePost(post.id)}
                    disabled={deletingId === post.id}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-3 py-1 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                  >
                    <span>🗑️</span>
                    <span>{deletingId === post.id ? (isEn ? 'Deleting...' : 'Διαγραφή...') : (isEn ? 'Delete' : 'Διαγραφή')}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
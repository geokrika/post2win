'use client'

import { useState } from 'react'

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  onSuccess: (newPost: any) => void
  lang: 'el' | 'en'
}

export default function CreatePostModal({
  isOpen,
  onClose,
  onSuccess,
  lang,
}: CreatePostModalProps) {
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const isEn = lang === 'en'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 🟢 ΔΙΑΒΑΣΜΑ ΠΡΑΓΜΑΤΙΚΟΥ ΣΥΝΔΕΔΕΜΕΝΟΥ ΧΡΗΣΤΗ ΑΠΟ ΤΟ LOCALSTORAGE
    const savedUser = localStorage.getItem('ugc_user')
    let activeUser: any = null

    if (savedUser) {
      try {
        activeUser = JSON.parse(savedUser)
      } catch (err) {
        console.error('Error parsing user from localStorage:', err)
      }
    }

    if (!activeUser || !activeUser.id) {
      alert(
        isEn
          ? 'You must be logged in to post. Please log in again.'
          : 'Δεν είστε συνδεδεμένος. Παρακαλώ συνδεθείτε ξανά.'
      )
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUser.id, // 👈 Στέλνουμε το ΠΡΑΓΜΑΤΙΚΟ ID του συνδεδεμένου χρήστη
          title: title.trim(),
          textContent: textContent.trim(),
          fileUrl: fileUrl.trim() || null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setTitle('')
        setTextContent('')
        setFileUrl('')
        onSuccess(data.post)
      } else {
        alert(
          (isEn ? 'Error creating post: ' : 'Σφάλμα δημιουργίας: ') +
            (data.error || '')
        )
      }
    } catch (err) {
      console.error('Submit Post Error:', err)
      alert(
        isEn
          ? 'Failed to create post. Please try again.'
          : 'Αποτυχία δημιουργίας δημοσιεύματος. Δοκιμάστε ξανά.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-amber-400">
            {isEn ? '✨ Create New Post' : '✨ Νέο Δημοσίευμα'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1 font-semibold">
              {isEn ? 'Title' : 'Τίτλος'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 transition"
              placeholder={
                isEn ? 'Give your post a title...' : 'Δώστε έναν τίτλο...'
              }
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1 font-semibold">
              {isEn ? 'Content' : 'Περιεχόμενο'}
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 h-28 transition resize-none"
              placeholder={
                isEn
                  ? 'Write your post content here...'
                  : 'Γράψτε το κείμενό σας...'
              }
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1 font-semibold">
              {isEn ? 'Image or Video URL (Optional)' : 'URL Εικόνας / Βίντεο (Προαιρετικό)'}
            </label>
            <input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 transition"
              placeholder="https://..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Ακύρωση'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl text-xs font-black transition shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? isEn
                  ? 'Posting...'
                  : 'Δημοσίευση...'
                : isEn
                ? 'Publish Post'
                : 'Δημοσίευση'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
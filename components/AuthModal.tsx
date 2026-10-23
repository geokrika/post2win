'use client'

import { useState, useEffect } from 'react'

interface AuthModalProps {
  isOpen: boolean
  mode?: 'login' | 'register'
  initialMode?: 'login' | 'register'
  lang?: 'el' | 'en'
  onClose: () => void
  onSwitchMode?: (mode: 'login' | 'register') => void
  onSuccess: (user: any) => void
}

export default function AuthModal({
  isOpen,
  mode: propMode,
  initialMode = 'login',
  lang = 'el',
  onClose,
  onSwitchMode,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(propMode || initialMode)
  
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMode(propMode || initialMode)
      setError(null)
    }
  }, [propMode, initialMode, isOpen])

  if (!isOpen) return null

  const isEn = lang === 'en'

  const toggleMode = () => {
    setError(null)
    const newMode = mode === 'login' ? 'register' : 'login'
    setMode(newMode)
    if (onSwitchMode) onSwitchMode(newMode)
  }

  // 🟢 Αποθήκευση πραγματικού χρήστη από τη βάση
  const saveAndCompleteUser = (rawUserData: any) => {
    localStorage.removeItem('ugc_user')

    const cleanUser = {
      id: rawUserData.id || rawUserData.user_id,
      player_id: rawUserData.player_id,
      username: rawUserData.username || rawUserData.full_name || rawUserData.email?.split('@')[0],
      email: rawUserData.email || '',
      wallet_balance: Number(rawUserData.wallet_balance ?? 100.00)
    }

    localStorage.setItem('ugc_user', JSON.stringify(cleanUser))
    onSuccess(cleanUser)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'register') {
        if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
          setError(isEn ? 'Please fill in all required fields.' : 'Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία.')
          setLoading(false)
          return
        }

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(),
            username: username.trim(),
            email: email.trim(),
            phone: phone.trim(),
            password: password.trim(),
          }),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          setError(data.error || (isEn ? 'Registration failed.' : 'Η εγγραφή απέτυχε.'))
          setLoading(false)
          return
        }

        saveAndCompleteUser(data.user)

      } else {
        if (!email.trim() || !password.trim()) {
          setError(isEn ? 'Please fill in email and password.' : 'Παρακαλώ συμπληρώστε email και κωδικό.')
          setLoading(false)
          return
        }

        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: email.trim(),
            password: password.trim(),
          }),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          setError(data.error || (isEn ? 'Login failed.' : 'Η σύνδεση απέτυχε.'))
          setLoading(false)
          return
        }

        saveAndCompleteUser(data.user)
      }
    } catch (err: any) {
      setError(err.message || (isEn ? 'An error occurred' : 'Σφάλμα κατά την επεξεργασία'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-amber-400 mb-4">
          {mode === 'login'
            ? isEn ? '🔑 Login' : '🔑 Σύνδεση'
            : isEn ? '✨ Register' : '✨ Εγγραφή'}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isEn ? 'Full Name' : 'Ονοματεπώνυμο'} *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isEn ? 'John Doe' : 'Γιώργος Παπαδόπουλος'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isEn ? 'Username' : 'Όνομα Χρήστη (Username)'} *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username123"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isEn ? 'Phone Number' : 'Τηλέφωνο'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="6912345678"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isEn ? 'Password' : 'Κωδικός πρόσβασης'} *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black py-2.5 rounded-xl text-sm transition mt-2 cursor-pointer"
          >
            {loading
              ? '...'
              : mode === 'login'
              ? isEn ? 'Login' : 'Σύνδεση'
              : isEn ? 'Register' : 'Εγγραφή'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-xs text-slate-400 hover:text-amber-400 underline cursor-pointer"
          >
            {mode === 'login'
              ? isEn ? "Don't have an account? Register" : 'Δεν έχετε λογαριασμό; Εγγραφή'
              : isEn ? 'Already have an account? Login' : 'Έχετε ήδη λογαριασμό; Σύνδεση'}
          </button>
        </div>

      </div>
    </div>
  )
}
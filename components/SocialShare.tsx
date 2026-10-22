'use client'

import React, { useState } from 'react'

export default function SocialShare({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false)

  const shareText = encodeURIComponent(`Δες αυτή τη δημοσίευση στο UGC Jackpot: "${title}"`)
  const shareUrl = encodeURIComponent(url || typeof window !== 'undefined' ? window.location.href : '')

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
      <span className="text-[11px] text-slate-400 font-semibold">Κοινοποίηση:</span>
      
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs transition"
        title="Facebook"
      >
        📘 Facebook
      </a>

      <a
        href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 bg-sky-500/20 hover:bg-sky-500 text-sky-400 hover:text-white rounded-lg text-xs transition"
        title="X / Twitter"
      >
        🐦 X
      </a>

      <a
        href={`https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs transition"
        title="WhatsApp"
      >
        💬 WhatsApp
      </a>

      <button
        onClick={copyToClipboard}
        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition ml-auto"
      >
        {copied ? '✅ Αντιγράφηκε!' : '🔗 Copy Link'}
      </button>
    </div>
  )
}
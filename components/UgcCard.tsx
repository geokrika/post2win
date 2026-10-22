'use client'

import { useState } from 'react'
import BetButton from './BetButton'

interface UgcCardProps {
  file: {
    id: string
    media_type: string
    file_url?: string | null
    text_content?: string | null
    created_at?: string | Date | null
    users?: {
      id: string
      username: string
      full_name?: string | null
    } | null
    votes?: any[]
  }
  totalJackpotVotes?: number
}

export default function UgcCard({ file, totalJackpotVotes = 100 }: UgcCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [useAnonymous, setUseAnonymous] = useState(false)
  
  // State για το Social Share Modal / Menu
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // 1. Δημιουργία Μοναδικού Ψηφιακού Κωδικού (PlayerID-FileID-Timestamp)
  const timestamp = file.created_at ? new Date(file.created_at).getTime() : Date.now()
  const playerIdShort = file.users?.id ? file.users.id.slice(0, 5) : 'ANON'
  const fileIdShort = file.id.slice(0, 5)
  const uniqueCode = `${playerIdShort}-${fileIdShort}-${timestamp.toString().slice(-5)}`

  // 2. Υπολογισμός Λαχνών & Πιθανοτήτων
  const ticketsCount = file.votes?.length || 0
  const winProbability = totalJackpotVotes > 0 
    ? ((ticketsCount / totalJackpotVotes) * 100).toFixed(1) 
    : '0.0'

  // 3. Όνομα Δημιουργού
  const displayName = useAnonymous 
    ? `Player #${playerIdShort}` 
    : (file.users?.full_name || file.users?.username || 'Άγνωστος')

  // 4. Social Share Links & Actions
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/post/${file.id}` : ''
  const shareText = `Δες αυτή τη συμμετοχή στο UGC Progressive Jackpot! 🏆`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Web Share API (για κινητά) αν υποστηρίζεται, αλλιώς ανοίγει το Custom Social Modal
  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'UGC Progressive Jackpot',
          text: shareText,
          url: shareUrl,
        })
        return
      } catch (err) {
        // Αν ο χρήστης ακυρώσει ή αποτύχει, ανοίγει το fallback modal
      }
    }
    setIsShareOpen(!isShareOpen)
  }

  return (
    <article style={{
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #e4e6eb',
      overflow: 'hidden',
      marginBottom: '1.25rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative'
    }}>
      
      {/* ─── 1. HEADER ΚΑΡΤΑΣ ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #f0f2f5'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: '#1877f2',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.1rem'
          }}>
            {displayName[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#050505', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{displayName}</span>
              <button 
                onClick={() => setUseAnonymous(!useAnonymous)}
                title="Αλλαγή προβολής ονόματος"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.75rem',
                  color: '#1877f2',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                ({useAnonymous ? 'Προβολή Ονόματος' : 'Ανώνυμο'})
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#65676b', fontFamily: 'monospace' }}>
              🆔 ID: <span style={{ backgroundColor: '#f0f2f5', padding: '2px 6px', borderRadius: '4px' }}>{uniqueCode}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. MEDIA VIEWER (ΠΕΡΙΕΧΟΜΕΝΟ) ─── */}
      {file.media_type === 'IMAGE' && file.file_url && (
        <div style={{ width: '100%', backgroundColor: '#000' }}>
          <img 
            src={file.file_url} 
            alt="UGC Preview" 
            style={{ 
              width: '100%', 
              maxHeight: '400px', 
              objectFit: 'cover', 
              display: 'block' 
            }}
          />
        </div>
      )}

      {file.media_type === 'AUDIO' && (
        <div style={{
          padding: '1.25rem',
          backgroundColor: '#0f172a',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>🎧 Custom Audio Player</span>
            <span style={{ fontSize: '0.75rem', backgroundColor: '#1e293b', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px' }}>HQ Audio</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#38bdf8',
                color: '#0f172a',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.4)'
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '3px', height: '36px' }}>
              {[40, 70, 25, 90, 55, 30, 80, 100, 65, 45, 85, 50, 30, 75, 95, 60, 40, 20, 80, 50].map((h, i) => (
                <div 
                  key={i} 
                  style={{
                    flex: 1,
                    backgroundColor: isPlaying ? '#38bdf8' : '#334155',
                    height: isPlaying ? `${Math.max(15, (h * (i % 2 === 0 ? 1 : 0.7)))}%` : `${h}%`,
                    borderRadius: '2px',
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {file.text_content && (
        <div style={{
          padding: '1.25rem',
          backgroundColor: '#f8fafc',
          borderLeft: '4px solid #1877f2',
          fontStyle: 'italic',
          color: '#1e293b',
          fontSize: '1rem',
          lineHeight: '1.5'
        }}>
          "{file.text_content}"
        </div>
      )}

      {/* ─── 3. FOOTER ΚΑΡΤΑΣ (Interactions & Probabilities) ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: '#f0fdf4',
        borderTop: '1px solid #dcfce7',
        fontSize: '0.85rem',
        color: '#166534',
        fontWeight: '600'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🎟️</span>
          <span>{ticketsCount} Λαχνοί</span>
        </div>
        <div style={{
          backgroundColor: '#bbf7d0',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '0.8rem',
          color: '#14532d'
        }}>
          🎯 {winProbability}% Πιθανότητα Νίκης
        </div>
      </div>

      <div style={{
        display: 'flex',
        borderTop: '1px solid #e4e6eb',
        padding: '6px 8px',
        gap: '4px'
      }}>
        {/* Κουμπί Πονταρίσματος */}
        <div style={{ flex: 2 }}>
          <BetButton 
            fileId={file.id} 
            onRequireLogin={() => {}} 
            onBetSuccess={() => {}} 
          />
        </div>

        {/* Κουμπί Share */}
        <button 
          onClick={handleShareClick}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            padding: '8px',
            borderRadius: '6px',
            fontWeight: '600',
            color: '#1877f2',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            backgroundColor: '#e7f3ff'
          }}
        >
          🚀 Κοινοποίηση
        </button>
      </div>

      {/* ─── 4. SOCIAL MEDIA SHARE POPOVER / MODAL ─── */}
      {isShareOpen && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>
              Μοιράσου το στις πλατφόρμες:
            </span>
            <button 
              onClick={() => setIsShareOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', color: '#94a3b8' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                minWidth: '70px',
                backgroundColor: '#1877f2',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textAlign: 'center'
              }}
            >
              Facebook
            </a>

            {/* WhatsApp */}
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                minWidth: '70px',
                backgroundColor: '#25d366',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textAlign: 'center'
              }}
            >
              WhatsApp
            </a>

            {/* Viber */}
            <a
              href={`viber://forward?text=${encodeURIComponent(`${shareText}${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                minWidth: '70px',
                backgroundColor: '#7360f2',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textAlign: 'center'
              }}
            >
              Viber
            </a>

            {/* X / Twitter */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                minWidth: '70px',
                backgroundColor: '#000',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                textAlign: 'center'
              }}
            >
              X / Twitter
            </a>

            {/* Copy Link */}
            <button
              onClick={handleCopy}
              style={{
                flex: 1,
                minWidth: '70px',
                backgroundColor: '#e2e8f0',
                color: '#334155',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {copied ? '✅ Antigraphe!' : '🔗 Copy Link'}
            </button>
          </div>
        </div>
      )}

    </article>
  )
}
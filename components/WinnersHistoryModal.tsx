'use client'

interface WinnersHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  history: any[]
  lang: 'el' | 'en'
}

export default function WinnersHistoryModal({
  isOpen,
  onClose,
  history,
  lang,
}: WinnersHistoryModalProps) {
  if (!isOpen) return null

  const isEn = lang === 'en'

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/30 w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
            📜 {isEn ? 'Winners History' : 'Ιστορικό Νικητών'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-sm">
            {isEn ? 'No completed draws yet.' : 'Δεν υπάρχουν ακόμα ολοκληρωμένες κληρώσεις.'}
          </p>
        ) : (
          <div className="space-y-4">
            {history.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-md space-y-2"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-amber-400">👤 {item.winner_name || 'Winner'}</span>
                  <span className="text-slate-500 font-mono">{item.date}</span>
                </div>

                <div className="text-sm font-semibold text-slate-200">
                  "{item.post_title || 'Post'}"
                </div>

                {/* 💰 ΤΕΛΙΚΑ ΠΟΣΑ */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-center font-mono text-xs">
                  <div className="bg-slate-900 p-1.5 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Total Jackpot</span>
                    <span className="text-amber-400 font-bold">€{(Number(item.total_jackpot) || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded-lg">
                    <span className="text-[10px] text-emerald-400 block">Creator (70%)</span>
                    <span className="text-emerald-400 font-bold">€{(Number(item.creator_prize) || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-900 p-1.5 rounded-lg">
                    <span className="text-[10px] text-indigo-400 block">Supporters (30%)</span>
                    <span className="text-indigo-400 font-bold">€{(Number(item.supporters_pool) || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* 👥 ΟΝΟΜΑΤΑ ΥΠΟΣΤΗΡΙΧΤΩΝ */}
                {item.supporters && item.supporters.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      {isEn ? 'Supporters:' : 'Υποστηρικτές:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.supporters.map((sup: any, sIdx: number) => (
                        <span
                          key={sIdx}
                          className="text-[11px] bg-slate-900 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-lg font-mono"
                        >
                          👤 {sup.username}: +€{(Number(sup.prizeWon) || 0).toFixed(2)} ({sup.tickets} 🎟️)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
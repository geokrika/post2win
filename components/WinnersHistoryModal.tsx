'use client'

import React from 'react'

interface WinnersHistoryModalProps {
  isOpen: boolean
  lang?: 'el' | 'en'
  history: any[]
  onClose: () => void
}

export default function WinnersHistoryModal({
  isOpen,
  lang = 'el',
  history,
  onClose,
}: WinnersHistoryModalProps) {
  if (!isOpen) return null

  const isEn = lang === 'en'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-5 relative max-h-[85vh] flex flex-col">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
              📜 {isEn ? `Winners History (${history.length})` : `Ιστορικό Νικητών (${history.length})`}
            </h3>
            <p className="text-[11px] text-slate-400">
              {isEn ? 'Permanent archive of past jackpot draws' : 'Μόνιμο αρχείο προηγούμενων κληρώσεων Jackpot'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* LIST OF WINNERS */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-950/50 rounded-2xl border border-slate-800/50">
              {isEn ? 'No completed draws in history yet.' : 'Δεν υπάρχουν ακόμα ολοκληρωμένες κληρώσεις στο ιστορικό.'}
            </div>
          ) : (
            history.map((win) => (
              <div
                key={win.id || `win-${win.date}`}
                className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-3 relative overflow-hidden"
              >
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                    🏆 {win.winner_name || (isEn ? 'Winner' : 'Νικητής')}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                    {win.date}
                  </span>
                </div>

                {win.post_title && (
                  <p className="text-xs text-slate-300 italic bg-black/40 p-2 rounded-lg border border-slate-800">
                    "{win.post_title}"
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
                  <div>
                    <span className="text-slate-400 block">{isEn ? 'Total Jackpot:' : 'Συνολικό Jackpot:'}</span>
                    <span className="text-amber-400 font-bold font-mono">
                      €{(Number(win.total_jackpot) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isEn ? 'Winner (70%):' : 'Νικητής (70%):'}</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      €{(Number(win.winner_prize) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{isEn ? 'Supporters (30%):' : 'Υποστηρικτές (30%):'}</span>
                    <span className="text-indigo-400 font-bold font-mono">
                      €{(Number(win.supporters_prize) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* SUPPORTERS LIST */}
                {win.supporters && win.supporters.length > 0 && (
                  <div className="pt-2 border-t border-slate-900">
                    <span className="text-[10px] text-indigo-300 font-bold block mb-1">
                      🤝 {isEn ? 'Supporters Share:' : 'Μοιράστηκαν οι Υποστηρικτές:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {win.supporters.map((sup: any, idx: number) => (
                        <span
                          key={`win-sup-${idx}`}
                          className="bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-lg text-[10px] text-slate-200"
                        >
                          👤 {sup.username} • 🎟️ {sup.tickets} • <strong className="text-emerald-400">+€{(Number(sup.earnedAmount) || 0).toFixed(2)}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* CLOSE BUTTON */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs"
          >
            {isEn ? 'Close' : 'Κλείσιμο'}
          </button>
        </div>

      </div>
    </div>
  )
}
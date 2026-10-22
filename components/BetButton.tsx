'use client'

import { useState } from 'react'

interface BetButtonProps {
  fileId: string
  fileName?: string
  userId?: string
  userBalance?: number
  onRequireLogin: () => void
  onBetSuccess: (newBal: number, newJackpot: number, newVote?: any) => void
}

const BET_OPTIONS = [
  { amount: 1, tickets: 1 },
  { amount: 2, tickets: 2 },
  { amount: 5, tickets: 5 },
  { amount: 10, tickets: 10 },
  { amount: 20, tickets: 20 },
  { amount: 50, tickets: 50 },
  { amount: 100, tickets: 100 },
]

export default function BetButton({
  fileId,
  userId,
  userBalance = 0,
  onRequireLogin,
  onBetSuccess,
}: BetButtonProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(10)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const currentOption = BET_OPTIONS.find((opt) => opt.amount === selectedAmount) || {
    amount: selectedAmount,
    tickets: selectedAmount,
  }

  const handleBet = async () => {
    if (!userId) {
      onRequireLogin()
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      // 1. Αποστολή αιτήματος στο /api/bet
      const res = await fetch('/api/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fileId,
          amount: selectedAmount,
          ticketsEarned: currentOption.tickets,
        }),
      })

      const textResponse = await res.text()
      console.log('📡 SERVER RESPONSE STATUS:', res.status)

      let result: any = null
      try {
        result = JSON.parse(textResponse)
      } catch (e) {
        console.error('SERVER DID NOT RETURN JSON:', textResponse)
      }

      if (!res.ok || !result || !result.success) {
        const errorDetails = result?.error || `Σφάλμα API (${res.status}): ${textResponse.slice(0, 80)}...`
        throw new Error(errorDetails)
      }

      const newBalance = result.newBalance ?? userBalance
      const jackpot = result.jackpot ?? 50
      const vote = result.vote

      // 2. Ενημέρωση state στο parent component
      onBetSuccess(Number(newBalance), Number(jackpot), vote)

      // 3. Εκπομπή custom event για άμεση ενημέρωση του Header Balance
      window.dispatchEvent(
        new CustomEvent('wallet_updated', { detail: Number(newBalance) })
      )

    } catch (err: any) {
      console.error('Bet Error:', err)
      setErrorMsg(err?.message || 'Αποτυχία πονταρίσματος')
      setTimeout(() => setErrorMsg(''), 6000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto">
      {errorMsg && (
        <span className="text-[11px] text-red-400 font-bold bg-red-950/90 px-2.5 py-1 rounded-lg border border-red-500/40 animate-fade-in shadow-md">
          ⚠️ {errorMsg}
        </span>
      )}

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <label className="text-[11px] text-slate-400 font-semibold pl-1 whitespace-nowrap">
            Ποσό:
          </label>
          <select
            value={selectedAmount}
            onChange={(e) => setSelectedAmount(Number(e.target.value))}
            className="bg-slate-900 text-amber-400 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            {BET_OPTIONS.map((opt) => (
              <option key={`opt-${opt.amount}`} value={opt.amount}>
                €{opt.amount}.00 ({opt.tickets} 🎟️)
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleBet}
          disabled={loading}
          className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50 whitespace-nowrap active:scale-95 cursor-pointer"
        >
          {loading ? (
            '⏳...'
          ) : (
            <>
              <span>🎯 Ποντάρισμα €{selectedAmount.toFixed(2)}</span>
              <span className="text-[10px] bg-slate-950/20 px-1.5 py-0.5 rounded text-slate-950 font-mono font-bold">
                (+{currentOption.tickets} 🎟️)
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
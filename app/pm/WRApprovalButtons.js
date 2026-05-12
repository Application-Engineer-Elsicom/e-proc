'use client'

import { useState, useTransition } from 'react'
import { approveWarehouseReleasePM, rejectWarehouseReleasePM } from '../actions/pm'

export default function WRApprovalButtons({ wrId }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleApprove = () => {
    if (!confirm('Setujui Warehouse Release ini sebagai Project Manager?')) return
    startTransition(async () => {
      setError('')
      const result = await approveWarehouseReleasePM(wrId)
      if (!result.success) setError(result.error)
    })
  }

  const handleReject = () => {
    const reason = prompt('Alasan penolakan PM:')
    if (reason === null) return
    startTransition(async () => {
      setError('')
      const result = await rejectWarehouseReleasePM(wrId, reason)
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <span className="text-red-500 text-[10px] font-bold">{error}</span>}
      <div className="flex gap-3">
        <button
          onClick={handleReject}
          disabled={isPending}
          className="flex-1 bg-white dark:bg-slate-900 text-gray-500 border border-gray-100 dark:border-gray-800 py-3 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 transition-all text-xs disabled:opacity-50 shadow-sm"
        >
          {isPending ? '...' : 'REJECT'}
        </button>
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="flex-[2] bg-yellow-500 text-black py-3 rounded-2xl font-black hover:bg-yellow-600 transition-all text-xs shadow-lg shadow-yellow-500/20 disabled:opacity-50"
        >
          {isPending ? 'PROCESSING...' : 'APPROVE WR'}
        </button>
      </div>
    </div>
  )
}

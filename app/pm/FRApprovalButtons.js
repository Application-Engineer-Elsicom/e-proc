'use client'

import { useState, useTransition } from 'react'
import { approveFaultReportPM, rejectFaultReportPM } from '../actions/pm'

export default function FRApprovalButtons({ frId }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleApprove = () => {
    if (!confirm('Setujui Fault Report ini sebagai Project Manager?')) return
    startTransition(async () => {
      setError('')
      const result = await approveFaultReportPM(frId)
      if (!result.success) setError(result.error)
    })
  }

  const handleReject = () => {
    const reason = prompt('Alasan penolakan PM:')
    if (reason === null) return
    startTransition(async () => {
      setError('')
      const result = await rejectFaultReportPM(frId, reason)
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
          className="flex-[2] bg-red-600 text-white py-3 rounded-2xl font-black hover:bg-red-700 transition-all text-xs shadow-lg shadow-red-600/20 disabled:opacity-50"
        >
          {isPending ? 'PROCESSING...' : 'APPROVE FR'}
        </button>
      </div>
    </div>
  )
}

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
      {error && <span className="text-xs text-destructive">{error}</span>}
      <div className="flex gap-2">
        <button
          onClick={handleReject}
          disabled={isPending}
          className="flex-1 rounded-md border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          {isPending ? '...' : 'Tolak'}
        </button>
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="flex-[2] rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Memproses...' : 'Setujui FR'}
        </button>
      </div>
    </div>
  )
}

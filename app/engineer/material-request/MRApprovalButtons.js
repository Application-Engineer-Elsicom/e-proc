'use client'

import { useState, useTransition } from 'react'
import {
  approveMRByWpo,
  rejectMRByWpo,
  approveMRBySystem,
  rejectMRBySystem,
} from '../../actions/material-request'

export default function MRApprovalButtons({ mrId, engineerRole }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleApprove = () => {
    const label = engineerRole === 'WPO' ? 'WPO' : 'SYSTEM'
    if (!confirm(`Setujui Material Request ini sebagai ${label}?`)) return

    startTransition(async () => {
      setError('')
      const fn = engineerRole === 'WPO' ? approveMRByWpo : approveMRBySystem
      const result = await fn(mrId)
      if (!result.success) setError(result.error)
    })
  }

  const handleReject = () => {
    const reason = prompt('Alasan penolakan:')
    if (reason === null) return // cancelled

    startTransition(async () => {
      setError('')
      const fn = engineerRole === 'WPO' ? rejectMRByWpo : rejectMRBySystem
      const result = await fn(mrId, reason)
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleReject}
          disabled={isPending}
          className="flex-1 rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          Tolak
        </button>
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="flex-[2] rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Memproses...' : 'Setujui'}
        </button>
      </div>
    </div>
  )
}

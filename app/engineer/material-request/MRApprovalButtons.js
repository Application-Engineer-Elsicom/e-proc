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
      {error && <p className="text-red-500 text-[10px] font-bold">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleReject}
          disabled={isPending}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition disabled:opacity-50"
        >
          Tolak
        </button>
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="flex-[2] px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition disabled:opacity-50"
        >
          {isPending ? 'Memproses...' : 'Setujui ✓'}
        </button>
      </div>
    </div>
  )
}

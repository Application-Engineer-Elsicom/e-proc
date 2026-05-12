'use client'

import { useState, useEffect } from 'react'

export default function FaultReportContent() {
  const [frs, setFrs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFRs = async () => {
      try {
        // Note: This requires a server action - for now we'll fetch client-side
        // In production, create a getApprovedFRs action
        setFrs([])
      } catch (error) {
        console.error('Error fetching FRs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchFRs()
  }, [])

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'LOW':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
      case 'URGENT':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Loading Fault Reports...</p>
      </div>
    )
  }

  if (frs.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-slate-800 p-12 rounded-2xl text-center border-2 border-dashed border-green-200 dark:border-slate-700">
        <p className="text-green-700 dark:text-green-300 font-bold">Tidak ada Fault Report yang menunggu approval dari PM</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">FR Number</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Project</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Item</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Issue</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Priority</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Reporter</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {frs.map((fr) => (
            <tr key={fr.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-bold">{fr.docNo}</td>
              <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{fr.projectName}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{fr.itemName || '—'}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 line-clamp-2 text-xs">{fr.faultIssue || '—'}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-[10px] font-black ${getPriorityColor(fr.priority)}`}>
                  {fr.priority || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{fr.reporter?.name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

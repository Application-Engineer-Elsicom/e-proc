'use client'

import { useState, useEffect } from 'react'
import { prisma } from '@/lib/prisma'

export default function WRPlanContent() {
  const [wrs, setWrs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWRs = async () => {
      try {
        // Note: This requires a server action - for now we'll fetch client-side
        // In production, create a getApprovedWRs action
        setWrs([])
      } catch (error) {
        console.error('Error fetching WRs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchWRs()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Loading Warehouse Releases...</p>
      </div>
    )
  }

  if (wrs.length === 0) {
    return (
      <div className="bg-red-50 dark:bg-slate-800 p-12 rounded-2xl text-center border-2 border-dashed border-red-200 dark:border-slate-700">
        <p className="text-red-700 dark:text-red-300 font-bold">Tidak ada WR yang menunggu approval dari PM</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">WR Number</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Proyek</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Created By</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Location</th>
            <th className="px-4 py-3 text-right font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Item</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Approved</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {wrs.map((wr) => (
            <tr key={wr.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-bold">{wr.docNo}</td>
              <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{wr.projectName}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{wr.requester?.name || '—'}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{wr.deliveryLocation || '—'}</td>
              <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-bold">{wr.items?.length || 0}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{wr.pmApprovedAt ? new Date(wr.pmApprovedAt).toLocaleDateString('id-ID') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

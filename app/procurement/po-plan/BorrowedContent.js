'use client'

import { useState, useEffect } from 'react'
import { getBorrowedItems, markAsReturned } from '../../actions/borrowed-item'

export default function BorrowedContent() {
  const [borrowed, setBorrowed] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    fetchBorrowedItems()
  }, [])

  const fetchBorrowedItems = async () => {
    setLoading(true)
    const result = await getBorrowedItems()
    if (result.success) {
      setBorrowed(result.data)
    }
    setLoading(false)
  }

  const handleMarkReturned = async (id) => {
    if (!confirm('Mark this item as returned?')) return

    setActionLoading(id)
    const result = await markAsReturned(id, '')
    setActionLoading(null)

    if (result.success) {
      fetchBorrowedItems()
    } else {
      alert('Error: ' + result.error)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Loading borrowed items...</p>
      </div>
    )
  }

  const activeBorrowed = borrowed.filter(b => b.status === 'BORROWED')

  if (activeBorrowed.length === 0) {
    return (
      <div className="bg-blue-50 dark:bg-slate-800 p-12 rounded-2xl text-center border-2 border-dashed border-blue-200 dark:border-slate-700">
        <p className="text-blue-700 dark:text-blue-300 font-bold">Tidak ada item yang sedang dipinjam</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Doc No</th>
              <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">From Project</th>
              <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">To Project</th>
              <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Deskripsi</th>
              <th className="px-4 py-3 text-right font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Qty</th>
              <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Due Date</th>
              <th className="px-4 py-3 text-center font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {activeBorrowed.map((item) => {
              const dueDate = new Date(item.dueDate)
              const today = new Date()
              const isOverdue = dueDate < today
              const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))

              return (
                <tr key={item.id} className={`transition-colors ${isOverdue ? 'bg-red-50 dark:bg-red-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                  <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-bold">{item.docNo}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-mono">{item.fromProjectId}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-mono">{item.toProjectId}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.description}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-bold">{item.qty}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {item.dueDate ? new Date(item.dueDate).toLocaleDateString('id-ID') : '—'}
                      </span>
                      {daysLeft >= 0 && daysLeft <= 7 && (
                        <span className="text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 px-2 py-1 rounded">
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-2 py-1 rounded">
                          OVERDUE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleMarkReturned(item.id)}
                      disabled={actionLoading === item.id}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition disabled:opacity-50"
                    >
                      {actionLoading === item.id ? 'Memproses…' : 'Mark Returned'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { getPurchaseOrders, updatePOItem } from '../../actions/purchase-order'
import { exportPOItemsToExcel } from '../../../lib/export-utils'

export default function POPlanContent() {
  const [pos, setPos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    projectCode: '',
    poNumber: '',
    description: '',
    matIn: '', // 'all', 'received', 'pending'
  })
  const [editingItemId, setEditingItemId] = useState(null)
  const [editMatInDate, setEditMatInDate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPOs()
  }, [])

  const fetchPOs = async () => {
    setLoading(true)
    const result = await getPurchaseOrders()
    if (result.success) {
      setPos(result.data)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Loading PO items...</p>
      </div>
    )
  }

  // Flatten all items from all POs
  const allItems = pos.flatMap(po =>
    po.items.map(item => ({
      ...item,
      poNumber: po.poNumber,
      poId: po.id,
      projectCode: po.projectCode,
      deliveryTime: po.deliveryTime,
      poStatus: po.status,
      poHealth: po.poHealth,
    }))
  )

  // Apply filters
  const filteredItems = allItems.filter(item => {
    if (filters.projectCode && item.projectCode !== filters.projectCode) return false
    if (filters.poNumber && !item.poNumber.includes(filters.poNumber)) return false
    if (filters.description && !item.description.toLowerCase().includes(filters.description.toLowerCase())) return false
    if (filters.matIn === 'received' && !item.matIn) return false
    if (filters.matIn === 'pending' && item.matIn) return false
    return true
  })

  // Get unique values for filter dropdowns
  const projectCodes = [...new Set(allItems.map(i => i.projectCode))]
  const poNumbers = [...new Set(allItems.map(i => i.poNumber))]

  const handleSaveMatIn = async (itemId, newDate) => {
    setSaving(true)
    const result = await updatePOItem(itemId, { matIn: newDate ? new Date(newDate) : null })
    setSaving(false)

    if (result.success) {
      setEditingItemId(null)
      fetchPOs()
    } else {
      alert('Error: ' + result.error)
    }
  }

  if (allItems.length === 0) {
    return (
      <div className="bg-blue-50 dark:bg-slate-800 p-12 rounded-2xl text-center border-2 border-dashed border-blue-200 dark:border-slate-700">
        <p className="text-blue-700 dark:text-blue-300 font-bold">Tidak ada PO items untuk ditampilkan</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters & Export */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Filter</p>
          <button
            onClick={() => exportPOItemsToExcel(filteredItems)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition flex items-center gap-1"
          >
            📥 Export
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={filters.projectCode}
            onChange={(e) => setFilters({ ...filters, projectCode: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Projects</option>
            {projectCodes.map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>

          <select
            value={filters.poNumber}
            onChange={(e) => setFilters({ ...filters, poNumber: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All POs</option>
            {poNumbers.map(po => (
              <option key={po} value={po}>{po}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search description..."
            value={filters.description}
            onChange={(e) => setFilters({ ...filters, description: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          />

          <select
            value={filters.matIn}
            onChange={(e) => setFilters({ ...filters, matIn: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All Status</option>
            <option value="received">Received</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Description</th>
              <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Part Number</th>
              <th className="px-4 py-3 text-right font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Qty</th>
              <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">PO</th>
              <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Mat In</th>
              <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Unit</th>
              <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Project</th>
              <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">PR No</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium line-clamp-2">{item.description}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{item.partNumber || '—'}</td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-bold">{item.qty}</td>
                <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-bold">{item.poNumber}</td>
                <td className="px-4 py-3">
                  {editingItemId === item.id ? (
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={editMatInDate}
                        onChange={(e) => setEditMatInDate(e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs"
                      />
                      <button
                        onClick={() => handleSaveMatIn(item.id, editMatInDate)}
                        disabled={saving}
                        className="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingItemId(null)}
                        className="px-2 py-1 bg-gray-400 text-white text-xs font-bold rounded hover:bg-gray-500"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setEditingItemId(item.id)
                        setEditMatInDate(item.matIn ? new Date(item.matIn).toISOString().split('T')[0] : '')
                      }}
                      className="cursor-pointer"
                    >
                      {item.matIn ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {new Date(item.matIn).toLocaleDateString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded inline-block">Click to add</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.unit}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono">{item.projectCode}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{item.prNo || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No items match the current filters
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { getPurchaseOrders } from '../../actions/purchase-order'
import { exportPOListToExcel, exportPOItemsToExcel } from '../../../lib/export-utils'
import Link from 'next/link'

export default function POListContent() {
  const [pos, setPos] = useState([])
  const [loading, setLoading] = useState(true)

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

  const getHealthColor = (health) => {
    switch (health) {
      case 'RECEIVED':
        return 'bg-green-100 dark:bg-green-950'
      case 'ON_TRACK':
        return 'bg-white dark:bg-slate-900'
      case 'WARNING':
        return 'bg-yellow-100 dark:bg-yellow-950'
      case 'CRITICAL':
        return 'bg-orange-100 dark:bg-orange-950'
      case 'LATE':
        return 'bg-red-100 dark:bg-red-950'
      default:
        return 'bg-white dark:bg-slate-900'
    }
  }

  const getHealthBadgeColor = (health) => {
    switch (health) {
      case 'RECEIVED':
        return 'bg-green-500'
      case 'ON_TRACK':
        return 'bg-gray-400'
      case 'WARNING':
        return 'bg-yellow-500'
      case 'CRITICAL':
        return 'bg-orange-500'
      case 'LATE':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Loading POs...</p>
      </div>
    )
  }

  if (pos.length === 0) {
    return (
      <div className="bg-blue-50 dark:bg-slate-800 p-12 rounded-2xl text-center border-2 border-dashed border-blue-200 dark:border-slate-700">
        <p className="text-blue-700 dark:text-blue-300 font-bold">Tidak ada purchase order</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Export Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => exportPOListToExcel(pos)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-sm flex items-center gap-2"
        >
          📥 Export PO List
        </button>
        <button
          onClick={() => {
            const allItems = pos.flatMap(po =>
              po.items.map(item => ({
                ...item,
                poNumber: po.poNumber,
                projectCode: po.projectCode,
              }))
            )
            exportPOItemsToExcel(allItems)
          }}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition text-sm flex items-center gap-2"
        >
          📥 Export Items
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">PO Number</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Date</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Proyek</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Pemasok</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Delivery Target</th>
            <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Health</th>
            <th className="px-4 py-3 text-right font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Amount</th>
            <th className="px-4 py-3 text-center font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {pos.map((po) => (
            <tr key={po.id} className={`${getHealthColor(po.poHealth)} transition-colors hover:opacity-80`}>
              <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-bold">{po.poNumber}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                {new Date(po.poDate).toLocaleDateString('id-ID')}
              </td>
              <td className="px-4 py-3 text-gray-900 dark:text-white font-mono font-bold">{po.projectCode}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{po.supplierName}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                {new Date(po.deliveryTime).toLocaleDateString('id-ID')}
              </td>
              <td className="px-4 py-3">
                <span className={`${getHealthBadgeColor(po.poHealth)} text-white px-3 py-1 rounded-full text-[10px] font-black`}>
                  {po.poHealth}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(parseFloat(po.totalAmount || 0))}
              </td>
              <td className="px-4 py-3 text-center">
                <Link
                  href={`/procurement/po-list/${po.id}`}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition inline-block"
                >
                  Detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

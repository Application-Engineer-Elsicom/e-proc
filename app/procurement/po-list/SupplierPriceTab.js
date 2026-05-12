'use client'

import { useState, useEffect } from 'react'
import { getSupplierPrices, deleteSupplierPrice } from '../../actions/supplier-price'
import CreateSupplierPriceForm from './CreateSupplierPriceForm'

export default function SupplierPriceTab() {
  const [prices, setPrices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchPrices()
  }, [])

  const fetchPrices = async () => {
    setLoading(true)
    const result = await getSupplierPrices()
    if (result.success) {
      setPrices(result.data)
    }
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this price?')) return

    const result = await deleteSupplierPrice(id)
    if (result.success) {
      fetchPrices()
    } else {
      alert('Error: ' + result.error)
    }
  }

  const filteredPrices = prices.filter(p =>
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    (p.partNumber?.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Search & Add Button */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search description, supplier, or part number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ Add Price'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <CreateSupplierPriceForm onSuccess={() => { setShowForm(false); fetchPrices() }} />
        </div>
      )}

      {/* Table */}
      {filteredPrices.length === 0 ? (
        <div className="bg-blue-50 dark:bg-slate-800 p-12 rounded-2xl text-center border-2 border-dashed border-blue-200 dark:border-slate-700">
          <p className="text-blue-700 dark:text-blue-300 font-bold">
            {search ? 'No supplier prices found' : 'No supplier prices'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Description</th>
                <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Part Number</th>
                <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Supplier</th>
                <th className="px-4 py-3 text-left font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Unit</th>
                <th className="px-4 py-3 text-right font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Unit Price</th>
                <th className="px-4 py-3 text-center font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredPrices.map((price) => (
                <tr key={price.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{price.description}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{price.partNumber || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{price.supplierName}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{price.unit}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: price.currency || 'IDR',
                      minimumFractionDigits: 0,
                    }).format(parseFloat(price.unitPrice))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(price.id)}
                      className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 text-xs font-bold rounded hover:bg-red-200 dark:hover:bg-red-800 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

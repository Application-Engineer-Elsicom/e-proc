'use client'

import { useState } from 'react'
import { createSupplierPrice } from '../../actions/supplier-price'

export default function CreateSupplierPriceForm({ onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    supplierName: '',
    description: '',
    partNumber: '',
    unit: 'pcs',
    unitPrice: '',
    currency: 'IDR',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (!formData.supplierName || !formData.description || !formData.unitPrice) {
      alert('Please fill all required fields')
      setLoading(false)
      return
    }

    const result = await createSupplierPrice(formData)
    setLoading(false)

    if (result.success) {
      setFormData({
        supplierName: '',
        description: '',
        partNumber: '',
        unit: 'pcs',
        unitPrice: '',
        currency: 'IDR',
      })
      onSuccess && onSuccess()
    } else {
      alert('Error: ' + result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
            Supplier Name *
          </label>
          <input
            type="text"
            name="supplierName"
            value={formData.supplierName}
            onChange={handleChange}
            placeholder="e.g., PT. ABC Supply"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
            Description *
          </label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Item description"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
            Part Number
          </label>
          <input
            type="text"
            name="partNumber"
            value={formData.partNumber}
            onChange={handleChange}
            placeholder="Part #"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
            Unit
          </label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          >
            <option>pcs</option>
            <option>box</option>
            <option>kg</option>
            <option>meter</option>
            <option>roll</option>
            <option>liter</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
            Unit Price *
          </label>
          <input
            type="number"
            name="unitPrice"
            value={formData.unitPrice}
            onChange={handleChange}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
            Currency
          </label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
          >
            <option>IDR</option>
            <option>USD</option>
            <option>EUR</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition disabled:opacity-50 text-sm"
        >
          {loading ? 'Adding...' : 'Add Supplier Price'}
        </button>
      </div>
    </form>
  )
}

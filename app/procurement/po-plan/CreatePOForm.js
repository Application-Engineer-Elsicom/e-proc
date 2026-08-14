'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPurchaseOrder, generatePONumber } from '../../actions/purchase-order'

// Cari stok gudang yang cocok dengan item PO — Tahap 3 minimal (info saja).
// Cocokkan by SKU (=Part No) dulu, lalu fallback ke nama item mengandung
// deskripsi. Case-insensitive.
function findStock(inventory, item) {
  if (!inventory?.length) return null
  const part = (item.partNumber || "").trim().toLowerCase()
  const desc = (item.description || "").trim().toLowerCase()
  if (part) {
    const bySku = inventory.find((inv) => inv.sku.toLowerCase() === part)
    if (bySku) return bySku
  }
  if (desc.length >= 3) {
    return inventory.find((inv) => inv.itemName.toLowerCase().includes(desc)) || null
  }
  return null
}

export default function CreatePOForm({ inventory = [] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [poNumber, setPoNumber] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [items, setItems] = useState([
    { description: '', partNumber: '', qty: 1, unit: 'pcs', unitPrice: 0 },
  ])

  const generatePONum = async () => {
    if (!projectCode) {
      alert('Project code is required')
      return
    }
    const result = await generatePONumber(projectCode)
    if (result.success) {
      setPoNumber(result.data.poNumber)
    }
  }

  const handleAddItem = () => {
    setItems([...items, { description: '', partNumber: '', qty: 1, unit: 'pcs', unitPrice: 0 }])
  }

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const handleItemChange = (idx, field, value) => {
    const newItems = [...items]
    newItems[idx] = { ...newItems[idx], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    if (!poNumber || !projectCode || !supplierName || !deliveryTime) {
      alert('Please fill all required fields')
      setLoading(false)
      return
    }

    const totalAmount = items.reduce((sum, item) => {
      return sum + (parseInt(item.qty || 0) * parseFloat(item.unitPrice || 0))
    }, 0)

    const result = await createPurchaseOrder({
      poNumber,
      projectId: projectCode,
      projectCode,
      supplierName,
      deliveryTime: new Date(deliveryTime),
      totalAmount,
      items: items.filter(item => item.description),
    })

    setLoading(false)

    if (result.success) {
      router.push('/procurement/po-list')
    } else {
      alert('Error: ' + result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* PO Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6">PO Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PO Number */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              PO Number *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="Auto-generated"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={generatePONum}
                disabled={!projectCode}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 transition"
              >
                Generate
              </button>
            </div>
          </div>

          {/* Project Code */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Project Code *
            </label>
            <input
              type="text"
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              placeholder="e.g., 2499"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Supplier Name *
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g., PT. ABC Supply"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Delivery Time */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Delivery Target Date *
            </label>
            <input
              type="date"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* PO Items */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Item</h2>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition text-sm"
          >
            + Add Item
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => {
            const stock = findStock(inventory, item)
            return (
            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
              {stock && (
                <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <span>📦 Stok gudang tersedia:</span>
                  <span className="font-bold">{stock.stockQty} {stock.unit}</span>
                  <span className="text-amber-600/70">({stock.itemName})</span>
                  {stock.stockQty >= parseInt(item.qty || 0) && (
                    <span className="ml-auto rounded-full bg-amber-200 dark:bg-amber-800 px-2 py-0.5 text-[10px] font-bold">
                      cukup untuk qty ini — pertimbangkan ambil dari stok
                    </span>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Description */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Deskripsi</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="Item description"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                {/* Part Number */}
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Part No</label>
                  <input
                    type="text"
                    value={item.partNumber}
                    onChange={(e) => handleItemChange(idx, 'partNumber', e.target.value)}
                    placeholder="Part #"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                {/* Qty */}
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Qty</label>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Satuan</label>
                  <select
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  >
                    <option>pcs</option>
                    <option>box</option>
                    <option>kg</option>
                    <option>meter</option>
                    <option>roll</option>
                  </select>
                </div>
              </div>

              {/* Unit Price & Total */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Unit Price</label>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">Total Price</label>
                  <div className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-bold text-sm">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(parseInt(item.qty || 0) * parseFloat(item.unitPrice || 0))}
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-sm transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-black rounded-lg hover:opacity-80 transition disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Purchase Order'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-black rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          Batal
        </button>
      </div>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { updatePOItem, addInvoice } from '../../actions/purchase-order'

export default function PODetailContent({ po }) {
  const [items, setItems] = useState(po.items || [])
  const [invoices, setInvoices] = useState(po.invoices || [])
  const [editingItem, setEditingItem] = useState(null)
  const [newInvoice, setNewInvoice] = useState({ invoiceNo: '', amount: '' })
  const [loading, setLoading] = useState(false)

  const handleUpdateMatIn = async (itemId, matInDate) => {
    setLoading(true)
    const result = await updatePOItem(itemId, { matIn: matInDate })
    setLoading(false)

    if (result.success) {
      const updatedItems = items.map(item =>
        item.id === itemId ? { ...item, matIn: matInDate } : item
      )
      setItems(updatedItems)
    } else {
      alert('Error: ' + result.error)
    }
  }

  const handleAddInvoice = async (e) => {
    e.preventDefault()
    if (!newInvoice.invoiceNo || !newInvoice.amount) {
      alert('Please fill invoice details')
      return
    }

    setLoading(true)
    const result = await addInvoice(po.id, {
      invoiceNo: newInvoice.invoiceNo,
      amount: parseFloat(newInvoice.amount),
    })
    setLoading(false)

    if (result.success) {
      setInvoices([...invoices, result.data])
      setNewInvoice({ invoiceNo: '', amount: '' })
    } else {
      alert('Error: ' + result.error)
    }
  }

  const getHealthColor = (health) => {
    switch (health) {
      case 'RECEIVED':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
      case 'ON_TRACK':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
      case 'WARNING':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200'
      case 'CRITICAL':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200'
      case 'LATE':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Supplier</p>
          <p className="text-lg font-black text-gray-900 dark:text-white mt-1">{po.supplierName}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Delivery Target</p>
          <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
            {new Date(po.deliveryTime).toLocaleDateString('id-ID')}
          </p>
        </div>

        <div className={`rounded-2xl border-2 border-current border-opacity-30 p-6 ${getHealthColor(po.poHealth)}`}>
          <p className="text-xs font-bold uppercase">PO Health</p>
          <p className="text-lg font-black mt-1">{po.poHealth}</p>
        </div>
      </div>

      {/* Total Amount */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">Total Amount</p>
        <p className="text-3xl font-black text-gray-900 dark:text-white mt-2">
          {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(parseFloat(po.totalAmount || 0))}
        </p>
      </div>

      {/* Items Tab */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tighter">
          Items ({items.length})
        </h2>

        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white text-xs uppercase">Description</th>
                <th className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white text-xs uppercase">Qty</th>
                <th className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white text-xs uppercase">Unit Price</th>
                <th className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white text-xs uppercase">Total</th>
                <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white text-xs uppercase">Mat In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{item.description}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{item.qty}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(parseFloat(item.unitPrice || 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0,
                    }).format(parseInt(item.qty) * parseFloat(item.unitPrice || 0))}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={item.matIn ? new Date(item.matIn).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleUpdateMatIn(item.id, e.target.value ? new Date(e.target.value) : null)}
                      disabled={loading}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices Tab */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tighter">
          Invoices ({invoices.length})
        </h2>

        {/* Add Invoice Form */}
        <form onSubmit={handleAddInvoice} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              value={newInvoice.invoiceNo}
              onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNo: e.target.value })}
              placeholder="Invoice No. (e.g., Inv1)"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
            />
            <input
              type="number"
              value={newInvoice.amount}
              onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
              placeholder="Amount"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition disabled:opacity-50 text-sm"
            >
              {loading ? 'Adding...' : 'Add Invoice'}
            </button>
          </div>
        </form>

        {/* Invoices List */}
        {invoices.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No invoices yet
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white text-xs uppercase">Invoice No.</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white text-xs uppercase">Date</th>
                  <th className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white text-xs uppercase">Amount</th>
                  <th className="px-4 py-3 text-left font-bold text-gray-900 dark:text-white text-xs uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">{inv.invoiceNo}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                      {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('id-ID') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      }).format(parseFloat(inv.amount || 0))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        inv.isPaid
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
                          : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200'
                      }`}>
                        {inv.isPaid ? 'PAID' : 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

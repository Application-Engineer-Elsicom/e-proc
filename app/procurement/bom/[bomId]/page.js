'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProcurementBom, savePricing, saveSubItemPricing, finalizePricing } from '@/actions/procurement'

const CURRENCIES = ['IDR', 'USD', 'EUR', 'SGD']

function formatIDR(val) {
  if (!val && val !== 0) return '-'
  return 'Rp ' + parseFloat(val).toLocaleString('id-ID', { minimumFractionDigits: 0 })
}

export default function ProcurementBomPage() {
  const params = useParams()
  const router = useRouter()
  const bomId = params.bomId

  const [bom, setBom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [finalizing, setFinalizing] = useState(false)
  const [finNotes, setFinNotes] = useState('')
  const [showFinalize, setShowFinalize] = useState(false)

  // Per-row edit state: { [rowKey]: { unitPrice, currency, supplier, leadTime, saving } }
  const [editState, setEditState] = useState({})

  const loadBom = useCallback(async () => {
    setLoading(true)
    const result = await getProcurementBom(bomId)
    if (result.success) {
      setBom(result.data)
      const init = {}
      for (const item of result.data.items) {
        if (item.hasSubItems) {
          for (const si of item.subItems) {
            init[`sub_${si.id}`] = {
              unitPrice: si.unitPrice ? parseFloat(si.unitPrice).toString() : '',
              currency: si.currency || 'IDR',
              supplier: si.supplier || '',
              leadTime: si.leadTime?.toString() || '',
              saving: false,
            }
          }
        } else {
          init[`item_${item.id}`] = {
            unitPrice: item.unitPrice ? parseFloat(item.unitPrice).toString() : '',
            currency: item.currency || 'IDR',
            supplier: item.supplier || '',
            leadTime: item.leadTime?.toString() || '',
            saving: false,
          }
        }
      }
      setEditState(init)
    } else {
      setErrorMsg(result.error || 'Failed to load BoM')
    }
    setLoading(false)
  }, [bomId])

  useEffect(() => { loadBom() }, [loadBom])

  const setRow = (key, updates) => {
    setEditState((prev) => ({ ...prev, [key]: { ...prev[key], ...updates } }))
  }

  const handleSaveItem = async (item) => {
    const key = `item_${item.id}`
    const row = editState[key]
    if (!row?.unitPrice || parseFloat(row.unitPrice) <= 0) {
      setErrorMsg('Unit price harus diisi dan lebih dari 0')
      return
    }
    setRow(key, { saving: true })
    setErrorMsg('')
    const result = await savePricing(bomId, item.id, {
      unitPrice: parseFloat(row.unitPrice),
      currency: row.currency,
      supplier: row.supplier,
      leadTime: row.leadTime,
    })
    if (result.success) {
      setSuccessMsg(`Harga tersimpan untuk "${item.marketingDesc}"`)
      setTimeout(() => setSuccessMsg(''), 2500)
      await loadBom()
    } else {
      setErrorMsg(result.error)
    }
    setRow(key, { saving: false })
  }

  const handleSaveSubItem = async (subItem) => {
    const key = `sub_${subItem.id}`
    const row = editState[key]
    if (!row?.unitPrice || parseFloat(row.unitPrice) <= 0) {
      setErrorMsg('Unit price harus diisi dan lebih dari 0')
      return
    }
    setRow(key, { saving: true })
    setErrorMsg('')
    const result = await saveSubItemPricing(bomId, subItem.id, {
      unitPrice: parseFloat(row.unitPrice),
      currency: row.currency,
      supplier: row.supplier,
      leadTime: row.leadTime,
    })
    if (result.success) {
      setSuccessMsg(`Harga tersimpan untuk "${subItem.description}"`)
      setTimeout(() => setSuccessMsg(''), 2500)
      await loadBom()
    } else {
      setErrorMsg(result.error)
    }
    setRow(key, { saving: false })
  }

  const handleFinalize = async () => {
    setFinalizing(true)
    setErrorMsg('')
    const result = await finalizePricing(bomId, finNotes)
    if (result.success) {
      setSuccessMsg('Pricing finalized!')
      setShowFinalize(false)
      setTimeout(() => router.push('/procurement/bom'), 1500)
    } else {
      setErrorMsg(result.error)
    }
    setFinalizing(false)
  }

  const computeTotals = () => {
    if (!bom) return { totalValue: 0, pricedCount: 0, totalLeafItems: 0 }
    let totalValue = 0, pricedCount = 0, totalLeafItems = 0
    for (const item of bom.items) {
      if (item.hasSubItems) {
        for (const si of item.subItems) {
          totalLeafItems++
          if (si.unitPrice) { totalValue += parseFloat(si.totalPrice) || 0; pricedCount++ }
        }
      } else {
        totalLeafItems++
        if (item.unitPrice) { totalValue += parseFloat(item.totalPrice) || 0; pricedCount++ }
      }
    }
    return { totalValue, pricedCount, totalLeafItems }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto"></div>
      </div>
    )
  }

  if (!bom) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{errorMsg || 'BoM tidak ditemukan'}</p>
        <Link href="/procurement/bom" className="text-green-600 hover:underline">← Back</Link>
      </div>
    )
  }

  const { totalValue, pricedCount, totalLeafItems } = computeTotals()
  const allPriced = pricedCount === totalLeafItems && totalLeafItems > 0
  const isReadOnly = bom.bomStatus === 'PRICED'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{bom.bomNo}</h1>
            <p className="text-gray-600 dark:text-gray-400">{bom.projectName} • {bom.projectCode}</p>
            {bom.contractNo && <p className="text-sm text-gray-500 mt-1">Contract: {bom.contractNo}</p>}
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              bom.bomStatus === 'PRICED'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}>
              {bom.bomStatus}
            </span>
            <p className="text-sm text-gray-500 mt-2">{pricedCount}/{totalLeafItems} item diisi harga</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-2 bg-green-500 rounded-full transition-all"
              style={{ width: `${totalLeafItems > 0 ? (pricedCount / totalLeafItems) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
          {successMsg}
        </div>
      )}

      {/* Items */}
      <div className="space-y-4">
        {bom.items.map((item, itemIdx) => (
          <div key={item.id} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Marketing item header */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {itemIdx + 1}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.marketingDesc}</p>
                {item.hasSubItems ? (
                  <p className="text-xs text-blue-600 dark:text-blue-400">📋 {item.subItems.length} sub-item</p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {item.refinedQty} {item.refinedUnit}
                    {item.specifications && ` — ${item.specifications.substring(0, 60)}${item.specifications.length > 60 ? '…' : ''}`}
                  </p>
                )}
              </div>
            </div>

            {/* Pricing rows */}
            {item.hasSubItems ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {item.subItems.map((si, siIdx) => {
                  const key = `sub_${si.id}`
                  const row = editState[key] || {}
                  return (
                    <PriceRow
                      key={si.id}
                      label={`${String.fromCharCode(97 + siIdx)}. ${si.description}`}
                      qty={si.qty}
                      unit={si.unit}
                      specs={si.specifications}
                      isPriced={!!si.unitPrice}
                      isReadOnly={isReadOnly}
                      row={row}
                      onChange={(f, v) => setRow(key, { [f]: v })}
                      onSave={() => handleSaveSubItem(si)}
                      indent
                    />
                  )
                })}
              </div>
            ) : (
              (() => {
                const key = `item_${item.id}`
                const row = editState[key] || {}
                return (
                  <PriceRow
                    label={null}
                    qty={item.refinedQty}
                    unit={item.refinedUnit}
                    specs={item.specifications}
                    isPriced={!!item.unitPrice}
                    isReadOnly={isReadOnly}
                    row={row}
                    onChange={(f, v) => setRow(key, { [f]: v })}
                    onSave={() => handleSaveItem(item)}
                  />
                )
              })()
            )}
          </div>
        ))}
      </div>

      {/* Total + Finalize */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Estimasi Total Nilai BoM</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatIDR(totalValue)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {pricedCount} dari {totalLeafItems} item sudah diisi harga
            </p>
          </div>
          {!isReadOnly ? (
            <button
              onClick={() => setShowFinalize(true)}
              disabled={!allPriced}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
            >
              {allPriced ? 'Finalisasi Pricing →' : `Belum selesai (${pricedCount}/${totalLeafItems})`}
            </button>
          ) : (
            <span className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-sm font-medium">
              ✓ Pricing Finalized
            </span>
          )}
        </div>
      </div>

      <Link href="/procurement/bom" className="inline-block px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition">
        ← Back to List
      </Link>

      {/* Finalize Modal */}
      {showFinalize && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Finalisasi Pricing</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Nilai: <strong className="text-gray-900 dark:text-white">{formatIDR(totalValue)}</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {totalLeafItems} item akan di-finalize. Status BoM → <strong>PRICED</strong>.
            </p>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Catatan (Opsional)</label>
            <textarea
              value={finNotes}
              onChange={(e) => setFinNotes(e.target.value)}
              placeholder="Catatan untuk marketing / management..."
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-800 dark:text-white mb-4 text-sm"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowFinalize(false)} disabled={finalizing}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 transition">
                Batal
              </button>
              <button onClick={handleFinalize} disabled={finalizing}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 transition">
                {finalizing ? 'Memproses...' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PriceRow({ label, qty, unit, specs, isPriced, isReadOnly, row, onChange, onSave, indent = false }) {
  return (
    <div className={`p-4 ${indent ? 'pl-10 bg-gray-50/70 dark:bg-slate-800/40' : ''} ${isPriced ? 'bg-green-50/50 dark:bg-green-950/10' : ''}`}>
      {label && (
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
          {label}
          <span className="ml-2 text-xs text-gray-500 font-normal">— {qty} {unit}</span>
          {specs && <span className="ml-1 text-xs text-gray-400 italic">{specs.substring(0, 50)}{specs.length > 50 ? '…' : ''}</span>}
        </p>
      )}

      {isPriced && !isReadOnly ? (
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-500">Unit Price</p>
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              {row.currency} {parseFloat(row.unitPrice || 0).toLocaleString('id-ID')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total ({qty} {unit})</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {row.currency} {(parseFloat(row.unitPrice || 0) * (qty || 1)).toLocaleString('id-ID')}
            </p>
          </div>
          {row.supplier && (
            <div>
              <p className="text-xs text-gray-500">Pemasok</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{row.supplier}</p>
            </div>
          )}
          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-medium">✓ Priced</span>
          <button
            onClick={onSave}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Ubah
          </button>
        </div>
      ) : isReadOnly ? (
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <span className="font-semibold text-gray-900 dark:text-white">{row.currency} {parseFloat(row.unitPrice || 0).toLocaleString('id-ID')} / {unit}</span>
          <span className="text-gray-500">× {qty} = <strong>{formatIDR(parseFloat(row.unitPrice || 0) * (qty || 1))}</strong></span>
          {row.supplier && <span className="text-gray-500">Supplier: {row.supplier}</span>}
          {row.leadTime && <span className="text-gray-500">Lead time: {row.leadTime} hari</span>}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Unit Price <span className="text-red-500">*</span></label>
            <div className="flex gap-1">
              <select
                value={row.currency || 'IDR'}
                onChange={(e) => onChange('currency', e.target.value)}
                className="px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs w-20"
              >
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input
                type="number" min="0" step="any"
                value={row.unitPrice || ''}
                onChange={(e) => onChange('unitPrice', e.target.value)}
                placeholder="0"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pemasok</label>
            <input type="text" value={row.supplier || ''} onChange={(e) => onChange('supplier', e.target.value)}
              placeholder="Nama supplier"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lead Time (hari)</label>
            <input type="number" min="0" value={row.leadTime || ''} onChange={(e) => onChange('leadTime', e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <button onClick={onSave} disabled={row.saving || !row.unitPrice}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition">
              {row.saving ? 'Saving...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

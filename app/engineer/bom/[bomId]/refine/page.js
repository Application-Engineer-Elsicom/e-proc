'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  refineBomItem,
  saveBomSubItems,
  submitBomForApproval,
  getBomForRefinement,
  rejectBomItem,
  getEngineerWpoList,
} from '@/actions/engineer'

const UNITS = ['Pcs', 'Unit', 'Set', 'Kg', 'Gram', 'Ton', 'Liter', 'M³', 'Meter', 'M²', 'Roll', 'Box', 'Lembar']

function newSubItemRow() {
  return { tempId: Date.now() + Math.random(), description: '', qty: '', unit: 'Pcs', specifications: '', notes: '' }
}

export default function RefineBomPage({ params }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [bom, setBom] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [globalMsg, setGlobalMsg] = useState({ type: '', text: '' })
  const [showAssignWpoModal, setShowAssignWpoModal] = useState(false)
  const [wpoList, setWpoList] = useState([])
  const [selectedWpoId, setSelectedWpoId] = useState('')

  // Access control: Only STAFF engineer can access this page
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.engineerRole !== 'STAFF') {
      // Non-STAFF engineers cannot access refine page
      alert('Akses ditolak: Hanya STAFF engineer yang bisa akses halaman refinement')
      router.push('/engineer/bom')
    }
  }, [status, session, router])

  const loadBom = useCallback(async () => {
    try {
      const result = await getBomForRefinement(params.bomId)
      if (!result.success) {
        alert('Failed to load BoM: ' + result.error)
        router.push('/engineer/bom')
        return
      }
      setBom(result.data)
      setItems(result.data.items.map(buildItemState))
    } catch (error) {
      alert('Error loading BoM: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [params.bomId, router])

  useEffect(() => {
    if (status === 'authenticated') loadBom()
  }, [status, loadBom])

  // Build local state from a DB item
  function buildItemState(item) {
    return {
      // DB data
      id: item.id,
      marketingDesc: item.marketingDesc,
      itemStatus: item.itemStatus,
      hasSubItems: item.hasSubItems,
      refinedQty: item.refinedQty,
      refinedUnit: item.refinedUnit,
      specifications: item.specifications,
      notes: item.notes,
      subItems: item.subItems || [],
      // UI state
      editMode: null, // null | 'direct' | 'subitems'
      saving: false,
      errorMsg: '',
      // Direct-fill temps
      tempQty: item.refinedQty?.toString() || '',
      tempUnit: item.refinedUnit || 'Pcs',
      tempSpecs: item.specifications || '',
      tempNotes: item.notes || '',
      // Sub-items temps
      tempSubItems: item.subItems?.length > 0
        ? item.subItems.map((s) => ({ tempId: s.id, description: s.description, qty: s.qty.toString(), unit: s.unit, specifications: s.specifications || '', notes: s.notes || '' }))
        : [newSubItemRow()],
    }
  }

  // ─── Item state updaters ───────────────────────────────────────────────────

  const setItemField = (itemId, updates) => {
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, ...updates } : i))
  }

  const setSubItemField = (itemId, tempId, field, value) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item
      return {
        ...item,
        tempSubItems: item.tempSubItems.map((s) => s.tempId === tempId ? { ...s, [field]: value } : s),
      }
    }))
  }

  const addSubItemRow = (itemId) => {
    setItems((prev) => prev.map((item) =>
      item.id === itemId
        ? { ...item, tempSubItems: [...item.tempSubItems, newSubItemRow()] }
        : item
    ))
  }

  const removeSubItemRow = (itemId, tempId) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== itemId) return item
      const updated = item.tempSubItems.filter((s) => s.tempId !== tempId)
      return { ...item, tempSubItems: updated.length === 0 ? [newSubItemRow()] : updated }
    }))
  }

  const openEditMode = (item, mode) => {
    // Reset temp to DB values when opening edit
    const reset = mode === 'direct'
      ? {
          tempQty: item.refinedQty?.toString() || '',
          tempUnit: item.refinedUnit || 'Pcs',
          tempSpecs: item.specifications || '',
          tempNotes: item.notes || '',
        }
      : {
          tempSubItems: item.subItems?.length > 0
            ? item.subItems.map((s) => ({ tempId: s.id, description: s.description, qty: s.qty.toString(), unit: s.unit, specifications: s.specifications || '', notes: s.notes || '' }))
            : [newSubItemRow()],
        }
    setItemField(item.id, { editMode: mode, errorMsg: '', ...reset })
  }

  const cancelEdit = (itemId) => setItemField(itemId, { editMode: null, errorMsg: '' })

  // ─── Save actions ─────────────────────────────────────────────────────────

  const saveDirect = async (item) => {
    setItemField(item.id, { saving: true, errorMsg: '' })
    try {
      const result = await refineBomItem(params.bomId, item.id, {
        refinedQty: item.tempQty,
        refinedUnit: item.tempUnit,
        specifications: item.tempSpecs,
        notes: item.tempNotes,
      })
      if (!result.success) {
        setItemField(item.id, { saving: false, errorMsg: result.error })
        return
      }
      setItemField(item.id, {
        saving: false,
        editMode: null,
        errorMsg: '',
        itemStatus: 'REFINED',
        hasSubItems: false,
        refinedQty: parseInt(item.tempQty),
        refinedUnit: item.tempUnit,
        specifications: item.tempSpecs,
        notes: item.tempNotes,
        subItems: [],
      })
    } catch (error) {
      setItemField(item.id, { saving: false, errorMsg: error.message })
    }
  }

  const saveSubItems = async (item) => {
    setItemField(item.id, { saving: true, errorMsg: '' })
    try {
      const result = await saveBomSubItems(params.bomId, item.id, item.tempSubItems)
      if (!result.success) {
        setItemField(item.id, { saving: false, errorMsg: result.error })
        return
      }
      setItemField(item.id, {
        saving: false,
        editMode: null,
        errorMsg: '',
        itemStatus: 'REFINED',
        hasSubItems: true,
        refinedQty: null,
        refinedUnit: null,
        subItems: result.data.subItems,
      })
    } catch (error) {
      setItemField(item.id, { saving: false, errorMsg: error.message })
    }
  }

  // ─── Submit BoM for WPO Approval ──────────────────────────────────────────

  const handleSubmitClick = async () => {
    const unrefined = items.filter((i) => i.itemStatus !== 'REFINED')
    if (unrefined.length > 0) {
      setGlobalMsg({ type: 'error', text: `${unrefined.length} item belum diselesaikan.` })
      return
    }

    // Fetch WPO list and show assignment modal
    try {
      const result = await getEngineerWpoList()
      if (!result.success) {
        setGlobalMsg({ type: 'error', text: 'Failed to load WPO list: ' + result.error })
        return
      }
      setWpoList(result.data)
      setSelectedWpoId(result.data.length > 0 ? result.data[0].id : '')
      setShowAssignWpoModal(true)
    } catch (error) {
      setGlobalMsg({ type: 'error', text: 'Error: ' + error.message })
    }
  }

  const handleSubmit = async () => {
    if (!selectedWpoId) {
      alert('Pilih WPO engineer terlebih dahulu')
      return
    }

    if (!confirm('Submit BoM untuk WPO Approval? Tindakan ini tidak bisa dibatalkan.')) return

    setSubmitting(true)
    setGlobalMsg({ type: '', text: '' })
    try {
      const result = await submitBomForApproval(params.bomId, selectedWpoId)
      if (result.success) {
        setGlobalMsg({ type: 'success', text: 'BoM submitted untuk WPO Approval!' })
        setTimeout(() => router.push('/engineer/bom'), 1200)
      } else {
        setGlobalMsg({ type: 'error', text: result.error })
      }
    } catch (error) {
      setGlobalMsg({ type: 'error', text: error.message })
    } finally {
      setSubmitting(false)
      setShowAssignWpoModal(false)
    }
  }

  // ─── Reject BoM ───────────────────────────────────────────────────────────

  const handleReject = async () => {
    if (!rejectionReason.trim()) { alert('Alasan penolakan harus diisi'); return }
    setSubmitting(true)
    try {
      const result = await rejectBomItem(params.bomId, null, rejectionReason)
      if (result.success) {
        alert('BoM ditolak dan dikembalikan ke Marketing')
        router.push('/engineer/bom')
      } else {
        alert('Failed: ' + result.error)
      }
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setSubmitting(false)
      setShowRejectModal(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading BoM...</p>
        </div>
      </div>
    )
  }

  if (!bom) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">BoM not found</p>
        <Link href="/engineer/bom" className="text-amber-600 hover:underline mt-4 inline-block">
          Back to BoM List
        </Link>
      </div>
    )
  }

  const allRefined = items.every((i) => i.itemStatus === 'REFINED')
  const refinedCount = items.filter((i) => i.itemStatus === 'REFINED').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Refine: {bom.bomNo}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{bom.projectName} ({bom.projectCode})</p>
            {bom.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{bom.description}</p>}
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
              {bom.bomStatus}
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {refinedCount}/{items.length} item selesai
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-2 bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${items.length > 0 ? (refinedCount / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Global message */}
      {globalMsg.text && (
        <div className={`px-4 py-3 rounded-lg border ${
          globalMsg.type === 'error'
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
        }`}>
          {globalMsg.text}
        </div>
      )}

      {/* How-to banner */}
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-1">Cara mengisi refinement:</p>
        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
          <li><strong>Direct Fill</strong> — isi qty & satuan langsung pada item marketing (cocok untuk item tunggal)</li>
          <li><strong>Sub-items</strong> — pecah 1 item marketing menjadi beberapa sub-item dengan qty masing-masing (cocok untuk item yang perlu diperinci)</li>
        </ul>
      </div>

      {/* Items */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <ItemCard
            key={item.id}
            item={item}
            index={index}
            onOpenDirect={() => openEditMode(item, 'direct')}
            onOpenSubItems={() => openEditMode(item, 'subitems')}
            onCancel={() => cancelEdit(item.id)}
            onSaveDirect={() => saveDirect(item)}
            onSaveSubItems={() => saveSubItems(item)}
            onFieldChange={(field, val) => setItemField(item.id, { [field]: val })}
            onSubItemField={(tempId, field, val) => setSubItemField(item.id, tempId, field, val)}
            onAddSubItem={() => addSubItemRow(item.id)}
            onRemoveSubItem={(tempId) => removeSubItemRow(item.id, tempId)}
          />
        ))}
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3 justify-between">
        <Link
          href="/engineer/bom"
          className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
        >
          ← Back
        </Link>
        <div className="flex gap-3">
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={submitting}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
          >
            Tolak BoM
          </button>
          <button
            onClick={handleSubmitClick}
            disabled={!allRefined || submitting}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
          >
            {submitting ? 'Submitting...' : `Submit untuk WPO ${allRefined ? '✓' : `(${refinedCount}/${items.length})`}`}
          </button>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Tolak BoM</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              BoM akan dikembalikan ke Marketing dengan alasan:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Alasan penolakan..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-800 dark:text-white mb-4"
              rows="4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                disabled={submitting}
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
                disabled={submitting}
              >
                {submitting ? 'Menolak...' : 'Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WPO Assignment Modal */}
      {showAssignWpoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Assign ke WPO Engineer</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Pilih WPO engineer yang akan meninjau BoM ini:
            </p>
            <select
              value={selectedWpoId}
              onChange={(e) => setSelectedWpoId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white mb-4 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih WPO Engineer --</option>
              {wpoList.map((wpo) => (
                <option key={wpo.id} value={wpo.id}>
                  {wpo.name} ({wpo.username})
                </option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAssignWpoModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                disabled={submitting}
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedWpoId || submitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium disabled:opacity-50 transition"
              >
                {submitting ? 'Submitting...' : 'Assign & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ItemCard sub-component ────────────────────────────────────────────────────

function ItemCard({
  item, index,
  onOpenDirect, onOpenSubItems, onCancel,
  onSaveDirect, onSaveSubItems,
  onFieldChange, onSubItemField, onAddSubItem, onRemoveSubItem,
}) {
  const isRefined = item.itemStatus === 'REFINED'

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-lg border-2 transition ${
      isRefined ? 'border-green-400 dark:border-green-600' : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Item header row */}
      <div className="flex items-start gap-4 p-5">
        {/* Index + status */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ background: isRefined ? '#16a34a' : '#9ca3af' }}>
          {isRefined ? '✓' : index + 1}
        </div>

        {/* Description */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">{item.marketingDesc}</p>

          {/* Refined summary */}
          {isRefined && !item.editMode && (
            <div className="mt-2">
              {item.hasSubItems ? (
                <div>
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">
                    📋 {item.subItems.length} sub-item:
                  </p>
                  <div className="space-y-1">
                    {item.subItems.map((s, i) => (
                      <p key={s.id || i} className="text-xs text-gray-600 dark:text-gray-400 pl-4">
                        {i + 1}. {s.description} — <strong>{s.qty} {s.unit}</strong>
                        {s.specifications && <span className="ml-1 text-gray-400">({s.specifications.substring(0, 40)}{s.specifications.length > 40 ? '…' : ''})</span>}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  ✔ Direct fill: <strong>{item.refinedQty} {item.refinedUnit}</strong>
                  {item.specifications && <span className="ml-2 text-gray-500 font-normal">— {item.specifications.substring(0, 50)}{item.specifications.length > 50 ? '…' : ''}</span>}
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {item.errorMsg && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">{item.errorMsg}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0">
          {!item.editMode && (
            <div className="flex gap-2">
              {isRefined ? (
                <>
                  <button
                    onClick={onOpenDirect}
                    className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition"
                  >
                    Edit Direct
                  </button>
                  <button
                    onClick={onOpenSubItems}
                    className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition"
                  >
                    Edit Sub-items
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onOpenDirect}
                    className="px-3 py-1.5 text-xs bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-lg font-medium transition"
                  >
                    Direct Fill
                  </button>
                  <button
                    onClick={onOpenSubItems}
                    className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-lg font-medium transition"
                  >
                    Sub-items
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Direct Fill Panel ── */}
      {item.editMode === 'direct' && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-950/30 p-5">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-4">
            Direct Fill — isi quantity & satuan untuk "{item.marketingDesc}"
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={item.tempQty}
                onChange={(e) => onFieldChange('tempQty', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Satuan <span className="text-red-500">*</span>
              </label>
              <select
                value={item.tempUnit}
                onChange={(e) => onFieldChange('tempUnit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
              >
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Spesifikasi Teknis</label>
            <textarea
              value={item.tempSpecs}
              onChange={(e) => onFieldChange('tempSpecs', e.target.value)}
              placeholder="Spesifikasi teknis, merek, grade, dll."
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
            <textarea
              value={item.tempNotes}
              onChange={(e) => onFieldChange('tempNotes', e.target.value)}
              placeholder="Catatan tambahan..."
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onSaveDirect}
              disabled={item.saving || !item.tempQty}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition"
            >
              {item.saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              onClick={onCancel}
              disabled={item.saving}
              className="px-5 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ── Sub-items Panel ── */}
      {item.editMode === 'subitems' && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-950/30 p-5">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
            Sub-items — pecah "{item.marketingDesc}" menjadi detail item
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-4">
            Setiap sub-item akan diisi harga terpisah oleh Procurement.
          </p>

          {/* Sub-items table */}
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                  <th className="px-3 py-2 text-left font-semibold w-8">#</th>
                  <th className="px-3 py-2 text-left font-semibold min-w-48">Deskripsi Sub-item</th>
                  <th className="px-3 py-2 text-left font-semibold w-24">Qty</th>
                  <th className="px-3 py-2 text-left font-semibold w-28">Satuan</th>
                  <th className="px-3 py-2 text-left font-semibold min-w-40">Spesifikasi</th>
                  <th className="px-3 py-2 text-center font-semibold w-16">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200 dark:divide-blue-800">
                {item.tempSubItems.map((si, i) => (
                  <tr key={si.tempId} className="bg-white dark:bg-slate-800">
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">{i + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={si.description}
                        onChange={(e) => onSubItemField(si.tempId, 'description', e.target.value)}
                        placeholder="e.g., Steel Beam HB 200"
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        value={si.qty}
                        onChange={(e) => onSubItemField(si.tempId, 'qty', e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={si.unit}
                        onChange={(e) => onSubItemField(si.tempId, 'unit', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500"
                      >
                        {UNITS.map((u) => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={si.specifications}
                        onChange={(e) => onSubItemField(si.tempId, 'specifications', e.target.value)}
                        placeholder="Spesifikasi teknis..."
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {item.tempSubItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveSubItem(si.tempId)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-300 font-bold px-1"
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={onAddSubItem}
            className="mb-4 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg font-medium transition"
          >
            + Tambah Sub-item
          </button>

          <div className="flex gap-3">
            <button
              onClick={onSaveSubItems}
              disabled={item.saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition"
            >
              {item.saving ? 'Menyimpan...' : 'Simpan Sub-items'}
            </button>
            <button
              onClick={onCancel}
              disabled={item.saving}
              className="px-5 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  approveBomByWpo,
  approveBomBySystem,
  rejectBomItem,
  getBomForRefinement,
  editRefinedItemByWpo,
  getEngineerSystemList,
} from '@/actions/engineer'
import { getBomStatusLabel, getBomItemStatusLabel } from '@/lib/permissions'

const UNITS = ['Pcs', 'Unit', 'Set', 'Kg', 'Gram', 'Ton', 'Liter', 'M³', 'Meter', 'M²', 'Roll', 'Box', 'Lembar']

// Potong hanya bila memang kepanjangan — sebelumnya '...' selalu ditempel
// sehingga teks pendek pun terlihat seolah ada lanjutannya.
const truncate = (text, max = 40) =>
  !text ? '-' : text.length > max ? `${text.substring(0, max)}…` : text

export default function ApproveBomPage({ params }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [bom, setBom] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [rejectedItems, setRejectedItems] = useState(new Map())
  const [comments, setComments] = useState('')
  const [showCommentForm, setShowCommentForm] = useState(null)
  const [itemComments, setItemComments] = useState(new Map())
  const [editingItemId, setEditingItemId] = useState(null)
  const [editData, setEditData] = useState({})
  const [showAssignSystemModal, setShowAssignSystemModal] = useState(false)
  const [systemList, setSystemList] = useState([])
  const [selectedSystemId, setSelectedSystemId] = useState('')
  const [pendingApproval, setPendingApproval] = useState(false)

  const isWpo = session?.user?.engineerRole === 'WPO'
  const isSystem = session?.user?.engineerRole === 'SYSTEM'

  // Access control: Only WPO and SYSTEM engineers can access this page
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.engineerRole !== 'WPO' && session?.user?.engineerRole !== 'SYSTEM') {
      // Only WPO and SYSTEM can access approval page
      alert('Akses ditolak: Hanya WPO dan SYSTEM engineer yang bisa akses halaman approval')
      router.push('/engineer/bom')
    }
  }, [status, session, router])

  // Load BoM for approval
  const loadBom = useCallback(async () => {
    try {
      const result = await getBomForRefinement(params.bomId)
      if (result.success) {
        setBom(result.data)
        setItems(result.data.items)
      } else {
        alert('Gagal memuat BoM: ' + result.error)
        router.push('/engineer/bom')
      }
    } catch (error) {
      console.error('Terjadi kesalahan saat memuat BoM:', error)
      alert('Terjadi kesalahan saat memuat BoM')
    } finally {
      setLoading(false)
    }
  }, [params.bomId, router])

  // Load on mount
  useEffect(() => {
    if (status === 'authenticated') {
      loadBom()
    }
  }, [status, loadBom])

  // Toggle rejection for item
  const toggleRejection = (itemId) => {
    const newRejections = new Map(rejectedItems)
    if (newRejections.has(itemId)) {
      newRejections.delete(itemId)
    } else {
      newRejections.set(itemId, '')
    }
    setRejectedItems(newRejections)
  }

  // Update rejection reason
  const updateRejectionReason = (itemId, reason) => {
    const newRejections = new Map(rejectedItems)
    newRejections.set(itemId, reason)
    setRejectedItems(newRejections)
  }

  // Add comment to item
  const addItemComment = (itemId, comment) => {
    const newComments = new Map(itemComments)
    const existing = newComments.get(itemId) || []
    newComments.set(itemId, [
      ...existing,
      {
        id: Date.now(),
        text: comment,
        by: session?.user?.name,
        timestamp: new Date().toLocaleString(),
      },
    ])
    setItemComments(newComments)
    setShowCommentForm(null)
  }

  // Handle WPO edit item
  const handleEditItem = (item) => {
    setEditingItemId(item.id)
    if (item.hasSubItems) {
      setEditData({
        editMode: 'subitems',
        subItems: item.subItems.map((s) => ({
          tempId: s.id,
          description: s.description,
          qty: s.qty.toString(),
          unit: s.unit,
          specifications: s.specifications || '',
          notes: s.notes || '',
        })),
      })
    } else {
      setEditData({
        editMode: 'direct',
        refinedQty: item.refinedQty?.toString() || '',
        refinedUnit: item.refinedUnit || 'Pcs',
        specifications: item.specifications || '',
        notes: item.notes || '',
      })
    }
  }

  // Switch edit mode in WPO modal
  const switchWpoEditMode = (mode, item) => {
    if (mode === 'direct') {
      setEditData({
        editMode: 'direct',
        refinedQty: '',
        refinedUnit: 'Pcs',
        specifications: '',
        notes: '',
      })
    } else {
      setEditData({
        editMode: 'subitems',
        subItems: [{ tempId: Date.now(), description: '', qty: '', unit: 'Pcs', specifications: '', notes: '' }],
      })
    }
  }

  // Add sub-item row in WPO modal
  const addWpoSubItem = () => {
    setEditData((prev) => ({
      ...prev,
      subItems: [...(prev.subItems || []), { tempId: Date.now() + Math.random(), description: '', qty: '', unit: 'Pcs', specifications: '', notes: '' }],
    }))
  }

  // Remove sub-item row in WPO modal
  const removeWpoSubItem = (tempId) => {
    setEditData((prev) => ({
      ...prev,
      subItems: prev.subItems.filter((s) => s.tempId !== tempId).length === 0
        ? [{ tempId: Date.now() + Math.random(), description: '', qty: '', unit: 'Pcs', specifications: '', notes: '' }]
        : prev.subItems.filter((s) => s.tempId !== tempId),
    }))
  }

  const handleSaveEdit = async (item) => {
    const currentMode = editData.editMode || (item.hasSubItems ? 'subitems' : 'direct')

    // Validate based on mode
    if (currentMode === 'direct') {
      if (!editData.refinedQty) {
        alert('Quantity harus diisi')
        return
      }
    } else {
      if (!editData.subItems || editData.subItems.length === 0) {
        alert('Minimal 1 sub-item harus ada')
        return
      }
      for (const si of editData.subItems) {
        if (!si.description?.trim()) {
          alert('Deskripsi sub-item tidak boleh kosong')
          return
        }
        if (!si.qty) {
          alert('Qty sub-item harus diisi')
          return
        }
      }
    }

    setApproving(true)
    try {
      // Prepare data based on mode
      let saveData = { ...editData }
      if (currentMode === 'subitems') {
        // For sub-items mode, remove direct fields
        saveData = {
          subItems: editData.subItems.map((si) => ({
            description: si.description,
            qty: parseInt(si.qty),
            unit: si.unit,
            specifications: si.specifications || null,
            notes: si.notes || null,
          })),
        }
      } else {
        // For direct mode, remove sub-items
        saveData = {
          refinedQty: parseInt(editData.refinedQty),
          refinedUnit: editData.refinedUnit,
          specifications: editData.specifications || null,
          notes: editData.notes || null,
        }
      }

      const result = await editRefinedItemByWpo(params.bomId, item.id, saveData)
      if (result.success) {
        // Update local items state
        setItems((prev) => prev.map((i) => i.id === item.id ? result.data : i))
        setEditingItemId(null)
        setEditData({})
        alert('Item updated successfully')
      } else {
        alert('Failed to update item: ' + result.error)
      }
    } catch (error) {
      alert('Error updating item: ' + error.message)
    } finally {
      setApproving(false)
    }
  }

  // Handle WPO approval (show SYSTEM assignment modal)
  const handleWpoApprovalClick = async () => {
    if (!confirm('Approve all refined items? This moves BoM to SYSTEM_REVIEW.')) {
      return
    }

    setPendingApproval(true)
    // Fetch SYSTEM list
    try {
      const result = await getEngineerSystemList()
      if (!result.success) {
        alert('Failed to load SYSTEM list: ' + result.error)
        setPendingApproval(false)
        return
      }
      setSystemList(result.data)
      setSelectedSystemId(result.data.length > 0 ? result.data[0].id : '')
      setShowAssignSystemModal(true)
    } catch (error) {
      alert('Error: ' + error.message)
      setPendingApproval(false)
    }
  }

  const handleWpoApproval = async () => {
    if (!selectedSystemId) {
      alert('Pilih SYSTEM engineer terlebih dahulu')
      return
    }

    setApproving(true)
    try {
      const rejectionReasons = {}
      rejectedItems.forEach((reason, itemId) => {
        if (reason.trim()) {
          rejectionReasons[itemId] = reason
        }
      })

      const result = await approveBomByWpo(params.bomId, rejectionReasons, comments, selectedSystemId)
      if (result.success) {
        alert('BoM approved by WPO. Moving to SYSTEM review...')
        router.push('/engineer/bom')
      } else {
        alert('Failed to approve: ' + result.error)
      }
    } catch (error) {
      console.error('Error approving BoM:', error)
      alert('Error approving BoM')
    } finally {
      setApproving(false)
      setShowAssignSystemModal(false)
      setPendingApproval(false)
    }
  }

  // Handle System approval (final activation)
  const handleSystemApproval = async () => {
    if (!confirm('Activate BoM? This will mark it as ACTIVE and ready for Procurement.')) {
      return
    }

    setApproving(true)
    try {
      const result = await approveBomBySystem(params.bomId, comments)
      if (result.success) {
        alert('BoM activated successfully! Ready for Procurement.')
        router.push('/engineer/bom')
      } else {
        alert('Failed to activate: ' + result.error)
      }
    } catch (error) {
      console.error('Error activating BoM:', error)
      alert('Error activating BoM')
    } finally {
      setApproving(false)
    }
  }

  // Handle rejection (back to refinement)
  const handleReject = async (itemId) => {
    const reason = rejectedItems.get(itemId)
    if (!reason?.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    if (!confirm(`Reject "${items.find(i => i.id === itemId)?.marketingDesc}"? This sends it back to refinement.`)) {
      return
    }

    setApproving(true)
    try {
      const result = await rejectBomItem(params.bomId, itemId, reason)
      if (result.success) {
        alert('Item rejected and sent back to refinement')
        router.push('/engineer/bom')
      } else {
        alert('Failed to reject: ' + result.error)
      }
    } catch (error) {
      console.error('Error rejecting item:', error)
      alert('Error rejecting item')
    } finally {
      setApproving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!bom) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">BoM not found</p>
        <Link href="/engineer/bom" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to BoM List
        </Link>
      </div>
    )
  }

  const approvalStage = isWpo ? 'WPO Review' : 'System Review'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {approvalStage}: {bom.bomNo}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Project: {bom.projectName} ({bom.projectCode})
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium">
              {getBomStatusLabel(bom.bomStatus)}
            </span>
          </div>
        </div>
        {bom.description && (
          <p className="text-gray-600 dark:text-gray-400">{bom.description}</p>
        )}
      </div>

      {/* Items Review Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-800">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Deskripsi
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Jumlah Rincian
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Spesifikasi
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {items.map((item) => {
                const isRejected = rejectedItems.has(item.id)
                return (
                  <tr key={item.id} className={`${isRejected ? 'bg-red-50 dark:bg-red-950' : ''} hover:bg-gray-50 dark:hover:bg-slate-800`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.marketingDesc}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Notes: {item.notes}
                          </p>
                        )}
                      </div>
                    </td>
                    {/* Item bermode sub-item tidak punya refinedQty — tanpa cabang
                        ini approver melihat sel kosong dan menyetujui tanpa tahu isinya. */}
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {item.hasSubItems ? (
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                            📋 {item.subItems?.length || 0} sub-item
                          </p>
                          <div className="space-y-0.5">
                            {item.subItems?.map((s, i) => (
                              <p key={s.id || i} className="text-xs text-gray-600 dark:text-gray-400">
                                {i + 1}. {s.description} — <strong>{s.qty} {s.unit}</strong>
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        `${item.refinedQty ?? '-'} ${item.refinedUnit || ''}`.trim()
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.hasSubItems
                        ? item.subItems?.map((s) => s.specifications).filter(Boolean).join('; ') || '-'
                        : truncate(item.specifications)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        {getBomItemStatusLabel(item.itemStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {isWpo && (
                          <button
                            onClick={() => handleEditItem(item)}
                            className="px-3 py-1 rounded text-xs font-medium bg-blue-200 hover:bg-blue-300 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200"
                          >
                            Ubah
                          </button>
                        )}
                        <button
                          onClick={() => toggleRejection(item.id)}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            isRejected
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-red-200 hover:bg-red-300 dark:bg-red-900 dark:hover:bg-red-800 text-red-800 dark:text-red-200'
                          }`}
                        >
                          {isRejected ? 'Reject' : 'Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejection Details */}
      {rejectedItems.size > 0 && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">
            Items for Rejection
          </h2>
          <div className="space-y-4">
            {Array.from(rejectedItems.entries()).map(([itemId, reason]) => {
              const item = items.find(i => i.id === itemId)
              return (
                <div key={itemId} className="border border-red-300 dark:border-red-700 rounded p-4 bg-white dark:bg-slate-900">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    {item?.marketingDesc}
                  </p>
                  <textarea
                    value={reason}
                    onChange={(e) => updateRejectionReason(itemId, e.target.value)}
                    placeholder="Reason for rejection..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-slate-800 dark:text-white text-sm mb-2"
                    rows="2"
                  />
                  <button
                    onClick={() => handleReject(itemId)}
                    disabled={approving || !reason.trim()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium disabled:opacity-50"
                  >
                    Confirm Rejection
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Catatan Persetujuan
        </h2>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Add remarks, notes, or conditions for this approval..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-slate-800 dark:text-white mb-4"
          rows="4"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Catatan ini tersimpan di riwayat persetujuan.
        </p>
      </div>

      {/* Item-level Comments */}
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {item.marketingDesc}
              </h3>
              <button
                onClick={() => setShowCommentForm(showCommentForm === item.id ? null : item.id)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showCommentForm === item.id ? 'Hide' : 'Tambah Catatan'}
              </button>
            </div>

            {showCommentForm === item.id && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      addItemComment(item.id, e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-slate-800 dark:text-white text-sm"
                />
              </div>
            )}

            {itemComments.get(item.id)?.length > 0 && (
              <div className="space-y-2">
                {itemComments.get(item.id).map((comment) => (
                  <div key={comment.id} className="text-xs bg-gray-100 dark:bg-slate-800 p-2 rounded">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {comment.by} <span className="text-gray-500 dark:text-gray-400 font-normal">{comment.timestamp}</span>
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-between">
        <Link
          href="/engineer/bom"
          className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium"
        >
          Kembali
        </Link>
        <button
          onClick={isWpo ? handleWpoApprovalClick : handleSystemApproval}
          disabled={approving || rejectedItems.size > 0 || pendingApproval}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {approving || pendingApproval ? 'Memproses…' : isWpo ? 'Setujui & Teruskan ke System' : 'Activate BoM'}
        </button>
      </div>

      {/* Edit Item Modal (WPO only) */}
      {editingItemId && isWpo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            {(() => {
              const item = items.find(i => i.id === editingItemId)
              if (!item) return null
              const currentMode = editData.editMode || (item.hasSubItems ? 'subitems' : 'direct')

              return (
                <>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Edit: {item.marketingDesc}
                  </h3>

                  {/* Mode Selector */}
                  <div className="mb-4 flex gap-2">
                    <button
                      onClick={() => switchWpoEditMode('direct', item)}
                      className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                        currentMode === 'direct'
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Direct Fill
                    </button>
                    <button
                      onClick={() => switchWpoEditMode('subitems', item)}
                      className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                        currentMode === 'subitems'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      Sub-items
                    </button>
                  </div>

                  {/* Direct Fill Mode */}
                  {currentMode === 'direct' && (
                    <div className="space-y-3 mb-4 bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                        <input
                          type="number"
                          min="1"
                          value={editData.refinedQty || ''}
                          onChange={(e) => setEditData({ ...editData, refinedQty: e.target.value })}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Unit *</label>
                        <select
                          value={editData.refinedUnit || 'Pcs'}
                          onChange={(e) => setEditData({ ...editData, refinedUnit: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        >
                          {UNITS.map((u) => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Spesifikasi</label>
                        <textarea
                          value={editData.specifications || ''}
                          onChange={(e) => setEditData({ ...editData, specifications: e.target.value })}
                          placeholder="Spesifikasi teknis, merek, grade, dll."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                          rows="2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
                        <textarea
                          value={editData.notes || ''}
                          onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                          placeholder="Catatan tambahan..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                          rows="2"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sub-items Mode */}
                  {currentMode === 'subitems' && (
                    <div className="mb-4 bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">
                        Sub-items — pecah item menjadi detail items
                      </p>
                      <div className="overflow-x-auto mb-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-blue-100 dark:bg-blue-900/50">
                              <th className="px-2 py-2 text-left font-semibold w-8">#</th>
                              <th className="px-2 py-2 text-left font-semibold">Deskripsi</th>
                              <th className="px-2 py-2 text-left font-semibold w-16">Qty</th>
                              <th className="px-2 py-2 text-left font-semibold w-20">Satuan</th>
                              <th className="px-2 py-2 text-left font-semibold">Spesifikasi</th>
                              <th className="px-2 py-2 text-center w-8">Hapus</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-200 dark:divide-blue-800">
                            {editData.subItems?.map((si, idx) => (
                              <tr key={si.tempId} className="bg-white dark:bg-slate-800">
                                <td className="px-2 py-2 text-gray-500 dark:text-gray-400 font-medium">{idx + 1}</td>
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={si.description}
                                    onChange={(e) => {
                                      const newSubs = [...editData.subItems]
                                      newSubs[idx].description = e.target.value
                                      setEditData({ ...editData, subItems: newSubs })
                                    }}
                                    placeholder="Deskripsi..."
                                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={si.qty}
                                    onChange={(e) => {
                                      const newSubs = [...editData.subItems]
                                      newSubs[idx].qty = e.target.value
                                      setEditData({ ...editData, subItems: newSubs })
                                    }}
                                    placeholder="0"
                                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <select
                                    value={si.unit}
                                    onChange={(e) => {
                                      const newSubs = [...editData.subItems]
                                      newSubs[idx].unit = e.target.value
                                      setEditData({ ...editData, subItems: newSubs })
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-xs"
                                  >
                                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                                  </select>
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={si.specifications}
                                    onChange={(e) => {
                                      const newSubs = [...editData.subItems]
                                      newSubs[idx].specifications = e.target.value
                                      setEditData({ ...editData, subItems: newSubs })
                                    }}
                                    placeholder="Spesifikasi..."
                                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-xs"
                                  />
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {editData.subItems.length > 1 && (
                                    <button
                                      onClick={() => removeWpoSubItem(si.tempId)}
                                      className="text-red-500 hover:text-red-700 dark:hover:text-red-300 font-bold"
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
                        onClick={addWpoSubItem}
                        className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg font-medium transition"
                      >
                        + Tambah Sub-item
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setEditingItemId(null)}
                      disabled={approving}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleSaveEdit(item)}
                      disabled={approving || !editData.refinedQty && currentMode === 'direct' || editData.subItems?.length === 0 && currentMode === 'subitems'}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded font-medium disabled:opacity-50 transition"
                    >
                      {approving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* SYSTEM Assignment Modal (WPO only) */}
      {showAssignSystemModal && isWpo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Assign ke SYSTEM Engineer</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Pilih SYSTEM engineer yang akan mengaktifkan BoM ini:
            </p>
            <select
              value={selectedSystemId}
              onChange={(e) => setSelectedSystemId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white mb-4 focus:ring-2 focus:ring-green-500"
            >
              <option value="">-- Pilih SYSTEM Engineer --</option>
              {systemList.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.name} ({sys.username})
                </option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAssignSystemModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                disabled={approving}
              >
                Batal
              </button>
              <button
                onClick={handleWpoApproval}
                disabled={!selectedSystemId || approving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium disabled:opacity-50 transition"
              >
                {approving ? 'Memproses…' : 'Assign & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  getBomDetail,
  updateBom,
  submitBomForRefinement,
  deleteBom,
  getEngineerStaffList,
} from '@/actions/bom'

export default function BoMDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bomId = params.bomId

  const [bom, setBom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [staffList, setStaffList] = useState([])
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [loadingStaff, setLoadingStaff] = useState(false)

  const { register, control, handleSubmit, formState: { errors }, reset } =
    useForm({
      defaultValues: {
        projectName: '',
        projectCode: '',
        contractNo: '',
        description: '',
        items: [],
      },
    })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  useEffect(() => {
    loadBomDetail()
  }, [bomId])

  // Load staff list when modal opens
  useEffect(() => {
    if (showAssignModal && staffList.length === 0) {
      loadStaffList()
    }
  }, [showAssignModal])

  const loadBomDetail = async () => {
    try {
      setLoading(true)
      const result = await getBomDetail(bomId)

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to load BoM')
        return
      }

      setBom(result.data)

      reset({
        projectName: result.data.projectName,
        projectCode: result.data.projectCode,
        contractNo: result.data.contractNo || '',
        description: result.data.description || '',
        items: result.data.items.map((item) => ({
          id: item.id,
          marketingDesc: item.marketingDesc,
          marketingQty: item.marketingQty?.toString() || '',
          marketingUnit: item.marketingUnit,
          itemStatus: item.itemStatus,
        })),
      })
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load BoM')
    } finally {
      setLoading(false)
    }
  }

  const loadStaffList = async () => {
    setLoadingStaff(true)
    try {
      const result = await getEngineerStaffList()
      if (result.success) {
        setStaffList(result.data)
      } else {
        setErrorMessage(result.error || 'Gagal memuat daftar Engineer Staff')
      }
    } catch (error) {
      setErrorMessage(error.message || 'Gagal memuat daftar Engineer Staff')
    } finally {
      setLoadingStaff(false)
    }
  }

  const onSubmitUpdate = async (data) => {
    try {
      setIsSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      const validItems = data.items.filter(
        (item) => item.marketingDesc?.trim(),
      )
      if (validItems.length === 0) {
        setErrorMessage('Minimal 1 item dengan deskripsi harus ada')
        setIsSubmitting(false)
        return
      }

      const formData = new FormData()
      formData.append('projectName', data.projectName)
      formData.append('projectCode', data.projectCode)
      formData.append('contractNo', data.contractNo || '')
      formData.append('description', data.description || '')
      formData.append('items', JSON.stringify(validItems))

      const result = await updateBom(bomId, formData)

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to update BoM')
        return
      }

      setSuccessMessage('BoM updated successfully!')
      setIsEditing(false)
      setTimeout(() => {
        loadBomDetail()
      }, 500)
    } catch (error) {
      setErrorMessage(error.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open assignment modal instead of submitting directly
  const handleSubmitClick = () => {
    setErrorMessage('')
    setSuccessMessage('')
    setSelectedStaffId('')
    setShowAssignModal(true)
  }

  // Confirm assignment and submit BoM
  const handleConfirmSubmit = async () => {
    if (!selectedStaffId) return

    setShowAssignModal(false)
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await submitBomForRefinement(bomId, selectedStaffId)

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to submit BoM')
        return
      }

      setSuccessMessage(result.message || 'BoM submitted for refinement!')
      setTimeout(() => {
        loadBomDetail()
      }, 500)
    } catch (error) {
      setErrorMessage(error.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this BoM?')) {
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage('')

      const result = await deleteBom(bomId)

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to delete BoM')
        return
      }

      setSuccessMessage('BoM deleted successfully!')
      setTimeout(() => {
        router.push('/marketing/bom')
      }, 500)
    } catch (error) {
      setErrorMessage(error.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading BoM...</p>
        </div>
      </div>
    )
  }

  if (!bom) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">BoM not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-lg">👷</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Assign Engineer Staff
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {bom.bomNo} — {bom.projectName}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Pilih Engineer Staff yang akan melakukan refinement untuk BoM ini.
            </p>

            {loadingStaff ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : staffList.length === 0 ? (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <p className="text-red-700 dark:text-red-300 text-sm font-medium">
                  Tidak ada Engineer Staff yang tersedia.
                </p>
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                  Hubungi administrator untuk menambahkan Engineer Staff.
                </p>
              </div>
            ) : (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Engineer Staff <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">-- Pilih Engineer Staff --</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={!selectedStaffId || loadingStaff}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
              >
                Submit & Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {bom.bomNo}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {bom.projectName} • {bom.projectCode}
          </p>
        </div>
        <div className="text-right">
          <span
            className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusBadgeClasses(
              bom.bomStatus,
            )}`}
          >
            {formatStatus(bom.bomStatus)}
          </span>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Created {new Date(bom.createdAt).toLocaleDateString('id-ID')}
          </p>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Main Content */}
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmitUpdate)} className="space-y-6">
          {/* Project Info Section */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Project Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Project Code */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Project Code
                </label>
                <input
                  type="text"
                  {...register('projectCode', {
                    required: 'Project code is required',
                  })}
                  placeholder="e.g., 2244"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.projectCode && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                    {errors.projectCode.message}
                  </p>
                )}
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  {...register('projectName', {
                    required: 'Project name is required',
                  })}
                  placeholder="e.g., Bridge Construction Project"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.projectName && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                    {errors.projectName.message}
                  </p>
                )}
              </div>

              {/* Contract No */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Contract No (Optional)
                </label>
                <input
                  type="text"
                  {...register('contractNo')}
                  placeholder="e.g., CONTRACT-2026-001"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Description (Optional)
                </label>
                <textarea
                  {...register('description')}
                  placeholder="Add any notes or description about this BoM"
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Bill of Materials Items
              </h2>
              <button
                type="button"
                onClick={() =>
                  append({
                    marketingDesc: '',
                    marketingQty: '',
                    marketingUnit: 'Pcs',
                  })
                }
                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition font-medium"
              >
                + Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white w-12">
                      No.
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white flex-1 min-w-48">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white w-32">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white w-24">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white w-20">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {fields.map((field, index) => (
                    <tr
                      key={field.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          {...register(`items.${index}.marketingDesc`)}
                          placeholder="e.g., Steel Beam 10x10"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          {...register(`items.${index}.marketingQty`)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          {...register(`items.${index}.marketingUnit`)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option>Pcs</option>
                          <option>Unit</option>
                          <option>Set</option>
                          <option>Kg</option>
                          <option>Liter</option>
                          <option>Meter</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              * At least 1 item with description is required
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                loadBomDetail()
              }}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Project Info Section */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Project Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Project ID
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {bom.projectId}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Project Code
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {bom.projectCode}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Project Name
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {bom.projectName}
                </p>
              </div>
              {bom.contractNo && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Contract No
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {bom.contractNo}
                  </p>
                </div>
              )}
              {bom.description && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Description
                  </p>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {bom.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Bill of Materials Items
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white w-12">
                      No.
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white flex-1 min-w-48">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white w-32">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white w-24">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white w-24">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bom.items.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.marketingDesc}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.marketingQty || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {item.marketingUnit}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getItemStatusBadgeClasses(
                            item.itemStatus,
                          )}`}
                        >
                          {formatItemStatus(item.itemStatus)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* History Section */}
          {bom.histories && bom.histories.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Activity History
              </h2>

              <div className="space-y-4">
                {bom.histories.map((history) => (
                  <div
                    key={history.id}
                    className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-200">
                          {history.action.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {history.action}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {history.notes}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {new Date(history.timestamp).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {bom.bomStatus === 'DRAFT' && (
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition"
              >
                Edit
              </button>
              <button
                onClick={handleSubmitClick}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Refinement'}
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
              >
                Back
              </button>
            </div>
          )}
          {bom.bomStatus !== 'DRAFT' && (
            <div className="flex gap-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
              >
                Back
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatStatus(status) {
  const map = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    WPO_REVIEW: 'WPO Review',
    WPO_APPROVED: 'WPO Approved',
    WPO_REJECTED: 'WPO Rejected',
    SYSTEM_REVIEW: 'System Review',
    SYSTEM_APPROVED: 'System Approved',
    SYSTEM_REJECTED: 'System Rejected',
    REJECTED: 'Rejected',
    ACTIVE: 'Active',
    ARCHIVED: 'Archived',
  }
  return map[status] || status
}

function getStatusBadgeClasses(status) {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    case 'SUBMITTED':
    case 'WPO_REVIEW':
    case 'WPO_APPROVED':
    case 'SYSTEM_REVIEW':
    case 'SYSTEM_APPROVED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'REJECTED':
    case 'WPO_REJECTED':
    case 'SYSTEM_REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'ARCHIVED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}

function formatItemStatus(status) {
  const map = {
    PENDING: 'Pending',
    REFINED: 'Refined',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    PRICED: 'Priced',
  }
  return map[status] || status
}

function getItemStatusBadgeClasses(status) {
  switch (status) {
    case 'PENDING':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    case 'REFINED':
    case 'APPROVED':
    case 'PRICED':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}

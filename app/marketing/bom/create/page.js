'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { createBom } from '@/app/actions/bom'

export default function CreateBoMPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const { register, control, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      projectId: '',
      projectName: '',
      projectCode: '',
      contractNo: '',
      description: '',
      items: Array(5).fill({
        marketingDesc: '',
        marketingQty: '',
        marketingUnit: 'Pcs',
      }),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true)
      setErrorMessage('')
      setSuccessMessage('')

      // Validate at least one item with description
      const validItems = data.items.filter(
        (item) => item.marketingDesc?.trim(),
      )
      if (validItems.length === 0) {
        setErrorMessage('Minimal 1 item dengan deskripsi harus ada')
        setIsSubmitting(false)
        return
      }

      // Create FormData
      const formData = new FormData()
      formData.append('projectId', data.projectId)
      formData.append('projectName', data.projectName)
      formData.append('projectCode', data.projectCode)
      formData.append('contractNo', data.contractNo || '')
      formData.append('description', data.description || '')
      formData.append('items', JSON.stringify(validItems))

      // Call server action
      const result = await createBom(formData)

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to create BoM')
        return
      }

      setSuccessMessage(`BoM ${result.bomNo} created successfully!`)
      setTimeout(() => {
        router.push('/marketing/bom')
      }, 1500)
    } catch (error) {
      setErrorMessage(error.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Create New BoM
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a new Bill of Materials for your project
        </p>
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

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Project Info Section */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Project Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project ID */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Project ID *
              </label>
              <input
                type="text"
                {...register('projectId', {
                  required: 'Project ID is required',
                })}
                placeholder="e.g., PROJ-001"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.projectId && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                  {errors.projectId.message}
                </p>
              )}
            </div>

            {/* Project Code */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Project Code *
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Project Name *
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

          {/* Table */}
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
            {isSubmitting ? 'Creating...' : 'Create BoM'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

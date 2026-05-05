import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = {
  title: 'BoM List - Marketing',
  description: 'View and manage all your Bill of Materials',
}

export default async function BoMListPage({ searchParams }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'MARKETING') {
    redirect('/login')
  }

  const status = searchParams?.status || null

  // Fetch BoMs with filters
  const where = {
    createdBy: session.user.id,
  }

  if (status && status !== 'all') {
    where.bomStatus = status
  }

  const boms = await prisma.billOfMaterial.findMany({
    where,
    include: {
      items: true,
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ARCHIVED', label: 'Archived' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bill of Materials
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {boms.length} BoM{boms.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/marketing/bom/create"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
        >
          + Create New BoM
        </Link>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex gap-2 flex-wrap">
          {statuses.map((s) => (
            <Link
              key={s.value}
              href={`/marketing/bom${s.value !== 'all' ? `?status=${s.value}` : ''}`}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                (status === s.value || (s.value === 'all' && !status))
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* BoM List */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {boms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    BoM Number
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Project
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Items
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Created
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {boms.map((bom) => (
                  <tr
                    key={bom.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                  >
                    <td className="px-6 py-4">
                      <p className="font-mono font-medium text-gray-900 dark:text-white">
                        {bom.bomNo}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {bom.projectName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {bom.projectCode}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {bom._count.items}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClasses(
                          bom.bomStatus,
                        )}`}
                      >
                        {formatStatus(bom.bomStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(bom.createdAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/marketing/bom/${bom.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                        >
                          View
                        </Link>
                        {bom.bomStatus === 'DRAFT' && (
                          <>
                            <span className="text-gray-300 dark:text-gray-600">
                              •
                            </span>
                            <Link
                              href={`/marketing/bom/${bom.id}`}
                              className="text-amber-600 dark:text-amber-400 hover:underline text-sm font-medium"
                            >
                              Edit
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
              <span className="text-4xl">📭</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No BoMs found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {status
                ? 'No BoMs with this status'
                : "You haven't created any BoMs yet"}
            </p>
            <Link
              href="/marketing/bom/create"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              Create First BoM
            </Link>
          </div>
        )}
      </div>
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

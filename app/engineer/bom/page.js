import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = {
  title: 'Engineer BoM List - Refinement & Approval',
  description: 'View and manage BoM refinement and approvals',
}

export default async function EngineerBoMListPage({ searchParams }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ENGINEER') {
    redirect('/login')
  }

  const status = searchParams?.status || null
  const engineerRole = session.user.engineerRole

  let where = {}

  if (engineerRole === 'STAFF') {
    where.bomStatus = status || 'SUBMITTED'
  } else if (engineerRole === 'WPO') {
    where.bomStatus = status || 'WPO_REVIEW'
  } else if (engineerRole === 'SYSTEM') {
    where.bomStatus = status || 'SYSTEM_REVIEW'
  }

  const boms = await prisma.billOfMaterial.findMany({
    where,
    include: {
      items: true,
      creator: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const getStatusOptions = () => {
    if (engineerRole === 'STAFF') {
      return [
        { value: 'SUBMITTED', label: 'Needs Refinement' },
        { value: 'WPO_REVIEW', label: 'WPO Review' },
        { value: 'WPO_APPROVED', label: 'WPO Approved' },
      ]
    }
    if (engineerRole === 'WPO') {
      return [
        { value: 'WPO_REVIEW', label: 'Needs Approval' },
        { value: 'WPO_APPROVED', label: 'Approved' },
        { value: 'SYSTEM_REVIEW', label: 'System Review' },
      ]
    }
    if (engineerRole === 'SYSTEM') {
      return [
        { value: 'SYSTEM_REVIEW', label: 'Needs Activation' },
        { value: 'SYSTEM_APPROVED', label: 'System Approved' },
        { value: 'ACTIVE', label: 'Active' },
      ]
    }
    return []
  }

  const getActionLink = (bom) => {
    if (engineerRole === 'STAFF' || engineerRole === 'WPO') {
      return `/engineer/bom/${bom.id}/refine`
    }
    if (engineerRole === 'SYSTEM') {
      return `/engineer/bom/${bom.id}/approve`
    }
    return `#`
  }

  const getActionLabel = () => {
    if (engineerRole === 'STAFF') return 'Refine'
    if (engineerRole === 'WPO') return 'Approve'
    if (engineerRole === 'SYSTEM') return 'Activate'
    return 'View'
  }

  return (
    <div className="space-y-6">
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
          href="/engineer"
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex gap-2 flex-wrap">
          {getStatusOptions().map((s) => (
            <Link
              key={s.value}
              href={`/engineer/bom?status=${s.value}`}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                (status === s.value || (!status && s.value === 'SUBMITTED'))
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

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
                    From
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
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        {bom.bomStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {bom.creator?.name || 'Marketing'}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={getActionLink(bom)}
                        className="text-amber-600 dark:text-amber-400 hover:underline text-sm font-medium"
                      >
                        {getActionLabel()}
                      </Link>
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
            <p className="text-gray-600 dark:text-gray-400">
              No Bill of Materials in this status
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = {
  title: 'Engineer Dashboard - BoM Refinement',
  description: 'Dashboard untuk engineer team',
}

export default async function EngineerDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ENGINEER') {
    redirect('/login')
  }

  const engineerRole = session.user.engineerRole
  const userId = session.user.id

  let relevantBoms = []
  let stats = { pending: 0, inProgress: 0, waiting: 0, completed: 0 }

  if (engineerRole === 'STAFF') {
    // Show BoMs assigned to this specific STAFF member
    relevantBoms = await prisma.billOfMaterial.findMany({
      where: {
        bomStatus: 'SUBMITTED',
        assignedToStaff: userId,
      },
      include: {
        items: true,
        creator: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { submittedAt: 'desc' },
      take: 5,
    })

    // Stats: assigned to me vs pipeline progress
    const [assignedToMe, inWpoReview, completedCount] = await Promise.all([
      prisma.billOfMaterial.count({
        where: { bomStatus: 'SUBMITTED', assignedToStaff: userId },
      }),
      prisma.billOfMaterial.count({ where: { bomStatus: 'WPO_REVIEW' } }),
      prisma.billOfMaterial.count({ where: { bomStatus: 'ACTIVE' } }),
    ])

    stats = {
      pending: assignedToMe,
      inProgress: inWpoReview,
      waiting: 0,
      completed: completedCount,
    }
  } else if (engineerRole === 'WPO') {
    relevantBoms = await prisma.billOfMaterial.findMany({
      where: { bomStatus: 'WPO_REVIEW' },
      include: {
        items: true,
        creator: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })

    const [wpoReview, systemReview, activeCount] = await Promise.all([
      prisma.billOfMaterial.count({ where: { bomStatus: 'WPO_REVIEW' } }),
      prisma.billOfMaterial.count({ where: { bomStatus: 'SYSTEM_REVIEW' } }),
      prisma.billOfMaterial.count({ where: { bomStatus: 'ACTIVE' } }),
    ])

    stats = {
      pending: wpoReview,
      inProgress: systemReview,
      waiting: 0,
      completed: activeCount,
    }
  } else if (engineerRole === 'SYSTEM') {
    relevantBoms = await prisma.billOfMaterial.findMany({
      where: { bomStatus: 'SYSTEM_REVIEW' },
      include: {
        items: true,
        creator: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })

    const [systemReview, activeCount] = await Promise.all([
      prisma.billOfMaterial.count({ where: { bomStatus: 'SYSTEM_REVIEW' } }),
      prisma.billOfMaterial.count({ where: { bomStatus: 'ACTIVE' } }),
    ])

    stats = {
      pending: systemReview,
      inProgress: 0,
      waiting: 0,
      completed: activeCount,
    }
  }

  const getTaskDescription = () => {
    switch (engineerRole) {
      case 'STAFF':
        return 'Refine marketing items — update quantities and add specifications'
      case 'WPO':
        return 'Review refined items — quality check and approval'
      case 'SYSTEM':
        return 'Final system review — validate and activate BoM'
      default:
        return 'Review and manage BoM items'
    }
  }

  const getStatLabels = () => {
    if (engineerRole === 'STAFF') {
      return { pending: 'Assigned to Me', inProgress: 'WPO Review', waiting: '', completed: 'Active' }
    }
    if (engineerRole === 'WPO') {
      return { pending: 'Needs Approval', inProgress: 'System Review', waiting: '', completed: 'Active' }
    }
    return { pending: 'Needs Activation', inProgress: '', waiting: '', completed: 'Active' }
  }

  const labels = getStatLabels()

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-lg p-8 border border-amber-200 dark:border-amber-800">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome, {session.user.name}!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{getTaskDescription()}</p>
        {engineerRole === 'STAFF' && (
          <div className="mt-3 inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-3 py-1.5 rounded-lg text-sm font-medium">
            <span>👷</span>
            <span>Engineer Staff</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{labels.pending}</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <span className="text-xl">⏳</span>
            </div>
          </div>
        </div>

        {labels.inProgress && (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{labels.inProgress}</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.inProgress}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-xl">🔄</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{labels.completed}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Tasks */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {engineerRole === 'STAFF' ? 'BoM Assigned to Me' : 'Your Assigned Tasks'}
          </h3>
          <Link
            href={engineerRole === 'STAFF' ? '/engineer/bom?status=SUBMITTED&mine=true' : '/engineer/bom'}
            className="text-amber-600 dark:text-amber-400 hover:underline text-sm font-medium"
          >
            View All →
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          {relevantBoms.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">BoM No</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Project</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Items</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">From</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {relevantBoms.map((bom) => (
                    <tr key={bom.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition border-l-4 border-l-amber-400">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {bom.bomNo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{bom.projectName}</p>
                          <p className="text-xs text-gray-500">{bom.projectCode}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {bom._count.items} items
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          {bom.bomStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {bom.creator?.name || 'Marketing'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={
                            engineerRole === 'STAFF'
                              ? `/engineer/bom/${bom.id}/refine`
                              : `/engineer/bom/${bom.id}/approve`
                          }
                          className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                        >
                          {engineerRole === 'STAFF' ? 'Refine' : engineerRole === 'WPO' ? 'Approve' : 'Activate'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="inline-block p-3 bg-gray-100 dark:bg-gray-800 rounded-lg mb-3">
                <span className="text-3xl">📋</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-2 font-medium">
                {engineerRole === 'STAFF' ? 'Tidak ada BoM yang di-assign kepadamu' : 'No tasks assigned yet'}
              </p>
              <Link
                href="/engineer/bom"
                className="text-amber-600 dark:text-amber-400 hover:underline font-medium text-sm"
              >
                View BoM List
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

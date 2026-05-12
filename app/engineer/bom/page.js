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

  // Next.js 15: await searchParams
  const params = await searchParams
  const status = params?.status || null
  // For STAFF: mine=true by default (only assigned tasks); mine=false = see all
  const mine = params?.mine !== 'false'

  const engineerRole = session.user.engineerRole
  const userId = session.user.id

  // Build query
  let where = {}

  if (engineerRole === 'STAFF') {
    const activeStatus = status || 'SUBMITTED'
    where.bomStatus = activeStatus
    // Only filter by assignment when showing SUBMITTED tasks and mine=true
    if (activeStatus === 'SUBMITTED' && mine) {
      where.assignedToStaff = userId
    }
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

  // Fetch assigned staff names separately (avoids needing Prisma relation regeneration)
  const assignedStaffIds = [...new Set(boms.map((b) => b.assignedToStaff).filter(Boolean))]
  const staffUsers = assignedStaffIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: assignedStaffIds } },
        select: { id: true, name: true },
      })
    : []
  const staffMap = Object.fromEntries(staffUsers.map((u) => [u.id, u.name]))

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
    if (engineerRole === 'STAFF') {
      return `/engineer/bom/${bom.id}/refine`
    }
    if (engineerRole === 'WPO' || engineerRole === 'SYSTEM') {
      return `/engineer/bom/${bom.id}/approve`
    }
    return '#'
  }

  const getActionLabel = () => {
    if (engineerRole === 'STAFF') return 'Refine'
    if (engineerRole === 'WPO') return 'Approve'
    if (engineerRole === 'SYSTEM') return 'Activate'
    return 'View'
  }

  const activeStatus = status || (engineerRole === 'STAFF' ? 'SUBMITTED' : engineerRole === 'WPO' ? 'WPO_REVIEW' : 'SYSTEM_REVIEW')
  const isSubmittedTab = activeStatus === 'SUBMITTED'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bill of Materials
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {boms.length} BoM{boms.length !== 1 ? 's' : ''}
            {engineerRole === 'STAFF' && isSubmittedTab && mine && (
              <span className="ml-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
                (assigned to me)
              </span>
            )}
          </p>
        </div>
        <Link
          href="/engineer"
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex gap-2 flex-wrap">
          {getStatusOptions().map((s) => (
            <Link
              key={s.value}
              href={`/engineer/bom?status=${s.value}${engineerRole === 'STAFF' && s.value === 'SUBMITTED' ? `&mine=${mine}` : ''}`}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeStatus === s.value
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s.label}
            </Link>
          ))}

          {/* Assignment toggle — only for STAFF on SUBMITTED tab */}
          {engineerRole === 'STAFF' && isSubmittedTab && (
            <>
              <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1 self-stretch" />
              <Link
                href={`/engineer/bom?status=SUBMITTED&mine=true`}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  mine
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                My Tasks
              </Link>
              <Link
                href={`/engineer/bom?status=SUBMITTED&mine=false`}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  !mine
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All
              </Link>
            </>
          )}
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
                  {engineerRole === 'STAFF' && (
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Assigned To
                    </th>
                  )}
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {boms.map((bom) => {
                  const isAssignedToMe = bom.assignedToStaff === userId
                  return (
                    <tr
                      key={bom.id}
                      className={`hover:bg-gray-50 dark:hover:bg-slate-800 transition ${
                        engineerRole === 'STAFF' && isAssignedToMe
                          ? 'border-l-4 border-l-amber-400'
                          : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-medium text-gray-900 dark:text-white">
                            {bom.bomNo}
                          </p>
                          {engineerRole === 'STAFF' && isAssignedToMe && (
                            <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 px-1.5 py-0.5 rounded font-medium">
                              Mine
                            </span>
                          )}
                        </div>
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
                      {engineerRole === 'STAFF' && (
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {bom.assignedToStaff && staffMap[bom.assignedToStaff] ? (
                            <span className={isAssignedToMe ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}>
                              {staffMap[bom.assignedToStaff]}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 italic">Unassigned</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <Link
                          href={getActionLink(bom)}
                          className="text-amber-600 dark:text-amber-400 hover:underline text-sm font-medium"
                        >
                          {getActionLabel()}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
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
              {engineerRole === 'STAFF' && isSubmittedTab && mine
                ? 'Tidak ada BoM yang di-assign kepada kamu.'
                : 'No Bill of Materials in this status'}
            </p>
            {engineerRole === 'STAFF' && isSubmittedTab && mine && (
              <Link
                href="/engineer/bom?status=SUBMITTED&mine=false"
                className="inline-block mt-3 text-amber-600 dark:text-amber-400 hover:underline text-sm font-medium"
              >
                Lihat semua BoM →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

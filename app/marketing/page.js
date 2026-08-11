import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getBomStatusLabel } from '@/lib/permissions'

export const metadata = {
  title: 'Dashboard Marketing',
  description: 'Dashboard untuk marketing team',
}

export default async function MarketingDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'MARKETING') {
    redirect('/login')
  }

  // Fetch user's BoMs
  const boms = await prisma.billOfMaterial.findMany({
    where: { createdBy: session.user.id },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Setiap status BoM harus masuk tepat satu kotak, kalau tidak jumlah kotak
  // tidak akan sama dengan Total dan pengguna kehilangan jejak dokumennya.
  // Status yang sedang berjalan di Engineer/Procurement digabung jadi "Diproses".
  const REJECTED_STATUSES = ['REJECTED', 'WPO_REJECTED', 'SYSTEM_REJECTED']
  const countOf = (...statuses) =>
    boms.filter((b) => statuses.includes(b.bomStatus)).length

  const stats = {
    total: boms.length,
    draft: countOf('DRAFT'),
    diproses: countOf(
      'SUBMITTED', 'WPO_REVIEW', 'WPO_APPROVED',
      'SYSTEM_REVIEW', 'SYSTEM_APPROVED', 'ACTIVE',
    ),
    priced: countOf('PRICED'),
    ditolak: countOf(...REJECTED_STATUSES),
    archived: countOf('ARCHIVED'),
  }

  const recentBoms = boms.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-8 border border-blue-200 dark:border-blue-800">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Halo, {session.user.name}!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola Bill of Material dan pantau status persetujuannya
        </p>
      </div>

      {/* Kartu statistik — Draft + Diproses + Sudah Diharga + Ditolak + Arsip = Total */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total BoM',     value: stats.total,     icon: '📋', tone: 'text-gray-900 dark:text-white',      bg: 'bg-blue-100 dark:bg-blue-900' },
          { label: 'Draft',         value: stats.draft,     icon: '📝', tone: 'text-gray-500 dark:text-gray-300',   bg: 'bg-gray-100 dark:bg-gray-700' },
          { label: 'Diproses',      value: stats.diproses,  icon: '⏳', tone: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-100 dark:bg-blue-900' },
          { label: 'Sudah Diharga', value: stats.priced,    icon: '✅', tone: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900' },
          { label: 'Ditolak',       value: stats.ditolak,   icon: '↩️', tone: 'text-red-600 dark:text-red-400',     bg: 'bg-red-100 dark:bg-red-900' },
          { label: 'Diarsipkan',    value: stats.archived,  icon: '📦', tone: 'text-gray-400 dark:text-gray-500',   bg: 'bg-gray-100 dark:bg-gray-700' },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.label}</p>
                <p className={`text-2xl font-bold mt-2 ${card.tone}`}>{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.bg}`}>
                <span className="text-xl">{card.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          BoM Terbaru
        </h3>
        <Link
          href="/marketing/bom/create"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition"
        >
          + Buat BoM Baru
        </Link>
      </div>

      {/* Recent BoMs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {recentBoms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    No. BoM
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Proyek
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Dibuat
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentBoms.map((bom) => (
                  <tr
                    key={bom.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {bom.bomNo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <p className="font-medium">{bom.projectName}</p>
                        <p className="text-xs text-gray-500">
                          {bom.projectCode}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {bom._count.items} items
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          bom.bomStatus === 'DRAFT'
                            ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            : bom.bomStatus === 'SUBMITTED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : bom.bomStatus === 'ACTIVE'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {getBomStatusLabel(bom.bomStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(bom.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link
                        href={`/marketing/bom/${bom.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No BoMs created yet
            </p>
            <Link
              href="/marketing/bom/create"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Create your first BoM
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

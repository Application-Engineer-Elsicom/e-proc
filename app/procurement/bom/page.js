import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const metadata = { title: 'Procurement - BoM List' }

export default async function ProcurementBomList({ searchParams }) {
  const params = await searchParams
  const status = params?.status || 'ACTIVE'

  const boms = await prisma.billOfMaterial.findMany({
    where: { bomStatus: status },
    include: {
      items: { select: { itemStatus: true, unitPrice: true, totalPrice: true } },
      creator: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const statusOptions = [
    { value: 'ACTIVE', label: 'Needs Pricing' },
    { value: 'PRICED', label: 'Fully Priced' },
    { value: 'ARCHIVED', label: 'Archived' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bill of Materials</h1>
          <p className="text-gray-600 dark:text-gray-400">{boms.length} BoM{boms.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/procurement" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition">
          ← Dashboard
        </Link>
      </div>

      {/* Status filter */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((s) => (
            <Link key={s.value} href={`/procurement/bom?status=${s.value}`}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                status === s.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {boms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {['BoM Number', 'Project', 'Items', 'Priced', 'Total Value', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {boms.map((bom) => {
                  const pricedItems = bom.items.filter(i => i.unitPrice !== null).length
                  const totalValue = bom.items.reduce((sum, i) => sum + (parseFloat(i.totalPrice) || 0), 0)
                  const isFullyPriced = pricedItems === bom._count.items && bom._count.items > 0
                  return (
                    <tr key={bom.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                      <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-white">{bom.bomNo}</td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{bom.projectName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{bom.projectCode}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{bom._count.items}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${bom._count.items > 0 ? (pricedItems / bom._count.items) * 100 : 0}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{pricedItems}/{bom._count.items}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {totalValue > 0 ? `IDR ${totalValue.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          bom.bomStatus === 'PRICED'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                        }`}>{bom.bomStatus}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/procurement/bom/${bom.id}`}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium">
                          {bom.bomStatus === 'PRICED' ? 'View' : 'Price Items'}
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
            <p className="text-4xl mb-4">📋</p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No BoMs found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {status === 'ACTIVE' ? 'No BoMs ready for pricing. Wait for Engineer to activate BoMs.' : `No BoMs with status ${status}.`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

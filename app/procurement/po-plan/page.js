import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDashboardStats } from '../../actions/procurement-dashboard'
import POPlanContent from './POPlanContent'
import WRPlanContent from './WRPlanContent'
import FaultReportContent from './FaultReportContent'
import BorrowedContent from './BorrowedContent'

export const dynamic = 'force-dynamic'

export default async function POPlanPage({ searchParams }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'PROCUREMENT') {
    redirect('/login')
  }

  const tab = searchParams?.tab || 'po'
  const statsResult = await getDashboardStats()
  const stats = statsResult.success ? statsResult.data : {
    mrNotProcessed: 0,
    wrNotProcessed: 0,
    frNotProcessed: 0,
  }

  const tabs = [
    { id: 'po', label: 'PO Plan', count: null },
    { id: 'wr', label: 'WR Plan', count: stats.wrNotProcessed },
    { id: 'fr', label: 'Fault Report', count: stats.frNotProcessed },
    { id: 'borrowed', label: 'Borrowed', count: null },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
            PO Plan
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">
            Plan, track, and manage procurement
          </p>
        </div>
        <Link
          href="/procurement/po-plan/create"
          className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-black rounded-full hover:opacity-80 transition-all text-sm"
        >
          Create PO
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {tabs.map((t) => {
          const isActive = tab === t.id
          return (
            <Link
              key={t.id}
              href={`/procurement/po-plan?tab=${t.id}`}
              className={`px-5 py-3 font-black text-sm transition-colors relative whitespace-nowrap ${
                isActive
                  ? 'text-gray-900 dark:text-white border-b-2 border-blue-600'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-200'
                }`}>
                  {t.count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Tab Content */}
      <div>
        {tab === 'po' && <POPlanContent />}
        {tab === 'wr' && <WRPlanContent />}
        {tab === 'fr' && <FaultReportContent />}
        {tab === 'borrowed' && <BorrowedContent />}
      </div>
    </div>
  )
}

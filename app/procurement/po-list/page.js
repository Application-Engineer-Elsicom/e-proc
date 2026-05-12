import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import POListContent from './POListContent'
import DashboardProcurementTab from './DashboardTab'
import SupplierPriceTab from './SupplierPriceTab'

export const dynamic = 'force-dynamic'

export default async function POListPage({ searchParams }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'PROCUREMENT') {
    redirect('/login')
  }

  const tab = searchParams?.tab || 'list'

  const tabs = [
    { id: 'list', label: 'PO List', icon: '📋' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'prices', label: 'Daftar Harga Satuan', icon: '💰' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
          PO List
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 font-medium">
          Executed purchase orders and supplier pricing
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {tabs.map((t) => {
          const isActive = tab === t.id
          return (
            <a
              key={t.id}
              href={`/procurement/po-list?tab=${t.id}`}
              className={`px-5 py-3 font-black text-sm transition-colors relative whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'text-gray-900 dark:text-white border-b-2 border-blue-600'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </a>
          )
        })}
      </div>

      {/* Tab Content */}
      <div>
        {tab === 'list' && <POListContent />}
        {tab === 'dashboard' && <DashboardProcurementTab />}
        {tab === 'prices' && <SupplierPriceTab />}
      </div>
    </div>
  )
}

import { getServerSession } from 'next-auth'
import { authOptions } from '@/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { getDashboardStats, getFinancialStats } from '../actions/procurement-dashboard'
import DashboardCharts from './DashboardCharts'

export const dynamic = 'force-dynamic'

export default async function ProcurementDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'PROCUREMENT') {
    redirect('/login')
  }

  const year = new Date().getFullYear()
  const statsResult = await getDashboardStats()
  const financialResult = await getFinancialStats(year, null)

  const stats = statsResult.success ? statsResult.data : {
    mrNotProcessed: 0,
    wrNotProcessed: 0,
    frNotProcessed: 0,
    poReleased: 0,
    poPending: 0,
    poLate: 0,
  }

  const financial = financialResult.success ? financialResult.data : {
    financialData: [],
    totalBudget: 0,
    totalSpending: 0,
  }

  const engineerRequests = [
    {
      label: 'Material Request',
      count: stats.mrNotProcessed,
      color: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-200',
      icon: '📦',
    },
    {
      label: 'Warehouse Release',
      count: stats.wrNotProcessed,
      color: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-200',
      icon: '🚚',
    },
    {
      label: 'Fault Report',
      count: stats.frNotProcessed,
      color: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-200',
      icon: '⚠️',
    },
  ]

  const budgetUtilization = financial.totalBudget > 0
    ? Math.round((financial.totalSpending / financial.totalBudget) * 100)
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-gray-900 dark:text-white">Dashboard Procurement</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Halo, {session.user.name} • {year}</p>
      </div>

      {/* Engineer Requests Not Processed */}
      <div>
        <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-4">
          Permintaan dari Engineer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {engineerRequests.map((req) => (
            <div
              key={req.label}
              className={`${req.color} rounded-2xl border-2 border-current border-opacity-20 p-6 flex flex-col items-center justify-center text-center`}
            >
              <div className="text-4xl mb-2">{req.icon}</div>
              <p className="text-sm font-black uppercase tracking-tight mb-1">{req.label}</p>
              <p className="text-4xl font-black">{req.count}</p>
              <p className="text-xs font-bold mt-2 opacity-75">Belum Diproses</p>
            </div>
          ))}
        </div>
      </div>

      {/* Procurement Dashboard & Financial Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Procurement Dashboard */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-xl shadow-blue-500/5">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                Status Pengadaan
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ringkasan tahun berjalan</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Released POs */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase">Jumlah PO</p>
                  <p className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-1">Terbit</p>
                </div>
                <div className="text-4xl font-black text-blue-600 dark:text-blue-400">{stats.poReleased}</div>
              </div>
            </div>

            {/* Pending POs */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-300 uppercase">PO Tertunda</p>
                  <p className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1">Belum Diterima</p>
                </div>
                <div className="text-4xl font-black text-amber-600 dark:text-amber-400">{stats.poPending}</div>
              </div>
            </div>

            {/* Late POs */}
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-red-600 dark:text-red-300 uppercase">PO Terlambat</p>
                  <p className="text-2xl font-black text-red-900 dark:text-red-100 mt-1">Lewat Tenggat</p>
                </div>
                <div className="text-4xl font-black text-red-600 dark:text-red-400">{stats.poLate}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Dashboard */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-xl shadow-green-500/5">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                Ringkasan Keuangan
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Serapan anggaran per proyek</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Total Spent */}
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-xs font-bold text-orange-600 dark:text-orange-300 uppercase">Total Realisasi</p>
              <p className="text-3xl font-black text-orange-900 dark:text-orange-100 mt-2">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(financial.totalSpending)}
              </p>
            </div>

            {/* Total Budget */}
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <p className="text-xs font-bold text-green-600 dark:text-green-300 uppercase">Total Anggaran</p>
              <p className="text-3xl font-black text-green-900 dark:text-green-100 mt-2">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(financial.totalBudget)}
              </p>
            </div>

            {/* Budget Utilization Progress */}
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Serapan Anggaran</p>
                <span className="text-2xl font-black text-gray-900 dark:text-white">{budgetUtilization}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    budgetUtilization <= 70
                      ? 'bg-green-500'
                      : budgetUtilization <= 90
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Anggaran vs Realisasi Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-xl shadow-purple-500/5">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
              Anggaran vs Realisasi
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Perbandingan per proyek</p>
          </div>
        </div>

        {financial.financialData && financial.financialData.length > 0 ? (
          <DashboardCharts data={financial.financialData} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Belum ada data anggaran untuk {year}</p>
          </div>
        )}
      </div>
    </div>
  )
}

import Link from 'next/link'
import { getWarehouseReleases } from '../../actions/warehouse-release'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { getWrStatusLabel } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Warehouse Release',
}

// Approval WR kini di modul Warehouse & Procurement (dua sisi independen).
// Engineer (Requestor) hanya membuat dan memantau WR miliknya sendiri.
function StatusBadge({ status }) {
  const styles = {
    PENDING_APPROVAL:     'bg-orange-100 text-orange-700',
    WAREHOUSE_APPROVED:   'bg-sky-100 text-sky-700',
    PROCUREMENT_APPROVED: 'bg-violet-100 text-violet-700',
    APPROVED:             'bg-green-100 text-green-700',
    SHIPPED:              'bg-emerald-100 text-emerald-700',
    REJECTED:             'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-2 py-1 rounded text-[10px] font-bold ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {getWrStatusLabel(status)}
    </span>
  )
}

export default async function WarehouseReleasePage() {
  const session = await getServerSession(authOptions)
  const { id: userId } = session.user

  const result = await getWarehouseReleases()
  const mySubmissions = (result.success ? result.data : []).filter(r => r.requesterId === userId)

  const pendingCount = mySubmissions.filter(r =>
    ['PENDING_APPROVAL', 'WAREHOUSE_APPROVED', 'PROCUREMENT_APPROVED'].includes(r.status)
  ).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-[#FFC107] dark:text-[#FFC107] italic uppercase leading-none">Warehouse Release</h1>
          <p className="text-gray-500 font-bold text-sm tracking-tight uppercase">
            Monitoring pergerakan material dari gudang
          </p>
        </div>
        <Link
          href="/engineer/warehouse-release/create"
          className="bg-[#FFC107] text-black px-8 py-3 rounded-2xl hover:bg-black hover:text-white transition-all shadow-xl shadow-yellow-500/20 font-black text-sm uppercase tracking-wider"
        >
          + Create WR 📦
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total',             count: mySubmissions.length,                                        color: 'text-gray-800 dark:text-[#FFC107]' },
          { label: 'Menunggu Approval', count: pendingCount,                                                color: 'text-orange-500' },
          { label: 'Disetujui',         count: mySubmissions.filter(r => r.status === 'APPROVED').length,   color: 'text-green-500' },
          { label: 'Ditolak',           count: mySubmissions.filter(r => r.status === 'REJECTED').length,   color: 'text-red-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-yellow-50 dark:bg-yellow-900/10 p-5 rounded-2xl border border-yellow-100 dark:border-yellow-800 flex justify-between items-center">
            <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">{stat.label}</span>
            <span className={`text-3xl font-black ${stat.color}`}>{stat.count}</span>
          </div>
        ))}
      </div>

      {/* My Submissions */}
      <div>
        <h2 className="text-lg font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight mb-4">
          Rilis Saya
        </h2>
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#2d2d2d] text-white font-black uppercase tracking-widest text-[10px]">
                <th className="p-5 w-12 text-center opacity-50">NO</th>
                <th className="p-5">WR Number</th>
                <th className="p-5">Proyek</th>
                <th className="p-5">Item</th>
                <th className="p-5 text-center">Status</th>
                <th className="p-5">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {mySubmissions.map((wr, idx) => (
                <tr key={wr.id} className="border-b dark:border-gray-800 hover:bg-yellow-50/50 transition-colors">
                  <td className="p-5 text-center font-bold text-gray-300">{idx + 1}</td>
                  <td className="p-5 font-black text-gray-800 dark:text-[#FFC107]">{wr.docNo}</td>
                  <td className="p-5">
                    <p className="font-bold text-gray-500 dark:text-gray-400">{wr.projectName || wr.projectId}</p>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {wr.items.slice(0, 3).map((item, i) => (
                        <span key={i} className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[9px] font-bold text-gray-500">
                          {item.description} ({item.qty})
                        </span>
                      ))}
                      {wr.items.length > 3 && (
                        <span className="text-gray-400 text-[9px]">+{wr.items.length - 3} lainnya</span>
                      )}
                    </div>
                  </td>
                  <td className="p-5 text-center"><StatusBadge status={wr.status} /></td>
                  <td className="p-5 text-gray-400">{new Date(wr.createdAt).toLocaleDateString('id-ID')}</td>
                </tr>
              ))}
              {mySubmissions.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-20 text-center text-gray-400 italic font-bold">
                    Belum ada Warehouse Release.{' '}
                    <Link href="/engineer/warehouse-release/create" className="text-yellow-500 hover:underline">Buat sekarang</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

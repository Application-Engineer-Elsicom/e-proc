import Link from 'next/link'
import { getFaultReports } from '../../actions/fault-report'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import FRApprovalButtons from './FRApprovalButtons'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Fault Report - Engineer',
}

function PriorityBadge({ priority }) {
  const colors = {
    LOW:    'bg-green-100 text-green-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH:   'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black border border-inherit ${colors[priority] || 'bg-gray-100 text-gray-600'}`}>
      {priority}
    </span>
  )
}

function TechStatusBadge({ status }) {
  const colors = {
    OPEN:        'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    CLOSED:      'bg-emerald-100 text-emerald-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black border border-inherit ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

function ApprovalStatusBadge({ status }) {
  if (!status) return <span className="text-gray-300 text-[10px]">—</span>
  const styles = {
    WAITING_WPO:    'bg-orange-100 text-orange-700',
    WAITING_SYSTEM: 'bg-violet-100 text-violet-700',
    WAITING_PM:     'bg-blue-100 text-blue-700',
    APPROVED:       'bg-green-100 text-green-700',
    REJECTED:       'bg-red-100 text-red-700',
  }
  const labels = {
    WAITING_WPO:    'Menunggu WPO',
    WAITING_SYSTEM: 'Menunggu SYSTEM',
    WAITING_PM:     'Menunggu PM',
    APPROVED:       'Disetujui',
    REJECTED:       'Ditolak',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status.replace(/_/g, ' ')}
    </span>
  )
}

export default async function FaultReportPage() {
  const session = await getServerSession(authOptions)
  const { engineerRole, id: userId } = session.user

  const result = await getFaultReports()
  const allReports = result.success ? result.data : []

  // Split: my submissions vs pending my approval
  const pendingApprovalStatus = engineerRole === 'WPO' ? 'WAITING_WPO'
                               : engineerRole === 'SYSTEM' ? 'WAITING_SYSTEM'
                               : null

  const pendingApproval = pendingApprovalStatus
    ? allReports.filter(r => r.approvalStatus === pendingApprovalStatus && r.reportedBy !== userId)
    : []

  const mySubmissions = allReports.filter(r => r.reportedBy === userId)
  const canApprove = engineerRole === 'WPO' || engineerRole === 'SYSTEM'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-red-700 dark:text-red-500 italic uppercase leading-none">Fault Reports</h1>
          <p className="text-gray-500 font-bold text-sm tracking-tight">
            {engineerRole === 'STAFF'  && 'Issue tracking dan maintenance requests'}
            {engineerRole === 'WPO'    && 'Approval Level 1 — Engineer WPO'}
            {engineerRole === 'SYSTEM' && 'Approval Level 2 — Engineer SYSTEM'}
          </p>
        </div>
        <Link
          href="/engineer/fault-report/create"
          className="bg-red-700 text-white px-8 py-3 rounded-2xl hover:bg-black transition-all shadow-xl shadow-red-500/20 font-black text-sm uppercase tracking-wider"
        >
          + New Report ⚠️
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total',    count: mySubmissions.length,                                  color: 'text-gray-800 dark:text-white' },
          { label: 'Open',     count: mySubmissions.filter(r => r.status === 'OPEN').length, color: 'text-gray-500' },
          { label: 'In Progress', count: mySubmissions.filter(r => r.status === 'IN_PROGRESS').length, color: 'text-yellow-500' },
          { label: 'Closed',   count: mySubmissions.filter(r => r.status === 'CLOSED').length, color: 'text-emerald-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</span>
            <span className={`text-3xl font-black ${stat.color}`}>{stat.count}</span>
          </div>
        ))}
      </div>

      {/* Pending Approval Section (WPO/SYSTEM only) */}
      {canApprove && (
        <div>
          <h2 className="text-lg font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-red-400 rounded-full animate-pulse inline-block"></span>
            Menunggu Approval Saya
            {pendingApproval.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-black">
                {pendingApproval.length}
              </span>
            )}
          </h2>

          {pendingApproval.length === 0 ? (
            <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-8 text-center border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-400 font-bold">Tidak ada Fault Report yang menunggu approval Anda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20 text-gray-500 font-black uppercase tracking-widest">
                    <th className="p-4">Doc No</th>
                    <th className="p-4">Project / Asset</th>
                    <th className="p-4">Dibuat Oleh</th>
                    <th className="p-4 text-center">Priority</th>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApproval.map((fr) => (
                    <tr key={fr.id} className="border-b dark:border-gray-800 hover:bg-red-50/30 transition-colors">
                      <td className="p-4 font-black text-gray-800 dark:text-white">{fr.docNo}</td>
                      <td className="p-4">
                        <p className="font-bold text-gray-700 dark:text-gray-300">{fr.projectName}</p>
                        <p className="text-[10px] text-gray-400">{fr.itemName || fr.faultIssue || '—'}</p>
                      </td>
                      <td className="p-4 font-medium text-gray-600 dark:text-gray-400">{fr.reporter?.name}</td>
                      <td className="p-4 text-center"><PriorityBadge priority={fr.priority} /></td>
                      <td className="p-4 text-gray-400">{new Date(fr.createdAt).toLocaleDateString('id-ID')}</td>
                      <td className="p-4 w-48">
                        <FRApprovalButtons frId={fr.id} engineerRole={engineerRole} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* My Submissions */}
      <div>
        <h2 className="text-lg font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight mb-4">
          Laporan Saya
        </h2>
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#2d2d2d] text-white font-black uppercase tracking-widest text-[10px]">
                <th className="p-5 w-12 text-center opacity-50">#</th>
                <th className="p-5">Doc No</th>
                <th className="p-5">Project / Asset</th>
                <th className="p-5 text-center">Priority</th>
                <th className="p-5 text-center">Status Teknis</th>
                <th className="p-5 text-center">Status Approval</th>
                <th className="p-5">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {mySubmissions.map((r, index) => (
                <tr key={r.id} className="border-b dark:border-gray-800 hover:bg-red-50/30 transition-colors">
                  <td className="p-5 text-center font-bold text-gray-300">{index + 1}</td>
                  <td className="p-5 font-black text-gray-800 dark:text-gray-200">{r.docNo}</td>
                  <td className="p-5">
                    <p className="font-bold text-gray-700 dark:text-gray-300">{r.projectName}</p>
                    <p className="text-[10px] text-gray-400">{r.itemName || r.faultIssue || '—'}</p>
                  </td>
                  <td className="p-5 text-center"><PriorityBadge priority={r.priority} /></td>
                  <td className="p-5 text-center"><TechStatusBadge status={r.status} /></td>
                  <td className="p-5 text-center"><ApprovalStatusBadge status={r.approvalStatus} /></td>
                  <td className="p-5 text-gray-400">{new Date(r.createdAt).toLocaleDateString('id-ID')}</td>
                </tr>
              ))}
              {mySubmissions.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-20 text-center text-gray-400 italic font-bold">
                    Tidak ada Fault Report.{' '}
                    <Link href="/engineer/fault-report/create" className="text-red-500 hover:underline">Buat sekarang</Link>
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

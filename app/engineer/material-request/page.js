import Link from 'next/link'
import { getMaterialRequests } from '../../actions/material-request'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import MRApprovalButtons from './MRApprovalButtons'
import { getStatusLabel } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Material Request',
}

function StatusBadge({ status }) {
  const styles = {
    WAITING_WPO:    'bg-orange-100 text-orange-700 border-orange-200',
    WAITING_SYSTEM: 'bg-violet-100 text-violet-700 border-violet-200',
    WAITING_PM:     'bg-blue-100 text-blue-700 border-blue-200',
    APPROVED:       'bg-green-100 text-green-700 border-green-200',
    REJECTED:       'bg-red-100 text-red-700 border-red-200',
    PROCUREMENT_PROCESS: 'bg-purple-100 text-purple-700 border-purple-200',
  }
  return (
    <span className={`px-2 py-1 rounded text-[10px] font-bold border ${styles[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {getStatusLabel(status)}
    </span>
  )
}

export default async function MaterialRequestPage() {
  const session = await getServerSession(authOptions)
  const { engineerRole, id: userId } = session.user

  const result = await getMaterialRequests()
  const allRequests = result.success ? result.data : []

  // Split: my submissions vs pending my approval
  const pendingApprovalStatus = engineerRole === 'WPO' ? 'WAITING_WPO'
                               : engineerRole === 'SYSTEM' ? 'WAITING_SYSTEM'
                               : null

  const pendingApproval = pendingApprovalStatus
    ? allRequests.filter(r => r.status === pendingApprovalStatus && r.requestedBy !== userId)
    : []

  const mySubmissions = allRequests.filter(r => r.requestedBy === userId)

  const canApprove = engineerRole === 'WPO' || engineerRole === 'SYSTEM'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Material Requests</h1>
          <p className="text-gray-500 font-medium text-sm">
            {engineerRole === 'STAFF'  && 'Monitoring pengajuan material Anda'}
            {engineerRole === 'WPO'    && 'Approval Level 1 — Engineer WPO'}
            {engineerRole === 'SYSTEM' && 'Approval Level 2 — Engineer SYSTEM'}
          </p>
        </div>
        <Link
          href="/engineer/material-request/create"
          className="bg-[#2d2d2d] text-white px-6 py-3 rounded-xl hover:bg-black transition-all shadow-xl font-bold text-sm"
        >
          + New Request
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'My Total',      count: mySubmissions.length,                                              color: 'text-gray-800 dark:text-white' },
          { label: 'Pending WPO',   count: mySubmissions.filter(r => r.status === 'WAITING_WPO').length,     color: 'text-orange-500' },
          { label: 'Pending SYSTEM',count: mySubmissions.filter(r => r.status === 'WAITING_SYSTEM').length,  color: 'text-violet-500' },
          { label: 'Pending PM',    count: mySubmissions.filter(r => r.status === 'WAITING_PM').length,      color: 'text-blue-500' },
          { label: 'Disetujui',     count: mySubmissions.filter(r => r.status === 'APPROVED').length,        color: 'text-green-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
            <span className={`text-3xl font-black ${stat.color}`}>{stat.count}</span>
          </div>
        ))}
      </div>

      {/* Pending Approval Section (WPO/SYSTEM only) */}
      {canApprove && (
        <div>
          <h2 className="text-lg font-black text-gray-700 dark:text-gray-300 uppercase tracking-tight mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-orange-400 rounded-full animate-pulse inline-block"></span>
            Menunggu Approval Saya
            {pendingApproval.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-black">
                {pendingApproval.length}
              </span>
            )}
          </h2>

          {pendingApproval.length === 0 ? (
            <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-8 text-center border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-400 font-bold">Tidak ada MR yang menunggu approval Anda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-orange-50 dark:bg-orange-900/10 border-b border-orange-100 dark:border-orange-900/20 text-gray-500 font-black uppercase tracking-widest">
                    <th className="p-4">Doc No</th>
                    <th className="p-4">Proyek</th>
                    <th className="p-4">Dibuat Oleh</th>
                    <th className="p-4">Item</th>
                    <th className="p-4">Tanggal</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApproval.map((req) => (
                    <tr key={req.id} className="border-b dark:border-gray-800 hover:bg-orange-50/30 transition-colors">
                      <td className="p-4 font-black text-gray-800 dark:text-white">{req.docControlNo}</td>
                      <td className="p-4">
                        <p className="font-bold text-gray-700 dark:text-gray-300">{req.projectName}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{req.projectId}</p>
                      </td>
                      <td className="p-4 font-medium text-gray-600 dark:text-gray-400">{req.requester?.name}</td>
                      <td className="p-4 font-bold text-gray-700 dark:text-gray-300">{req.items?.length} item</td>
                      <td className="p-4 text-gray-400">{new Date(req.createdAt).toLocaleDateString('id-ID')}</td>
                      <td className="p-4 w-48">
                        <MRApprovalButtons mrId={req.id} engineerRole={engineerRole} />
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
          Pengajuan Saya
        </h2>
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 text-gray-500 font-black uppercase tracking-widest">
                <th className="p-4 w-8 text-center">No</th>
                <th className="p-4">Doc No</th>
                <th className="p-4">Proyek</th>
                <th className="p-4">WPO</th>
                <th className="p-4">Status</th>
                <th className="p-4">Tanggal</th>
                <th className="p-4 text-center">File</th>
              </tr>
            </thead>
            <tbody>
              {mySubmissions.map((req, index) => (
                <tr key={req.id} className="border-b dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 text-center font-bold text-gray-300">{index + 1}</td>
                  <td className="p-4 font-black text-gray-800 dark:text-gray-200">{req.docControlNo}</td>
                  <td className="p-4">
                    <p className="font-bold text-gray-700 dark:text-gray-300">{req.projectName}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{req.projectId}</p>
                  </td>
                  <td className="p-4 font-medium text-gray-600 dark:text-gray-400">{req.wpo || '-'}</td>
                  <td className="p-4"><StatusBadge status={req.status} /></td>
                  <td className="p-4 text-gray-400">{new Date(req.createdAt).toLocaleDateString('id-ID')}</td>
                  <td className="p-4 text-center">
                    {req.fileUrl ? (
                      <a href={req.fileUrl} target="_blank" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-green-50 transition-all inline-block">📎</a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {mySubmissions.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-gray-400 italic">
                    Belum ada Material Request.{' '}
                    <Link href="/engineer/material-request/create" className="text-blue-500 hover:underline">Buat sekarang</Link>
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

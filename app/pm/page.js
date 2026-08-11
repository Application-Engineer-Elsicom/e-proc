import { getPendingPMRequests, getPendingFRForPM, getPendingWRForPM } from '../actions/pm'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PMApprovalButtons from './PMApprovalButtons'
import FRApprovalButtons from './FRApprovalButtons'
import WRApprovalButtons from './WRApprovalButtons'

export const dynamic = 'force-dynamic'

/**
 * Nama pemberi persetujuan pada satu jenjang.
 * Dokumen hanya sampai ke PM lewat persetujuan atau aturan skip-level, jadi
 * jenjang tanpa approver berarti memang dilewati — bukan menunggu.
 * Jangan pernah jatuh ke isian teks bebas pada form: itu bukan approver.
 */
function approverLabel(approver) {
  return approver?.name || 'Dilewati'
}

export default async function PMDashboard({ searchParams }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'PROJECT_MANAGER') {
    redirect('/login')
  }

  // Next 15: searchParams adalah Promise, harus di-await sebelum dibaca.
  const tab = (await searchParams)?.tab || 'mr'

  // Fetch all pending items in parallel
  const [mrResult, frResult, wrResult] = await Promise.all([
    getPendingPMRequests(),
    getPendingFRForPM(),
    getPendingWRForPM(),
  ])

  const mrRequests = mrResult.success ? mrResult.data : []
  const frReports  = frResult.success  ? frResult.data  : []
  const wrReleases = wrResult.success  ? wrResult.data  : []

  const tabs = [
    { id: 'mr', label: 'Material Request', count: mrRequests.length, color: 'blue' },
    { id: 'fr', label: 'Fault Report',     count: frReports.length,  color: 'red'  },
    { id: 'wr', label: 'Warehouse Release',count: wrReleases.length, color: 'yellow' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">PM Approval</h1>
          <p className="text-gray-500 font-medium">Final approval untuk MR, Fault Report, dan Warehouse Release</p>
        </div>
        <div className="flex gap-3 text-xs font-bold">
          <div className="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800">
            <span className="text-gray-400">Total Pending: </span>
            <span className="text-red-500 text-lg font-black ml-1">
              {mrRequests.length + frReports.length + wrReleases.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => {
          const isActive = tab === t.id
          return (
            <Link
              key={t.id}
              href={`/pm?tab=${t.id}`}
              className={`px-5 py-3 font-black text-sm transition-colors relative ${
                isActive
                  ? 'text-gray-900 dark:text-white border-b-2 border-blue-600'
                  : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}>
                  {t.count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Tab: Material Request */}
      {tab === 'mr' && (
        <div>
          {mrRequests.length === 0 ? (
            <EmptyState label="Material Request" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {mrRequests.map((req) => (
                <div key={req.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-blue-500/5 p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase mb-2 inline-block">WAITING PM</span>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white leading-none mb-1">{req.docControlNo}</h3>
                        <p className="text-sm font-bold text-blue-600 mb-1">{req.projectName}</p>
                        <p className="text-xs text-gray-400">Oleh {req.requester?.name}</p>
                      </div>
                      {req.fileUrl && (
                        <a href={req.fileUrl} target="_blank" className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-blue-50 transition-all">
                          <span className="text-xl">📄</span>
                        </a>
                      )}
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-xs border-b dark:border-gray-800 pb-2">
                        <span className="text-gray-400">WPO Approver:</span>
                        <span className="font-bold text-green-600">{approverLabel(req.wpoApprover)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b dark:border-gray-800 pb-2">
                        <span className="text-gray-400">SYSTEM Approver:</span>
                        <span className="font-bold text-violet-600">{approverLabel(req.systemApprover)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b dark:border-gray-800 pb-2">
                        <span className="text-gray-400">Work Package:</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">{req.workPackage || '—'}</span>
                      </div>
                      <div className="pt-2">
                        <p className="text-[10px] uppercase font-black text-gray-300 mb-2">Items ({req.items?.length})</p>
                        <div className="max-h-28 overflow-y-auto pr-2 space-y-1">
                          {req.items?.map((item) => (
                            <div key={item.id} className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg flex justify-between text-[11px]">
                              <span className="text-gray-600 dark:text-gray-400 line-clamp-1">{item.description}</span>
                              <span className="font-black text-gray-800 dark:text-gray-200 whitespace-nowrap ml-4">{item.qty} {item.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t dark:border-gray-800">
                    <PMApprovalButtons reqId={req.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Fault Report */}
      {tab === 'fr' && (
        <div>
          {frReports.length === 0 ? (
            <EmptyState label="Fault Report" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {frReports.map((fr) => (
                <div key={fr.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-red-500/5 p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase mb-2 inline-block">WAITING PM</span>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-white leading-none mb-1">{fr.docNo}</h3>
                        <p className="text-sm font-bold text-red-600 mb-1">{fr.projectName}</p>
                        <p className="text-xs text-gray-400">Oleh {fr.reporter?.name}</p>
                      </div>
                      <PriorityBadge priority={fr.priority} />
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-xs border-b dark:border-gray-800 pb-2">
                        <span className="text-gray-400">Item:</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">{fr.itemName || '—'}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b dark:border-gray-800 pb-2">
                        <span className="text-gray-400">Issue:</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300 text-right max-w-[60%]">{fr.faultIssue || '—'}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b dark:border-gray-800 pb-2">
                        <span className="text-gray-400">WPO Approver:</span>
                        <span className="font-bold text-green-600">{approverLabel(fr.wpoApprover)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b dark:border-gray-800 pb-2">
                        <span className="text-gray-400">SYSTEM Approver:</span>
                        <span className="font-bold text-violet-600">{approverLabel(fr.systemApprover)}</span>
                      </div>
                      {fr.description && (
                        <div className="pt-1">
                          <p className="text-[10px] uppercase font-black text-gray-300 mb-1">Deskripsi</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-3">{fr.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="pt-4 border-t dark:border-gray-800">
                    <FRApprovalButtons frId={fr.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Warehouse Release */}
      {tab === 'wr' && (
        <div>
          {wrReleases.length === 0 ? (
            <EmptyState label="Warehouse Release" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {wrReleases.map((wr) => (
                <div key={wr.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-yellow-500/5 p-8 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold uppercase mb-2 inline-block">WAITING PM</span>
                        <h3 className="text-2xl font-black text-gray-800 dark:text-yellow-400 leading-none mb-1">{wr.docNo}</h3>
                        <p className="text-sm font-bold text-yellow-600 mb-1">{wr.projectName || wr.projectId}</p>
                        <p className="text-xs text-gray-400">Oleh {wr.requester?.name}</p>
                      </div>
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-xs border-b dark:border-gray-800 pb-2">
                        <span className="text-gray-400">Delivery Target:</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">{wr.deliveryTarget || '—'}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b dark:border-gray-800 pb-2">
                        <span className="text-gray-400">WPO Approver:</span>
                        <span className="font-bold text-green-600">{approverLabel(wr.wpoApprover)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-b dark:border-gray-800 pb-2">
                        <span className="text-gray-400">SYSTEM Approver:</span>
                        <span className="font-bold text-violet-600">{approverLabel(wr.systemApprover)}</span>
                      </div>
                      <div className="pt-2">
                        <p className="text-[10px] uppercase font-black text-gray-300 mb-2">Items ({wr.items?.length})</p>
                        <div className="max-h-28 overflow-y-auto pr-2 space-y-1">
                          {wr.items?.map((item, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg flex justify-between text-[11px]">
                              <span className="text-gray-600 dark:text-gray-400 line-clamp-1">{item.description}</span>
                              <span className="font-black text-gray-800 dark:text-gray-200 whitespace-nowrap ml-4">{item.qty} {item.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t dark:border-gray-800">
                    <WRApprovalButtons wrId={wr.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ label }) {
  return (
    <div className="bg-blue-50 dark:bg-slate-800 p-12 rounded-2xl text-center border-2 border-dashed border-blue-100 dark:border-gray-700">
      <p className="text-blue-400 font-bold italic">Tidak ada {label} yang menunggu approval PM.</p>
    </div>
  )
}

function PriorityBadge({ priority }) {
  const colors = {
    LOW:    'bg-green-100 text-green-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH:   'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${colors[priority] || 'bg-gray-100 text-gray-600'}`}>
      {priority}
    </span>
  )
}

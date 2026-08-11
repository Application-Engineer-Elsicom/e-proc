'use client'

import { useState, useEffect } from 'react'
import { getOrdersRequiringAttention, getProjectSummary } from '../../actions/procurement-dashboard'

export default function DashboardProcurementTab() {
  const [attention, setAttention] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const attentionResult = await getOrdersRequiringAttention()
    const projectResult = await getProjectSummary()

    if (attentionResult.success) {
      setAttention(attentionResult.data)
    }
    if (projectResult.success) {
      setProjects(projectResult.data)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>
  }

  const getHealthColor = (health) => {
    switch (health) {
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-200'
      case 'critical':
        return 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-200'
      case 'late':
        return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Orders Requiring Attention */}
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tighter">
            Orders Requiring Attention
          </h3>

          {/* Counts */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase">Warning</p>
              <p className="text-3xl font-black text-yellow-700 dark:text-yellow-300 mt-1">{attention?.counts.warning || 0}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">Critical</p>
              <p className="text-3xl font-black text-orange-700 dark:text-orange-300 mt-1">{attention?.counts.critical || 0}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Late</p>
              <p className="text-3xl font-black text-red-700 dark:text-red-300 mt-1">{attention?.counts.late || 0}</p>
            </div>
          </div>

          {/* Tables */}
          {attention?.late && attention.late.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-red-700 dark:text-red-300 mb-3 uppercase">Late Orders</h4>
              <div className="overflow-x-auto rounded-lg border border-red-200 dark:border-red-800">
                <table className="w-full text-xs">
                  <thead className="bg-red-50 dark:bg-red-950/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">PO Number</th>
                      <th className="px-3 py-2 text-left font-bold">Proyek</th>
                      <th className="px-3 py-2 text-left font-bold">Pemasok</th>
                      <th className="px-3 py-2 text-right font-bold">Days Late</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-200 dark:divide-red-800">
                    {attention.late.map((po, idx) => (
                      <tr key={idx} className="hover:bg-red-50 dark:hover:bg-red-950/30">
                        <td className="px-3 py-2 font-bold text-blue-600 dark:text-blue-400">{po.poNumber}</td>
                        <td className="px-3 py-2">{po.projectCode}</td>
                        <td className="px-3 py-2">{po.supplierName}</td>
                        <td className="px-3 py-2 text-right font-bold">{Math.abs(po.daysUntilDelivery)} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {attention?.critical && attention.critical.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-orange-700 dark:text-orange-300 mb-3 uppercase">Critical Orders</h4>
              <div className="overflow-x-auto rounded-lg border border-orange-200 dark:border-orange-800">
                <table className="w-full text-xs">
                  <thead className="bg-orange-50 dark:bg-orange-950/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">PO Number</th>
                      <th className="px-3 py-2 text-left font-bold">Proyek</th>
                      <th className="px-3 py-2 text-left font-bold">Delivery Date</th>
                      <th className="px-3 py-2 text-right font-bold">Days Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-200 dark:divide-orange-800">
                    {attention.critical.map((po, idx) => (
                      <tr key={idx} className="hover:bg-orange-50 dark:hover:bg-orange-950/30">
                        <td className="px-3 py-2 font-bold text-blue-600 dark:text-blue-400">{po.poNumber}</td>
                        <td className="px-3 py-2">{po.projectCode}</td>
                        <td className="px-3 py-2 text-xs">{new Date(po.deliveryTime).toLocaleDateString('id-ID')}</td>
                        <td className="px-3 py-2 text-right font-bold">{po.daysUntilDelivery} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Project Summary */}
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tighter">
            Project Summary
          </h3>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Project ID</th>
                  <th className="px-4 py-3 text-right font-bold">Total PO</th>
                  <th className="px-4 py-3 text-right font-bold">Fully Received</th>
                  <th className="px-4 py-3 text-right font-bold">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {projects.map((proj) => {
                  const progress = proj.totalPO > 0 ? (proj.fullReceived / proj.totalPO) * 100 : 0
                  return (
                    <tr key={proj.projectId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{proj.projectCode}</td>
                      <td className="px-4 py-3 text-right font-bold">{proj.totalPO}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded font-bold">
                          {proj.fullReceived}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="font-bold text-xs min-w-[2rem]">{Math.round(progress)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

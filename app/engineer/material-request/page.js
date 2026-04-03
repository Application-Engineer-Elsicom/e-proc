import Link from 'next/link';
import { getMaterialRequests } from '../../actions/material-request';
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export default async function MaterialRequestPage() {
  const session = await getServerSession(authOptions);
  const result = await getMaterialRequests();
  const requests = result.success ? result.data : [];

  // Helper function for status styling
  const getStatusBadge = (status) => {
    const styles = {
      WAITING_WPO: "bg-orange-100 text-orange-700 border-orange-200",
      WAITING_PM: "bg-blue-100 text-blue-700 border-blue-200",
      APPROVED: "bg-green-100 text-green-700 border-green-200",
      PROCUREMENT_PROCESS: "bg-purple-100 text-purple-700 border-purple-200",
      REJECTED: "bg-red-100 text-red-700 border-red-200",
    };
    return (
      <span className={`px-2 py-1 rounded text-[10px] font-bold border ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">Material Requests</h1>
          <p className="text-gray-500 font-medium text-sm">Monitoring and tracking your order lifecycle</p>
        </div>
        <div className="flex gap-4">
          <Link href="/engineer/material-request/create" className="bg-[#2d2d2d] text-white px-8 py-3 rounded-xl hover:bg-black transition-all shadow-xl font-bold text-sm">
            + New Request
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Pending WPO", count: requests.filter(r => r.status === 'WAITING_WPO').length, color: "text-orange-500" },
          { label: "Pending PM", count: requests.filter(r => r.status === 'WAITING_PM').length, color: "text-blue-500" },
          { label: "Fully Approved", count: requests.filter(r => r.status === 'APPROVED').length, color: "text-green-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
            <span className={`text-4xl font-black ${stat.color}`}>{stat.count}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800 text-gray-500 font-black uppercase tracking-widest border-b dark:border-gray-700">
              <th className="p-4 w-12 text-center">No</th>
              <th className="p-4 w-32">Doc No</th>
              <th className="p-4">Project</th>
              <th className="p-4">WPO Assign</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created At</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req, index) => (
              <tr key={req.id} className="border-b dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                <td className="p-4 text-center font-bold text-gray-300">{index + 1}</td>
                <td className="p-4 font-black text-gray-800 dark:text-gray-200">{req.docControlNo}</td>
                <td className="p-4">
                   <p className="font-bold text-gray-700 dark:text-gray-300">{req.projectName}</p>
                   <p className="text-[10px] text-gray-400 uppercase font-bold">{req.projectId}</p>
                </td>
                <td className="p-4 font-medium text-gray-600 dark:text-gray-400">{req.wpo || '-'}</td>
                <td className="p-4">{getStatusBadge(req.status)}</td>
                <td className="p-4 text-gray-400 font-medium">{new Date(req.createdAt).toLocaleDateString()}</td>
                <td className="p-4 text-center">
                   <div className="flex justify-center gap-2">
                     <button className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-blue-50 transition-all text-blue-600">🔍</button>
                     {req.fileUrl && <a href={req.fileUrl} target="_blank" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-green-50 transition-all">📎</a>}
                   </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan="7" className="p-10 text-center text-gray-400 italic">No material requests found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
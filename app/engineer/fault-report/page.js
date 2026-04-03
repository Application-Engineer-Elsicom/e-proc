import Link from 'next/link';
import { getFaultReports } from '../../actions/fault-report';

export const dynamic = 'force-dynamic';

export default async function FaultReportPage() {
  const result = await getFaultReports();
  const reports = result.success ? result.data : [];

  const getPriorityBadge = (p) => {
    const colors = {
      LOW: "bg-green-100 text-green-700",
      MEDIUM: "bg-blue-100 text-blue-700",
      HIGH: "bg-orange-100 text-orange-700",
      URGENT: "bg-red-100 text-red-700",
    };
    return <span className={`px-2 py-0.5 rounded text-[9px] font-black border border-inherit ${colors[p]}`}>{p}</span>;
  };

  const getStatusBadge = (s) => {
    const colors = {
      OPEN: "bg-gray-100 text-gray-700",
      IN_PROGRESS: "bg-yellow-100 text-yellow-700",
      CLOSED: "bg-emerald-100 text-emerald-700",
    };
    return <span className={`px-2 py-0.5 rounded text-[9px] font-black border border-inherit ${colors[s]}`}>{s.replace('_', ' ')}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-red-700 dark:text-red-500 italic uppercase leading-none">Fault Reports</h1>
          <p className="text-gray-500 font-bold text-sm tracking-tight">Issue tracking and technical maintenance requests</p>
        </div>
        <Link href="/engineer/fault-report/create" className="bg-red-700 text-white px-10 py-3 rounded-2xl hover:bg-black transition-all shadow-xl shadow-red-500/20 font-black text-sm uppercase tracking-wider">
          + New Report ⚠️
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Issues", count: reports.filter(r => r.status !== 'CLOSED').length, bg: "bg-red-50 dark:bg-red-900/10", text: "text-red-600" },
          { label: "Closed", count: reports.filter(r => r.status === 'CLOSED').length, bg: "bg-emerald-50 dark:bg-emerald-900/10", text: "text-emerald-600" },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-6 rounded-3xl border border-inherit flex justify-between items-center`}>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">{stat.label}</span>
            <span className={`${stat.text} text-4xl font-black`}>{stat.count}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-2xl shadow-red-500/5">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#2d2d2d] text-white font-black uppercase tracking-widest text-[10px]">
              <th className="p-5 w-12 text-center opacity-50">#</th>
              <th className="p-5">Doc No</th>
              <th className="p-5">Asset / Project</th>
              <th className="p-5">Category</th>
              <th className="p-5 text-center">Priority</th>
              <th className="p-5 text-center">Status</th>
              <th className="p-5">Reported At</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, index) => (
              <tr key={r.id} className="border-b dark:border-gray-800 hover:bg-red-50/30 transition-colors group">
                <td className="p-5 text-center font-bold text-gray-300">{index + 1}</td>
                <td className="p-5 font-black text-gray-800 dark:text-gray-200">{r.docNo}</td>
                <td className="p-5">
                   <p className="font-bold text-gray-700 dark:text-gray-300 uppercase underline decoration-red-200">{r.assetName}</p>
                   <p className="text-[10px] text-gray-400 font-bold italic">{r.projectName}</p>
                </td>
                <td className="p-5 text-gray-400 font-bold">{r.issueCategory}</td>
                <td className="p-5 text-center">{getPriorityBadge(r.priority)}</td>
                <td className="p-5 text-center">{getStatusBadge(r.status)}</td>
                <td className="p-5 text-gray-400 font-medium italic">{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan="7" className="p-20 text-center text-gray-400 italic font-bold">Tidak ada laporan kerusakan. Masih aman! ✅</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
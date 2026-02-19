"use client";
import Link from 'next/link';

export default function FaultReportPage() {
  // Header khusus untuk Fault Report
  const headers = [
    "Report ID", "Project Name", "Asset Name", "Issue Category", 
    "Reported By", "Date Occurred", "Priority", "Status", "Action"
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-red-700 dark:text-red-500">Fault Report System</h1>
          <p className="text-gray-500 text-sm">Pelaporan kendala teknis dan kerusakan material</p>
        </div>
        <Link href="/engineer/fault-report/create" className="bg-red-700 text-white px-6 py-2 rounded-md hover:bg-red-800 transition-all text-sm font-medium shadow-md">
          ⚠️ New Fault Report
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl flex justify-between items-center w-full md:w-72 border border-red-100 dark:border-red-800">
          <span className="text-red-700 dark:text-red-400 font-bold leading-tight text-sm">Urgent<br/>Issues</span>
          <span className="text-4xl font-black text-red-600">3</span>
        </div>
        <div className="bg-gray-100 dark:bg-slate-800 p-5 rounded-2xl flex justify-between items-center w-full md:w-72 border border-gray-200 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 font-bold leading-tight text-sm">In Progress<br/>Repair</span>
          <span className="text-4xl font-black text-gray-700 dark:text-gray-200">7</span>
        </div>
      </div>

      {/* Tabel Excel Style */}
      <div className="overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm">
        <table className="w-full border-collapse bg-white dark:bg-slate-800 text-xs">
          <thead>
            <tr className="bg-[#2d2d2d] text-white uppercase font-bold">
              <th className="border border-gray-600 p-3 w-10 text-center">No</th>
              {headers.map(h => (
                <th key={h} className="border border-gray-600 p-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, i) => (
              <tr key={i} className="hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                <td className="border border-gray-300 dark:border-gray-600 p-2 text-center text-gray-400">{i + 1}</td>
                {headers.map(h => (
                  <td key={h} className="border border-gray-300 dark:border-gray-600 p-2 h-10"></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
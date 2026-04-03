import Link from 'next/link';
import { getWarehouseReleases } from '../../actions/warehouse-release';

export const dynamic = 'force-dynamic';

export default async function WarehouseReleasePage() {
  const result = await getWarehouseReleases();
  const releases = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black text-[#FFC107] dark:text-[#FFC107] italic uppercase leading-none">Warehouse Release</h1>
          <p className="text-gray-500 font-bold text-sm tracking-tight uppercase">Monitoring movement of materials from storage</p>
        </div>
        <div className="flex gap-4">
           <Link href="/engineer/warehouse-release/create" className="bg-[#FFC107] text-black px-10 py-3 rounded-2xl hover:bg-black hover:text-white transition-all shadow-xl shadow-yellow-500/20 font-black text-sm uppercase tracking-wider">
             + Create WR 📦
           </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-8 rounded-[40px] border border-yellow-100 dark:border-yellow-800 flex justify-between items-end">
           <div>
              <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest block mb-4">Total Releases</span>
              <span className="text-5xl font-black text-gray-800 dark:text-yellow-500">{releases.length}</span>
           </div>
           <span className="text-3xl grayscale opacity-20">📦</span>
        </div>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-2xl shadow-yellow-500/5">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#2d2d2d] text-white font-black uppercase tracking-widest text-[10px]">
              <th className="p-5 w-12 text-center opacity-50">NO</th>
              <th className="p-5">WR Number</th>
              <th className="p-5">Project ID</th>
              <th className="p-5">Release Date</th>
              <th className="p-5">Items</th>
              <th className="p-5">Requester</th>
              <th className="p-5 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {releases.map((wr, idx) => (
              <tr key={wr.id} className="border-b dark:border-gray-800 hover:bg-yellow-50/50 transition-colors group">
                <td className="p-5 text-center font-bold text-gray-300">{idx + 1}</td>
                <td className="p-5 font-black text-gray-800 dark:text-[#FFC107]">{wr.docNo}</td>
                <td className="p-5 font-bold text-gray-500 dark:text-gray-400">{wr.projectId}</td>
                <td className="p-5 text-gray-400 font-medium italic">{new Date(wr.releaseDate).toLocaleDateString()}</td>
                <td className="p-5">
                   <div className="flex flex-wrap gap-1 max-w-xs">
                      {wr.items.map((item, i) => (
                        <span key={i} className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[9px] font-bold text-gray-500">{item.description} ({item.qty})</span>
                      ))}
                   </div>
                </td>
                <td className="p-5">
                   <p className="font-bold text-gray-700 dark:text-gray-300">{wr.requester?.name}</p>
                </td>
                <td className="p-5 text-center">
                   <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-[#FFC107] hover:border-transparent transition-all font-bold text-[10px] uppercase">Details</button>
                </td>
              </tr>
            ))}
            {releases.length === 0 && (
              <tr>
                <td colSpan="7" className="p-20 text-center text-gray-400 italic font-bold">No items released yet. 🏗️</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
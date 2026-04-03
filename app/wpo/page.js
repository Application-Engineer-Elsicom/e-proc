import { getPendingWPORequests } from '../actions/wpo';
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from 'next/link';

// Client Component untuk tombol agar interaktif
import ApprovalButtons from './ApprovalButtons';

export const dynamic = 'force-dynamic';

export default async function WPODashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "WPO") {
    redirect("/login");
  }

  const result = await getPendingWPORequests();
  const requests = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black dark:text-white">WPO Pending Approvals</h1>
          <p className="text-gray-500">Daftar permintaan material yang menunggu persetujuan Anda</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-gray-50 dark:bg-slate-800 p-10 rounded-2xl text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
           <p className="text-gray-400 font-bold italic">Tidak ada permintaan yang menunggu persetujuan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {requests.map((req) => (
            <div key={req.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 hover:shadow-md transition-all">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-black text-red-600">{req.docControlNo}</h3>
                  <p className="text-sm font-bold opacity-70">{req.projectName} ({req.projectId})</p>
                </div>
                <div className="text-right text-xs">
                   <p className="text-gray-400 italic mb-1">Requested at {new Date(req.createdAt).toLocaleDateString()}</p>
                   {req.fileUrl && (
                     <a href={req.fileUrl} target="_blank" className="text-blue-500 hover:underline font-bold">
                        📄 View Attachment
                     </a>
                   )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
                <p className="text-xs uppercase font-black text-gray-400 mb-2">Item Summary</p>
                <div className="space-y-1">
                  {req.items.map((item, idx) => (
                    <div key={item.id} className="text-xs flex justify-between border-b dark:border-gray-700 pb-1 last:border-0">
                       <span>{idx + 1}. {item.description}</span>
                       <span className="font-bold">{item.qty} {item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                 <div className="text-xs text-gray-500">
                    <span className="block font-bold">Work Package: {req.workPackage || '-'}</span>
                    <span className="block">Notes: {req.keterangan || '-'}</span>
                 </div>
                 <ApprovalButtons reqId={req.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

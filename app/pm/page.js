import { getPendingPMRequests } from '../actions/pm';
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import PMApprovalButtons from './PMApprovalButtons';

export const dynamic = 'force-dynamic';

export default async function PMDashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== "PROJECT_MANAGER") {
    redirect("/login");
  }

  const result = await getPendingPMRequests();
  const requests = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black dark:text-white uppercase tracking-tighter">PM Approval</h1>
          <p className="text-gray-500 font-medium">Finalizing Material Requests for Project Procurement</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-blue-50 dark:bg-slate-800 p-12 rounded-2xl text-center border-2 border-dashed border-blue-100 dark:border-gray-700">
           <p className="text-blue-400 font-bold italic">No requests pending for final PM approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {requests.map((req) => (
            <div key={req.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-blue-500/5 p-8 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase mb-2 inline-block">WAITING PM</span>
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white leading-none mb-1">{req.docControlNo}</h3>
                    <p className="text-sm font-bold text-blue-600 mb-1">{req.projectName}</p>
                    <p className="text-xs text-gray-400">Requested by {req.requester?.name}</p>
                  </div>
                  {req.fileUrl && (
                    <a href={req.fileUrl} target="_blank" className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-blue-50 transition-all group">
                       <span className="text-xl group-hover:scale-110 inline-block transition-transform">📄</span>
                    </a>
                  )}
                </div>

                <div className="space-y-3 mb-8">
                   <div className="flex justify-between text-xs border-b dark:border-gray-800 pb-2">
                      <span className="text-gray-400">WPO Approver:</span>
                      <span className="font-bold text-green-600">{req.wpoApprover?.name || req.wpo}</span>
                   </div>
                   <div className="flex justify-between text-xs border-b dark:border-gray-800 pb-2">
                      <span className="text-gray-400">Work Package:</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">{req.workPackage || '-'}</span>
                   </div>
                   <div className="pt-2">
                     <p className="text-[10px] uppercase font-black text-gray-300 mb-2">Detailed Items</p>
                     <div className="max-h-32 overflow-y-auto pr-2 space-y-2">
                        {req.items.map((item) => (
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
  );
}

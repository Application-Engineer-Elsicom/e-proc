"use client";
import { useState, useTransition, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createWarehouseRelease, getApprovedMRs } from '../../../actions/warehouse-release';

export default function CreateWarehouseRelease() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const [mrs, setMrs] = useState([]);
  const [isLoadingMRs, setIsLoadingMRs] = useState(true);

  const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      materialRequestId: '',
      projectId: '',
      projectName: '',
      deliveryTarget: '',
      deliveryLocation: '',
      dateReleased: '',
      docNo: '',
      items: Array(10).fill({ reqNo: '', requestor: '', approval: '', description: '', elsPartNum: '', manufacturer: '', requestQty: '', remainingQty: '', qty: '', unit: 'Pcs' })
    }
  });

  const { fields, replace, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  useEffect(() => {
    async function loadMRs() {
      setIsLoadingMRs(true);
      const res = await getApprovedMRs();
      if (res.success) setMrs(res.data);
      setIsLoadingMRs(false);
    }
    loadMRs();
  }, []);

  const selectedMRId = watch("materialRequestId");
  useEffect(() => {
    if (selectedMRId) {
      const mr = mrs.find(m => m.id === selectedMRId);
      if (mr) {
        setValue("projectId", mr.projectId);
        setValue("projectName", mr.projectName);
        const mrItems = mr.items.map(item => ({
          reqNo: mr.docControlNo,
          requestor: mr.requester?.name || 'Unknown',
          approval: 'PM Approved',
          description: item.description,
          elsPartNum: item.elsicomPartNum,
          manufacturer: item.manufacturer,
          requestQty: item.qty,
          remainingQty: item.qty,
          qty: '',
          unit: item.unit
        }));
        replace(mrItems);
      }
    }
  }, [selectedMRId, mrs, setValue, replace]);

  const onSubmit = (data) => {
    setErrorMessage("");
    const filteredItems = data.items.filter(item => item.description.trim() !== "" || item.qty !== "");
    if (filteredItems.length === 0) {
      setErrorMessage("Mohon isi setidaknya satu item untuk dirilis.");
      return;
    }

    startTransition(async () => {
      const result = await createWarehouseRelease({
        ...data,
        items: filteredItems
      });
      if (result.success) {
        router.push('/engineer/warehouse-release');
      } else {
        setErrorMessage("Gagal membuat Warehouse Release: " + result.error);
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-xl shadow-red-500/5 border border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <div>
          <h1 className="text-5xl font-black text-red-600 uppercase tracking-tighter italic">Create</h1>
          <p className="text-2xl font-bold text-gray-400 uppercase tracking-tight">Warehouse Release Sheet</p>
        </div>
        <div className="relative w-48 h-12 grayscale opacity-30 dark:invert">
           <Image src="/logo-elsicom.png" alt="Logo" fill className="object-contain" priority />
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 font-bold rounded-r-xl">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* SMART PULL SELECTOR */}
        <div className="bg-red-600 p-6 rounded-[32px] shadow-2xl shadow-red-600/10 text-white flex flex-col md:flex-row gap-6 items-center">
           <div className="flex-1 w-full">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2 block ml-4">Source Material Request (Approved)</label>
              <select {...register("materialRequestId")} className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:text-red-600 transition-all">
                 <option value="" className="text-gray-400">Pilih Nomor MR...</option>
                 {mrs.map(mr => (
                    <option key={mr.id} value={mr.id} className="text-black">{mr.docControlNo} - {mr.projectName}</option>
                 ))}
              </select>
           </div>
           <div className="text-right">
              <p className="text-[10px] font-black uppercase opacity-60">Project Reference</p>
              <p className="text-lg font-black uppercase tracking-tighter">{watch("projectName") || "-"}</p>
           </div>
        </div>

        {/* DELIVERY INFO GRID */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Delivery Target</label>
              <input {...register("deliveryTarget")} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-red-400 transition-all dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Delivery Location</label>
              <input {...register("deliveryLocation")} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-red-400 transition-all dark:text-white" />
            </div>
          </div>
        </div>

        {/* TABLE SECTION - OPTIMIZED WITH STICKY COLUMNS */}
        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] relative">
            <table className="w-full text-left border-collapse table-fixed min-w-[1700px]">
              <thead className="bg-[#2d2d2d] dark:bg-slate-800 text-white sticky top-0 z-30">
                <tr className="text-[10px] font-black uppercase text-center tracking-widest">
                  <th className="p-4 w-16 sticky left-0 bg-[#2d2d2d] dark:bg-slate-800 z-40 border-r border-[#3d3d3d]">#</th>
                  <th className="p-4 w-40 sticky left-16 bg-[#2d2d2d] dark:bg-slate-800 z-40 border-r border-[#3d3d3d]">Req No.</th>
                  <th className="p-4 w-40 text-left px-4">Requestor</th>
                  <th className="p-4 w-40">Approval</th>
                  <th className="p-4 w-80 text-left px-4">Item Description</th>
                  <th className="p-4 w-40">ELS Part Number</th>
                  <th className="p-4 w-40">Manufacturer</th>
                  <th className="p-4 w-32">Req Qty</th>
                  <th className="p-4 w-28 text-center">Remaining</th>
                  <th className="p-4 w-32 bg-red-600">Release Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {fields.map((field, index) => (
                  <tr key={field.id} className="group hover:bg-red-50/30 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 text-center sticky left-0 bg-white dark:bg-slate-900 z-20 border-r border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center gap-2">
                       <span className="text-[11px] font-bold text-gray-300 dark:text-gray-600">{index + 1}</span>
                       <button 
                         type="button" 
                         onClick={() => remove(index)}
                         className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all p-1"
                         title="Remove Row"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                       </button>
                    </td>
                    <td className="p-0 sticky left-16 bg-white dark:bg-slate-900 z-20 border-r border-gray-100 dark:border-gray-800 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                       <input {...register(`items.${index}.reqNo`)} className="w-full p-4 bg-transparent outline-none text-[11px] text-center dark:text-gray-400 focus:bg-red-50/50 dark:focus:bg-red-500/5" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                       <input {...register(`items.${index}.requestor`)} className="w-full p-4 bg-transparent outline-none text-[11px] dark:text-gray-400 focus:bg-red-50/50 dark:focus:bg-red-500/5" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                       <input {...register(`items.${index}.approval`)} className="w-full p-4 bg-transparent outline-none text-[11px] text-center dark:text-gray-400 focus:bg-red-50/50 dark:focus:bg-red-500/5" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                       <input {...register(`items.${index}.description`)} className="w-full p-4 bg-transparent outline-none text-[12px] font-bold dark:text-white focus:bg-red-50/50 dark:focus:bg-red-500/5" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                       <input {...register(`items.${index}.elsPartNum`)} className="w-full p-4 bg-transparent outline-none text-[11px] text-center dark:text-gray-400 uppercase font-bold focus:bg-red-50/50 dark:focus:bg-red-500/5" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                       <input {...register(`items.${index}.manufacturer`)} className="w-full p-4 bg-transparent outline-none text-[11px] text-center dark:text-gray-400 focus:bg-red-50/50 dark:focus:bg-red-500/5" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                       <input type="number" {...register(`items.${index}.requestQty`)} className="w-full p-4 bg-transparent outline-none text-[12px] text-center font-bold text-gray-400 focus:bg-red-50/50 dark:focus:bg-red-500/5" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800 text-center text-[12px] font-bold text-orange-500 bg-orange-50/10">
                       {watch(`items.${index}.remainingQty`)}
                    </td>
                    <td className="p-0 bg-red-600/5">
                       <input type="number" {...register(`items.${index}.qty`)} className="w-full p-4 bg-transparent outline-none text-[14px] text-center font-black dark:text-white focus:bg-red-600 focus:text-white transition-all" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* ADD LINE BUTTON */}
          <button 
             type="button" 
             onClick={() => append({ reqNo: '', requestor: '', approval: '', description: '', elsPartNum: '', manufacturer: '', requestQty: '', remainingQty: '', qty: '', unit: 'Pcs' })}
             className="w-full py-4 bg-gray-50 dark:bg-slate-800 text-[11px] font-black uppercase text-gray-400 hover:bg-red-600 hover:text-white transition-all border-t dark:border-gray-800 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
            ADD NEW LINE ITEM
          </button>
        </div>

        {/* BOTTOM ACTION */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4 border-t dark:border-gray-800">
           <div className="flex gap-4">
              <div className="bg-white dark:bg-slate-900 px-8 py-4 rounded-3xl border border-gray-100 dark:border-gray-800 text-center shadow-lg">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Doc. Control No</p>
                 <input 
                   {...register("docNo")} 
                   className="w-48 bg-gray-50 dark:bg-slate-800 border-none p-2 rounded-xl text-center text-xs font-black outline-none focus:ring-2 focus:ring-red-400 dark:text-white" 
                   placeholder="INPUT DOC NO" 
                 />
              </div>
              <div className="bg-white dark:bg-slate-900 px-8 py-4 rounded-3xl border border-gray-100 dark:border-gray-800 text-center shadow-lg">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Release Date</p>
                 <input type="date" {...register("dateReleased")} className="bg-transparent border-none p-0 text-xs font-bold outline-none dark:text-white" />
              </div>
           </div>
           <button type="submit" disabled={isPending} className="bg-red-600 text-white px-20 py-5 rounded-[24px] font-black hover:bg-black shadow-2xl shadow-red-600/20 transition-all uppercase tracking-widest text-sm active:scale-95">
              {isPending ? 'Processing...' : 'Create Release Order'}
           </button>
        </div>
      </form>
    </div>
  );
}

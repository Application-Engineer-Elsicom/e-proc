"use client";
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createFaultReport } from '../../../actions/fault-report';

export default function CreateFaultReport() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      projectId: '',
      projectName: '',
      itemName: '',
      manufacturer: '',
      targetRepair: '',
      faultIssue: '',
      description: ''
    }
  });

  const onSubmit = (data) => {
    setErrorMessage("");
    startTransition(async () => {
      const result = await createFaultReport(data);
      if (result.success) {
        router.push('/engineer/fault-report');
      } else {
        setErrorMessage("Gagal membuat laporan: " + result.error);
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[32px] shadow-xl shadow-green-500/5 border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-6xl font-black text-green-600 uppercase tracking-tighter leading-none mb-1">FR No. 001/2413</h1>
          <p className="text-3xl font-bold text-gray-400 uppercase tracking-tight">Fault Report Sheet</p>
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
        {/* INPUT GRID */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] shadow-2xl shadow-black/5 border border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Project ID</label>
              <input {...register("projectId", { required: true })} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-green-400 transition-all dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Project Name</label>
              <input {...register("projectName")} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-green-400 transition-all dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Item / Asset Name</label>
              <input {...register("itemName")} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-green-400 transition-all dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Manufacturer</label>
              <input {...register("manufacturer")} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-green-400 transition-all dark:text-white" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Repair Date</label>
              <input type="date" {...register("targetRepair")} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-green-400 transition-all dark:text-white" />
            </div>
            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Specific Fault Issue</label>
              <input {...register("faultIssue")} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-green-400 transition-all dark:text-white" placeholder="Contoh: Overheating pada modul PSU" />
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-800">
           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3 block">Detailed Chronological Description</label>
           <textarea 
               {...register("description")} 
               rows={12} 
               className="w-full p-8 bg-gray-50 dark:bg-slate-800 border-none rounded-[32px] text-sm font-medium outline-none ring-2 ring-transparent focus:ring-green-400 transition-all dark:text-white resize-none"
               placeholder="Jelaskan secara detail kronologi dan dampak kerusakan..."
            />
        </div>

        {/* ACTION */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4">
           <button type="button" className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-10 py-5 rounded-[24px] font-black hover:bg-black hover:text-white shadow-xl transition-all uppercase tracking-widest text-xs flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Document Attachments
           </button>
           <button type="submit" disabled={isPending} className="bg-green-700 text-white px-24 py-5 rounded-[24px] font-black hover:bg-black shadow-2xl shadow-green-600/20 transition-all uppercase tracking-widest text-sm active:scale-95 disabled:bg-gray-400">
              {isPending ? 'Submitting...' : 'Submit Final Report'}
           </button>
        </div>
      </form>
    </div>
  );
}

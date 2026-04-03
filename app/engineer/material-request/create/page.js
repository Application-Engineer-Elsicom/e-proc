"use client";
import { useState, useTransition, useRef } from 'react';
import Image from 'next/image';
import { useForm, useFieldArray } from 'react-hook-form';
import { createMaterialRequest } from '../../../actions/material-request';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export default function CreateMR() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      projectId: '',
      projectName: '',
      assignSys: '',
      assignPM: '',
      wpo: '',
      workPackage: '',
      keterangan: '',
      dateReleased: '',
      items: Array(15).fill({ description: '', elsicomPartNum: '', manufacturePartNum: '', type: '', manufacturer: '', qty: '', unit: 'Pcs', targetDate: '', remarks: '' })
    }
  });

  const { fields, replace, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      const mappedItems = data.map(row => ({
        description: row['Description & Specification'] || row.description || '',
        elsicomPartNum: row['Elsicom Part Number'] || row.elsicomPartNum || '',
        manufacturePartNum: row['Manufacturer Part No'] || row.manufacturePartNum || '',
        type: row.Type || row.type || '',
        manufacturer: row.Manufacturer || row.manufacturer || '',
        qty: parseInt(row.Qty || row.qty, 10) || '',
        unit: row.Unit || row.unit || 'Pcs',
        targetDate: row['Target Date'] || row.targetDate || '',
        remarks: row.Remarks || row.remarks || ''
      }));
      if (mappedItems.length > 0) replace(mappedItems);
    };
    reader.readAsBinaryString(file);
  };

  const onSubmit = (data) => {
    setErrorMessage("");
    const filteredItems = data.items.filter(item => item.description.trim() !== "" || item.qty !== "");
    if (filteredItems.length === 0) {
      setErrorMessage("Mohon isi setidaknya satu item material.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("projectId", data.projectId);
      formData.set("projectName", data.projectName);
      formData.set("assignSys", data.assignSys);
      formData.set("assignPM", data.assignPM);
      formData.set("workPackage", data.workPackage);
      formData.set("wpo", data.wpo);
      formData.set("keterangan", data.keterangan);
      formData.set("dateReleased", data.dateReleased);
      formData.set("items", JSON.stringify(filteredItems));

      if (selectedFile) formData.append("file", selectedFile);

      const result = await createMaterialRequest(formData);
      if (result.success) {
        router.push('/engineer/material-request');
      } else {
        setErrorMessage("Gagal membuat request: " + result.error);
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-xl shadow-yellow-500/5 border border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <div>
          <h1 className="text-5xl font-black text-[#FFC107] uppercase tracking-tighter italic">Create</h1>
          <p className="text-2xl font-bold text-gray-400 uppercase tracking-tight">Material Request</p>
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
        {/* TOP INPUT GRID */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] shadow-2xl shadow-black/5 border border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Project ID</label>
              <select {...register("projectId", { required: true })} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-yellow-400 transition-all dark:text-white">
                <option value="">Select ID</option>
                <option value="PRJ-2413">PRJ-2413</option>
                <option value="PRJ-2414">PRJ-2414</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Project Name</label>
              <input {...register("projectName", { required: true })} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-yellow-400 transition-all dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign Sys</label>
              <select {...register("assignSys")} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-yellow-400 transition-all dark:text-white">
                <option value="">Select Sys</option>
                <option value="System A">System A</option>
                <option value="System B">System B</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign PM</label>
              <select {...register("assignPM")} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-yellow-400 transition-all dark:text-white">
                <option value="">Select PM</option>
                <option value="Agus PM">Agus PM</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WP (Work Package)</label>
              <input {...register("workPackage")} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-yellow-400 transition-all dark:text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WPO</label>
              <input {...register("wpo")} className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-yellow-400 transition-all dark:text-white" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Keterangan / Remarks</label>
              <div className="flex gap-4">
                <input {...register("keterangan")} className="flex-1 p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-yellow-400 transition-all dark:text-white" />
                <label className="cursor-pointer bg-yellow-400 text-black px-6 py-4 rounded-2xl font-black text-xs hover:bg-black hover:text-white transition-all shadow-lg shadow-yellow-500/20 uppercase flex items-center gap-2">
                  <span>Upload</span>
                  <input type="file" onChange={handleExcelUpload} className="hidden" accept=".xlsx, .xls" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE SECTION - OPTIMIZED FOR EASY INPUT */}
        <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] relative">
            <table className="w-full text-left border-collapse table-fixed min-w-[1600px]">
              <thead className="bg-[#2d2d2d] dark:bg-slate-800 text-white sticky top-0 z-30">
                <tr className="text-[10px] font-black uppercase text-center tracking-widest">
                  <th className="p-4 w-16 sticky left-0 bg-[#2d2d2d] dark:bg-slate-800 z-40 border-r border-[#3d3d3d]">#</th>
                  <th className="p-4 w-80 text-left px-6 sticky left-16 bg-[#2d2d2d] dark:bg-slate-800 z-40 border-r border-[#3d3d3d]">Description & Specification</th>
                  <th className="p-4 w-44">Elsicom Part No</th>
                  <th className="p-4 w-44">Manu Part No</th>
                  <th className="p-4 w-40">Type</th>
                  <th className="p-4 w-40">Manufacturer</th>
                  <th className="p-4 w-24">Qty</th>
                  <th className="p-4 w-24">Unit</th>
                  <th className="p-4 w-40">Target Date</th>
                  <th className="p-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {fields.map((field, index) => (
                  <tr key={field.id} className="group hover:bg-yellow-50/30 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 text-center sticky left-0 bg-white dark:bg-slate-900 z-20 border-r border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center gap-2">
                      <span className="text-[11px] font-black text-gray-300 dark:text-gray-600">{index + 1}</span>
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
                      <input {...register(`items.${index}.description`)} className="w-full p-4 bg-transparent outline-none text-[12px] font-bold dark:text-white focus:bg-yellow-50/50 dark:focus:bg-yellow-400/5" placeholder="Enter description..." />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                      <input {...register(`items.${index}.elsicomPartNum`)} className="w-full p-4 bg-transparent outline-none text-[11px] text-center uppercase dark:text-gray-400 focus:bg-yellow-50/50 dark:focus:bg-yellow-400/5 placeholder:opacity-20" placeholder="ELS-XXX" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                      <input {...register(`items.${index}.manufacturePartNum`)} className="w-full p-4 bg-transparent outline-none text-[11px] text-center uppercase dark:text-gray-400 focus:bg-yellow-50/50 dark:focus:bg-yellow-400/5 placeholder:opacity-20" placeholder="MPN-XXX" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                      <input {...register(`items.${index}.type`)} className="w-full p-4 bg-transparent outline-none text-[11px] text-center dark:text-gray-400 focus:bg-yellow-50/50 dark:focus:bg-yellow-400/5" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                      <input {...register(`items.${index}.manufacturer`)} className="w-full p-4 bg-transparent outline-none text-[11px] text-center dark:text-gray-400 focus:bg-yellow-50/50 dark:focus:bg-yellow-400/5" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                      <input type="number" {...register(`items.${index}.qty`)} className="w-full p-4 bg-transparent outline-none text-[12px] text-center font-black dark:text-white focus:bg-yellow-400 focus:text-black transition-all" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                      <input {...register(`items.${index}.unit`)} className="w-full p-4 bg-transparent outline-none text-[12px] text-center font-bold dark:text-gray-500 focus:bg-yellow-50/50 dark:focus:bg-yellow-400/5" />
                    </td>
                    <td className="p-0 border-r border-gray-50 dark:border-gray-800">
                      <input type="date" {...register(`items.${index}.targetDate`)} className="w-full p-4 bg-transparent outline-none text-[11px] text-center dark:text-gray-500 focus:bg-yellow-50/50 dark:focus:bg-yellow-400/5" />
                    </td>
                    <td className="p-0">
                      <input {...register(`items.${index}.remarks`)} className="w-full p-4 bg-transparent outline-none text-[11px] dark:text-gray-400 focus:bg-yellow-50/50 dark:focus:bg-yellow-400/5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* ADD LINE BUTTON */}
          <button
            type="button"
            onClick={() => append({ description: '', elsicomPartNum: '', manufacturePartNum: '', type: '', manufacturer: '', qty: '', unit: 'Pcs', targetDate: '', remarks: '' })}
            className="w-full py-4 bg-gray-50 dark:bg-slate-800/50 text-[11px] font-black uppercase text-gray-400 hover:bg-yellow-400 hover:text-black transition-all border-t dark:border-gray-800 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
            ADD NEW LINE ITEM
          </button>
        </div>

        {/* BOTTOM ACTION */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4">
          <div className="flex gap-4">
            <div className="bg-white dark:bg-slate-900 px-8 py-4 rounded-3xl border border-gray-100 dark:border-gray-800 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Doc. Control No</p>
              <input
                {...register("docNo")}
                className="w-48 bg-gray-50 dark:bg-slate-800 border-none p-2 rounded-xl text-center text-xs font-black outline-none focus:ring-2 focus:ring-red-400 dark:text-white"
                placeholder="INPUT DOC NO"
              />
            </div>
            <div className="bg-white dark:bg-slate-900 px-8 py-4 rounded-3xl border border-gray-100 dark:border-gray-800 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date Released</p>
              <input type="date" {...register("dateReleased")} className="bg-transparent border-none p-0 text-xs font-bold outline-none dark:text-white" />
            </div>
          </div>
          <button type="submit" disabled={isPending} className="bg-[#2d2d2d] dark:bg-yellow-400 text-white dark:text-black px-20 py-5 rounded-[24px] font-black hover:bg-black dark:hover:bg-white shadow-2xl transition-all uppercase tracking-widest text-sm active:scale-95 disabled:bg-gray-400">
            {isPending ? 'Sending...' : 'Confirm & Send Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
"use client";
import { useState, useTransition } from 'react';
import { approveMaterialRequestPM, rejectMaterialRequestPM } from '../actions/pm';

export default function PMApprovalButtons({ reqId }) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  const handleApprove = () => {
    if (confirm("Setujui permintaan material ini untuk proses pengadaan?")) {
      startTransition(async () => {
        const result = await approveMaterialRequestPM(reqId);
        if (!result.success) setErrorMessage(result.error);
      });
    }
  };

  const handleReject = () => {
    const reason = prompt("Alasan penolakan PM:");
    if (reason !== null) {
      startTransition(async () => {
        const result = await rejectMaterialRequestPM(reqId, reason);
        if (!result.success) setErrorMessage(result.error);
      });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {errorMessage && (
        <span className="text-red-500 text-[10px] font-bold mb-1">{errorMessage}</span>
      )}
      <div className="flex gap-3">
        <button 
          onClick={handleReject} 
          disabled={isPending}
          className="flex-1 bg-white dark:bg-slate-900 text-gray-500 border border-gray-100 dark:border-gray-800 py-3 rounded-2xl font-bold hover:bg-red-50 hover:text-red-600 transition-all text-xs disabled:opacity-50 shadow-sm"
        >
          {isPending ? '...' : 'REJECT'}
        </button>
        <button 
          onClick={handleApprove} 
          disabled={isPending}
          className="flex-[2] bg-blue-600 text-white py-3 rounded-2xl font-black hover:bg-blue-700 transition-all text-xs shadow-lg shadow-blue-600/20 disabled:opacity-50"
        >
          {isPending ? 'PROCESSING...' : 'FINAL APPROVE'}
        </button>
      </div>
    </div>
  );
}

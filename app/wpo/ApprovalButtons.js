"use client";
import { useState, useTransition } from 'react';
import { approveMaterialRequest, rejectMaterialRequest } from '../actions/wpo';

export default function ApprovalButtons({ reqId }) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  const handleApprove = () => {
    if (confirm("Apakah Anda yakin ingin menyetujui permintaan ini?")) {
      startTransition(async () => {
        const result = await approveMaterialRequest(reqId);
        if (!result.success) {
          setErrorMessage(result.error);
        }
      });
    }
  };

  const handleReject = () => {
    const reason = prompt("Masukkan alasan penolakan:");
    if (reason !== null) {
      startTransition(async () => {
        const result = await rejectMaterialRequest(reqId, reason);
        if (!result.success) {
          setErrorMessage(result.error);
        }
      });
    }
  };

  return (
    <div className="flex gap-2">
      {errorMessage && (
        <span className="text-red-500 text-xs font-bold mr-2">{errorMessage}</span>
      )}
      <button 
        onClick={handleReject} 
        disabled={isPending}
        className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition-all text-xs disabled:opacity-50"
      >
        {isPending ? '...' : 'REJECT'}
      </button>
      <button 
        onClick={handleApprove} 
        disabled={isPending}
        className="bg-green-600 text-white px-6 py-2 rounded-lg font-black hover:bg-green-700 transition-all text-xs disabled:opacity-50"
      >
        {isPending ? 'APPROVING...' : 'APPROVE REQUEST'}
      </button>
    </div>
  );
}

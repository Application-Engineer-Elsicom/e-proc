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
        <span className="mb-1 text-xs text-destructive">{errorMessage}</span>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleReject}
          disabled={isPending}
          className="flex-1 rounded-md border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          {isPending ? '...' : 'Tolak'}
        </button>
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="flex-[2] rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Memproses...' : 'Setujui Final'}
        </button>
      </div>
    </div>
  );
}

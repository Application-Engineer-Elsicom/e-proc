import { cn } from "@/lib/utils";

/**
 * Judul halaman yang seragam: judul, keterangan singkat, dan slot aksi di kanan.
 * Dipakai di semua halaman supaya jarak dan ukuran judul tidak berbeda-beda
 * antar modul seperti sebelumnya.
 */
export default function PageHeader({ title, description, actions, className }) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

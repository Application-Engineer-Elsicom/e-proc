import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Gabungkan className dengan aman.
 * twMerge membuat kelas dari pemanggil menang atas kelas bawaan komponen
 * (mis. `className="bg-red-600"` mengalahkan `bg-primary` di dalam Button),
 * tanpa perlu menebak urutan penulisan di CSS.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

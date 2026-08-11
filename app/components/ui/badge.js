import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        // Nada status dokumen — dipetakan dari kode status lewat statusTone()
        // di app/lib/status-style.js, jangan dipilih manual per halaman.
        neutral: "border-transparent bg-muted text-muted-foreground",
        info: "border-transparent bg-blue-100 text-blue-700",
        progress: "border-transparent bg-amber-100 text-amber-700",
        success: "border-transparent bg-emerald-100 text-emerald-700",
        danger: "border-transparent bg-red-100 text-red-700",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

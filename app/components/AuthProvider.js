"use client";
import { SessionProvider } from "next-auth/react";

// next-auth tidak otomatis mengikuti "basePath" di next.config.mjs — tanpa
// ini, fetch session/login dari browser tetap ke /api/auth/... (bukan
// /e-proc/api/auth/...) walau seluruh app sudah di-subpath-kan.
const basePath = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/api/auth`;

export default function AuthProvider({ children }) {
  return <SessionProvider basePath={basePath}>{children}</SessionProvider>;
}
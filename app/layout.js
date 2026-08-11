import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from "./components/AuthProvider"; // Sesuaikan path-nya
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "E-Proc — Sistem E-Procurement Elsicom",
    template: "%s — E-Proc",
  },
  description:
    "Sistem pengadaan terpadu Elsicom: Bill of Material, Material Request, Fault Report, Warehouse Release, dan Purchase Order.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

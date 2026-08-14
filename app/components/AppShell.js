"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  AlertTriangle,
  CheckSquare,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackageCheck,
  Receipt,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Ikon disimpan di sini dan dipilih lewat nama (string), bukan dioper sebagai
 * komponen dari layout. Layout adalah server component; mengoper fungsi
 * menembus batas server→klien membuat React gagal serialisasi:
 * "Functions cannot be passed directly to Client Components".
 */
const ICONS = {
  dashboard: LayoutDashboard,
  document: FileText,
  package: Package,
  fault: AlertTriangle,
  truck: Truck,
  approval: CheckSquare,
  plan: ClipboardList,
  receipt: Receipt,
  warehouse: Warehouse,
  goodsReceipt: PackageCheck,
};
import { Button } from "./ui/button";
import NotificationBell from "./NotificationBell";
import { Avatar, AvatarFallback, initials } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

/**
 * Kerangka satu-satunya untuk seluruh modul (Marketing, Engineer, PM,
 * Procurement, Warehouse). Sebelumnya tiap modul punya layout sendiri dengan
 * gaya berbeda — header abu-abu di satu tempat, sidebar gelap di tempat lain.
 *
 * Struktur mengikuti E-Proc_UI_Redesign.html: sidebar w-64 dengan border kanan,
 * header sticky setinggi h-16, area isi dengan padding sm:px-6.
 *
 * navItems: [{ href, label, icon }] — icon adalah kunci pada ICONS di atas.
 */
export default function AppShell({ moduleName, moduleSubtitle, navItems, user, children }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Cocokkan rute terpanjang dulu, supaya /procurement/bom tidak membuat
  // /procurement ikut aktif.
  const activeHref = React.useMemo(() => {
    const matches = navItems
      .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
      .sort((a, b) => b.href.length - a.href.length);
    return matches[0]?.href;
  }, [pathname, navItems]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Latar gelap saat sidebar dibuka di layar sempit */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r bg-background transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="relative h-7 w-28 shrink-0">
            <Image src="/logo-elsicom.png" alt="Elsicom" fill className="object-contain object-left" priority />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          >
            <X />
          </Button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm font-semibold">{moduleName}</p>
          {moduleSubtitle && (
            <p className="text-xs text-muted-foreground">{moduleSubtitle}</p>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {navItems.map(({ href, label, icon }) => {
            const Icon = ICONS[icon];
            const active = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3 text-[11px] text-muted-foreground">
          Sistem E-Procurement Elsicom
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
          >
            <Menu />
          </Button>

          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.roleLabel}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Menu akun"
                >
                  <Avatar>
                    <AvatarFallback>{initials(user.name)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium">{user.name}</span>
                  <span className="block text-xs text-muted-foreground">{user.roleLabel}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() =>
                    signOut({
                      callbackUrl: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/login`,
                    })
                  }
                >
                  <LogOut />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

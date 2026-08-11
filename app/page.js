import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { getRoleDisplayName } from "@/lib/permissions";
import LogoutButton from "./components/LogoutButton";

// Halaman awal tiap role. Role tanpa entri di sini belum punya modul.
const DASHBOARD_BY_ROLE = {
  ENGINEER: "/engineer",
  MARKETING: "/marketing",
  WPO: "/wpo",
  PROCUREMENT: "/procurement",
  PROJECT_MANAGER: "/pm",
};

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const dashboard = DASHBOARD_BY_ROLE[session.user.role];
  if (dashboard) {
    redirect(dashboard);
  }

  // FINANCE dan WAREHOUSE belum punya modul — lihat Tahap C di APP_PLAN.md
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold">Halo, {session.user.name}</h1>
      <p className="text-gray-500">
        Modul untuk peran {getRoleDisplayName(session.user)} belum tersedia.
        Hubungi administrator bila Anda seharusnya memiliki akses.
      </p>
      <LogoutButton />
    </div>
  );
}

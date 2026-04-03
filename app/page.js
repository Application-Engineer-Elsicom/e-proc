import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Redirect berdasarkan role
  if (session.user.role === "ENGINEER") {
    redirect("/engineer");
  } else if (session.user.role === "WPO") {
    redirect("/wpo");
  } else {
    // Default fallback jika role belum dikenal
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold">Welcome, {session.user.name}</h1>
        <p className="text-gray-500">Role Anda ({session.user.role}) belum memiliki dashboard khusus.</p>
        <a href="/login" className="mt-4 text-red-600 font-bold">Logout / Switch Account</a>
      </div>
    );
  }
}

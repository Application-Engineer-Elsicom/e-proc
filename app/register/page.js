import { getServerSession } from "next-auth";
import { authOptions } from "@/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import RegisterForm from "./RegisterForm";

export const metadata = {
  title: "Buat Akun Pengguna",
};

// Halaman ini dulu terbuka untuk umum dan tertaut dari halaman login, sehingga
// siapa pun bisa membuat akun sekaligus memilih perannya sendiri. Sekarang
// dijaga di sisi server: pengunjung tanpa wewenang tidak pernah melihat form.
const CAN_CREATE_USERS = ["PROJECT_MANAGER"];

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (!CAN_CREATE_USERS.includes(session.user.role)) {
    redirect("/");
  }

  return <RegisterForm />;
}

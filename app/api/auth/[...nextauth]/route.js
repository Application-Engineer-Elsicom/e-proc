import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs"

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      async authorize(credentials) {
        // Mencari user di MySQL berdasarkan username
        const user = await prisma.user.findUnique({
          where: { username: credentials.username }
        })

        // Validasi password menggunakan bcrypt
        if (user && await bcrypt.compare(credentials.password, user.password)) {
          return { 
            id: user.id, 
            name: user.name, 
            role: user.role, 
            position: user.position 
          }
        }
        return null
      }
    })
  ],
  callbacks: {
    // Menyimpan role dan jabatan ke dalam Token JWT
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.position = user.position
      }
      return token
    },
    // Menyimpan data dari token ke dalam Session agar bisa diakses di Frontend
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role
        session.user.position = token.position
      }
      return session
    }
  },
  pages: { 
    signIn: "/login" // Mengarahkan ke halaman login custom Anda
  },
  session: {
    strategy: "jwt"
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
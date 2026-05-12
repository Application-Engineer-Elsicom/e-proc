import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs"

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      async authorize(credentials) {
        console.log("Authorize attempt for:", credentials.username);
        // Mencari user di MySQL berdasarkan username
        const user = await prisma.user.findUnique({
          where: { username: credentials.username }
        })

        if (!user) {
          console.log("User not found in DB");
          return null;
        }

        // Validasi password menggunakan bcrypt
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        console.log("Password valid:", isPasswordValid);

        if (user && isPasswordValid) {
          return {
            id: user.id.toString(),
            name: user.name,
            role: user.role,
            engineerRole: user.engineerRole,
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
        token.id = user.id
        token.role = user.role
        token.engineerRole = user.engineerRole
        token.position = user.position
      }
      return token
    },
    // Menyimpan data dari token ke dalam Session agar bisa diakses di Frontend
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.engineerRole = token.engineerRole
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
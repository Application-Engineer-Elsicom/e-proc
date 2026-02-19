'use server'
import { prisma } from "../prisma"; // Path diperbaiki
import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"

export async function registerUser(formData) {
  const name = formData.get("name")
  const username = formData.get("username")
  const password = formData.get("password")
  const role = formData.get("role")
  const position = formData.get("position")

  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: {
      name,
      username,
      password: hashedPassword,
      role,
      position
    }
  })

  redirect("/login")
}
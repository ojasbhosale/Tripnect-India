"use client"

import { usePathname } from "next/navigation"
import Navbar from "./navbar"

export default function NavbarWrapper() {
  const pathname = usePathname()

  // Hide navbar on /auth and its subroutes
  if (pathname?.startsWith("/auth")) {
    return null
  }

  return <Navbar />
}

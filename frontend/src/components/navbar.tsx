"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Plane, Menu } from "lucide-react"
import { authService } from "@/services/auth"

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    await authService.logout()
    router.push("/auth")
  }

  const NavLinks = () => (
    <div className="flex flex-col md:flex-row md:items-center gap-6">
      <Link href="/buddies" className="text-gray-700 hover:text-indigo-600 font-medium">
        Find Buddies
      </Link>
      <Link href="/trips" className="text-gray-700 hover:text-indigo-600 font-medium">
        Explore Trips
      </Link>
      <Link href="/ai-planner" className="text-gray-700 hover:text-indigo-600 font-medium">
        AI Planner
      </Link>
      <Button variant="outline" onClick={handleSignOut} className="w-fit">
        Sign Out
      </Button>
    </div>
  )

  return (
    <header className="w-full bg-white shadow-md">
      <div className="container mx-auto flex justify-between items-center px-4 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Plane className="h-6 w-6 text-indigo-600" />
          <span className="text-lg font-bold text-gray-900">TripNect India</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <NavLinks />
        </nav>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6 text-gray-700" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-6 flex flex-col gap-6">
              <NavLinks />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

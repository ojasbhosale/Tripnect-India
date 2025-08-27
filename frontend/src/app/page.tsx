"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import HomePage from "@/pages/Home"
import { authService } from "@/services/auth"
import Navbar from "@/components/navbar"

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser?.()
        if (user) {
          setIsLoggedIn(true)
        } else {
          router.replace("/auth")
        }
      } catch {
        router.replace("/auth")
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <>
      {isLoggedIn && (
        <>
          <Navbar />
          <HomePage />
        </>
      )}
    </>
  )
}

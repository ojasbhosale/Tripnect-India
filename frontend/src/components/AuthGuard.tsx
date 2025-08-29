"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { authService } from "@/services/auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const check = async () => {
      try {
        const user = await authService.getCurrentUser()
        if (!user) {
          router.replace("/auth")
        } else {
          setIsAuthed(true)
        }
      } catch {
        router.replace("/auth")
      } finally {
        setChecking(false)
      }
    }

    // only protect non-auth routes
    if (!pathname.startsWith("/auth")) {
      check()
    } else {
      setChecking(false)
    }
  }, [pathname, router])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return <>{isAuthed || pathname.startsWith("/auth") ? children : null}</>
}

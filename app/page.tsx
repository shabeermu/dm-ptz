"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { LandingPage } from "@/components/layout/landing-page"
import { Loader2 } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (code) {
      const params = new URLSearchParams()
      params.set("code", code)
      if (state) params.set("state", state)
      router.replace(`/dashboard?${params.toString()}`)
      return
    }

    fetch("/api/auth/session")
      .then((res) => {
        if (res.ok) router.replace("/dashboard")
      })
      .catch(() => {})
  }, [searchParams, router])

  return <LandingPage />
}

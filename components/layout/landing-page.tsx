"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Instagram, Loader2, Terminal, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

const isDevelopment = process.env.NODE_ENV === "development"

export function LandingPage() {
  const router = useRouter()
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDevLoggingIn, setIsDevLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setError(null)
    setIsConnecting(true)

    try {
      const stateRes = await fetch("/api/auth/oauth-state")
      if (!stateRes.ok) throw new Error("Failed to initialize sign-in. Please try again.")

      const { state } = await stateRes.json()
      const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
      const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI

      if (!clientId || !redirectUri) {
        throw new Error("Instagram login is not configured.")
      }

      const scope = encodeURIComponent(
        "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments",
      )

      window.location.href =
        `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1` +
        `&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code&scope=${scope}&state=${state}`
    } catch (loginError) {
      const message =
        loginError instanceof Error ? loginError.message : "Unable to start Instagram sign-in."
      setError(message)
      setIsConnecting(false)
    }
  }

  const handleTestLogin = async () => {
    setError(null)
    setIsDevLoggingIn(true)

    try {
      const res = await fetch("/api/instagram/test-login", { method: "POST" })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Dev login failed")
      }

      localStorage.setItem("ig_user_id", data.userId)
      localStorage.setItem("ig_username", data.username)
      router.push("/dashboard")
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Dev login failed"
      setError(message)
      setIsDevLoggingIn(false)
    }
  }

  const isBusy = isConnecting || isDevLoggingIn

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="font-mono-ui text-xl font-bold tracking-tight">DM-PTZ</h1>
            <p className="text-sm text-muted-foreground">Instagram automation for internal use</p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={handleLogin}
            disabled={isBusy}
          >
            {isConnecting ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Instagram aria-hidden="true" />
            )}
            Connect Instagram
          </Button>

          {isDevelopment && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleTestLogin}
              disabled={isBusy}
            >
              {isDevLoggingIn ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Terminal aria-hidden="true" />
              )}
              Dev Login
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}

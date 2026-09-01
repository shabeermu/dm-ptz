"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"

interface SessionResponse {
  userId: string
  username: string
  profilePic?: string | null
}

function persistSessionCache(session: SessionResponse) {
  localStorage.setItem("ig_user_id", session.userId)
  localStorage.setItem("ig_username", session.username)
  if (session.profilePic) {
    localStorage.setItem("ig_profile_pic", session.profilePic)
  } else {
    localStorage.removeItem("ig_profile_pic")
  }
}

function clearSessionCache() {
  localStorage.removeItem("ig_user_id")
  localStorage.removeItem("ig_username")
  localStorage.removeItem("ig_profile_pic")
}

export function useInstagramSession() {
  const [username, setUsername] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profilePic, setProfilePic] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const searchParams = useSearchParams()
  const router = useRouter()

  const applySession = useCallback((session: SessionResponse) => {
    persistSessionCache(session)
    setUserId(session.userId)
    setUsername(session.username)
    setProfilePic(session.profilePic ?? null)
  }, [])

  const clearSession = useCallback(() => {
    clearSessionCache()
    setUsername(null)
    setUserId(null)
    setProfilePic(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    const initializeSession = async () => {
      const code = searchParams.get("code")
      const state = searchParams.get("state")

      try {
        if (code) {
          const res = await fetch("/api/instagram/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, state }),
          })
          const data = await res.json()

          if (!cancelled && res.ok && data.success) {
            applySession({
              userId: data.userId,
              username: data.username,
              profilePic: data.profilePic,
            })
            router.replace("/dashboard")
            return
          }

          if (!cancelled) {
            clearSession()
          }
        } else {
          const res = await fetch("/api/auth/session")
          if (!cancelled && res.ok) {
            const session = (await res.json()) as SessionResponse
            applySession(session)
          } else if (!cancelled) {
            clearSession()
          }
        }
      } catch (error) {
        console.error("Session initialization failed:", error)
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    initializeSession()

    return () => {
      cancelled = true
    }
  }, [searchParams, router, applySession, clearSession])

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Logout failed:", error)
    } finally {
      clearSession()
      router.push("/")
    }
  }

  return { userId, username, profilePic, isLoading, logout }
}

import { type NextRequest, type NextResponse } from "next/server"

export const SESSION_COOKIE_NAME = "insta_session"
export const OAUTH_STATE_COOKIE_NAME = "oauth_state"

const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 60 // 60 days
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10 // 10 minutes

export interface SessionPayload {
  userId: string
  username: string
  profilePic?: string | null
  exp: number
  iat: number
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production")
  }
  return "dev-insecure-session-secret-change-me"
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  return base64UrlEncode(new Uint8Array(signature))
}

async function verifySignature(payload: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  )
  const signatureBytes = new Uint8Array(base64UrlDecode(signature))
  return crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(payload))
}

export async function createSessionToken(
  data: Omit<SessionPayload, "exp" | "iat">,
  maxAgeSeconds = DEFAULT_SESSION_MAX_AGE_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    ...data,
    iat: now,
    exp: now + maxAgeSeconds,
  }
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const signature = await signPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export async function parseSessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null

  const separatorIndex = token.lastIndexOf(".")
  if (separatorIndex <= 0) return null

  const encodedPayload = token.slice(0, separatorIndex)
  const signature = token.slice(separatorIndex + 1)

  try {
    const isValid = await verifySignature(encodedPayload, signature)
    if (!isValid) return null

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as SessionPayload
    if (!payload.userId || !payload.username || !payload.exp) return null
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

export function getSessionCookieOptions(maxAgeSeconds = DEFAULT_SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  }
}

export function getOAuthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  }
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  return parseSessionToken(token)
}

export async function setSessionCookie(
  response: NextResponse,
  session: Omit<SessionPayload, "exp" | "iat">,
  maxAgeSeconds = DEFAULT_SESSION_MAX_AGE_SECONDS,
): Promise<void> {
  const token = await createSessionToken(session, maxAgeSeconds)
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(maxAgeSeconds))
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(0),
    maxAge: 0,
  })
}

export function generateOAuthState(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

export function validateOAuthState(request: NextRequest, state: string | null | undefined): boolean {
  if (!state) return false
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value
  return Boolean(storedState && storedState === state)
}

export function clearOAuthStateCookie(response: NextResponse): void {
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
    ...getOAuthStateCookieOptions(),
    maxAge: 0,
  })
}

"use client"

import { useState, useEffect, useRef } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Smartphone, RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { SelectDrawingSession } from "@/db/schema"
import { toast } from "sonner"

// Extend the session type to include the URL
interface SessionWithUrl extends SelectDrawingSession {
  sessionUrl: string
}

interface QRCodeSyncProps {
  sessionId: string
  fontId: string
  onSessionCreated?: (session: SessionWithUrl) => void
  onSessionExpired?: () => void
  isActive?: boolean
}

export function QRCodeSync({
  sessionId,
  fontId,
  onSessionCreated,
  onSessionExpired,
  isActive = true
}: QRCodeSyncProps) {
  const [session, setSession] = useState<SessionWithUrl | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [requestInProgress, setRequestInProgress] = useState(false)
  const [serverDown, setServerDown] = useState(false)
  const retryCount = useRef(0)
  const maxRetries = 2

  // Create or refresh the session
  const createSession = async () => {
    // Skip if already in progress or if server is known to be down
    if (requestInProgress || serverDown) return

    setRequestInProgress(true)
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fontId }),
        // Add a timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000)
      })

      const data = await response.json()

      if (!response.ok) {
        // Specifically handle database connection errors
        if (
          data.error?.includes("connection") ||
          data.error?.includes("database")
        ) {
          console.error("Database connection issue:", data.error)
          setError("Server is busy. Please try again in a few minutes.")

          // Don't retry automatically for DB connection issues
          setServerDown(true)
          retryCount.current = maxRetries + 1
          return
        }

        // Handle other errors
        throw new Error(data.error || "Failed to create session")
      }

      // Reset counters on success
      retryCount.current = 0
      setServerDown(false)
      setSession(data.session)

      if (onSessionCreated) {
        onSessionCreated(data.session)
      }
    } catch (err) {
      console.error("Error creating session:", err)

      // Handle network errors that might indicate server is down
      if (
        err instanceof TypeError ||
        (err instanceof Error && err.message.includes("fetch"))
      ) {
        setError("Cannot connect to server. It may be offline.")
        setServerDown(true)
        retryCount.current = maxRetries + 1
      } else {
        setError((err as Error).message || "Failed to create session")

        // Only set up retry if we haven't exceeded max and it's not a server down issue
        if (retryCount.current < maxRetries && isActive) {
          retryCount.current++
          const delay = 2000 * Math.pow(2, retryCount.current)
          setTimeout(createSession, delay)
        }
      }
    } finally {
      setIsLoading(false)
      setRequestInProgress(false)
    }
  }

  // Initialize session on mount if active (with proper error handling)
  useEffect(() => {
    if (!isActive || session) return

    // Reset state when component activates
    setServerDown(false)
    retryCount.current = 0

    // Create session initially
    createSession()

    // Clean up: Only try to end the session if we had one and the server isn't known to be down
    return () => {
      if (session && !serverDown) {
        // Get the session ID in a type-safe way
        const sessionId = (session as SessionWithUrl)?.id
        if (sessionId) {
          fetch(`/api/sessions/${sessionId}`, {
            method: "DELETE",
            signal: AbortSignal.timeout(5000) // Add timeout to prevent hanging
          }).catch(err => {
            console.error("Error ending session:", err)
            // Just log error, don't retry or take any action
          })
        }
      }
    }
  }, [isActive, session, serverDown])

  // Set up session expiration check
  useEffect(() => {
    if (!session) return

    const checkExpiration = () => {
      const now = new Date()
      const expiresAt = new Date(session.expiresAt)

      if (now > expiresAt) {
        if (onSessionExpired) {
          onSessionExpired()
        }
        return true
      }

      return false
    }

    // Check immediately
    const isExpired = checkExpiration()
    if (isExpired) return

    // Set up periodic checks
    const interval = setInterval(() => {
      const isExpired = checkExpiration()
      if (isExpired) {
        clearInterval(interval)
      }
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [session, onSessionExpired])

  // Don't render anything if inactive
  if (!isActive) {
    return null
  }

  const handleRetry = () => {
    // Reset counters and flags
    retryCount.current = 0
    setServerDown(false)
    setError(null)
    // Try again
    createSession()
  }

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Smartphone className="mr-2 size-5" />
          Mobile Sync
        </CardTitle>
        <CardDescription>
          Scan this QR code with your mobile device to continue drawing there
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center">
        {error ? (
          <div className="mb-4 text-center text-red-500">
            <XCircle className="mx-auto mb-2 size-8" />
            {error}
            {serverDown ? (
              <p className="mt-2 text-sm">
                The server appears to be offline. Please restart your server,
                then try again.
              </p>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        ) : session ? (
          <div className="rounded-lg border bg-white p-4">
            <QRCodeSVG
              value={session.sessionUrl}
              size={200}
              level="H"
              includeMargin
            />
          </div>
        ) : (
          <div className="flex size-52 items-center justify-center">
            <RefreshCw className="size-8 animate-spin text-gray-400" />
          </div>
        )}

        {session && (
          <div className="mt-4 text-center">
            <p className="mb-1 text-sm font-medium">Session Code:</p>
            <p className="text-lg font-bold tracking-wider">
              {session.sessionCode}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Expires in{" "}
              {Math.round(
                (new Date(session.expiresAt).getTime() - Date.now()) / 60000
              )}{" "}
              minutes
            </p>
          </div>
        )}
      </CardContent>

      {session && (
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={createSession}
            disabled={isLoading || requestInProgress}
          >
            <RefreshCw
              className={`mr-2 size-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh QR Code
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

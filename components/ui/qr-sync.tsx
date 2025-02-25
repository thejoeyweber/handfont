"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Smartphone } from "lucide-react"

interface QRSyncProps {
  sessionCode: string
  sessionUrl: string
  onSessionEnd?: () => void
}

export function QRSync({ sessionCode, sessionUrl, onSessionEnd }: QRSyncProps) {
  const [countdown, setCountdown] = useState(0)

  // Set up countdown timer
  useEffect(() => {
    // QR code expires in 24 hours, but we'll show a countdown for 10 minutes
    setCountdown(10 * 60) // 10 minutes in seconds

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Format countdown as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">
          Sync with your mobile device
        </CardTitle>
        <CardDescription className="text-center">
          Scan this QR code with your phone to continue writing samples
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center">
        <div className="mb-4 flex items-center justify-center rounded-lg border bg-white p-4">
          {/* We'll use a third-party library for the actual QR code, for now we're adding a placeholder */}
          <div className="flex size-48 items-center justify-center bg-gray-100">
            {/* Replace with actual QR code component */}
            <Smartphone className="size-12 text-gray-400" />
          </div>
        </div>

        <div className="mb-4 text-center">
          <p className="font-medium">
            Session Code: <span className="font-bold">{sessionCode}</span>
          </p>
          <p className="text-sm text-gray-500">
            QR code expires in {formatTime(countdown)}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(sessionUrl)
              }
            }}
          >
            Copy Link
          </Button>

          {onSessionEnd && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={onSessionEnd}
            >
              End Session
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

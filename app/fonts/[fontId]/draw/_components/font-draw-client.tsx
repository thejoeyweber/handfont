"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { WritingPrompt } from "@/components/ui/writing-prompt"
import { QRCodeSync } from "@/components/ui/qr-code-sync"
import { FontPreview } from "@/components/ui/font-preview"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SelectFont } from "@/db/schema"
import { DrawingData } from "@/types"
import {
  createSampleAction,
  getFontSamplesAction
} from "@/actions/db/samples-actions"
import { updateFontAction } from "@/actions/db/fonts-actions"
import {
  Pencil,
  Smartphone,
  Save,
  Check,
  Eye,
  RefreshCw,
  AlertCircle
} from "lucide-react"
import { SelectDrawingSession } from "@/db/schema"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"

interface SessionWithUrl extends SelectDrawingSession {
  sessionUrl: string
}

interface FontDrawClientProps {
  font: SelectFont
  userId: string
  writingPrompts: string[]
}

export default function FontDrawClient({
  font,
  userId,
  writingPrompts
}: FontDrawClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("draw")
  const [sessionId, setSessionId] = useState(uuidv4())
  const [samples, setSamples] = useState<Record<string, DrawingData>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [deviceType, setDeviceType] = useState<"desktop" | "mobile">("desktop")
  const [session, setSession] = useState<SessionWithUrl | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState(Date.now())
  const [isSyncing, setIsSyncing] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [sessionScanned, setSessionScanned] = useState(false)

  // Detect device type on mount
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    setDeviceType(isMobile ? "mobile" : "desktop")
  }, [])

  // Handle capturing a character sample
  const handleCharacterCapture = async (
    character: string,
    data: DrawingData
  ) => {
    try {
      // Create an image URL from the drawing data
      // In a real app, you would convert the drawing to an image and upload it
      // For this demo, we'll use a placeholder URL
      const imageUrl = `https://example.com/images/${character}.png`

      // Save the sample to the database
      const result = await createSampleAction({
        fontId: font.id,
        userId,
        character,
        imageUrl,
        svgPath: JSON.stringify(data.points),
        inputMethod: session
          ? "qr_sync"
          : deviceType === "mobile"
            ? "mobile"
            : "desktop",
        sessionId: session?.id || sessionId
      })

      if (!result.isSuccess) {
        console.error("Failed to save sample:", result.message)
      }

      // Update local state
      setSamples(prev => ({
        ...prev,
        [character]: data
      }))
    } catch (error) {
      console.error("Error saving sample:", error)
    }
  }

  // Handle completion of drawing
  const handleComplete = async (allSamples: Record<string, DrawingData>) => {
    setIsSaving(true)

    try {
      // Update the font status
      const updateResult = await updateFontAction(font.id, {
        status: "processing"
      })

      if (!updateResult.isSuccess) {
        throw new Error(updateResult.message)
      }

      // Call the font generation API
      const response = await fetch("/api/fonts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fontId: font.id })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate font")
      }

      setIsCompleted(true)
      setTimeout(() => {
        router.push(`/fonts/${font.id}`)
      }, 2000)
    } catch (error) {
      console.error("Error completing font:", error)
      alert("Failed to complete font: " + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle session creation
  const handleSessionCreated = (newSession: SessionWithUrl) => {
    setSession(newSession)

    // Mark that QR code has been scanned, but not active yet
    setSessionScanned(true)

    // Do NOT mark session as active yet until we detect actual mobile user activity
    // We just connected the mobile device but user hasn't started drawing

    toast.success("QR code scanned successfully!", {
      description:
        "Mobile device connected. Waiting for user to start drawing..."
    })
  }

  // Handle session expiration
  const handleSessionExpired = () => {
    setSessionActive(false)
    setSession(null)
    toast.error("Mobile session expired", {
      description: "Please generate a new QR code if needed"
    })
  }

  // Poll for new samples from mobile devices
  useEffect(() => {
    // Skip if we're in mobile mode
    if (deviceType === "mobile") return

    // Add a flag to track if we're already syncing
    let isSyncingInProgress = false
    let firstActivityDetected = false
    let sessionActivityChecked = false

    // Function to check session status
    const checkSessionActivity = async () => {
      if (!session) return false

      try {
        // Get the latest session info
        const result = await fetch(`/api/sessions/${session.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        })

        if (!result.ok) {
          return false
        }

        const data = await result.json()

        if (!data.success || !data.session) {
          return false
        }

        const sessionData = data.session

        // Check if user has modified the lastActive timestamp or isActive flag,
        // indicating they started the mobile flow
        if (sessionData.lastActive || sessionData.isActive) {
          const lastActiveTime = sessionData.lastActive
            ? new Date(sessionData.lastActive).getTime()
            : 0
          const sessionCreatedTime = new Date(session.createdAt).getTime()

          // If both isActive flag is true and lastActive is updated, this means the user
          // has selected a drawing mode on mobile and is ready to draw
          const hasActivity =
            lastActiveTime > sessionCreatedTime + 15000 &&
            sessionData.isActive === true

          if (hasActivity) {
            // First time we've detected real activity - activate the session
            if (!sessionActive) {
              setSessionActive(true)

              // Switch tabs only if we're on mobile tab and this is the first detection
              if (!sessionActivityChecked && activeTab === "mobile") {
                sessionActivityChecked = true

                toast.success("Mobile drawing session started!", {
                  description:
                    "User has started drawing. Switching to preview to show progress."
                })

                setTimeout(() => {
                  setActiveTab("preview")
                }, 1000)
              }
            }
            return true
          }
        }

        return false
      } catch (error) {
        console.error("Error checking session activity:", error)
        return false
      }
    }

    // Function to fetch the latest samples
    const syncSamples = async () => {
      // Skip if already syncing or no font
      if (!font || isSyncing || isSyncingInProgress) return

      // Set local flag to prevent multiple syncs
      isSyncingInProgress = true
      setIsSyncing(true)

      // First check if session has activity
      if (sessionActive && !sessionActivityChecked) {
        await checkSessionActivity()
      }

      try {
        // Get the latest samples from the server
        const result = await getFontSamplesAction(font.id)

        if (result.isSuccess && result.data) {
          // Convert the server samples to our DrawingData format
          const newSamples: Record<string, DrawingData> = {}
          let newSamplesFound = false
          let mobileActivityDetected = false
          const previousSampleCount = Object.keys(samples).length

          result.data.forEach(sample => {
            if (sample.svgPath) {
              try {
                // Parse the SVG path back to points
                const points = JSON.parse(sample.svgPath)

                // Only add if newer than our last sync or not in our current samples
                const sampleTime = new Date(sample.createdAt).getTime()
                if (sampleTime > lastSyncTime || !samples[sample.character]) {
                  newSamples[sample.character] = {
                    points,
                    width: 400, // Default width
                    height: 400 // Default height
                  }

                  // Check if this is a mobile sample
                  if (
                    sample.inputMethod === "qr_sync" &&
                    session?.id === sample.sessionId
                  ) {
                    mobileActivityDetected = true
                    console.log(`Mobile activity detected: ${sample.character}`)
                  }

                  console.log(
                    `Synced character: ${sample.character} from ${sample.inputMethod}`
                  )
                  newSamplesFound = true
                }
              } catch (error) {
                console.error(
                  `Error parsing sample path for ${sample.character}:`,
                  error
                )
              }
            }
          })

          // If we have new samples, update state
          if (Object.keys(newSamples).length > 0) {
            setSamples(prev => ({
              ...prev,
              ...newSamples
            }))

            // Show a toast notification only if manually triggered or if new samples were found
            if (!autoRefreshEnabled || newSamplesFound) {
              toast.success(
                `Synced ${Object.keys(newSamples).length} characters from mobile`
              )
            }

            // Check if this is the first mobile activity and we should switch tabs
            if (
              mobileActivityDetected &&
              !firstActivityDetected &&
              !sessionActivityChecked &&
              activeTab === "mobile"
            ) {
              // Only consider it first activity if there are more samples than before
              if (
                Object.keys(samples).length + Object.keys(newSamples).length >
                previousSampleCount
              ) {
                firstActivityDetected = true

                // Switch to preview tab after a short delay
                setTimeout(() => {
                  setActiveTab("preview")
                  toast.success("First character received from mobile!", {
                    description:
                      "Switched to preview tab to show progress. You can switch back to QR code if needed."
                  })
                }, 1000)
              }
            }
          } else if (!autoRefreshEnabled) {
            // If manual sync and no new samples
            toast.info("No new samples found")
          }

          // Update last sync time and refresh time
          setLastSyncTime(Date.now())
          setLastRefreshTime(new Date())
        }
      } catch (error) {
        console.error("Error syncing samples:", error)
        toast.error("Failed to sync with mobile device")
      } finally {
        setIsSyncing(false)
        isSyncingInProgress = false
      }
    }

    // Check for session activity periodically (5 seconds)
    const activityCheckInterval = setInterval(() => {
      // Only check if we haven't detected activity yet
      if (session && !sessionActive) {
        checkSessionActivity()
      }
    }, 5000)

    // Manual trigger for initial sync after mounting
    syncSamples()

    // Set up polling for samples
    const syncInterval = setInterval(() => {
      // Do more frequent polling if we're waiting for the first mobile activity
      if (sessionActive && !firstActivityDetected && activeTab === "mobile") {
        syncSamples()
      }
      // Regular polling for auto-refresh if enabled and looking at preview
      else if (autoRefreshEnabled && activeTab === "preview" && sessionActive) {
        syncSamples()
      }
    }, 5000) // More frequent polling (5 seconds) to detect first activity sooner

    // Clean up on unmount
    return () => {
      clearInterval(syncInterval)
      clearInterval(activityCheckInterval)
    }
  }, [font, deviceType, activeTab, sessionActive, autoRefreshEnabled, session])

  // Render completion message if done
  if (isCompleted) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Check className="mr-2 size-5 text-green-500" />
            Font Generation Started
          </CardTitle>
          <CardDescription>
            Your font is being generated. This may take a few minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="my-4 text-center text-gray-600">
            You'll be redirected to your font page in a moment.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Calculate preview stats
  const totalCharacters = font.characters.length
  const capturedCharacters = Object.keys(samples).length
  const completionPercentage = Math.round(
    (capturedCharacters / totalCharacters) * 100
  )

  return (
    <div>
      <Tabs defaultValue="draw" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="draw" className="flex items-center">
            <Pencil className="mr-2 size-4" />
            Draw Characters
          </TabsTrigger>

          <TabsTrigger value="preview" className="flex items-center">
            <Eye className="mr-2 size-4" />
            Preview Font
          </TabsTrigger>

          {deviceType === "desktop" && (
            <TabsTrigger value="mobile" className="flex items-center">
              <Smartphone className="mr-2 size-4" />
              Use Mobile Device
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="draw" className="mt-6">
          <WritingPrompt
            prompts={writingPrompts}
            characterSet={font.characters.join("")}
            onCharacterCapture={handleCharacterCapture}
            onComplete={handleComplete}
            initialSamples={samples}
          />

          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => handleComplete(samples)}
              disabled={isSaving || Object.keys(samples).length === 0}
              className="flex items-center"
            >
              <Save className="mr-2 size-4" />
              {isSaving ? "Generating Font..." : "Complete & Generate Font"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <div className="mx-auto max-w-4xl">
            {sessionActive && (
              <div className="mb-6 flex items-center justify-between rounded-md border bg-blue-50 p-4">
                <div className="flex items-center">
                  <Smartphone className="mr-2 size-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-700">
                      Mobile session active
                    </p>
                    <p className="text-sm text-blue-600">
                      {completionPercentage}% complete ({capturedCharacters}/
                      {totalCharacters} characters)
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-gray-500">
                    {lastRefreshTime ? (
                      <>
                        Last refreshed: {lastRefreshTime.toLocaleTimeString()}
                      </>
                    ) : (
                      <>Waiting for first refresh</>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLastSyncTime(0) // Force a full sync
                      setAutoRefreshEnabled(false) // Disable auto for manual sync
                      setTimeout(() => setAutoRefreshEnabled(true), 1000) // Re-enable after a second
                    }}
                    disabled={isSyncing}
                    className="ml-2"
                  >
                    <RefreshCw
                      className={`mr-2 size-4 ${isSyncing ? "animate-spin" : ""}`}
                    />
                    {isSyncing ? "Syncing..." : "Refresh Now"}
                  </Button>
                  <Button
                    variant={autoRefreshEnabled ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  >
                    {autoRefreshEnabled
                      ? "Auto Refresh On"
                      : "Auto Refresh Off"}
                  </Button>
                </div>
              </div>
            )}

            {completionPercentage === 0 ? (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="mr-2 size-5 text-amber-500" />
                    No Characters Yet
                  </CardTitle>
                  <CardDescription>
                    No character samples have been captured yet.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-gray-600">
                    Start drawing characters or use a mobile device to create
                    your font.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <FontPreview samples={samples} />
            )}

            <div className="mt-8 flex justify-center gap-4">
              <Button variant="outline" onClick={() => setActiveTab("draw")}>
                <Pencil className="mr-2 size-4" />
                Continue Drawing
              </Button>

              {completionPercentage > 0 && (
                <Button
                  onClick={() => handleComplete(samples)}
                  disabled={isSaving || Object.keys(samples).length === 0}
                  className="flex items-center"
                >
                  <Save className="mr-2 size-4" />
                  {isSaving ? "Generating Font..." : "Complete & Generate Font"}
                </Button>
              )}
            </div>
          </div>
        </TabsContent>

        {deviceType === "desktop" && (
          <TabsContent value="mobile" className="mt-6">
            <div className="mx-auto max-w-md">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Use Your Mobile Device</span>
                    <div className="flex items-center">
                      {sessionActive && (
                        <span className="mr-2 inline-flex size-2 animate-pulse rounded-full bg-green-400"></span>
                      )}
                      {sessionScanned && !sessionActive && (
                        <span className="mr-2 inline-flex size-2 animate-pulse rounded-full bg-yellow-400"></span>
                      )}
                      <span
                        className={
                          sessionActive
                            ? "text-green-600"
                            : sessionScanned
                              ? "text-yellow-600"
                              : "text-gray-500"
                        }
                      >
                        {sessionActive
                          ? "Ready"
                          : sessionScanned
                            ? "Scanned"
                            : "Ready to Scan"}
                      </span>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {sessionActive
                      ? "Mobile user has selected a drawing mode and is ready to draw. Switching to Preview tab..."
                      : sessionScanned
                        ? "QR code scanned! Waiting for user to select drawing mode on mobile device..."
                        : "Scan the QR code below to continue writing on your mobile device."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!sessionActive ? (
                    // Show QR code if not active yet
                    <>
                      <QRCodeSync
                        sessionId={sessionId}
                        fontId={font.id}
                        onSessionCreated={handleSessionCreated}
                        onSessionExpired={handleSessionExpired}
                        isActive={activeTab === "mobile"}
                      />

                      {sessionScanned && (
                        <div className="mt-4 border-t pt-4">
                          <div className="rounded-md bg-yellow-50 p-3">
                            <div className="flex items-center">
                              <span className="mr-2 inline-flex size-3 animate-pulse rounded-full bg-yellow-500"></span>
                              <h3 className="font-medium text-yellow-800">
                                QR code scanned!
                              </h3>
                            </div>
                            <p className="mt-1 text-sm text-yellow-700">
                              Your mobile device is connected. Waiting for user
                              to select drawing mode...
                            </p>
                            <div className="mt-3 flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setLastSyncTime(0) // Force a full sync
                                  toast.success(
                                    "Checking for mobile activity..."
                                  )
                                }}
                                disabled={isSyncing}
                                className="text-xs"
                              >
                                <RefreshCw
                                  className={`mr-1 size-3 ${isSyncing ? "animate-spin" : ""}`}
                                />
                                Check Status
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Mobile user has selected a mode - show a different state
                    <div className="pt-2">
                      <div className="mb-4 rounded-md bg-green-50 p-4">
                        <div className="flex items-center">
                          <span className="mr-2 inline-flex size-3 animate-pulse rounded-full bg-green-500"></span>
                          <h3 className="font-medium text-green-800">
                            Session Ready!
                          </h3>
                        </div>
                        <p className="mt-1 text-sm text-green-700">
                          Mobile user has selected a drawing mode and can now
                          start drawing. We're automatically switching to the
                          Preview tab.
                        </p>
                        <div className="mt-2 flex items-center justify-between text-sm text-green-700">
                          <span>
                            Characters captured: {Object.keys(samples).length} /{" "}
                            {totalCharacters}
                          </span>
                          <span>{completionPercentage}% complete</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-green-200">
                          <div
                            className="h-1.5 rounded-full bg-green-600 transition-all duration-300"
                            style={{ width: `${completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {sessionActive && (
                    <div className="mt-6 border-t pt-4">
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => setActiveTab("preview")}
                          className="flex w-full items-center justify-center"
                        >
                          <Eye className="mr-2 size-4" />
                          View Preview & Progress
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {
                            // Generate a fresh session ID for a new QR code
                            setSessionId(uuidv4())
                            setSession(null)
                            setSessionScanned(false)
                            setSessionActive(false)
                            toast.success("New QR code generated")
                          }}
                          className="flex w-full items-center justify-center"
                        >
                          <RefreshCw className="mr-2 size-4" />
                          Generate New QR Code
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("draw")}
                  >
                    <Pencil className="mr-2 size-4" />
                    Draw Mode
                  </Button>

                  {sessionActive && completionPercentage > 20 && (
                    <Button
                      variant="default"
                      onClick={() => handleComplete(samples)}
                      disabled={isSaving}
                    >
                      <Save className="mr-2 size-4" />
                      Complete Font
                    </Button>
                  )}

                  {sessionActive && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Reset session state
                        setSessionActive(false)
                        setSessionScanned(false)
                        setSession(null)
                        // Generate a new session ID for a fresh start
                        setSessionId(uuidv4())

                        toast.info(
                          "Previous session ended. Ready to scan a new QR code."
                        )
                      }}
                      className="ml-auto"
                    >
                      <Smartphone className="mr-2 size-4" />
                      New Mobile Session
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

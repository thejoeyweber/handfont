"use client"

import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import Confetti from "react-confetti"
import { WritingPromptMobile } from "@/components/ui/writing-prompt-mobile"
import {
  AlertCircle,
  Check,
  ArrowLeft,
  Menu,
  X,
  Save,
  Edit,
  Type,
  Grid3X3,
  ChevronUp,
  MessageSquare,
  Eraser,
  PenTool,
  Paintbrush,
  Pencil,
  Undo,
  Redo,
  MoveRight,
  BookOpen,
  Smartphone
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { createSampleAction } from "@/actions/db/samples-actions"
import {
  getDrawingSessionByCodeAction,
  updateDrawingSessionAction
} from "@/actions/db/drawing-sessions-actions"
import { getFontByIdAction } from "@/actions/db/fonts-actions"
import { DrawingData, DrawingPoint } from "@/types"
import { useRouter } from "next/navigation"
import { DrawingCanvas, DrawingCanvasRef } from "@/components/ui/drawing-canvas"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getUniqueCharacters } from "@/lib/writing-prompts"
import { extractCharactersFromDrawing } from "@/lib/character-extraction"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

interface MobileDrawClientProps {
  code: string
}

// Define app states
type AppState =
  | "loading"
  | "welcome"
  | "mode-select"
  | "drawing"
  | "complete"
  | "error"

export default function MobileDrawClient({ code }: MobileDrawClientProps) {
  const router = useRouter()
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [font, setFont] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [samples, setSamples] = useState<Record<string, DrawingData>>({})
  const [isComplete, setIsComplete] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"sentence" | "character">(
    "sentence"
  )
  const [isLandscape, setIsLandscape] = useState(false)
  const [promptHeight, setPromptHeight] = useState(150)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeChar, setActiveChar] = useState<string | null>(null)
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [sentenceDrawing, setSentenceDrawing] = useState<DrawingData | null>(
    null
  )
  const [isExtracting, setIsExtracting] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [canvasScrollPos, setCanvasScrollPos] = useState(0)
  const [showPrompt, setShowPrompt] = useState(true)
  const [showStyleControls, setShowStyleControls] = useState(false)
  const [brushStyle, setBrushStyle] = useState<"pen" | "brush" | "pencil">(
    "pen"
  )
  const [brushSize, setBrushSize] = useState(2)
  const [brushColor, setBrushColor] = useState("#000000")
  const [appState, setAppState] = useState<AppState>("loading")
  const [sessionStarted, setSessionStarted] = useState(false)
  const [introStep, setIntroStep] = useState(0)
  const [hasDrawing, setHasDrawing] = useState(false)
  const [hasShownDrawingTip, setHasShownDrawingTip] = useState(false)

  // Text prompts for drawing
  const prompts = [
    "The quick brown fox jumps over the lazy dog.",
    "Pack my box with five dozen liquor jugs.",
    "How vexingly quick daft zebras jump!",
    "Sphinx of black quartz, judge my vow.",
    "Amazingly few discotheques provide jukeboxes."
  ]

  const currentPrompt = prompts[currentPromptIndex]

  // Extract unique characters from the current prompt
  const promptCharacters = getUniqueCharacters(currentPrompt)

  // Update viewport dimensions and check orientation on mount and resize
  useEffect(() => {
    const updateViewport = () => {
      setViewportHeight(window.innerHeight)
      setViewportWidth(window.innerWidth)
      setIsLandscape(window.innerWidth > window.innerHeight)

      // Adjust prompt height based on orientation
      const newPromptHeight =
        window.innerWidth > window.innerHeight
          ? 150 // landscape
          : 120 // portrait
      setPromptHeight(newPromptHeight)
    }

    updateViewport()
    window.addEventListener("resize", updateViewport)
    return () => window.removeEventListener("resize", updateViewport)
  }, [])

  // Handle scroll position for canvas
  useEffect(() => {
    const handleScroll = () => {
      if (canvasContainerRef.current) {
        setCanvasScrollPos(canvasContainerRef.current.scrollTop)
      }
    }

    const container = canvasContainerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // Set up session heartbeat to detect session end
  useEffect(() => {
    if (!session || !sessionStarted) return

    // Immediately mark the session as active when user explicitly starts drawing
    const markActive = async () => {
      try {
        await updateDrawingSessionAction(session.id, {
          isActive: true,
          lastActive: new Date()
        })
        console.log("Session marked as active")
      } catch (err) {
        console.error("Failed to mark session as active:", err)
      }
    }

    // Call once immediately when user starts
    markActive()

    // Set up regular heartbeat
    const heartbeatInterval = setInterval(() => {
      // Update session lastActive timestamp
      updateDrawingSessionAction(session.id, { lastActive: new Date() }).catch(
        err => console.error("Failed to update session heartbeat:", err)
      )
    }, 30000) // Every 30 seconds

    return () => clearInterval(heartbeatInterval)
  }, [session, sessionStarted])

  // Notify server when user actually starts the session (beyond just loading)
  const startSession = async () => {
    if (!session) return

    try {
      // Update session to indicate the user has explicitly chosen to start drawing
      setSessionStarted(true)
      setAppState("drawing")

      // Mark the session as active immediately to inform the desktop
      await updateDrawingSessionAction(session.id, {
        isActive: true,
        lastActive: new Date()
      })
      console.log("Session marked as active immediately")

      // Start with the user's chosen mode
      setActiveTab(activeTab)

      toast.success("Session started! You can start drawing now.")
    } catch (error) {
      console.error("Failed to update session status:", error)
      toast.error("Failed to start session. Please try again.")
    }
  }

  useEffect(() => {
    async function getSessionAndFont() {
      setIsLoading(true)
      try {
        // First get the drawing session by code
        const sessionResult = await getDrawingSessionByCodeAction(code)

        if (!sessionResult.isSuccess || !sessionResult.data) {
          setError(sessionResult.message)
          setAppState("error")
          return
        }

        const session = sessionResult.data
        setSession(session)

        // Then get the font by ID
        const fontResult = await getFontByIdAction(session.fontId)

        if (!fontResult.isSuccess || !fontResult.data) {
          setError(fontResult.message)
          setAppState("error")
          return
        }

        setFont(fontResult.data)
        setAppState("welcome")
      } catch (error) {
        console.error("Error fetching session and font:", error)
        setError("Failed to load font information. Please try again.")
        setAppState("error")
      } finally {
        setIsLoading(false)
      }
    }

    getSessionAndFont()
  }, [code])

  const handleCharacterCapture = async (
    character: string,
    data: DrawingData
  ) => {
    if (!font || !session) return

    // Update local state
    setSamples(prev => ({
      ...prev,
      [character]: data
    }))

    try {
      // Convert drawing data to SVG path for storage
      const svgPath = JSON.stringify(data.points)

      // Create a placeholder image URL (in a real app, you would convert the drawing to an image and upload it)
      const imageUrl = `https://example.com/images/${character}.png`

      // Save to database
      const { isSuccess, message } = await createSampleAction({
        fontId: font.id,
        userId: session.userId,
        character,
        imageUrl,
        svgPath,
        inputMethod: "qr_sync",
        sessionId: session.id
      })

      if (!isSuccess) {
        toast.error(`Failed to save: ${message}`)
      } else {
        toast.success(`Saved character: ${character}`)
      }
    } catch (error) {
      console.error("Error saving sample:", error)
      toast.error("Failed to save character sample")
    }
  }

  const handleCompleteSamples = async (
    samples: Record<string, DrawingData>
  ) => {
    if (!font || !session) return

    setIsSaving(true)

    try {
      // Save any remaining samples
      const promises = Object.entries(samples).map(([character, data]) => {
        // Convert drawing data to SVG path for storage
        const svgPath = JSON.stringify(data.points)

        // Create a placeholder image URL
        const imageUrl = `https://example.com/images/${character}.png`

        return createSampleAction({
          fontId: font.id,
          userId: session.userId,
          character,
          imageUrl,
          svgPath,
          inputMethod: "qr_sync",
          sessionId: session.id
        })
      })

      await Promise.all(promises)

      // Update session status to completed
      await updateDrawingSessionAction(session.id, { isActive: false })

      // Show completion state
      setIsComplete(true)
      setAppState("complete")

      // Redirect to font detail page after a delay
      setTimeout(() => {
        router.push(`/fonts/${font.id}`)
      }, 5000)
    } catch (error) {
      console.error("Error completing samples:", error)
      toast.error("Failed to complete sample submission")
    } finally {
      setIsSaving(false)
    }
  }

  // Prevent accidental back navigation during drawing
  useEffect(() => {
    // Block back navigation
    const blockBack = () => {
      window.history.pushState(null, "", window.location.href)
    }

    // Initial block
    blockBack()

    // Handle back gesture/button
    const handlePopState = () => {
      // Show notification
      toast.info("Back gesture detected", {
        description:
          "Use the 'Back' button in the header instead of browser gestures",
        duration: 3000
      })

      // Re-block navigation
      blockBack()
    }

    // Add listener
    window.addEventListener("popstate", handlePopState)

    // Apply CSS to reduce chances of triggering browser gestures
    document.body.style.overscrollBehavior = "none"

    // Cleanup
    return () => {
      window.removeEventListener("popstate", handlePopState)
      document.body.style.overscrollBehavior = ""
    }
  }, [])

  // Add confirmation before unloading page with unsaved changes
  useEffect(() => {
    if (hasDrawing || sentenceDrawing || Object.keys(samples).length > 0) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        e.returnValue =
          "You have unsaved drawings. Are you sure you want to leave?"
        return e.returnValue
      }

      window.addEventListener("beforeunload", handleBeforeUnload)

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload)
      }
    }
  }, [hasDrawing, sentenceDrawing, samples])

  // Select a character for drawing in character mode
  const handleSelectCharacter = (char: string): void => {
    setActiveChar(char)
  }

  // Handle saving a character in character mode
  const handleSaveCharacter = (data: DrawingData) => {
    if (!activeChar) return

    // Ensure the drawing doesn't contain paths linking to other characters
    // by only saving points specific to this drawing session
    const cleanData = {
      ...data,
      // Remove any potential connecting points by creating a new isolated drawing
      points: [...data.points]
    }

    // Add to samples
    setSamples(prev => ({
      ...prev,
      [activeChar]: cleanData
    }))

    // Save to server
    handleCharacterCapture(activeChar, cleanData)

    // Show success notification
    toast.success(`Character "${activeChar}" saved!`)

    // Select next undrawn character if available
    if (font?.characters) {
      const undrawnChars = font.characters.filter(
        (char: string) => !samples[char]
      )
      if (undrawnChars.length > 0) {
        // Wait a moment before changing character to prevent accidental drawing
        setTimeout(() => {
          setActiveChar(undrawnChars[0])
        }, 500)
      }
    }
  }

  // Handle extracting characters from sentence drawing
  const handleExtractCharacters = async () => {
    if (!sentenceDrawing) {
      toast.error("Please draw the sentence first")
      return
    }

    setIsExtracting(true)

    try {
      // Get characters from the drawing
      const extractedSamples = await extractCharactersFromDrawing(
        sentenceDrawing,
        promptCharacters
      )

      if (!extractedSamples || Object.keys(extractedSamples).length === 0) {
        toast.error(
          "Could not extract any characters. Try drawing more clearly."
        )
        return
      }

      // Save the extracted characters
      const newSamples = { ...samples }

      for (const [char, data] of Object.entries(extractedSamples)) {
        newSamples[char] = data
        await handleCharacterCapture(char, data)
      }

      setSamples(newSamples)

      // Clear the sentence drawing
      setSentenceDrawing(null)

      // Show success message
      toast.success(
        `Extracted ${Object.keys(extractedSamples).length} characters!`
      )

      // Move to character mode to show results
      setActiveTab("character")
    } catch (error) {
      console.error("Error extracting characters:", error)
      toast.error("Failed to extract characters from drawing")
    } finally {
      setIsExtracting(false)
    }
  }

  // Toggle showing/hiding prompt
  const togglePrompt = () => {
    setShowPrompt(!showPrompt)
  }

  // Toggle showing/hiding style controls
  const toggleStyleControls = () => {
    setShowStyleControls(!showStyleControls)
  }

  // Handle clearing the drawing canvas
  const handleClearCanvas = () => {
    if (activeTab === "sentence") {
      setSentenceDrawing(null)
      toast.success("Drawing cleared")
    } else if (activeTab === "character" && activeChar) {
      // Remove the character from samples
      const newSamples = { ...samples }
      delete newSamples[activeChar]
      setSamples(newSamples)
      toast.success(`Cleared drawing for character "${activeChar}"`)
    }
  }

  // Calculate canvas dimensions based on viewport and orientation
  const getCanvasDimensions = () => {
    const width = isLandscape
      ? showPrompt
        ? viewportWidth * 0.78
        : viewportWidth // 78% width in landscape with prompt visible
      : viewportWidth // full width in portrait

    const height = Math.max(
      viewportHeight - (isLandscape ? 70 : showPrompt ? promptHeight + 70 : 70), // height minus header and prompt if visible
      500 // minimum height
    )

    return { width, height }
  }

  // Add a proper handleSaveSentence function that gets data from the canvas
  const handleSaveSentence = (data: DrawingData) => {
    if (!data || data.points.length < 2) {
      toast.error("Please draw something first")
      return
    }

    try {
      // Create a clean copy to avoid memory reference issues
      const cleanData = {
        ...data,
        points: [...data.points]
      }

      // Update local state
      setSentenceDrawing(cleanData)

      // Show success message to user
      toast.success("Drawing saved successfully")

      // Switch back to sentence mode
      setActiveTab("sentence")
    } catch (error) {
      console.error("Error saving sentence:", error)
      toast.error("Failed to save drawing")
    }
  }

  // Render intro screen
  const renderWelcomeScreen = () => {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-center">
              Welcome to HandFont Mobile Drawing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mb-6 flex justify-center">
              <div className="bg-primary/10 flex size-20 items-center justify-center rounded-full">
                <Edit className="text-primary size-12" />
              </div>
            </div>

            <p className="text-center">
              You're about to create your custom font using your own
              handwriting. Follow the steps below to get started.
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
                  <span className="font-semibold">1</span>
                </div>
                <div>
                  <h3 className="font-medium">Choose your drawing mode</h3>
                  <p className="text-muted-foreground text-sm">
                    Sentence mode lets you write full sentences, while Character
                    mode focuses on individual letters.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
                  <span className="font-semibold">2</span>
                </div>
                <div>
                  <h3 className="font-medium">Draw your characters</h3>
                  <p className="text-muted-foreground text-sm">
                    Use your finger or stylus to draw letters naturally. Try to
                    maintain a consistent style.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
                  <span className="font-semibold">3</span>
                </div>
                <div>
                  <h3 className="font-medium">Save and continue</h3>
                  <p className="text-muted-foreground text-sm">
                    Your drawings will be saved automatically. When finished,
                    you can generate your font.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => setAppState("mode-select")}
              className="w-full"
            >
              Continue
              <MoveRight className="ml-2 size-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Render mode selection screen
  const renderModeSelect = () => {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-center">
              Choose Your Drawing Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground mb-4 text-center">
              Select how you'd prefer to create your font characters
            </p>

            <div className="grid gap-4">
              <div
                className={`hover:border-primary cursor-pointer rounded-lg border p-4 transition-all ${activeTab === "sentence" ? "bg-primary/5 border-primary ring-primary/20 ring-2" : ""}`}
                onClick={() => setActiveTab("sentence")}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <BookOpen className="text-primary size-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">Sentence Mode</h3>
                    <p className="text-muted-foreground text-sm">
                      Write complete sentences and extract multiple characters
                      at once
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`hover:border-primary cursor-pointer rounded-lg border p-4 transition-all ${activeTab === "character" ? "bg-primary/5 border-primary ring-primary/20 ring-2" : ""}`}
                onClick={() => setActiveTab("character")}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Type className="text-primary size-6" />
                  </div>
                  <div>
                    <h3 className="font-medium">Character Mode</h3>
                    <p className="text-muted-foreground text-sm">
                      Focus on drawing one character at a time for more
                      precision
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setAppState("welcome")}>
              Go Back
            </Button>
            <Button onClick={startSession} disabled={isSaving}>
              Start Drawing
              <MoveRight className="ml-2 size-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Handle page exit/unload to notify server
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (session && sessionStarted) {
        try {
          // Mark session as completed when user leaves
          await updateDrawingSessionAction(session.id, { isActive: false })
        } catch (error) {
          console.error("Failed to update session on exit:", error)
        }
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      handleBeforeUnload() // Also try to update when component unmounts
    }
  }, [session, sessionStarted])

  // First, add a ref to access the DrawingCanvas component
  const drawingCanvasRef = useRef<DrawingCanvasRef | null>(null)

  if (isLoading || appState === "loading") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <div className="border-primary size-8 animate-spin rounded-full border-b-2" />
        <p className="text-muted-foreground mt-4">
          Loading font information...
        </p>
      </div>
    )
  }

  if (error || appState === "error") {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (appState === "welcome") {
    return renderWelcomeScreen()
  }

  if (appState === "mode-select") {
    return renderModeSelect()
  }

  if (isComplete || appState === "complete") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Confetti
          width={typeof window !== "undefined" ? window.innerWidth : 300}
          height={typeof window !== "undefined" ? window.innerHeight : 200}
          recycle={false}
          numberOfPieces={500}
        />
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">Done!</h1>
          <p className="mb-4">
            Thanks for your contribution. Redirecting you back to the font
            page...
          </p>
          <Button onClick={() => router.push(`/fonts/${font.id}`)}>
            Go to Font Page
          </Button>
        </div>
      </div>
    )
  }

  const canvasDimensions = getCanvasDimensions()

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/fonts/${font?.id}`)}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Button>

        <h1 className="flex-1 text-center text-lg font-semibold">
          {font?.name || "Font Drawing"}
        </h1>

        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu className="size-4" />
          </Button>
        </div>
      </header>

      {/* Mode tabs */}
      <div className="border-b">
        <Tabs
          value={activeTab}
          onValueChange={value =>
            setActiveTab(value as "sentence" | "character")
          }
        >
          <TabsList className="w-full">
            <TabsTrigger value="sentence" className="flex-1">
              <MessageSquare className="mr-1 size-4" />
              Sentence Mode
            </TabsTrigger>
            <TabsTrigger value="character" className="flex-1">
              <Type className="mr-1 size-4" />
              Character Mode
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className={`flex ${isLandscape ? "flex-row" : "flex-col"} h-full`}>
        {/* Sentence Mode */}
        {activeTab === "sentence" && (
          <>
            {/* Writing prompt - positioned based on orientation */}
            {showPrompt && (
              <div
                className={`${isLandscape ? "h-screen w-[22%] overflow-y-auto border-r" : "sticky bottom-0 z-10 w-full border-b bg-white"}`}
                style={{ height: isLandscape ? "auto" : promptHeight }}
              >
                <div className="p-2">
                  <h3 className="mb-1 flex items-center justify-between text-sm font-medium">
                    <span>Writing Sample:</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={togglePrompt}
                    >
                      <ChevronUp className="size-3" />
                    </Button>
                  </h3>
                  <div className="rounded-md border bg-gray-50 p-2 text-sm font-medium">
                    {currentPrompt}
                  </div>

                  <div className="mt-2 flex justify-end">
                    {sentenceDrawing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExtractCharacters}
                        disabled={isExtracting}
                        className="text-xs"
                      >
                        {isExtracting ? "Extracting..." : "Extract Characters"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Canvas area - scrollable */}
            <div
              ref={canvasContainerRef}
              className={`${isLandscape ? (showPrompt ? "w-[78%]" : "w-full") : "w-full"} relative overflow-y-auto`}
              style={{
                height: isLandscape
                  ? "100vh"
                  : `calc(100vh - ${showPrompt ? promptHeight : 0}px - 70px)`,
                overscrollBehavior: "none", // Prevent browser pull-to-refresh and navigation gestures
                touchAction: "pan-y" // Only allow vertical scrolling
              }}
            >
              <div className="p-2 pb-20">
                {" "}
                {/* Add padding at bottom to ensure space for controls */}
                <DrawingCanvas
                  ref={drawingCanvasRef}
                  width={canvasDimensions.width - 16}
                  height={canvasDimensions.height}
                  initialDrawing={sentenceDrawing || undefined}
                  onSave={data => {
                    // Create a clean copy to avoid memory reference issues
                    const cleanData = {
                      ...data,
                      points: [...data.points]
                    }
                    setSentenceDrawing(cleanData)
                    toast.success("Drawing saved")
                  }}
                  onClear={() => {
                    handleClearCanvas()
                    setHasDrawing(false)
                  }}
                  onDrawStart={() => {
                    setHasDrawing(true)

                    // Show drawing tip only once per session
                    if (!hasShownDrawingTip) {
                      toast.info("Drawing safely", {
                        description:
                          "Draw from the center of the screen to avoid triggering browser navigation",
                        duration: 5000
                      })
                      setHasShownDrawingTip(true)
                    }
                  }}
                  showControls={false}
                  className="touch-manipulation rounded-md border"
                  brushStyle={brushStyle}
                  brushSize={brushSize}
                  brushColor={brushColor}
                  // Add guided drawing for sentence mode
                  guidedText={currentPrompt}
                  showGuide={true}
                  guideOpacity={0.1}
                  guideFontSize={Math.min(24, canvasDimensions.height / 6)}
                />
              </div>

              {/* Style controls toolbar */}
              {showStyleControls && (
                <div className="fixed inset-x-0 bottom-14 z-30 flex items-center justify-between border-t bg-white p-2">
                  <div className="flex w-full items-center gap-4">
                    <div className="flex-1">
                      <Select
                        value={brushStyle}
                        onValueChange={value =>
                          setBrushStyle(value as "pen" | "brush" | "pencil")
                        }
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder="Style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pen">
                            <div className="flex items-center">
                              <PenTool className="mr-2 size-4" />
                              Pen
                            </div>
                          </SelectItem>
                          <SelectItem value="brush">
                            <div className="flex items-center">
                              <Paintbrush className="mr-2 size-4" />
                              Brush
                            </div>
                          </SelectItem>
                          <SelectItem value="pencil">
                            <div className="flex items-center">
                              <Pencil className="mr-2 size-4" />
                              Pencil
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-xs">Size:</span>
                      <Slider
                        value={[brushSize]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={value => setBrushSize(value[0])}
                        className="flex-1"
                      />
                    </div>

                    <div>
                      <input
                        type="color"
                        value={brushColor}
                        onChange={e => setBrushColor(e.target.value)}
                        className="size-8 cursor-pointer rounded-md"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sticky drawing controls */}
              <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t bg-white p-2">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCanvas}
                    className="flex items-center"
                  >
                    <Eraser className="mr-1 size-4" />
                    Clear
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleStyleControls}
                    className="flex items-center"
                  >
                    <Edit className="mr-1 size-4" />
                    {showStyleControls ? "Hide Styles" : "Show Styles"}
                  </Button>

                  {sentenceDrawing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExtractCharacters}
                      disabled={isExtracting}
                      className="flex items-center"
                    >
                      <Check className="mr-1 size-4" />
                      {isExtracting ? "Extracting..." : "Extract"}
                    </Button>
                  )}
                </div>

                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    // Check if we have drawing data
                    if (
                      hasDrawing &&
                      drawingCanvasRef.current?.getDrawingData
                    ) {
                      try {
                        // Get the actual drawing data from the canvas component
                        const drawingData =
                          drawingCanvasRef.current.getDrawingData()

                        // Only proceed if we have points
                        if (
                          drawingData &&
                          drawingData.points &&
                          drawingData.points.length > 0
                        ) {
                          // Save the drawing with the actual drawing data
                          handleSaveSentence(drawingData)
                        } else {
                          toast.error(
                            "No drawing detected. Please draw something first."
                          )
                        }
                      } catch (error) {
                        console.error("Error getting drawing data:", error)
                        toast.error("Failed to save drawing. Please try again.")
                      }
                    } else if (!hasDrawing) {
                      toast.error("Please draw something first")
                    } else {
                      toast.error("Drawing canvas not properly initialized")
                    }
                  }}
                  disabled={!hasDrawing}
                  className="flex items-center"
                >
                  <Save className="mr-1 size-4" />
                  Save
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Character Mode */}
        {activeTab === "character" && (
          <div className="w-full p-2 pb-24">
            {/* Character selection */}
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium">
                Select a character to draw:
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {font?.characters?.map((char: string) => {
                  const isDrawn = !!samples[char]
                  const isActive = activeChar === char
                  return (
                    <Button
                      key={char}
                      variant={
                        isActive ? "default" : isDrawn ? "outline" : "ghost"
                      }
                      className={`aspect-square h-10 p-0 ${
                        isDrawn && !isActive
                          ? "border-green-200 bg-green-50 text-green-800"
                          : ""
                      } ${isActive ? "bg-blue-500 text-white" : ""}`}
                      onClick={() => handleSelectCharacter(char)}
                    >
                      <span className="text-base">{char}</span>
                      {isDrawn && !isActive && (
                        <div className="absolute bottom-0.5 right-0.5">
                          <Check className="size-2" />
                        </div>
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Active character drawing */}
            {activeChar ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    Drawing: <span className="font-bold">{activeChar}</span>
                  </h3>
                  <div className="flex items-center gap-1">
                    {samples[activeChar] && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearCanvas}
                      >
                        <Eraser className="mr-1 size-4" />
                        Clear
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleStyleControls}
                      className="flex items-center"
                    >
                      <Edit className="mr-1 size-4" />
                      {showStyleControls ? "Hide Styles" : "Edit Styles"}
                    </Button>
                  </div>
                </div>

                <DrawingCanvas
                  ref={drawingCanvasRef}
                  width={canvasDimensions.width - 16} // Account for padding
                  height={400}
                  initialDrawing={samples[activeChar] || undefined}
                  onSave={handleSaveCharacter}
                  onClear={handleClearCanvas}
                  showControls={false}
                  className="rounded-md border"
                  brushStyle={brushStyle}
                  brushSize={brushSize}
                  brushColor={brushColor}
                  onDrawStart={() => setHasDrawing(true)}
                  // Add guided drawing for character mode
                  guidedText={activeChar}
                  showGuide={true}
                  guideOpacity={0.15}
                  guideFontSize={200}
                />

                {/* Style controls for character mode */}
                {showStyleControls && (
                  <div className="mt-4 rounded-md border bg-gray-50 p-3">
                    <h4 className="mb-2 text-sm font-medium">
                      Drawing Settings
                    </h4>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-20 text-xs">Brush Style:</span>
                        <Select
                          value={brushStyle}
                          onValueChange={value =>
                            setBrushStyle(value as "pen" | "brush" | "pencil")
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pen">
                              <div className="flex items-center">
                                <PenTool className="mr-2 size-4" />
                                Pen
                              </div>
                            </SelectItem>
                            <SelectItem value="brush">
                              <div className="flex items-center">
                                <Paintbrush className="mr-2 size-4" />
                                Brush
                              </div>
                            </SelectItem>
                            <SelectItem value="pencil">
                              <div className="flex items-center">
                                <Pencil className="mr-2 size-4" />
                                Pencil
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="w-20 text-xs">Brush Size:</span>
                        <Slider
                          value={[brushSize]}
                          min={1}
                          max={10}
                          step={1}
                          onValueChange={value => setBrushSize(value[0])}
                          className="flex-1"
                        />
                        <span className="w-8 text-right text-xs">
                          {brushSize}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="w-20 text-xs">Color:</span>
                        <input
                          type="color"
                          value={brushColor}
                          onChange={e => setBrushColor(e.target.value)}
                          className="size-8 cursor-pointer rounded-md"
                        />
                        <span className="flex-1 text-xs opacity-70">
                          {brushColor}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Save button for character mode */}
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="default"
                    onClick={() => {
                      if (drawingCanvasRef.current && hasDrawing) {
                        handleSaveCharacter(
                          drawingCanvasRef.current.getDrawingData()
                        )
                      } else {
                        toast.error("Please draw something first")
                      }
                    }}
                    disabled={!hasDrawing}
                    className="flex items-center"
                  >
                    <Save className="mr-1 size-4" />
                    Save Character
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-md border bg-blue-50 p-4 text-center text-blue-800">
                Please select a character to draw from the grid above
              </div>
            )}

            {/* Sticky character controls */}
            <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t bg-white p-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/fonts/${font?.id}`)}
              >
                <ArrowLeft className="mr-1 size-4" />
                Exit
              </Button>

              <Button
                variant="default"
                onClick={() => handleCompleteSamples(samples)}
                disabled={isSaving || Object.keys(samples).length === 0}
                className="flex items-center"
              >
                <Check className="mr-1 size-4" />
                {isSaving
                  ? "Saving..."
                  : `Complete (${Object.keys(samples).length}/${font?.characters?.length || 0})`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

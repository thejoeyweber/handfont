"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DrawingCanvas } from "@/components/ui/drawing-canvas"
import { DrawingData } from "@/types"
import { getUniqueCharacters } from "@/lib/writing-prompts"
import { extractCharactersFromDrawing } from "@/lib/character-extraction"
import {
  ChevronLeft,
  ChevronRight,
  Check,
  RefreshCcw,
  Edit,
  Type,
  Wand2
} from "lucide-react"
import { toast } from "sonner"

interface WritingPromptMobileProps {
  prompts: string[]
  onComplete?: (samples: Record<string, DrawingData>) => void
  onCharacterCapture?: (character: string, data: DrawingData) => void
  initialSamples?: Record<string, DrawingData>
  characterSet: string
}

export function WritingPromptMobile({
  prompts,
  onComplete,
  onCharacterCapture,
  initialSamples = {},
  characterSet
}: WritingPromptMobileProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [samples, setSamples] =
    useState<Record<string, DrawingData>>(initialSamples)
  const [currentDrawing, setCurrentDrawing] = useState<DrawingData | null>(null)
  const [sentenceDrawing, setSentenceDrawing] = useState<DrawingData | null>(
    null
  )
  const [mode, setMode] = useState<"sentence" | "character" | "sentence-draw">(
    "sentence"
  )
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null
  )
  const [extractedCharacters, setExtractedCharacters] = useState<
    Record<string, DrawingData>
  >({})
  const [isExtracting, setIsExtracting] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(0)

  // Update viewport height for full screen canvas
  useEffect(() => {
    setViewportHeight(window.innerHeight)

    const handleResize = () => {
      setViewportHeight(window.innerHeight)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const currentPrompt = prompts[currentIndex]

  // Extract unique characters from the current prompt
  const promptCharacters = getUniqueCharacters(currentPrompt)

  // Filter to only include characters from our target character set
  const targetCharacters = promptCharacters
    .split("")
    .filter(char => characterSet.includes(char))
    .join("")

  // Check which characters have been captured
  const capturedCharacters = Object.keys(samples)
  const remainingCharacters = targetCharacters
    .split("")
    .filter(char => !capturedCharacters.includes(char))
    .join("")

  // Progress calculations
  const promptProgress = currentIndex / prompts.length
  const characterProgress = capturedCharacters.length / characterSet.length

  // Handle saving a drawing for a specific character
  const handleSaveCharacter = (data: DrawingData) => {
    if (!selectedCharacter) return

    // Save the drawing for this character
    const newSamples = {
      ...samples,
      [selectedCharacter]: data
    }

    setSamples(newSamples)
    setCurrentDrawing(null)

    // Call the callback if provided
    if (onCharacterCapture) {
      onCharacterCapture(selectedCharacter, data)
    }

    // If no more characters for this prompt, go to next prompt
    if (remainingCharacters.length <= 1) {
      if (currentIndex < prompts.length - 1) {
        // Go to next prompt
        setCurrentIndex(currentIndex + 1)
        setMode("sentence")
      } else if (onComplete) {
        // Complete the process
        onComplete(newSamples)
      }
    } else {
      // Reset selected character
      setSelectedCharacter(null)
      // Go back to sentence view
      setMode("sentence")
    }
  }

  // Handle saving the sentence drawing
  const handleSaveSentence = (data: DrawingData) => {
    setSentenceDrawing(data)
    setMode("sentence")
  }

  // Handle character selection
  const handleSelectCharacter = (character: string) => {
    setSelectedCharacter(character)

    // Use extracted character if available, otherwise use existing sample or null
    const drawingData =
      extractedCharacters[character] || samples[character] || null
    setCurrentDrawing(drawingData)
    setMode("character")
  }

  // Navigate to previous prompt
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setMode("sentence")
      setSelectedCharacter(null)
      setSentenceDrawing(null)
      setExtractedCharacters({})
    }
  }

  // Navigate to next prompt
  const handleNext = () => {
    if (currentIndex < prompts.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setMode("sentence")
      setSelectedCharacter(null)
      setSentenceDrawing(null)
      setExtractedCharacters({})
    }
  }

  // Return to sentence view
  const handleBackToSentence = () => {
    setMode("sentence")
    setSelectedCharacter(null)
  }

  // Switch to sentence drawing mode
  const handleDrawSentence = () => {
    setMode("sentence-draw")
  }

  // Extract characters from sentence drawing
  const handleExtractCharacters = async () => {
    if (!sentenceDrawing) {
      toast.error("Please draw the sentence first")
      return
    }

    setIsExtracting(true)

    try {
      // Extract characters from the drawing
      const extracted = extractCharactersFromDrawing(
        sentenceDrawing,
        currentPrompt
      )

      // Update extracted characters
      setExtractedCharacters(extracted)

      // Update samples with extracted characters
      const newSamples = { ...samples }

      // Only add characters that are in our target set
      Object.entries(extracted).forEach(([char, data]) => {
        if (characterSet.includes(char)) {
          newSamples[char] = data

          // Call the callback if provided
          if (onCharacterCapture) {
            onCharacterCapture(char, data)
          }
        }
      })

      setSamples(newSamples)

      toast.success(`Extracted ${Object.keys(extracted).length} characters`)

      // If all characters are captured, go to next prompt
      const remainingAfterExtraction = targetCharacters
        .split("")
        .filter(char => !Object.keys(newSamples).includes(char))
        .join("")

      if (remainingAfterExtraction.length === 0) {
        if (currentIndex < prompts.length - 1) {
          // Go to next prompt
          setTimeout(() => {
            setCurrentIndex(currentIndex + 1)
            setMode("sentence")
            setSentenceDrawing(null)
            setExtractedCharacters({})
          }, 1000)
        } else if (onComplete) {
          // Complete the process
          setTimeout(() => {
            onComplete(newSamples)
          }, 1000)
        }
      }
    } catch (error) {
      console.error("Error extracting characters:", error)
      toast.error("Failed to extract characters")
    } finally {
      setIsExtracting(false)
    }
  }

  // Calculate canvas height based on viewport
  const getCanvasHeight = () => {
    if (mode === "character") {
      // For character drawing, use more space
      return Math.min(viewportHeight * 0.7, 500)
    } else if (mode === "sentence-draw") {
      // For sentence drawing, use a wider but shorter canvas
      return Math.min(viewportHeight * 0.5, 300)
    }
    return 0 // Not used in sentence mode
  }

  // Calculate canvas width based on viewport
  const getCanvasWidth = () => {
    if (mode === "character") {
      // For character drawing, use a square canvas
      return Math.min(window.innerWidth * 0.9, 500)
    } else if (mode === "sentence-draw") {
      // For sentence drawing, use full width
      return Math.min(window.innerWidth * 0.95, 800)
    }
    return 0 // Not used in sentence mode
  }

  // Sticky prompt component for character and sentence drawing modes
  const renderStickyPrompt = () => {
    if (mode === "character") {
      return (
        <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between border-t bg-white p-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToSentence}
              className="mr-2"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span>
              Draw: <strong className="text-xl">{selectedCharacter}</strong>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDrawing(null)}
          >
            <RefreshCcw className="mr-1 size-4" />
            Clear
          </Button>
        </div>
      )
    } else if (mode === "sentence-draw") {
      return (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToSentence}
              className="mr-2"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (sentenceDrawing) {
                  handleSaveSentence(sentenceDrawing)
                }
              }}
            >
              <Check className="mr-1 size-4" />
              Done
            </Button>
          </div>
          <div className="rounded-lg border bg-gray-50 p-2 text-base font-medium">
            {currentPrompt}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      {/* Sticky prompt when in drawing modes */}
      {renderStickyPrompt()}

      {/* Progress bar */}
      <div className="mb-4">
        <div className="mb-1 text-sm font-medium">
          {Math.round(characterProgress * 100)}% of characters captured
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="bg-primary h-2 rounded-full"
            style={{ width: `${characterProgress * 100}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Prompt {currentIndex + 1} of {prompts.length}
        </div>
      </div>

      {mode === "sentence" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Write this sentence</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDrawSentence}
                className="flex items-center"
              >
                <Edit className="mr-2 size-4" />
                Draw Sentence
              </Button>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="mb-4 rounded-lg border bg-gray-50 p-4 text-lg font-medium">
              {currentPrompt}
            </div>

            {sentenceDrawing && (
              <div className="mb-6 rounded-lg border bg-gray-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Your handwriting:</h3>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExtractCharacters}
                    disabled={isExtracting}
                    className="flex items-center"
                  >
                    <Wand2 className="mr-2 size-4" />
                    {isExtracting ? "Extracting..." : "Auto-Extract"}
                  </Button>
                </div>

                <div className="rounded-lg border bg-white p-2">
                  <canvas
                    width={sentenceDrawing.width}
                    height={sentenceDrawing.height}
                    className="w-full"
                    ref={canvas => {
                      if (canvas && sentenceDrawing) {
                        const ctx = canvas.getContext("2d")
                        if (ctx) {
                          ctx.clearRect(0, 0, canvas.width, canvas.height)
                          ctx.lineWidth = 2
                          ctx.lineCap = "round"
                          ctx.lineJoin = "round"
                          ctx.strokeStyle = "#000000"

                          if (sentenceDrawing.points.length > 1) {
                            ctx.beginPath()
                            ctx.moveTo(
                              sentenceDrawing.points[0].x,
                              sentenceDrawing.points[0].y
                            )

                            for (
                              let i = 1;
                              i < sentenceDrawing.points.length;
                              i++
                            ) {
                              const p1 = sentenceDrawing.points[i - 1]
                              const p2 = sentenceDrawing.points[i]

                              const xc = (p1.x + p2.x) / 2
                              const yc = (p1.y + p2.y) / 2

                              ctx.quadraticCurveTo(p1.x, p1.y, xc, yc)
                            }

                            ctx.lineTo(
                              sentenceDrawing.points[
                                sentenceDrawing.points.length - 1
                              ].x,
                              sentenceDrawing.points[
                                sentenceDrawing.points.length - 1
                              ].y
                            )
                            ctx.stroke()
                          }
                        }
                      }
                    }}
                  />
                </div>

                {Object.keys(extractedCharacters).length > 0 && (
                  <div className="mt-4">
                    <h3 className="mb-2 text-sm font-medium">
                      Extracted characters:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(extractedCharacters).map(
                        ([char, data]) => (
                          <div
                            key={char}
                            className="relative flex size-12 items-center justify-center rounded-md border bg-white"
                            onClick={() => handleSelectCharacter(char)}
                          >
                            <canvas
                              width={data.width}
                              height={data.height}
                              className="size-10"
                              ref={canvas => {
                                if (canvas && data) {
                                  const ctx = canvas.getContext("2d")
                                  if (ctx) {
                                    ctx.clearRect(
                                      0,
                                      0,
                                      canvas.width,
                                      canvas.height
                                    )
                                    ctx.lineWidth = 2
                                    ctx.lineCap = "round"
                                    ctx.lineJoin = "round"
                                    ctx.strokeStyle = "#000000"

                                    if (data.points.length > 1) {
                                      ctx.beginPath()
                                      ctx.moveTo(
                                        data.points[0].x,
                                        data.points[0].y
                                      )

                                      for (
                                        let i = 1;
                                        i < data.points.length;
                                        i++
                                      ) {
                                        const p1 = data.points[i - 1]
                                        const p2 = data.points[i]

                                        const xc = (p1.x + p2.x) / 2
                                        const yc = (p1.y + p2.y) / 2

                                        ctx.quadraticCurveTo(p1.x, p1.y, xc, yc)
                                      }

                                      ctx.lineTo(
                                        data.points[data.points.length - 1].x,
                                        data.points[data.points.length - 1].y
                                      )
                                      ctx.stroke()
                                    }
                                  }
                                }
                              }}
                            />
                            <div className="absolute bottom-0 right-0 rounded-tl-md bg-gray-100 px-1 text-xs">
                              {char}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium">
                Click on characters to draw individually:
              </h3>
              <div className="flex flex-wrap gap-2">
                {targetCharacters.split("").map((char, index) => {
                  const isCaptured = capturedCharacters.includes(char)

                  return (
                    <Button
                      key={`${char}-${index}`}
                      variant={isCaptured ? "default" : "outline"}
                      size="sm"
                      className={`size-10 ${isCaptured ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}`}
                      onClick={() => handleSelectCharacter(char)}
                    >
                      {char}
                      {isCaptured && <Check className="ml-1 size-3" />}
                    </Button>
                  )
                })}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="mr-2 size-4" />
              Previous
            </Button>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentIndex === prompts.length - 1}
            >
              Next
              <ChevronRight className="ml-2 size-4" />
            </Button>
          </CardFooter>
        </Card>
      ) : mode === "character" ? (
        <div className="pb-24 pt-4">
          <DrawingCanvas
            width={getCanvasWidth()}
            height={getCanvasHeight()}
            onSave={handleSaveCharacter}
            initialDrawing={currentDrawing || undefined}
            className="mx-auto"
          />
        </div>
      ) : (
        <div className="pb-28 pt-4">
          <DrawingCanvas
            width={getCanvasWidth()}
            height={getCanvasHeight()}
            onSave={handleSaveSentence}
            initialDrawing={sentenceDrawing || undefined}
            className="mx-auto"
          />
        </div>
      )}
    </div>
  )
}

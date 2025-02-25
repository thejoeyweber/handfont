"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { DrawingData } from "@/types"

interface FontPreviewProps {
  samples: Record<string, DrawingData>
  className?: string
}

export function FontPreview({ samples, className }: FontPreviewProps) {
  const [previewText, setPreviewText] = useState(
    "The quick brown fox jumps over the lazy dog"
  )
  const [fontSize, setFontSize] = useState(24)
  const [lineHeight, setLineHeight] = useState(1.5)
  const [letterSpacing, setLetterSpacing] = useState(1)
  const [canvasWidth, setCanvasWidth] = useState(800)
  const [canvasHeight, setCanvasHeight] = useState(400)

  // Reference to the canvas element
  const canvasRef = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set canvas dimensions
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    // Draw preview text
    drawPreviewText(ctx)
  }

  // Draw the preview text on the canvas
  const drawPreviewText = (ctx: CanvasRenderingContext2D) => {
    // Set background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Set text properties
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#000000"

    // Calculate starting position
    let x = 20
    let y = fontSize + 20
    const maxWidth = canvasWidth - 40

    // Split text into words
    const words = previewText.split(" ")

    // Draw each word
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const wordWidth = calculateWordWidth(word)

      // Check if word fits on current line
      if (x + wordWidth > maxWidth) {
        // Move to next line
        x = 20
        y += fontSize * lineHeight
      }

      // Draw word
      drawWord(ctx, word, x, y)

      // Move to next word position
      x += wordWidth + fontSize * 0.5 // Add space between words
    }
  }

  // Calculate the width of a word based on character samples
  const calculateWordWidth = (word: string): number => {
    let width = 0

    for (let i = 0; i < word.length; i++) {
      const char = word[i]

      // Use default width if character not in samples
      if (!samples[char]) {
        width += fontSize * 0.6
        continue
      }

      // Calculate width based on sample aspect ratio
      const sample = samples[char]
      const sampleWidth = sample.width
      const sampleHeight = sample.height
      const aspectRatio = sampleWidth / sampleHeight

      width += fontSize * aspectRatio * letterSpacing
    }

    return width
  }

  // Draw a word on the canvas
  const drawWord = (
    ctx: CanvasRenderingContext2D,
    word: string,
    x: number,
    y: number
  ) => {
    let currentX = x

    for (let i = 0; i < word.length; i++) {
      const char = word[i]

      // Skip if character not in samples
      if (!samples[char]) {
        // Draw placeholder rectangle
        ctx.fillStyle = "#f0f0f0"
        ctx.fillRect(currentX, y - fontSize, fontSize * 0.6, fontSize)
        currentX += fontSize * 0.6 * letterSpacing
        continue
      }

      // Get character sample
      const sample = samples[char]

      // Calculate dimensions based on font size
      const sampleWidth = sample.width
      const sampleHeight = sample.height
      const aspectRatio = sampleWidth / sampleHeight
      const charWidth = fontSize * aspectRatio
      const charHeight = fontSize

      // Draw character
      drawCharacter(
        ctx,
        sample,
        currentX,
        y - charHeight,
        charWidth,
        charHeight
      )

      // Move to next character position
      currentX += charWidth * letterSpacing
    }
  }

  // Draw a character on the canvas
  const drawCharacter = (
    ctx: CanvasRenderingContext2D,
    sample: DrawingData,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    // Skip if no points
    if (!sample.points || sample.points.length < 2) return

    // Save context state
    ctx.save()

    // Set up transformation
    const scaleX = width / sample.width
    const scaleY = height / sample.height

    ctx.translate(x, y)
    ctx.scale(scaleX, scaleY)

    // First draw the reference character in light gray
    drawReferenceCharacter(ctx, sample, width, height)

    // Then draw the actual handwritten character in black
    ctx.beginPath()
    ctx.moveTo(sample.points[0].x, sample.points[0].y)

    for (let i = 1; i < sample.points.length; i++) {
      const p1 = sample.points[i - 1]
      const p2 = sample.points[i]

      // Use quadratic curves for smoother lines
      const xc = (p1.x + p2.x) / 2
      const yc = (p1.y + p2.y) / 2

      ctx.quadraticCurveTo(p1.x, p1.y, xc, yc)
    }

    // Connect to the last point
    ctx.lineTo(
      sample.points[sample.points.length - 1].x,
      sample.points[sample.points.length - 1].y
    )
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.stroke()

    // Restore context state
    ctx.restore()
  }

  // Draw a reference character in the background
  const drawReferenceCharacter = (
    ctx: CanvasRenderingContext2D,
    sample: DrawingData,
    width: number,
    height: number
  ) => {
    // Find the character this sample represents
    const char = Object.entries(samples).find(([_, s]) => s === sample)?.[0]
    if (!char) return

    // Save context for the reference character
    ctx.save()

    // Reset the transformation to draw in parent coordinates
    ctx.resetTransform()

    // Set up monospace font style
    ctx.font = `${height * 0.8}px monospace`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "rgba(200, 200, 200, 0.2)" // Very light gray, mostly transparent

    // Calculate center position for the character in parent coordinates
    const centerX = width / 2
    const centerY = height / 2

    // Draw the reference character
    ctx.fillText(char, centerX, centerY)

    // Restore previous context state
    ctx.restore()
  }

  // Calculate canvas height based on text and font size
  useEffect(() => {
    // Estimate number of lines
    const words = previewText.split(" ")
    let lineCount = 1
    let lineWidth = 0
    const maxWidth = canvasWidth - 40

    for (let i = 0; i < words.length; i++) {
      const wordWidth = calculateWordWidth(words[i])

      if (lineWidth + wordWidth > maxWidth) {
        lineCount++
        lineWidth = wordWidth
      } else {
        lineWidth += wordWidth + fontSize * 0.5
      }
    }

    // Calculate height based on line count
    const newHeight = lineCount * fontSize * lineHeight + 40
    setCanvasHeight(newHeight)
  }, [previewText, fontSize, lineHeight, letterSpacing, samples, canvasWidth])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Font Preview</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <Label htmlFor="preview-text">Preview Text</Label>
          <Input
            id="preview-text"
            value={previewText}
            onChange={e => setPreviewText(e.target.value)}
            placeholder="Enter text to preview"
            className="mt-1"
          />
        </div>

        <div className="mb-4 grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="font-size">Font Size: {fontSize}px</Label>
            <Slider
              id="font-size"
              min={12}
              max={72}
              step={1}
              value={[fontSize]}
              onValueChange={value => setFontSize(value[0])}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="line-height">
              Line Height: {lineHeight.toFixed(1)}
            </Label>
            <Slider
              id="line-height"
              min={1}
              max={3}
              step={0.1}
              value={[lineHeight]}
              onValueChange={value => setLineHeight(value[0])}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="letter-spacing">
              Letter Spacing: {letterSpacing.toFixed(1)}
            </Label>
            <Slider
              id="letter-spacing"
              min={0.5}
              max={2}
              step={0.1}
              value={[letterSpacing]}
              onValueChange={value => setLetterSpacing(value[0])}
              className="mt-1"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="w-full"
          />
        </div>

        <div className="mt-6">
          <h3 className="mb-3 font-medium">Character Samples</h3>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
            {Object.entries(samples).map(([char, data]) => (
              <div
                key={char}
                className="relative rounded-md border bg-white p-1"
              >
                <div className="absolute inset-0 flex items-center justify-center font-mono text-3xl text-gray-200">
                  {char}
                </div>
                <canvas
                  width={data.width}
                  height={data.height}
                  className="relative z-10 h-12 w-full"
                  ref={canvas => {
                    if (canvas && data) {
                      const ctx = canvas.getContext("2d")
                      if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height)
                        ctx.lineWidth = 2
                        ctx.lineCap = "round"
                        ctx.lineJoin = "round"
                        ctx.strokeStyle = "#000000"

                        if (data.points.length > 1) {
                          ctx.beginPath()
                          ctx.moveTo(data.points[0].x, data.points[0].y)

                          for (let i = 1; i < data.points.length; i++) {
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
                <div className="mt-1 text-center text-xs font-medium text-gray-700">
                  {char}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>Characters captured: {Object.keys(samples).length}</p>
          <p className="mt-1">
            Missing characters will appear as gray boxes. Draw more characters
            to complete your font.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle
} from "react"
import { Button } from "@/components/ui/button"
import { DrawingData, DrawingPoint } from "@/types"
import { cn } from "@/lib/utils"
import {
  Eraser,
  Redo,
  Undo,
  Save,
  PenTool,
  Paintbrush,
  Pencil,
  ZoomIn,
  ZoomOut
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

type BrushStyle = "pen" | "brush" | "pencil"

interface DrawingCanvasProps {
  width?: number
  height?: number
  onSave?: (data: DrawingData) => void
  onClear?: () => void
  className?: string
  readOnly?: boolean
  initialDrawing?: DrawingData
  showControls?: boolean
  brushStyle?: "pen" | "brush" | "pencil"
  brushSize?: number
  brushColor?: string
  onDrawStart?: () => void
  guidedText?: string
  showGuide?: boolean
  guideOpacity?: number
  guideFontSize?: number
}

// Define what methods can be called via the forwarded ref
export interface DrawingCanvasRef {
  getDrawingData: () => DrawingData
  clearCanvas: () => void
}

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  (
    {
      width = 400,
      height = 200,
      onSave,
      onClear,
      className,
      readOnly = false,
      initialDrawing,
      showControls = true,
      brushStyle: propBrushStyle,
      brushSize: propBrushSize,
      brushColor: propBrushColor,
      onDrawStart,
      guidedText = "",
      showGuide = false,
      guideOpacity = 0.2,
      guideFontSize = 0
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [currentPoints, setCurrentPoints] = useState<DrawingPoint[]>([])
    const [history, setHistory] = useState<DrawingPoint[][]>([])
    const [redoStack, setRedoStack] = useState<DrawingPoint[][]>([])
    const [brushStyle, setBrushStyle] = useState<BrushStyle>(
      propBrushStyle || "pen"
    )
    const [brushSize, setBrushSize] = useState(propBrushSize || 2)
    const [brushColor, setBrushColor] = useState(propBrushColor || "#000000")
    const [scale, setScale] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [isPanning, setIsPanning] = useState(false)
    const [lastTouchTime, setLastTouchTime] = useState(0)
    const [touchCount, setTouchCount] = useState(0)
    const [initialPinchDistance, setInitialPinchDistance] = useState<
      number | null
    >(null)
    const [initialScale, setInitialScale] = useState(1)

    // Expose methods via the forwarded ref
    useImperativeHandle(ref, () => ({
      // Returns the current drawing data
      getDrawingData: () => {
        // Flatten all points from history and current points
        const allPoints = [...history.flat(), ...currentPoints]

        return {
          points: allPoints,
          width,
          height
        }
      },
      // Clears the canvas
      clearCanvas: () => {
        handleClear()
      }
    }))

    // Update internal state when props change
    useEffect(() => {
      if (propBrushStyle) {
        setBrushStyle(propBrushStyle)
      }
    }, [propBrushStyle])

    useEffect(() => {
      if (propBrushSize) {
        setBrushSize(propBrushSize)
      }
    }, [propBrushSize])

    useEffect(() => {
      if (propBrushColor) {
        setBrushColor(propBrushColor)
      }
    }, [propBrushColor])

    // Initialize canvas and load initial drawing if provided
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Set canvas resolution
      canvas.width = width
      canvas.height = height

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw guide text if enabled
      if (showGuide && guidedText) {
        drawGuideText(ctx)
      }

      // Set up drawing style
      updateBrushStyle(ctx)

      // Draw initial drawing if provided
      if (initialDrawing && initialDrawing.points.length > 0) {
        drawPointsOnCanvas(initialDrawing.points, ctx)
        setCurrentPoints(initialDrawing.points)
      }
    }, [
      width,
      height,
      initialDrawing,
      brushStyle,
      brushSize,
      brushColor,
      showGuide,
      guidedText,
      guideFontSize,
      guideOpacity
    ])

    // Draw guide text in the background
    const drawGuideText = (ctx: CanvasRenderingContext2D) => {
      if (!guidedText) return

      // Save context state
      ctx.save()

      // Calculate font size if not specified
      const fontSize = guideFontSize || height / 3

      // Set up font style
      ctx.font = `${fontSize}px monospace`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = `rgba(150, 150, 150, ${guideOpacity})`

      // Calculate text position
      const centerX = width / 2
      const centerY = height / 2

      // Measure text width to handle scaling
      const textMetrics = ctx.measureText(guidedText)
      const textWidth = textMetrics.width

      // Scale text if needed to fit within canvas
      if (textWidth > width * 0.9) {
        const scale = (width * 0.9) / textWidth
        ctx.scale(scale, 1)
      }

      // Draw the guide text
      ctx.fillText(guidedText, centerX, centerY)

      // Restore context
      ctx.restore()
    }

    // Apply transformations when scale or offset changes
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw guide text first if enabled
      if (showGuide && guidedText) {
        drawGuideText(ctx)
      }

      // Apply transformations
      ctx.save()
      ctx.translate(offset.x, offset.y)
      ctx.scale(scale, scale)

      // Redraw all strokes
      history.forEach(stroke => {
        updateBrushStyle(ctx)
        drawPointsOnCanvas(stroke, ctx)
      })

      // Draw current stroke if any
      if (currentPoints.length > 0) {
        updateBrushStyle(ctx)
        drawPointsOnCanvas(currentPoints, ctx)
      }

      ctx.restore()
    }, [
      scale,
      offset,
      history,
      currentPoints,
      brushStyle,
      brushSize,
      brushColor,
      showGuide,
      guidedText,
      guideFontSize,
      guideOpacity
    ])

    // Update brush style based on current settings
    const updateBrushStyle = (ctx: CanvasRenderingContext2D) => {
      ctx.lineWidth = brushSize
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.strokeStyle = brushColor

      // Apply different styles based on brush type
      switch (brushStyle) {
        case "pen":
          ctx.lineWidth = brushSize
          ctx.globalAlpha = 1.0
          break
        case "brush":
          ctx.lineWidth = brushSize * 1.5
          ctx.globalAlpha = 0.8
          break
        case "pencil":
          ctx.lineWidth = brushSize * 0.8
          ctx.globalAlpha = 0.9
          break
        default:
          break
      }
    }

    // Draw points on canvas
    const drawPointsOnCanvas = (
      points: DrawingPoint[],
      ctx: CanvasRenderingContext2D
    ) => {
      if (points.length < 2) return

      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)

      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1]
        const p2 = points[i]

        // Use quadratic curves for smoother lines
        const xc = (p1.x + p2.x) / 2
        const yc = (p1.y + p2.y) / 2

        // Apply pressure sensitivity if available
        if (p1.pressure !== undefined && brushStyle !== "pencil") {
          ctx.lineWidth = brushSize * (p1.pressure * 2)
        }

        // For pencil style, add some jitter
        if (brushStyle === "pencil") {
          const jitter = brushSize * 0.1
          const jx = xc + (Math.random() - 0.5) * jitter
          const jy = yc + (Math.random() - 0.5) * jitter
          ctx.quadraticCurveTo(p1.x, p1.y, jx, jy)
        } else {
          ctx.quadraticCurveTo(p1.x, p1.y, xc, yc)
        }
      }

      // Connect to the last point
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
      ctx.stroke()
    }

    // Convert screen coordinates to canvas coordinates
    const screenToCanvas = (x: number, y: number) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      const canvasX = (x - rect.left - offset.x) / scale
      const canvasY = (y - rect.top - offset.y) / scale

      return { x: canvasX, y: canvasY }
    }

    // Handle drawing start
    const handleStart = (
      e: React.MouseEvent | React.TouchEvent | PointerEvent
    ) => {
      if (readOnly) return

      // Handle multi-touch gestures
      if (e.type === "touchstart") {
        const touchEvent = e as React.TouchEvent
        const touches = touchEvent.touches.length
        setTouchCount(touches)

        // Two-finger touch - start panning or pinch-to-zoom
        if (touches === 2) {
          e.preventDefault()
          setIsPanning(true)

          // Calculate initial distance for pinch-to-zoom
          const touch1 = touchEvent.touches[0]
          const touch2 = touchEvent.touches[1]
          const distance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
          )
          setInitialPinchDistance(distance)
          setInitialScale(scale)
          return
        }

        // Detect double tap with two fingers (for undo)
        const now = Date.now()
        if (touches === 2 && now - lastTouchTime < 300) {
          e.preventDefault()
          handleUndo()
          return
        }
        setLastTouchTime(now)
      }

      // Start drawing
      setIsDrawing(true)
      setRedoStack([]) // Clear redo stack when drawing starts

      // Notify parent that drawing has started
      if (onDrawStart) {
        onDrawStart()
      }

      const canvas = canvasRef.current
      if (!canvas) return

      let clientX, clientY

      if (e instanceof PointerEvent || e.type === "mousedown") {
        clientX = (e as any).clientX
        clientY = (e as any).clientY
      } else {
        // Touch event
        clientX = (e as React.TouchEvent).touches[0].clientX
        clientY = (e as React.TouchEvent).touches[0].clientY
      }

      const pressure = e instanceof PointerEvent ? e.pressure : undefined
      const { x, y } = screenToCanvas(clientX, clientY)

      const newPoints: DrawingPoint[] = [{ x, y, pressure }]
      setCurrentPoints(newPoints)

      // Start new stroke
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.save()
      ctx.translate(offset.x, offset.y)
      ctx.scale(scale, scale)
      updateBrushStyle(ctx)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.stroke()
      ctx.restore()
    }

    // Handle drawing movement
    const handleMove = (
      e: React.MouseEvent | React.TouchEvent | PointerEvent
    ) => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Handle panning and pinch-to-zoom
      if (e.type === "touchmove") {
        const touchEvent = e as React.TouchEvent
        const touches = touchEvent.touches.length

        // Handle pinch-to-zoom
        if (touches === 2 && initialPinchDistance !== null) {
          e.preventDefault()

          const touch1 = touchEvent.touches[0]
          const touch2 = touchEvent.touches[1]

          // Calculate new distance
          const distance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
          )

          // Calculate new scale
          const newScale = initialScale * (distance / initialPinchDistance)

          // Limit scale to reasonable values
          const limitedScale = Math.min(Math.max(newScale, 0.5), 5)
          setScale(limitedScale)

          // Calculate center point for zooming
          const centerX = (touch1.clientX + touch2.clientX) / 2
          const centerY = (touch1.clientY + touch2.clientY) / 2

          // Adjust offset to zoom around center point
          const rect = canvas.getBoundingClientRect()
          const canvasCenterX = rect.left + rect.width / 2
          const canvasCenterY = rect.top + rect.height / 2

          setOffset(prev => ({
            x:
              prev.x +
              (centerX - canvasCenterX) * (1 - limitedScale / initialScale),
            y:
              prev.y +
              (centerY - canvasCenterY) * (1 - limitedScale / initialScale)
          }))

          return
        }

        // Handle panning with two fingers
        if (isPanning && touches === 2) {
          e.preventDefault()

          const touch = touchEvent.touches[0]
          const movementX =
            touch.clientX -
            (touchEvent.target as HTMLElement).getBoundingClientRect().left
          const movementY =
            touch.clientY -
            (touchEvent.target as HTMLElement).getBoundingClientRect().top

          setOffset(prev => ({
            x: prev.x + movementX * 0.1,
            y: prev.y + movementY * 0.1
          }))

          return
        }
      }

      if (!isDrawing || readOnly) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      let clientX, clientY

      if (e instanceof PointerEvent || e.type === "mousemove") {
        clientX = (e as any).clientX
        clientY = (e as any).clientY
      } else {
        // Touch event
        clientX = (e as React.TouchEvent).touches[0].clientX
        clientY = (e as React.TouchEvent).touches[0].clientY
      }

      const pressure = e instanceof PointerEvent ? e.pressure : undefined
      const { x, y } = screenToCanvas(clientX, clientY)

      // Add point to current stroke
      const newPoints = [...currentPoints, { x, y, pressure }]
      setCurrentPoints(newPoints)

      // Draw line to new point
      ctx.save()
      ctx.translate(offset.x, offset.y)
      ctx.scale(scale, scale)
      updateBrushStyle(ctx)
      drawPointsOnCanvas(newPoints, ctx)
      ctx.restore()
    }

    // Handle drawing end
    const handleEnd = (
      e: React.MouseEvent | React.TouchEvent | PointerEvent
    ) => {
      // Reset touch tracking
      if (e.type === "touchend") {
        const touchEvent = e as React.TouchEvent
        setTouchCount(touchEvent.touches.length)

        if (isPanning) {
          setIsPanning(false)
          setInitialPinchDistance(null)
          return
        }
      }

      if (!isDrawing || readOnly) return

      setIsDrawing(false)

      if (currentPoints.length > 1) {
        // Add current stroke to history
        setHistory([...history, currentPoints])
      }

      // Reset current points
      setCurrentPoints([])
    }

    // Handle wheel event for zooming
    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault()

      // Calculate new scale
      const delta = e.deltaY * -0.01
      const newScale = scale * (1 + delta)

      // Limit scale to reasonable values
      const limitedScale = Math.min(Math.max(newScale, 0.5), 5)

      // Calculate mouse position relative to canvas
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Calculate new offset to zoom toward mouse position
      const newOffset = {
        x: offset.x - (mouseX - offset.x) * (limitedScale / scale - 1),
        y: offset.y - (mouseY - offset.y) * (limitedScale / scale - 1)
      }

      setScale(limitedScale)
      setOffset(newOffset)
    }

    // Reset zoom and pan
    const handleResetView = () => {
      setScale(1)
      setOffset({ x: 0, y: 0 })
    }

    // Zoom in
    const handleZoomIn = () => {
      const newScale = Math.min(scale * 1.2, 5)
      setScale(newScale)
    }

    // Zoom out
    const handleZoomOut = () => {
      const newScale = Math.max(scale / 1.2, 0.5)
      setScale(newScale)
    }

    // Undo last stroke
    const handleUndo = () => {
      if (history.length === 0) return

      const newHistory = [...history]
      const lastStroke = newHistory.pop()

      if (lastStroke) {
        setRedoStack([...redoStack, lastStroke])
      }

      setHistory(newHistory)
    }

    // Redo last undone stroke
    const handleRedo = () => {
      if (redoStack.length === 0) return

      const newRedoStack = [...redoStack]
      const strokeToRedo = newRedoStack.pop()

      if (strokeToRedo) {
        setHistory([...history, strokeToRedo])
      }

      setRedoStack(newRedoStack)
    }

    // Clear canvas
    const handleClear = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Redraw guide text if enabled
      if (showGuide && guidedText) {
        drawGuideText(ctx)
      }

      // Add current state to redo stack if there's history
      if (history.length > 0) {
        setRedoStack([...redoStack, ...history])
      }

      // Reset history and current points
      setHistory([])
      setCurrentPoints([])

      // Call onClear callback if provided
      if (onClear) {
        onClear()
      }
    }

    // New function: completely clear all drawing data when starting a new drawing
    const clearAllDrawingData = () => {
      // Reset all drawing state
      setHistory([])
      setRedoStack([])
      setCurrentPoints([])

      // Clear the canvas
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          // Redraw guide text if enabled
          if (showGuide && guidedText) {
            drawGuideText(ctx)
          }
        }
      }

      // Call onClear callback if provided
      if (onClear) {
        onClear()
      }
    }

    // Save drawing
    const handleSave = () => {
      if (!onSave) return

      // Flatten all points
      const allPoints = history.flat()

      // Call onSave callback with drawing data
      onSave({
        points: allPoints,
        width,
        height
      })
    }

    // Get brush icon based on current style
    const getBrushIcon = () => {
      switch (brushStyle) {
        case "pen":
          return <PenTool className="size-4" />
        case "brush":
          return <Paintbrush className="size-4" />
        case "pencil":
          return <Pencil className="size-4" />
        default:
          return <PenTool className="size-4" />
      }
    }

    // Add guide controls if applicable
    const renderGuideControls = () => {
      if (!guidedText) return null

      return (
        <div className="mt-2 flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showGuide}
              onChange={e => (showGuide = e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Show Guide</span>
          </label>

          {showGuide && (
            <Slider
              value={[guideOpacity * 100]}
              min={5}
              max={40}
              step={5}
              onValueChange={value => (guideOpacity = value[0] / 100)}
              className="w-24"
            />
          )}
        </div>
      )
    }

    return (
      <div className={cn("flex flex-col items-center", className)}>
        <div
          ref={containerRef}
          className="relative touch-none overflow-hidden rounded-md border"
          style={{ width, height }}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="absolute left-0 top-0 touch-none"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            style={{
              width: "100%",
              height: "100%",
              cursor: isDrawing ? "crosshair" : "default"
            }}
          />

          {/* Zoom indicator */}
          <div className="absolute bottom-2 right-2 rounded-md bg-white/80 px-2 py-1 font-mono text-xs dark:bg-gray-800/80">
            {Math.round(scale * 100)}%
          </div>
        </div>

        {showControls && (
          <div className="mt-4 flex w-full flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  title="Undo"
                >
                  <Undo className="size-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  title="Redo"
                >
                  <Redo className="size-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  title="Clear"
                >
                  <Eraser className="size-4" />
                </Button>

                <div className="mx-1 h-6 border-l" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  title="Zoom In"
                >
                  <ZoomIn className="size-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                >
                  <ZoomOut className="size-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetView}
                  title="Reset View"
                  className="text-xs"
                >
                  Reset
                </Button>
              </div>

              {onSave && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={history.length === 0}
                >
                  <Save className="mr-1 size-4" />
                  Save
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select
                  value={brushStyle}
                  onValueChange={value => setBrushStyle(value as BrushStyle)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Brush Style" />
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

            {/* Add guide controls */}
            {guidedText && renderGuideControls()}
          </div>
        )}

        {/* Gesture instructions */}
        <div className="mt-2 text-center text-xs text-gray-500">
          <p>Pinch to zoom • Two-finger tap to undo • Two-finger drag to pan</p>
        </div>
      </div>
    )
  }
)

DrawingCanvas.displayName = "DrawingCanvas"

export type DrawingPoint = {
  x: number
  y: number
  pressure?: number
}

export type DrawingData = {
  points: DrawingPoint[]
  width: number
  height: number
}

export type FontGenerationOptions = {
  name: string
  description?: string
  weight?: "regular" | "bold" | "light" | "thin"
  style?: "normal" | "italic"
  includeNumbers?: boolean
  includeSymbols?: boolean
  includeUppercase?: boolean
}

export type DeviceType = "desktop" | "tablet" | "mobile" | "qrSync"

export type SessionSyncMessage = {
  type: "draw" | "clear" | "save" | "cancel"
  character?: string
  drawingData?: DrawingData
  sessionId: string
}

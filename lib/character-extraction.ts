/**
 * Character extraction utilities for handwritten text
 * This module provides functions to extract individual characters from handwritten sentences
 */

import { DrawingData, DrawingPoint } from "@/types"

/**
 * Enhanced algorithm to extract characters from handwritten text
 * Uses a multi-strategy approach for better accuracy with connected writing
 */
export function extractCharactersFromDrawing(
  drawingData: DrawingData,
  expectedCharacters: string
): Record<string, DrawingData> {
  // Initialize result object
  const result: Record<string, DrawingData> = {}

  // If no points, return empty result
  if (!drawingData.points || drawingData.points.length === 0) {
    return result
  }

  // Clean and filter expected characters (remove spaces and duplicates)
  const uniqueChars = [...new Set(expectedCharacters.replace(/\s+/g, ""))]

  try {
    // STEP 1: Analyze stroke patterns to identify natural breaks
    const strokeSegments = identifyStrokes(drawingData.points)

    // STEP 2: Apply intelligent character segmentation
    const characterBounds = calculateCharacterBounds(
      strokeSegments,
      uniqueChars.length
    )

    // STEP 3: Extract characters based on bounds
    const extractedCharacters = extractCharactersFromBounds(
      drawingData.points,
      characterBounds
    )

    // STEP 4: Match extracted segments to expected characters
    const matchedCharacters = matchSegmentsToCharacters(
      extractedCharacters,
      uniqueChars
    )

    // STEP 5: Create clean DrawingData for each character with proper isolation
    for (const [char, points] of Object.entries(matchedCharacters)) {
      if (points.length > 0) {
        // Make sure each character is properly isolated without connecting lines
        const isolatedPoints = isolateCharacterPoints(points)
        result[char] = normalizeDrawing({
          points: isolatedPoints,
          width: drawingData.width,
          height: drawingData.height
        })
      }
    }
  } catch (error) {
    console.error("Error extracting characters:", error)
    // Fall back to simpler horizontal slicing as a last resort
    if (Object.keys(result).length === 0) {
      try {
        return fallbackExtraction(drawingData, uniqueChars)
      } catch (fallbackError) {
        console.error("Fallback extraction also failed:", fallbackError)
      }
    }
  }

  return result
}

/**
 * Identifies separate strokes in a drawing by finding breaks in drawing continuity
 * A stroke is defined as a continuous line without lifting the pen
 */
function identifyStrokes(points: DrawingPoint[]): DrawingPoint[][] {
  if (points.length === 0) return []

  const strokes: DrawingPoint[][] = []
  let currentStroke: DrawingPoint[] = [points[0]]

  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1]
    const currPoint = points[i]

    // Calculate distance between consecutive points
    const distance = Math.sqrt(
      Math.pow(currPoint.x - prevPoint.x, 2) +
        Math.pow(currPoint.y - prevPoint.y, 2)
    )

    // If distance is too large, assume pen was lifted (start new stroke)
    // This threshold can be tuned based on testing
    if (distance > 15) {
      // Lowered from 20 to be more sensitive to pen lifts
      if (currentStroke.length > 2) {
        // Reduced from 3 to catch smaller strokes
        strokes.push([...currentStroke])
      }
      currentStroke = []
    }

    currentStroke.push(currPoint)
  }

  // Add the last stroke if it has enough points
  if (currentStroke.length > 2) {
    strokes.push(currentStroke)
  }

  return strokes
}

/**
 * New approach: Calculate character bounds based on stroke clusters and density analysis
 */
function calculateCharacterBounds(
  strokes: DrawingPoint[][],
  expectedCharCount: number
): StrokeBounds[] {
  // If no strokes, return empty array
  if (strokes.length === 0) return []

  // Step 1: Calculate stroke bounds
  const strokeBounds = strokes.map(getStrokeBounds)

  // Step 2: Group strokes based on proximity and vertical alignment
  const strokeGroups = groupStrokesByAlignment(strokeBounds, strokes)

  // Step 3: Calculate group bounds
  const groupBounds = strokeGroups.map(group => {
    // Find bounding box that encompasses all strokes in the group
    const allPoints = group.flatMap(strokeIdx => strokes[strokeIdx])
    return getStrokeBounds(allPoints)
  })

  // Step 4: If we have fewer groups than expected characters, try to split largest groups
  if (groupBounds.length < expectedCharCount) {
    return splitGroupsToMatchExpectedCount(groupBounds, expectedCharCount)
  }

  // Step 5: If we have more groups than expected characters, merge closest groups
  if (groupBounds.length > expectedCharCount) {
    return mergeGroupsToMatchExpectedCount(groupBounds, expectedCharCount)
  }

  return groupBounds
}

/**
 * Group strokes based on proximity and vertical alignment
 */
function groupStrokesByAlignment(
  strokeBounds: StrokeBounds[],
  strokes: DrawingPoint[][]
): number[][] {
  const strokeCount = strokeBounds.length
  const visited = new Array(strokeCount).fill(false)
  const groups: number[][] = []

  // Process each stroke
  for (let i = 0; i < strokeCount; i++) {
    if (visited[i]) continue

    // Start a new group with this stroke
    const group: number[] = [i]
    visited[i] = true

    // Find all strokes that are closely aligned with this one
    for (let j = 0; j < strokeCount; j++) {
      if (i === j || visited[j]) continue

      const bounds1 = strokeBounds[i]
      const bounds2 = strokeBounds[j]

      // Two criteria for grouping:
      // 1. Horizontal proximity (X overlap or close)
      // 2. Vertical alignment (significant Y overlap)

      // Check horizontal proximity
      const horizontalDistance = calculateHorizontalDistance(bounds1, bounds2)

      // Check vertical alignment
      const verticalOverlap = calculateVerticalOverlap(bounds1, bounds2)
      const maxHeight = Math.max(
        bounds1.maxY - bounds1.minY,
        bounds2.maxY - bounds2.minY
      )
      const verticalOverlapRatio = verticalOverlap / maxHeight

      // Group if horizontally close and vertically aligned
      // Adjust thresholds based on testing
      if (horizontalDistance < 30 && verticalOverlapRatio > 0.3) {
        group.push(j)
        visited[j] = true
      }
    }

    groups.push(group)
  }

  return groups
}

/**
 * Calculate horizontal distance between two bounding boxes
 */
function calculateHorizontalDistance(
  bounds1: StrokeBounds,
  bounds2: StrokeBounds
): number {
  // Check for overlap along X-axis
  const overlapX = Math.max(
    0,
    Math.min(bounds1.maxX, bounds2.maxX) - Math.max(bounds1.minX, bounds2.minX)
  )

  if (overlapX > 0) {
    return 0 // Overlapping horizontally
  }

  // No overlap, calculate distance
  return Math.min(
    Math.abs(bounds1.maxX - bounds2.minX),
    Math.abs(bounds1.minX - bounds2.maxX)
  )
}

/**
 * Calculate vertical overlap between two bounding boxes
 */
function calculateVerticalOverlap(
  bounds1: StrokeBounds,
  bounds2: StrokeBounds
): number {
  return Math.max(
    0,
    Math.min(bounds1.maxY, bounds2.maxY) - Math.max(bounds1.minY, bounds2.minY)
  )
}

/**
 * Split largest groups to match expected character count
 */
function splitGroupsToMatchExpectedCount(
  groupBounds: StrokeBounds[],
  expectedCount: number
): StrokeBounds[] {
  const result = [...groupBounds]

  // Sort groups by width, largest first
  const sortedIndices = result
    .map((bounds, idx) => ({ bounds, idx }))
    .sort(
      (a, b) => b.bounds.maxX - b.bounds.minX - (a.bounds.maxX - a.bounds.minX)
    )
    .map(item => item.idx)

  let remaining = expectedCount - result.length
  let splitIndex = 0

  while (remaining > 0 && splitIndex < sortedIndices.length) {
    const idx = sortedIndices[splitIndex]
    const bounds = result[idx]
    const width = bounds.maxX - bounds.minX

    // Skip narrow groups that are likely single characters
    if (width < 50) {
      splitIndex++
      continue
    }

    // Determine how many characters to split this group into
    const splitCount = Math.min(
      remaining + 1, // +1 because we're replacing 1 with N
      Math.round(width / 30) // Estimate based on average character width
    )

    if (splitCount <= 1) {
      splitIndex++
      continue
    }

    // Split this group horizontally
    const splitsForThisGroup = splitBoundsHorizontally(bounds, splitCount)

    // Replace the original group with the splits
    result.splice(idx, 1, ...splitsForThisGroup)

    // Update remaining count
    remaining -= splitCount - 1
    splitIndex++
  }

  return result
}

/**
 * Split a bounding box horizontally into the specified number of segments
 */
function splitBoundsHorizontally(
  bounds: StrokeBounds,
  count: number
): StrokeBounds[] {
  const width = bounds.maxX - bounds.minX
  const segmentWidth = width / count
  const result: StrokeBounds[] = []

  for (let i = 0; i < count; i++) {
    const minX = bounds.minX + i * segmentWidth
    const maxX = i === count - 1 ? bounds.maxX : minX + segmentWidth

    result.push({
      minX,
      maxX,
      minY: bounds.minY,
      maxY: bounds.maxY
    })
  }

  return result
}

/**
 * Merge closest groups to match expected character count
 */
function mergeGroupsToMatchExpectedCount(
  groupBounds: StrokeBounds[],
  expectedCount: number
): StrokeBounds[] {
  const result = [...groupBounds]

  // Continue merging until we reach the expected count
  while (result.length > expectedCount) {
    // Find the two closest groups
    let minDistance = Infinity
    let mergeIdx1 = 0
    let mergeIdx2 = 0

    for (let i = 0; i < result.length - 1; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const distance = calculateBoundsDistance(result[i], result[j])

        if (distance < minDistance) {
          minDistance = distance
          mergeIdx1 = i
          mergeIdx2 = j
        }
      }
    }

    // Merge the closest groups
    const mergedBounds = {
      minX: Math.min(result[mergeIdx1].minX, result[mergeIdx2].minX),
      maxX: Math.max(result[mergeIdx1].maxX, result[mergeIdx2].maxX),
      minY: Math.min(result[mergeIdx1].minY, result[mergeIdx2].minY),
      maxY: Math.max(result[mergeIdx1].maxY, result[mergeIdx2].maxY)
    }

    // Replace the two groups with the merged one
    result.splice(mergeIdx1, 1, mergedBounds)
    result.splice(mergeIdx2 > mergeIdx1 ? mergeIdx2 - 1 : mergeIdx2, 1)
  }

  return result
}

/**
 * Calculate distance between two bounding boxes
 */
function calculateBoundsDistance(
  bounds1: StrokeBounds,
  bounds2: StrokeBounds
): number {
  // Check for overlap
  const overlapX = Math.max(
    0,
    Math.min(bounds1.maxX, bounds2.maxX) - Math.max(bounds1.minX, bounds2.minX)
  )

  const overlapY = Math.max(
    0,
    Math.min(bounds1.maxY, bounds2.maxY) - Math.max(bounds1.minY, bounds2.minY)
  )

  // If there's overlap in both directions, they intersect
  if (overlapX > 0 && overlapY > 0) {
    return 0
  }

  // Calculate center points
  const center1 = {
    x: (bounds1.minX + bounds1.maxX) / 2,
    y: (bounds1.minY + bounds1.maxY) / 2
  }

  const center2 = {
    x: (bounds2.minX + bounds2.maxX) / 2,
    y: (bounds2.minY + bounds2.maxY) / 2
  }

  // Euclidean distance between centers
  return Math.sqrt(
    Math.pow(center2.x - center1.x, 2) + Math.pow(center2.y - center1.y, 2)
  )
}

/**
 * Extract points for characters based on calculated bounds
 */
function extractCharactersFromBounds(
  allPoints: DrawingPoint[],
  characterBounds: StrokeBounds[]
): DrawingPoint[][] {
  return characterBounds.map(bounds => {
    // Extract points within these bounds
    return allPoints.filter(
      point =>
        point.x >= bounds.minX &&
        point.x <= bounds.maxX &&
        point.y >= bounds.minY &&
        point.y <= bounds.maxY
    )
  })
}

/**
 * Match extracted segments to expected characters based on left-to-right ordering
 */
function matchSegmentsToCharacters(
  segments: DrawingPoint[][],
  expectedChars: string[]
): Record<string, DrawingPoint[]> {
  const result: Record<string, DrawingPoint[]> = {}

  // Sort segments by x position (left to right)
  const sortedSegments = [...segments]
    .map((points, idx) => ({
      points,
      minX: points.length > 0 ? Math.min(...points.map(p => p.x)) : 0,
      idx
    }))
    .sort((a, b) => a.minX - b.minX)
    .map(item => segments[item.idx])

  // Match each segment to a character
  for (
    let i = 0;
    i < Math.min(sortedSegments.length, expectedChars.length);
    i++
  ) {
    const char = expectedChars[i]
    result[char] = sortedSegments[i]
  }

  return result
}

/**
 * Isolate character points by removing any connecting lines
 * This ensures each character is a clean, self-contained drawing
 */
function isolateCharacterPoints(points: DrawingPoint[]): DrawingPoint[] {
  if (points.length === 0) return []

  // Identify natural breaks in the drawing
  const strokes = identifyStrokes(points)

  // If we only have one stroke or no strokes, return as is
  if (strokes.length <= 1) return points

  // Get bounds of all strokes
  const strokeBounds = strokes.map(getStrokeBounds)

  // Identify the main strokes that likely form the character
  // and filter out connecting lines (usually long horizontal strokes)
  const filteredStrokes = strokes.filter((stroke, idx) => {
    const bounds = strokeBounds[idx]
    const width = bounds.maxX - bounds.minX
    const height = bounds.maxY - bounds.minY

    // Reject horizontal lines with high width-to-height ratio
    const isConnectingLine = width > height * 4 && height < 20

    return !isConnectingLine
  })

  // Flatten and return the filtered strokes
  return filteredStrokes.flat()
}

/**
 * Fallback extraction method using simple horizontal slicing
 */
function fallbackExtraction(
  drawingData: DrawingData,
  expectedChars: string[]
): Record<string, DrawingData> {
  const result: Record<string, DrawingData> = {}

  // Simple horizontal slicing
  const segments = sliceHorizontally(drawingData.points, expectedChars.length)

  // Match segments to characters
  for (let i = 0; i < Math.min(segments.length, expectedChars.length); i++) {
    const char = expectedChars[i]

    // Normalize the extracted character
    result[char] = normalizeDrawing({
      points: segments[i],
      width: drawingData.width,
      height: drawingData.height
    })
  }

  return result
}

/**
 * Slices a group of points horizontally into the specified number of segments
 */
function sliceHorizontally(
  points: DrawingPoint[],
  count: number
): DrawingPoint[][] {
  if (points.length === 0 || count <= 1) return [points]

  // Find horizontal bounds
  const xValues = points.map(p => p.x)
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const width = maxX - minX

  // Create segments
  const result: DrawingPoint[][] = Array(count)
    .fill(null)
    .map(() => [])
  const segmentWidth = width / count

  // Assign points to segments
  for (const point of points) {
    // Determine which segment this point belongs to
    const segmentIdx = Math.min(
      Math.floor((point.x - minX) / segmentWidth),
      count - 1
    )
    result[segmentIdx].push({ ...point }) // Clone to avoid reference issues
  }

  // Remove empty segments and ensure we don't have more than expected
  return result.filter(segment => segment.length > 0).slice(0, count)
}

/**
 * Get the bounding box of a stroke
 */
interface StrokeBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

function getStrokeBounds(points: DrawingPoint[]): StrokeBounds {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }

  return { minX, maxX, minY, maxY }
}

/**
 * Normalizes a drawing by centering it and scaling it to fit within bounds
 */
function normalizeDrawing(drawing: DrawingData): DrawingData {
  const { points, width, height } = drawing

  if (points.length === 0) {
    return drawing
  }

  // Find bounds
  const bounds = getStrokeBounds(points)

  // Calculate dimensions
  const drawingWidth = bounds.maxX - bounds.minX
  const drawingHeight = bounds.maxY - bounds.minY

  // Calculate center points
  const drawingCenterX = bounds.minX + drawingWidth / 2
  const drawingCenterY = bounds.minY + drawingHeight / 2
  const targetCenterX = width / 2
  const targetCenterY = height / 2

  // Calculate scale factor (to fit within 80% of the target area)
  const targetWidth = width * 0.8
  const targetHeight = height * 0.8
  const scaleX = drawingWidth > 0 ? targetWidth / drawingWidth : 1
  const scaleY = drawingHeight > 0 ? targetHeight / drawingHeight : 1
  const scale = Math.min(scaleX, scaleY)

  // Normalize points
  const normalizedPoints = points.map(point => {
    // Center and scale
    const x = (point.x - drawingCenterX) * scale + targetCenterX
    const y = (point.y - drawingCenterY) * scale + targetCenterY

    return {
      x,
      y,
      pressure: point.pressure
    }
  })

  return {
    points: normalizedPoints,
    width,
    height
  }
}

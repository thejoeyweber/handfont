"use server"

import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/db"
import { fontsTable, samplesTable } from "@/db/schema"
import { eq, and } from "drizzle-orm"

// This function would typically call an external service to generate the font
// For now, it's a placeholder that simulates font generation
async function generateFontFromSamples(fontId: string, userId: string) {
  try {
    // 1. Get all samples for this font
    const samples = await db.query.samples.findMany({
      where: and(
        eq(samplesTable.fontId, fontId),
        eq(samplesTable.userId, userId)
      )
    })

    if (samples.length === 0) {
      throw new Error("No samples found for this font")
    }

    // 2. Update font status to processing
    await db
      .update(fontsTable)
      .set({ status: "processing" })
      .where(eq(fontsTable.id, fontId))

    // 3. In a real implementation, we would:
    // - Send samples to a font generation service
    // - Wait for the service to generate the font
    // - Upload the font file to storage
    // - Update the font record with the font URL

    // For this example, we'll simulate processing time and then update the status
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 4. Generate a dummy font URL (in real implementation, this would be the actual URL)
    const fontUrl = `https://example.com/fonts/${fontId}.ttf`

    // 5. Update the font record
    await db
      .update(fontsTable)
      .set({
        status: "completed",
        fontUrl
      })
      .where(eq(fontsTable.id, fontId))

    return { success: true }
  } catch (error) {
    console.error("Error generating font:", error)

    // Update the font status to failed
    await db
      .update(fontsTable)
      .set({ status: "failed" })
      .where(eq(fontsTable.id, fontId))

    return { success: false, error: (error as Error).message }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { fontId } = body

    if (!fontId) {
      return NextResponse.json(
        { error: "Font ID is required" },
        { status: 400 }
      )
    }

    // Verify that the font belongs to the user
    const font = await db.query.fonts.findFirst({
      where: and(eq(fontsTable.id, fontId), eq(fontsTable.userId, userId))
    })

    if (!font) {
      return NextResponse.json({ error: "Font not found" }, { status: 404 })
    }

    // Start the font generation process
    const result = await generateFontFromSamples(fontId, userId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to generate font" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in font generation API:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

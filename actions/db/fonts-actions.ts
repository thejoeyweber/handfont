"use server"

import { db } from "@/db/db"
import { 
  InsertFont, 
  SelectFont, 
  fontsTable 
} from "@/db/schema/fonts-schema"
import { ActionState } from "@/types"
import { eq, desc } from "drizzle-orm"

// Create a new font project
export async function createFontAction(
  font: InsertFont
): Promise<ActionState<SelectFont>> {
  try {
    const [newFont] = await db.insert(fontsTable).values(font).returning()
    return {
      isSuccess: true,
      message: "Font project created successfully",
      data: newFont
    }
  } catch (error) {
    console.error("Error creating font project:", error)
    return { isSuccess: false, message: "Failed to create font project" }
  }
}

// Get all fonts for a user
export async function getUserFontsAction(
  userId: string
): Promise<ActionState<SelectFont[]>> {
  try {
    const fonts = await db.query.fonts.findMany({
      where: eq(fontsTable.userId, userId),
      orderBy: [desc(fontsTable.createdAt)]
    })
    return {
      isSuccess: true,
      message: "Fonts retrieved successfully",
      data: fonts
    }
  } catch (error) {
    console.error("Error getting fonts:", error)
    return { isSuccess: false, message: "Failed to get fonts" }
  }
}

// Get all public fonts
export async function getAllFontsAction(): Promise<ActionState<SelectFont[]>> {
  try {
    // For now, we're just returning all fonts
    // In a production app, you would likely filter by a 'isPublic' flag
    const fonts = await db.query.fonts.findMany({
      orderBy: [desc(fontsTable.createdAt)]
    })
    return {
      isSuccess: true,
      message: "Public fonts retrieved successfully",
      data: fonts
    }
  } catch (error) {
    console.error("Error getting public fonts:", error)
    return { isSuccess: false, message: "Failed to get public fonts" }
  }
}

// Get a specific font by ID
export async function getFontByIdAction(
  id: string
): Promise<ActionState<SelectFont>> {
  try {
    const font = await db.query.fonts.findFirst({
      where: eq(fontsTable.id, id)
    })

    if (!font) {
      return {
        isSuccess: false,
        message: "Font not found"
      }
    }

    return {
      isSuccess: true,
      message: "Font retrieved successfully",
      data: font
    }
  } catch (error) {
    console.error("Error getting font:", error)
    return { isSuccess: false, message: "Failed to get font" }
  }
}

// Update a font project
export async function updateFontAction(
  id: string,
  data: Partial<InsertFont>
): Promise<ActionState<SelectFont>> {
  try {
    const [updatedFont] = await db
      .update(fontsTable)
      .set(data)
      .where(eq(fontsTable.id, id))
      .returning()

    return {
      isSuccess: true,
      message: "Font updated successfully",
      data: updatedFont
    }
  } catch (error) {
    console.error("Error updating font:", error)
    return { isSuccess: false, message: "Failed to update font" }
  }
}

// Delete a font project
export async function deleteFontAction(id: string): Promise<ActionState<void>> {
  try {
    await db.delete(fontsTable).where(eq(fontsTable.id, id))
    return {
      isSuccess: true,
      message: "Font deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting font:", error)
    return { isSuccess: false, message: "Failed to delete font" }
  }
} 
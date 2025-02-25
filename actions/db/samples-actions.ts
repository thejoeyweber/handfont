"use server"

import { db } from "@/db/db"
import { 
  InsertSample, 
  SelectSample, 
  samplesTable 
} from "@/db/schema/fonts-schema"
import { ActionState } from "@/types"
import { eq, and, desc } from "drizzle-orm"

// Create a new handwriting sample
export async function createSampleAction(
  sample: InsertSample
): Promise<ActionState<SelectSample>> {
  try {
    const [newSample] = await db.insert(samplesTable).values(sample).returning()
    return {
      isSuccess: true,
      message: "Sample created successfully",
      data: newSample
    }
  } catch (error) {
    console.error("Error creating sample:", error)
    return { isSuccess: false, message: "Failed to create sample" }
  }
}

// Get all samples for a font
export async function getFontSamplesAction(
  fontId: string
): Promise<ActionState<SelectSample[]>> {
  try {
    const samples = await db.query.samples.findMany({
      where: eq(samplesTable.fontId, fontId),
      orderBy: [desc(samplesTable.createdAt)]
    })
    return {
      isSuccess: true,
      message: "Samples retrieved successfully",
      data: samples
    }
  } catch (error) {
    console.error("Error getting samples:", error)
    return { isSuccess: false, message: "Failed to get samples" }
  }
}

// Get a specific sample
export async function getSampleByIdAction(
  id: string
): Promise<ActionState<SelectSample>> {
  try {
    const sample = await db.query.samples.findFirst({
      where: eq(samplesTable.id, id)
    })

    if (!sample) {
      return {
        isSuccess: false,
        message: "Sample not found"
      }
    }

    return {
      isSuccess: true,
      message: "Sample retrieved successfully",
      data: sample
    }
  } catch (error) {
    console.error("Error getting sample:", error)
    return { isSuccess: false, message: "Failed to get sample" }
  }
}

// Get a specific character sample for a font
export async function getCharacterSampleAction(
  fontId: string,
  character: string
): Promise<ActionState<SelectSample | null>> {
  try {
    const sample = await db.query.samples.findFirst({
      where: and(
        eq(samplesTable.fontId, fontId),
        eq(samplesTable.character, character)
      )
    })

    return {
      isSuccess: true,
      message: sample 
        ? "Sample retrieved successfully" 
        : "No sample found for this character",
      data: sample || null
    }
  } catch (error) {
    console.error("Error getting character sample:", error)
    return { isSuccess: false, message: "Failed to get character sample" }
  }
}

// Update a sample
export async function updateSampleAction(
  id: string,
  data: Partial<InsertSample>
): Promise<ActionState<SelectSample>> {
  try {
    const [updatedSample] = await db
      .update(samplesTable)
      .set(data)
      .where(eq(samplesTable.id, id))
      .returning()

    return {
      isSuccess: true,
      message: "Sample updated successfully",
      data: updatedSample
    }
  } catch (error) {
    console.error("Error updating sample:", error)
    return { isSuccess: false, message: "Failed to update sample" }
  }
}

// Delete a sample
export async function deleteSampleAction(id: string): Promise<ActionState<void>> {
  try {
    await db.delete(samplesTable).where(eq(samplesTable.id, id))
    return {
      isSuccess: true,
      message: "Sample deleted successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error deleting sample:", error)
    return { isSuccess: false, message: "Failed to delete sample" }
  }
} 
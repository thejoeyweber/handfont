"use server"

import { db } from "@/db/db"
import { 
  InsertDrawingSession, 
  SelectDrawingSession, 
  drawingSessionsTable 
} from "@/db/schema/fonts-schema"
import { ActionState } from "@/types"
import { eq, lt, and } from "drizzle-orm"

// Generate a random 6-character alphanumeric code
function generateSessionCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters: 0, 1, I, O
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Create a new drawing session
export async function createDrawingSessionAction(
  data: Omit<InsertDrawingSession, "sessionCode" | "expiresAt">
): Promise<ActionState<SelectDrawingSession>> {
  try {
    // Generate a unique session code
    let sessionCode = generateSessionCode();
    let codeExists = true;
    
    // Make sure the code is unique
    while (codeExists) {
      const existingSession = await db.query.drawingSessions.findFirst({
        where: eq(drawingSessionsTable.sessionCode, sessionCode),
      });
      
      if (!existingSession) {
        codeExists = false;
      } else {
        sessionCode = generateSessionCode();
      }
    }
    
    // Set expiration time to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    const [newSession] = await db.insert(drawingSessionsTable).values({
      ...data,
      sessionCode,
      expiresAt
    }).returning();
    
    return {
      isSuccess: true,
      message: "Drawing session created successfully",
      data: newSession
    }
  } catch (error) {
    console.error("Error creating drawing session:", error);
    return { isSuccess: false, message: "Failed to create drawing session" }
  }
}

// Get a drawing session by code
export async function getDrawingSessionByCodeAction(
  code: string
): Promise<ActionState<SelectDrawingSession>> {
  try {
    // We don't need to convert the date for the query
    // Just use it for comparison after we get the session
    
    const session = await db.query.drawingSessions.findFirst({
      where: and(
        eq(drawingSessionsTable.sessionCode, code),
        eq(drawingSessionsTable.isActive, true)
        // Remove the date comparison from the query
      )
    });
    
    if (!session) {
      return {
        isSuccess: false,
        message: "Session not found"
      }
    }
    
    // Check if the session is expired
    const currentTime = new Date();
    const expiresAt = new Date(session.expiresAt);
    
    if (currentTime > expiresAt) {
      return {
        isSuccess: false,
        message: "Session has expired"
      }
    }
    
    // Update last active timestamp
    await db
      .update(drawingSessionsTable)
      .set({ lastActive: new Date() })
      .where(eq(drawingSessionsTable.id, session.id));
    
    return {
      isSuccess: true,
      message: "Session retrieved successfully",
      data: session
    }
  } catch (error) {
    console.error("Error getting drawing session:", error);
    return { isSuccess: false, message: "Failed to get drawing session" }
  }
}

// Get a drawing session by ID
export async function getDrawingSessionByIdAction(
  id: string
): Promise<ActionState<SelectDrawingSession>> {
  try {
    const session = await db.query.drawingSessions.findFirst({
      where: eq(drawingSessionsTable.id, id)
    });
    
    if (!session) {
      return {
        isSuccess: false,
        message: "Session not found"
      }
    }
    
    return {
      isSuccess: true,
      message: "Session retrieved successfully",
      data: session
    }
  } catch (error) {
    console.error("Error getting drawing session:", error);
    return { isSuccess: false, message: "Failed to get drawing session" }
  }
}

// Update a drawing session
export async function updateDrawingSessionAction(
  id: string,
  data: Partial<InsertDrawingSession>
): Promise<ActionState<SelectDrawingSession>> {
  try {
    const [updatedSession] = await db
      .update(drawingSessionsTable)
      .set(data)
      .where(eq(drawingSessionsTable.id, id))
      .returning();
      
    return {
      isSuccess: true,
      message: "Session updated successfully",
      data: updatedSession
    }
  } catch (error) {
    console.error("Error updating drawing session:", error);
    return { isSuccess: false, message: "Failed to update drawing session" }
  }
}

// End a drawing session
export async function endDrawingSessionAction(
  id: string
): Promise<ActionState<void>> {
  try {
    await db
      .update(drawingSessionsTable)
      .set({ isActive: false })
      .where(eq(drawingSessionsTable.id, id));
      
    return {
      isSuccess: true,
      message: "Session ended successfully",
      data: undefined
    }
  } catch (error) {
    console.error("Error ending drawing session:", error);
    return { isSuccess: false, message: "Failed to end drawing session" }
  }
} 
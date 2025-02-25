"use server"

import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/db"
import { drawingSessionsTable } from "@/db/schema"
import { eq } from "drizzle-orm"
import {
  getDrawingSessionByIdAction,
  updateDrawingSessionAction
} from "@/actions/db/drawing-sessions-actions"

// Get a drawing session by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get userId if available, but don't require it
    const session = await auth()
    const userId = session?.userId || null

    // Properly await params and get the id
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      )
    }

    // Get the session
    const result = await getDrawingSessionByIdAction(id)

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      session: result.data
    })
  } catch (error) {
    console.error("Error getting drawing session:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Update a drawing session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get userId if available, but don't require it
    const authSession = await auth()
    const userId = authSession?.userId || null

    // Properly await params and get the id
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Update the session
    const result = await updateDrawingSessionAction(id, body)

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session: result.data
    })
  } catch (error) {
    console.error("Error updating drawing session:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Delete a drawing session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get userId if available, but don't require it
    const session = await auth()
    const userId = session?.userId || null

    // Properly await params and get the id
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      )
    }

    // Get the session
    const getResult = await db.query.drawingSessions.findFirst({
      where: eq(drawingSessionsTable.id, id)
    })

    if (!getResult) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Update the session to mark as inactive
    const result = await updateDrawingSessionAction(id, { isActive: false })

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error("Error deleting drawing session:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

"use server"

import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/db"
import { drawingSessionsTable } from "@/db/schema"
import { eq, lt, and } from "drizzle-orm"
import {
  createDrawingSessionAction,
  endDrawingSessionAction,
  getDrawingSessionByCodeAction
} from "@/actions/db/drawing-sessions-actions"
import { v4 as uuidv4 } from "uuid"

// Create a new drawing session
export async function POST(request: NextRequest) {
  try {
    // Get userId if available, but don't require it
    const session = await auth()
    const userId = session?.userId || null

    const body = await request.json()
    const { fontId } = body

    if (!fontId) {
      return NextResponse.json(
        { error: "Font ID is required" },
        { status: 400 }
      )
    }

    // Create a new drawing session
    const result = await createDrawingSessionAction({
      userId: userId || "anonymous", // Use 'anonymous' if no userId is available
      fontId,
      isActive: true
    })

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    // Generate session URL - ensure proper protocol and formatting
    let baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000"

    // Ensure baseUrl has protocol
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `http://${baseUrl}`
    }

    // Ensure baseUrl doesn't end with a slash
    baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl

    // Construct proper session URL
    const sessionUrl = `${baseUrl}/draw/${result.data.sessionCode}`

    console.log(`Generated session URL: ${sessionUrl}`) // Debug log

    return NextResponse.json({
      success: true,
      session: {
        ...result.data,
        sessionUrl
      }
    })
  } catch (error) {
    console.error("Error creating drawing session:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Get a drawing session by code
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.json(
        { error: "Session code is required" },
        { status: 400 }
      )
    }

    // Get the session
    const result = await getDrawingSessionByCodeAction(code)

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

// End a drawing session
export async function DELETE(request: NextRequest) {
  try {
    // Get userId if available, but don't require it
    const session = await auth()
    const userId = session?.userId || null

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      )
    }

    // Get the session first - allow any access for anonymous users
    const getResult = await db.query.drawingSessions.findFirst({
      where: userId
        ? and(
            eq(drawingSessionsTable.id, id),
            eq(drawingSessionsTable.userId, userId)
          )
        : eq(drawingSessionsTable.id, id)
    })

    if (!getResult) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // End the session
    const result = await endDrawingSessionAction(id)

    if (!result.isSuccess) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error("Error ending drawing session:", error)

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

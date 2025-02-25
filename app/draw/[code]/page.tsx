"use server"

import { redirect } from "next/navigation"
import { getDrawingSessionByCodeAction } from "@/actions/db/drawing-sessions-actions"
import MobileDrawClient from "./_components/mobile-draw-client"

interface MobileDrawPageParams {
  params: Promise<{ code: string }>
}

export default async function MobileDrawPage({ params }: MobileDrawPageParams) {
  const { code } = await params

  console.log(`Accessing mobile draw with session code: ${code}`) // Debug log

  // Check if the session is valid (but don't fetch the data here - do it in the client)
  const sessionResult = await getDrawingSessionByCodeAction(code)

  if (!sessionResult.isSuccess) {
    // Session not found or expired
    console.error(`Invalid session: ${sessionResult.message}`) // Debug error

    // Show error message instead of redirecting
    return (
      <div className="container max-w-md px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-4 text-2xl font-bold text-red-700">
            Invalid QR Code Session
          </h1>
          <p className="mb-4 text-gray-700">
            This drawing session is invalid or has expired. Please scan a new QR
            code.
          </p>
          <p className="text-sm text-gray-500">
            Error: {sessionResult.message}
          </p>
          <a
            href="/fonts"
            className="mt-6 inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Go to Fonts
          </a>
        </div>
      </div>
    )
  }

  // Return a clean, unpadded layout for maximum drawing space
  return <MobileDrawClient code={code} />
}

"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { getFontByIdAction } from "@/actions/db/fonts-actions"
import { getWritingPrompts } from "@/lib/writing-prompts"
import FontDrawClient from "./_components/font-draw-client"

interface FontDrawPageParams {
  params: Promise<{ fontId: string }>
}

export default async function FontDrawPage({ params }: FontDrawPageParams) {
  // Get userId if available, but don't require it
  const session = await auth()
  const userId = session?.userId || "anonymous"

  const { fontId } = await params

  // Get the font data
  const fontResult = await getFontByIdAction(fontId)

  if (!fontResult.isSuccess) {
    redirect("/fonts")
  }

  const font = fontResult.data

  // Only check font ownership if user is authenticated and not the creator
  if (userId !== "anonymous" && font.userId !== userId) {
    // For anonymous users or users who don't own the font, we could:
    // 1. Allow read-only access
    // 2. Create a copy for them to edit
    // 3. Redirect them to another page
    // For now, we'll just let them proceed
  }

  // Get writing prompts based on font options
  const hasUppercase = font.characters.some(
    char => char === char.toUpperCase() && char !== char.toLowerCase()
  )

  const hasNumbers = font.characters.some(char => !isNaN(parseInt(char, 10)))

  const hasPunctuation = font.characters.some(char => !/[a-zA-Z0-9]/.test(char))

  const writingPrompts = getWritingPrompts({
    includeLowercase: true,
    includeUppercase: hasUppercase,
    includeNumbers: hasNumbers,
    includePunctuation: hasPunctuation,
    count: 5
  })

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">
          Create Your Font: {font.name}
        </h1>
        <p className="text-gray-600">
          Write the characters using the prompts below. You can use a stylus,
          mouse, or touch input.
        </p>
      </div>

      <FontDrawClient
        font={font}
        userId={userId}
        writingPrompts={writingPrompts}
      />
    </div>
  )
}

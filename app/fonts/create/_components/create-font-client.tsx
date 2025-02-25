"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreateFontForm } from "@/components/ui/create-font-form"
import { FontGenerationOptions } from "@/types"
import { createFontAction } from "@/actions/db/fonts-actions"
import { getCharacterSet } from "@/lib/writing-prompts"

interface CreateFontClientProps {
  userId: string
}

export default function CreateFontClient({ userId }: CreateFontClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (data: FontGenerationOptions) => {
    setIsLoading(true)

    try {
      // Determine which characters to include based on options
      const characterSet = getCharacterSet({
        includeLowercase: true, // Always include lowercase
        includeUppercase: data.includeUppercase,
        includeNumbers: data.includeNumbers,
        includeBasicPunctuation: data.includeSymbols,
        includeExtendedPunctuation: false // Don't include extended punctuation by default
      })

      // Create the font project
      const result = await createFontAction({
        userId,
        name: data.name,
        description: data.description || "",
        characters: characterSet.split(""),
        status: "pending"
      })

      if (!result.isSuccess) {
        throw new Error(result.message)
      }

      // Redirect to the font draw page
      router.push(`/fonts/${result.data.id}/draw`)
    } catch (error) {
      console.error("Error creating font:", error)
      alert("Failed to create font: " + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return <CreateFontForm onSubmit={handleSubmit} isLoading={isLoading} />
}

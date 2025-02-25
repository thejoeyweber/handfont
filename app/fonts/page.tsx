"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import {
  getUserFontsAction,
  getAllFontsAction
} from "@/actions/db/fonts-actions"
import FontsClient from "./_components/fonts-client"

export default async function FontsPage() {
  // Get userId if available, but don't require it
  const session = await auth()
  const userId = session?.userId || "anonymous"

  // Get fonts - if user is authenticated, get their fonts
  // Otherwise get all public fonts or display empty state
  const fontsResult =
    userId !== "anonymous"
      ? await getUserFontsAction(userId)
      : await getAllFontsAction() // We'll need to create this action

  const fonts = fontsResult.isSuccess ? fontsResult.data : []

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">
            {userId !== "anonymous" ? "Your Fonts" : "HandFont Gallery"}
          </h1>
          <p className="text-gray-600">
            {userId !== "anonymous"
              ? "Create and manage your custom handwriting fonts."
              : "Browse custom handwriting fonts or create your own."}
          </p>
        </div>

        <Button asChild>
          <Link href="/fonts/create" className="flex items-center">
            <Plus className="mr-2 size-4" />
            Create New Font
          </Link>
        </Button>
      </div>

      <FontsClient fonts={fonts} userId={userId} />
    </div>
  )
}

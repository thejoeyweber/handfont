"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { CreateFontForm } from "@/components/ui/create-font-form"
import { getCharacterSet } from "@/lib/writing-prompts"
import CreateFontClient from "./_components/create-font-client"

export default async function CreateFontPage() {
  // Get userId if available, but don't require it
  const session = await auth()
  const userId = session?.userId || "anonymous"

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Create Your Font</h1>
        <p className="text-gray-600">
          Fill out the form below to start creating your custom handwriting
          font. You'll be able to provide handwriting samples in the next step.
        </p>
      </div>

      <CreateFontClient userId={userId} />
    </div>
  )
}

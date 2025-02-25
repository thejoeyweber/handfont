"use server"

import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { FontPreview } from "@/components/ui/font-preview"
import { getFontByIdAction } from "@/actions/db/fonts-actions"
import { getFontSamplesAction } from "@/actions/db/samples-actions"
import { DrawingData } from "@/types"
import { Download, ArrowLeft, Pen } from "lucide-react"
import Link from "next/link"
import FontDetailClient from "./_components/font-detail-client"

interface FontPageParams {
  params: Promise<{ fontId: string }>
}

export default async function FontPage({ params }: FontPageParams) {
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

  // Get samples for this font
  const samplesResult = await getFontSamplesAction(fontId)
  const samples = samplesResult.isSuccess ? samplesResult.data : []

  // Convert samples to the format expected by FontPreview
  const sampleData: Record<string, DrawingData> = {}

  samples.forEach((sample: any) => {
    try {
      if (sample.svgPath) {
        const points = JSON.parse(sample.svgPath)
        sampleData[sample.character] = {
          points,
          width: 400, // Default width
          height: 400 // Default height
        }
      }
    } catch (error) {
      console.error(`Error parsing sample data for ${sample.character}:`, error)
    }
  })

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Button asChild variant="outline" className="mb-4">
            <Link href="/fonts" className="flex items-center">
              <ArrowLeft className="mr-2 size-4" />
              Back to Fonts
            </Link>
          </Button>
          <h1 className="mb-2 text-3xl font-bold">{font.name}</h1>
          <p className="text-gray-600">
            {font.description || "A custom handwriting font"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/fonts/${fontId}/draw`} className="flex items-center">
              <Pen className="mr-2 size-4" />
              Edit Font
            </Link>
          </Button>

          {font.fontUrl && (
            <Button asChild>
              <Link
                href={font.fontUrl}
                download={`${font.name.toLowerCase().replace(/\s+/g, "-")}.ttf`}
                className="flex items-center"
              >
                <Download className="mr-2 size-4" />
                Download Font
              </Link>
            </Button>
          )}
        </div>
      </div>

      <FontDetailClient font={font} samples={sampleData} />
    </div>
  )
}

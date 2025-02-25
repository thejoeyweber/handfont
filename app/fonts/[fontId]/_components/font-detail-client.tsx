"use client"

import { useState } from "react"
import { FontPreview } from "@/components/ui/font-preview"
import { SelectFont } from "@/db/schema"
import { DrawingData } from "@/types"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { ChevronRight, Eye, Download } from "lucide-react"

interface FontDetailClientProps {
  font: SelectFont
  samples: Record<string, DrawingData>
}

export default function FontDetailClient({
  font,
  samples
}: FontDetailClientProps) {
  const [activeTab, setActiveTab] = useState("preview")

  // Calculate the completion percentage
  const charactersTotal = font.characters.length
  const charactersDone = Object.keys(samples).length
  const completionPercentage = Math.round(
    (charactersDone / charactersTotal) * 100
  )

  return (
    <div>
      <Tabs
        defaultValue="preview"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="preview" className="flex items-center">
            <Eye className="mr-2 size-4" />
            Font Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-6">
          {completionPercentage < 10 ? (
            <Card>
              <CardHeader>
                <CardTitle>Not Enough Samples</CardTitle>
                <CardDescription>
                  You need to provide more character samples to generate a
                  preview.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-6 text-center">
                  <p className="mb-4 text-gray-600">
                    Only {charactersDone} out of {charactersTotal} characters (
                    {completionPercentage}%) have been drawn.
                  </p>
                  <Button asChild>
                    <a
                      href={`/fonts/${font.id}/draw`}
                      className="flex items-center justify-center"
                    >
                      Continue Drawing
                      <ChevronRight className="ml-2 size-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <FontPreview samples={samples} />
          )}

          <div className="mt-8">
            <h3 className="mb-4 text-lg font-semibold">
              Character Samples ({charactersDone}/{charactersTotal})
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {font.characters.map(char => {
                const sample = samples[char]
                return (
                  <Card
                    key={char}
                    className={`overflow-hidden ${!sample ? "bg-gray-50" : ""}`}
                  >
                    <CardHeader className="p-2 text-center">
                      <CardTitle className="text-base">{char}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex h-20 items-center justify-center p-2">
                      {sample ? (
                        <canvas
                          width={sample.width}
                          height={sample.height}
                          className="max-h-full w-full"
                          ref={canvas => {
                            if (canvas && sample) {
                              const ctx = canvas.getContext("2d")
                              if (ctx) {
                                ctx.clearRect(0, 0, canvas.width, canvas.height)
                                ctx.lineWidth = 2
                                ctx.lineCap = "round"
                                ctx.lineJoin = "round"
                                ctx.strokeStyle = "#000000"

                                if (sample.points.length > 1) {
                                  ctx.beginPath()
                                  ctx.moveTo(
                                    sample.points[0].x,
                                    sample.points[0].y
                                  )

                                  for (
                                    let i = 1;
                                    i < sample.points.length;
                                    i++
                                  ) {
                                    const p1 = sample.points[i - 1]
                                    const p2 = sample.points[i]

                                    const xc = (p1.x + p2.x) / 2
                                    const yc = (p1.y + p2.y) / 2

                                    ctx.quadraticCurveTo(p1.x, p1.y, xc, yc)
                                  }

                                  ctx.lineTo(
                                    sample.points[sample.points.length - 1].x,
                                    sample.points[sample.points.length - 1].y
                                  )
                                  ctx.stroke()
                                }
                              }
                            }
                          }}
                        />
                      ) : (
                        <span className="text-gray-400">Not drawn</span>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import { useState } from "react"
import { DrawingCanvas } from "@/components/ui/drawing-canvas"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { DrawingData } from "@/types"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CharacterInputProps {
  characters: string[]
  onComplete?: (samples: Record<string, DrawingData>) => void
  onChange?: (character: string, data: DrawingData) => void
  initialSamples?: Record<string, DrawingData>
}

export function CharacterInput({
  characters,
  onComplete,
  onChange,
  initialSamples = {}
}: CharacterInputProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [samples, setSamples] =
    useState<Record<string, DrawingData>>(initialSamples)

  // Current character being drawn
  const currentChar = characters[currentIndex]

  // Handle saving the current character
  const handleSaveCharacter = (data: DrawingData) => {
    // Update samples state
    const newSamples = {
      ...samples,
      [currentChar]: data
    }
    setSamples(newSamples)

    // Call onChange if provided
    if (onChange) {
      onChange(currentChar, data)
    }

    // Move to next character if not at the end
    if (currentIndex < characters.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else if (onComplete) {
      // If at the end, call onComplete
      onComplete(newSamples)
    }
  }

  // Handle going to previous character
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  // Handle going to next character
  const handleNext = () => {
    if (currentIndex < characters.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  // Calculate progress percentage
  const progress = Math.round(
    (Object.keys(samples).length / characters.length) * 100
  )

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">
          Write the character:{" "}
          <span className="text-2xl font-bold">{currentChar}</span>
        </CardTitle>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="bg-primary h-2 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-center text-sm text-gray-500">
          Character {currentIndex + 1} of {characters.length} • {progress}%
          complete
        </div>
      </CardHeader>

      <CardContent>
        <DrawingCanvas
          width={300}
          height={300}
          onSave={handleSaveCharacter}
          initialDrawing={samples[currentChar]}
        />
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="mr-2 size-4" />
          Previous
        </Button>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === characters.length - 1}
        >
          Next
          <ChevronRight className="ml-2 size-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

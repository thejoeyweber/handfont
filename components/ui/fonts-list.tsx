"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SelectFont } from "@/db/schema/fonts-schema"
import {
  Pencil,
  Download,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface FontsListProps {
  fonts: SelectFont[]
  onDelete?: (id: string) => void
}

export function FontsList({ fonts, onDelete }: FontsListProps) {
  const [deleting, setDeleting] = useState<string | null>(null)

  // Handle font deletion
  const handleDelete = async (id: string) => {
    if (!onDelete) return

    setDeleting(id)
    try {
      await onDelete(id)
    } finally {
      setDeleting(null)
    }
  }

  // Get badge color based on font status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            variant="outline"
            className="border-green-200 bg-green-100 text-green-800"
          >
            <CheckCircle2 className="mr-1 size-3.5" />
            Completed
          </Badge>
        )
      case "processing":
        return (
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-100 text-blue-800"
          >
            <Clock className="mr-1 size-3.5" />
            Processing
          </Badge>
        )
      case "failed":
        return (
          <Badge
            variant="outline"
            className="border-red-200 bg-red-100 text-red-800"
          >
            <AlertCircle className="mr-1 size-3.5" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="border-yellow-200 bg-yellow-100 text-yellow-800"
          >
            <Clock className="mr-1 size-3.5" />
            Pending
          </Badge>
        )
    }
  }

  // If no fonts, show empty state
  if (fonts.length === 0) {
    return (
      <Card className="w-full border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <p className="mb-4 text-center text-gray-500">
            You haven&apos;t created any fonts yet.
          </p>
          <Button asChild>
            <Link href="/fonts/create">Create Your First Font</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {fonts.map(font => (
        <Card key={font.id} className="overflow-hidden">
          {font.previewImage ? (
            <div
              className="h-40 bg-gray-100 bg-cover bg-center"
              style={{ backgroundImage: `url(${font.previewImage})` }}
            />
          ) : (
            <div className="flex h-40 items-center justify-center bg-gray-100 text-gray-400">
              No Preview Available
            </div>
          )}

          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="font-medium">{font.name}</CardTitle>
              {getStatusBadge(font.status)}
            </div>
            <CardDescription className="line-clamp-1">
              {font.description || "No description"}
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-2">
            <p className="text-sm text-gray-500">
              Created {new Date(font.createdAt).toLocaleDateString()}
            </p>
            <p className="text-sm">
              {/* Display character count if available */}
              {font.characters
                ? `${font.characters.length} characters`
                : "No characters yet"}
            </p>
          </CardContent>

          <CardFooter className="grid grid-cols-3 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/fonts/${font.id}`}>
                <Pencil className="mr-1 size-4" />
                Edit
              </Link>
            </Button>

            {font.status === "completed" && font.fontUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={font.fontUrl} download>
                  <Download className="mr-1 size-4" />
                  Download
                </a>
              </Button>
            )}

            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleDelete(font.id)}
                disabled={deleting === font.id}
              >
                <Trash2 className="mr-1 size-4" />
                {deleting === font.id ? "Deleting..." : "Delete"}
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

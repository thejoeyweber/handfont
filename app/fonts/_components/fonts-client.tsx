"use client"

import { useState } from "react"
import { FontsList } from "@/components/ui/fonts-list"
import { SelectFont } from "@/db/schema"
import { deleteFontAction } from "@/actions/db/fonts-actions"

interface FontsClientProps {
  fonts: SelectFont[]
  userId: string
}

export default function FontsClient({ fonts, userId }: FontsClientProps) {
  const [userFonts, setUserFonts] = useState<SelectFont[]>(fonts)

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteFontAction(id)

      if (result.isSuccess) {
        // Remove the deleted font from the list
        setUserFonts(prev => prev.filter(font => font.id !== id))
      } else {
        console.error("Failed to delete font:", result.message)
        alert("Failed to delete font")
      }
    } catch (error) {
      console.error("Error deleting font:", error)
      alert("Failed to delete font")
    }
  }

  return <FontsList fonts={userFonts} onDelete={handleDelete} />
}

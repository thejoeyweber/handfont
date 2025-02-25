"use client"

import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { FontGenerationOptions } from "@/types"

// Form schema
const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  weight: z.enum(["regular", "bold", "light", "thin"]).default("regular"),
  style: z.enum(["normal", "italic"]).default("normal"),
  includeNumbers: z.boolean().default(true),
  includeSymbols: z.boolean().default(false),
  includeUppercase: z.boolean().default(true)
})

type FormValues = z.infer<typeof formSchema>

interface CreateFontFormProps {
  onSubmit: (data: FontGenerationOptions) => void
  isLoading?: boolean
}

export function CreateFontForm({
  onSubmit,
  isLoading = false
}: CreateFontFormProps) {
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      weight: "regular",
      style: "normal",
      includeNumbers: true,
      includeSymbols: false,
      includeUppercase: true
    }
  })

  // Handle form submission
  const handleSubmit = (values: FormValues) => {
    onSubmit(values)
  }

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Create New Font</CardTitle>
        <CardDescription>
          Fill out the details below to start creating your custom handwriting
          font.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Font Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Handwriting" {...field} />
                  </FormControl>
                  <FormDescription>
                    Give your font a memorable name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of your font..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Font Weight</FormLabel>
                    <select
                      className="w-full rounded-md border p-2"
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <option value="regular">Regular</option>
                      <option value="bold">Bold</option>
                      <option value="light">Light</option>
                      <option value="thin">Thin</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Font Style</FormLabel>
                    <select
                      className="w-full rounded-md border p-2"
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <option value="normal">Normal</option>
                      <option value="italic">Italic</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormField
                control={form.control}
                name="includeUppercase"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Include uppercase letters (A-Z)</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeNumbers"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Include numbers (0-9)</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeSymbols"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Include common symbols (,.?!@#$%&)</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Font"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

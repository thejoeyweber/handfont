import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean
} from "drizzle-orm/pg-core"

// Define enum for font status
export const fontStatusEnum = pgEnum("font_status", [
  "pending",
  "processing",
  "completed",
  "failed"
])

// Define enum for input method
export const inputMethodEnum = pgEnum("input_method", [
  "desktop",
  "tablet",
  "mobile",
  "qr_sync"
])

// Main fonts table to store user's font projects
export const fontsTable = pgTable("fonts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: fontStatusEnum("status").default("pending").notNull(),
  fontUrl: text("font_url"),
  previewImage: text("preview_image"),
  characters: jsonb("characters").$type<string[]>().default([]).notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

// Table to store individual handwriting samples
export const samplesTable = pgTable("samples", {
  id: uuid("id").defaultRandom().primaryKey(),
  fontId: uuid("font_id")
    .references(() => fontsTable.id, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id").notNull(),
  character: text("character").notNull(),
  imageUrl: text("image_url").notNull(),
  svgPath: text("svg_path"),
  inputMethod: inputMethodEnum("input_method").notNull(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

// Table to store real-time drawing sessions for QR code sync
export const drawingSessionsTable = pgTable("drawing_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  fontId: uuid("font_id")
    .references(() => fontsTable.id, { onDelete: "cascade" })
    .notNull(),
  sessionCode: text("session_code").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

export type InsertFont = typeof fontsTable.$inferInsert
export type SelectFont = typeof fontsTable.$inferSelect

export type InsertSample = typeof samplesTable.$inferInsert
export type SelectSample = typeof samplesTable.$inferSelect

export type InsertDrawingSession = typeof drawingSessionsTable.$inferInsert
export type SelectDrawingSession = typeof drawingSessionsTable.$inferSelect

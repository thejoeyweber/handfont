/*
<ai_context>
Initializes the database connection and schema for the app.
Uses a connection pool with singleton pattern to prevent connection exhaustion in serverless environments.
</ai_context>
*/

import {
  profilesTable,
  fontsTable,
  samplesTable,
  drawingSessionsTable
} from "@/db/schema"
import { config } from "dotenv"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

config({ path: ".env.local" })

const schema = {
  profiles: profilesTable,
  fonts: fontsTable,
  samples: samplesTable,
  drawingSessions: drawingSessionsTable
}

// Connection pool configuration - adjust based on your Supabase plan limits
const POOL_SIZE = process.env.NODE_ENV === "production" ? 2 : 10
const IDLE_TIMEOUT = 30 // Close connections after 30 seconds of inactivity
const MAX_LIFETIME = 60 * 5 // Recreate connections after 5 minutes
const CONNECTION_TIMEOUT = 10 // 10 second timeout on connections
const MAX_RETRIES = 3 // Maximum number of connection retries

// Global connection pool using singleton pattern to prevent connection exhaustion
// in serverless environments like Vercel
declare global {
  var db: ReturnType<typeof createDrizzleClient> | undefined
  // This prevents connections from being created on every module reload in development
  var postgresql: ReturnType<typeof createPostgresPool> | undefined
}

/**
 * Creates a postgres connection pool with proper limits and error handling
 */
function createPostgresPool(retryCount = 0): postgres.Sql {
  try {
    const sql = postgres(process.env.DATABASE_URL!, {
      max: POOL_SIZE,
      idle_timeout: IDLE_TIMEOUT,
      max_lifetime: MAX_LIFETIME,
      // Use SSL in production only
      ssl: process.env.NODE_ENV === "production",
      connect_timeout: CONNECTION_TIMEOUT,
      debug: process.env.NODE_ENV === "development",
      // Add onnotice handler for Postgres notifications
      onnotice: notice => {
        console.log(`[PG Notice] ${notice.message}`)
      }
    })

    // Add handler for pool errors - these don't get caught by try/catch
    sql.unsafe("SELECT 1").catch(err => {
      console.error("Database connection test failed:", err.message)
      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
        console.log(
          `Retrying connection in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`
        )
        setTimeout(() => {
          globalThis.postgresql = createPostgresPool(retryCount + 1)
        }, delay)
      }
    })

    return sql
  } catch (error) {
    console.error("Error creating Postgres connection pool:", error)

    // Retry with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
      console.log(
        `Retrying connection in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`
      )

      return new Proxy({} as postgres.Sql, {
        get: (target, prop) => {
          // Return a function that will retry creating the pool after delay
          if (typeof prop === "string" || typeof prop === "number") {
            return (...args: any[]) => {
              console.log(
                `Operation "${String(prop)}" delayed until connection is established`
              )
              return new Promise((resolve, reject) => {
                setTimeout(() => {
                  try {
                    const newPool = createPostgresPool(retryCount + 1)
                    globalThis.postgresql = newPool
                    resolve((newPool as any)[prop](...args))
                  } catch (e) {
                    reject(e)
                  }
                }, delay)
              })
            }
          }
        }
      })
    }

    // If we've exhausted retries, re-throw the error
    throw new Error(
      `Failed to connect to database after ${MAX_RETRIES} attempts: ${error}`
    )
  }
}

/**
 * Creates a Drizzle client with our schema
 */
function createDrizzleClient() {
  // Use an existing pool if available (in development with fast refresh)
  const sql = globalThis.postgresql ?? createPostgresPool()

  // Save the pool to the global object in development only
  if (process.env.NODE_ENV !== "production") {
    globalThis.postgresql = sql
  }

  return drizzle(sql, { schema })
}

// Export singleton instance to prevent connection leaks
export const db = globalThis.db || createDrizzleClient()

// Save instance in development only (prevents multiple pools in production)
if (process.env.NODE_ENV !== "production") {
  globalThis.db = db
}

// Handle graceful shutdown for cleanup
if (typeof process !== "undefined") {
  // Increase max listeners to prevent MaxListenersExceededWarning
  process.setMaxListeners(20)

  // Close connections when process is terminated
  const shutdownHandler = () => {
    if (globalThis.postgresql) {
      console.log("Closing database connections...")
      // @ts-ignore - end() exists but TypeScript doesn't see it
      globalThis.postgresql
        .end?.()
        .then(() => console.log("Database connections closed."))
        .catch((err: any) =>
          console.error("Error closing database connections:", err)
        )
        .finally(() => process.exit(0))
    } else {
      process.exit(0)
    }
  }

  process.once("SIGTERM", shutdownHandler)
  process.once("SIGINT", shutdownHandler)
}

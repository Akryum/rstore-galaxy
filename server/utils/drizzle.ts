import process from 'node:process'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

declare global {
  // eslint-disable-next-line vars-on-top
  var __galaxyPostgresClient: ReturnType<typeof postgres> | undefined
  // eslint-disable-next-line vars-on-top
  var __galaxyDb: ReturnType<typeof drizzle<typeof schema>> | undefined
}

export function useDrizzle() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to create the Drizzle client.')
  }

  if (!globalThis.__galaxyPostgresClient) {
    globalThis.__galaxyPostgresClient = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      prepare: false,
    })
  }

  if (!globalThis.__galaxyDb) {
    globalThis.__galaxyDb = drizzle({
      schema,
      client: globalThis.__galaxyPostgresClient,
    })
  }

  return globalThis.__galaxyDb
}

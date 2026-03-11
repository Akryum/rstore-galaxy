import { count } from 'drizzle-orm'
import { users } from '~~/server/database/schema'
import { useDrizzle } from '~~/server/utils/drizzle'

export default defineEventHandler(async () => {
  const db = useDrizzle()
  const [result] = await db.select({ value: count() }).from(users)

  if (!result) {
    throw new Error('Health check query did not return a result.')
  }

  return {
    status: 'ok',
  }
})

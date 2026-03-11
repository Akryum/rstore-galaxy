import { and, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { celestialProfiles, users } from '~~/server/database/schema'
import { useDrizzle } from '~~/server/utils/drizzle'
import { BODY_TYPES, clampOrbitDistance, clampOrbitSpeed, COLOR_TOKENS } from '~~/shared/galaxy'

function denyMutation(statusMessage: string) {
  return () => {
    throw createError({
      statusCode: 403,
      statusMessage,
    })
  }
}

export default defineNitroPlugin(() => {
  allowTables([users, celestialProfiles])

  hooksForTable(users, {
    'index.post.before': denyMutation('Users are synchronized from GitHub login only.'),
    'item.patch.before': denyMutation('Users cannot be changed through the public API.'),
    'item.delete.before': denyMutation('Users cannot be deleted through the public API.'),
  })

  hooksForTable(celestialProfiles, {
    'index.post.before': denyMutation('Celestial profiles are created automatically during login.'),
    'item.delete.before': denyMutation('Celestial profiles cannot be deleted.'),
    'item.patch.before': async (payload) => {
      const db = useDrizzle()
      const { user: { id: userId } } = await requireUserSession(payload.event)
      const body = payload.body

      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid payload.',
        })
      }

      const nextBody = body as Record<string, unknown>
      const safePatch: Record<string, unknown> = {}

      if (typeof nextBody.bodyType === 'string') {
        if (!BODY_TYPES.includes(nextBody.bodyType as typeof BODY_TYPES[number])) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Unknown body type.',
          })
        }

        safePatch.bodyType = nextBody.bodyType
      }

      if (nextBody.orbitDistance != null) {
        safePatch.orbitDistance = clampOrbitDistance(Number(nextBody.orbitDistance))
      }

      if (nextBody.orbitSpeed != null) {
        safePatch.orbitSpeed = clampOrbitSpeed(Number(nextBody.orbitSpeed))
      }

      if (typeof nextBody.colorToken === 'string') {
        if (!COLOR_TOKENS.includes(nextBody.colorToken as typeof COLOR_TOKENS[number])) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Unknown color token.',
          })
        }

        safePatch.colorToken = nextBody.colorToken
      }

      if (Object.keys(safePatch).length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'No editable fields were provided.',
        })
      }

      const ownedProfile = await db.query.celestialProfiles.findFirst({
        columns: {
          id: true,
        },
        where: and(
          eq(celestialProfiles.id, payload.key),
          eq(celestialProfiles.userId, userId),
        ),
      })

      if (!ownedProfile) {
        throw createError({
          statusCode: 403,
          statusMessage: 'You can only edit your own orbital object.',
        })
      }

      Object.keys(nextBody).forEach((key) => {
        delete nextBody[key]
      })

      Object.assign(nextBody, safePatch, {
        updatedAt: new Date(),
      })

      payload.transformQuery(({ where }) => {
        where(eq(celestialProfiles.userId, userId))
      })
    },
  })

  rstoreDrizzleHooks.hook('realtime.filter', ({ collection, reject }) => {
    if (collection !== 'users' && collection !== 'celestialProfiles') {
      reject()
    }
  })
})

import { relations } from 'drizzle-orm'
import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { BODY_TYPES, COLOR_TOKENS } from '../../shared/galaxy'

export const bodyTypeEnum = pgEnum('body_type', [...BODY_TYPES])
export const colorTokenEnum = pgEnum('color_token', [...COLOR_TOKENS])

// Keep the demo schema intentionally small: a GitHub user owns exactly one
// orbital profile, which is the record edited through the public rstore API.
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  githubId: text('github_id').notNull().unique(),
  login: text('login').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url').notNull(),
  bio: text('bio'),
  location: text('location'),
  profileUrl: text('profile_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }).defaultNow().notNull(),
})

// This is the table exposed to learners through the liveQuery/updateForm flow.
export const celestialProfiles = pgTable('celestial_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  seed: integer('seed').notNull(),
  bodyType: bodyTypeEnum('body_type').notNull(),
  orbitDistance: integer('orbit_distance').notNull(),
  orbitSpeed: integer('orbit_speed').notNull(),
  colorToken: colorTokenEnum('color_token').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ one }) => ({
  celestialProfile: one(celestialProfiles, {
    fields: [users.id],
    references: [celestialProfiles.userId],
    relationName: 'user_profile',
  }),
}))

export const celestialProfilesRelations = relations(celestialProfiles, ({ one }) => ({
  user: one(users, {
    fields: [celestialProfiles.userId],
    references: [users.id],
    relationName: 'user_profile',
  }),
}))

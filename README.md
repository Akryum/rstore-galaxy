# Rstore Galaxy

`rstore-galaxy` is a small Nuxt demo that turns GitHub users into orbiting objects in a shared 3D scene. The project is meant to be read as much as it is meant to be run: it shows how `@rstore/nuxt-drizzle` and `@rstore/vue` fit together in a real app without burying the data flow under a lot of product code.

## What This Repo Teaches

- Generating rstore collections from a Drizzle schema with `@rstore/nuxt-drizzle`
- Reading live relational data with `liveQuery(...)`
- Editing a single record with `updateForm()`
- Enforcing table-level access rules in server hooks
- Publishing realtime updates when writes happen outside the generated CRUD handlers

## Architecture At A Glance

1. GitHub OAuth creates or refreshes a `users` row and creates one `celestial_profiles` row per user.
2. `@rstore/nuxt-drizzle` generates the client collections and server CRUD routes from [server/database/schema.ts](server/database/schema.ts).
3. The home page opens one `liveQuery` on `celestialProfiles` and includes each related `user`.
4. Selecting your own object creates an `updateForm()` bound to that profile.
5. Server hooks in [server/plugins/rstore-permissions.ts](server/plugins/rstore-permissions.ts) sanitize the patch payload and enforce ownership before the generated route writes to Postgres.

## Key Files

- [app/composables/useGalaxyPageState.ts](app/composables/useGalaxyPageState.ts): main `liveQuery` example and page-level selection state
- [app/components/galaxy/GalaxyInspector.vue](app/components/galaxy/GalaxyInspector.vue): selected-record query and inspector UI
- [app/components/galaxy/GalaxyItemForm.vue](app/components/galaxy/GalaxyItemForm.vue): `updateForm()` autosave example
- [server/routes/auth/github.get.ts](server/routes/auth/github.get.ts): OAuth sync flow plus manual realtime publishing
- [server/plugins/rstore-permissions.ts](server/plugins/rstore-permissions.ts): row ownership checks and payload sanitizing
- [shared/galaxy.ts](shared/galaxy.ts): shared domain constants and scene helpers

## Local Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Required values:

- `DATABASE_URL`
- `NUXT_SESSION_PASSWORD`
- `NUXT_OAUTH_GITHUB_CLIENT_ID`
- `NUXT_OAUTH_GITHUB_CLIENT_SECRET`

If GitHub cannot infer the callback, also set `NUXT_OAUTH_GITHUB_REDIRECT_URL`.

### 3. Start Postgres

```bash
docker compose up -d
```

The included container exposes Postgres on `localhost:5444`.

### 4. Run the database migrations

```bash
pnpm db:migrate
```

### 5. Start the app

```bash
pnpm dev
```

Open `http://localhost:3000`.

## GitHub OAuth Notes

Create a GitHub OAuth app with:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/auth/github`

For production, update both URLs to your deployed domain and set the matching environment variables.

## Helpful Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm db:generate
pnpm db:migrate
```

## Demo Features

- `/` renders the shared galaxy
- `/login` starts GitHub OAuth
- `?kiosk=true` hides the inspector chrome and shows only the total profile count
- Development mode enables the realtime stress-test panel for bulk synthetic updates

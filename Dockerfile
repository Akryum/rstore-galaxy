FROM node:24 AS base

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build

COPY . .

RUN pnpm build

RUN pnpm db:migrate

FROM node:25-bookworm-slim AS runner

RUN apt update && apt install -y curl

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

COPY --from=build /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]

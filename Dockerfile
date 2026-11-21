# syntax=docker/dockerfile:1

# Сборка образа приложения. На Vercel этот файл не используется: платформа
# собирает Next.js сама. Контейнер нужен для проверки и запуска вне Vercel.
#
# Приложение слушает PORT (по умолчанию 3000) и HOSTNAME=0.0.0.0.

FROM node:24-bookworm-slim AS deps
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Сборка не требует DATABASE_URL: страницы с данными рендерятся динамически.
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# `output: "standalone"` кладёт в `.next/standalone` сервер и только нужные
# зависимости. `public` и `.next/static` в него не попадают — копируем отдельно.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "server.js"]

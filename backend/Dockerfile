FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate

FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Required by docker-compose healthcheck
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY package*.json ./
EXPOSE 4000
CMD ["npx", "tsx", "src/server.ts"]

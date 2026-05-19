FROM node:20-alpine AS builder
WORKDIR /app
# OpenSSL required by Prisma on Alpine
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# OpenSSL required by Prisma query engine on Alpine
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY package*.json ./
EXPOSE 4000
CMD ["npx", "tsx", "src/server.ts"]

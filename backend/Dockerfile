# ── Build stage ──────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY tsconfig.json tsconfig.build.json ./
COPY src/ src/

RUN npm run build

# ── Production stage ──────────────────────────
FROM node:20-alpine

RUN apk add --no-cache tini curl

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist/ ./dist/
COPY ormconfig.ts ./

RUN mkdir -p /app/uploads /app/logs /app/data && \
    chown -R node:node /app

USER node

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]

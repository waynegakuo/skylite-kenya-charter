FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build production Angular SSR bundle
RUN npm run build

# Production runtime container
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy built server & client bundles and runtime dependencies
COPY --from=builder /app/dist/app ./dist/app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

# Start Express SSR server on $PORT
CMD ["node", "dist/app/server/server.mjs"]

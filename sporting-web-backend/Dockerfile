# Multi-stage build for NestJS backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and build project
COPY . .
RUN mkdir -p /app/src/credential
RUN npm run build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency manifests and install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy credential folder if exists
RUN mkdir -p ./src/credential
COPY --from=builder /app/src/credential ./src/credential

EXPOSE 3000

CMD ["node", "dist/main"]

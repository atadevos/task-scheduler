# ============================================================
# BACKEND DOCKERFILE - NESTJS APPLICATION
# Multi-stage build for optimized production image
# ============================================================

# Stage 1: Build Stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install build dependencies (cached layer - rarely changes)
# Update package index first, then install build tools
# Retry logic for network issues with Alpine repositories
RUN for i in 1 2 3; do \
      apk update && apk add --no-cache python3 build-base && break || \
      (echo "Retry $i failed, waiting 5 seconds..." && sleep 5); \
    done

# Update npm to latest version (cached layer - rarely changes)
RUN npm install -g npm@latest

# Copy package files first (for better caching)
# This layer is only rebuilt when package.json changes
COPY package*.json ./

# Install dependencies (cached layer - only rebuilds when package.json changes)
# Using npm install instead of npm ci for better compatibility
# Force installation of devDependencies for CLI tools
RUN npm cache clean --force && \
    npm install --legacy-peer-deps --include=dev && \
    npm cache clean --force

# Copy source code (this layer rebuilds on every code change)
COPY . .

# Build the NestJS application
RUN npm run build

# ============================================================
# Stage 2: Production Stage
# ============================================================
FROM node:24-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Install NestJS CLI globally for development mode
RUN npm install -g @nestjs/cli

# Copy only necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/config ./config

# Set NODE_ENV
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Fix ownership for development mode (writable/executable by nestjs user)
RUN chown -R nestjs:nodejs /app/dist && \
    chown -R nestjs:nodejs /app/node_modules/.bin

USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]

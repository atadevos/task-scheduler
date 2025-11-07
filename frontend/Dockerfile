# ============================================================
# FRONTEND DOCKERFILE - VUE.JS 3 APPLICATION
# Multi-stage build for optimized production image
# ============================================================

# Stage 1: Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (for better caching)
# This layer is only rebuilt when package.json changes
COPY package*.json ./

# Install dependencies (cached layer - only rebuilds when package.json changes)
RUN npm ci

# Copy source code (this layer rebuilds on every code change)
COPY . .

# Build the Vue.js application
RUN npm run build

# ============================================================
# Stage 2: Production Stage (Using Nginx)
# ============================================================
FROM nginx:alpine

WORKDIR /app

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Ensure nginx user exists with correct permissions (may already exist in base image)
RUN (id -g nginx >/dev/null 2>&1 || addgroup -g 101 -S nginx) && \
    (id -u nginx >/dev/null 2>&1 || adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx)

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health.html || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# ============================================================
# Stage 2 Alternative: Development with Vite
# ============================================================
# Use for development: build with target=development
# FROM node:20-alpine as dev
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci
# COPY . .
# EXPOSE 3000
# CMD ["npm", "run", "dev"]

# ============================================================================
# Moodle-Proctor Backend Dockerfile
# Multi-stage build for production optimization
# ============================================================================

# ----------------------------------------------------------------------------
# Migration build stage (lightweight, no mediasoup)
# ----------------------------------------------------------------------------
FROM node:22-alpine AS migration-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies without scripts (skips mediasoup build)
RUN npm install --ignore-scripts

# Copy source code
COPY src ./src
COPY scripts ./scripts

# Build TypeScript
RUN npm run build

# ----------------------------------------------------------------------------
# Main backend build stage (includes mediasoup - SKIPPED due to build issues)
# ----------------------------------------------------------------------------
# NOTE: mediasoup build fails in Alpine Linux with the following error:
# - mediasoup requires native C++ compilation of worker binaries
# - Alpine's musl libc is incompatible with mediasoup's prebuilt binaries
# - Building from source requires gcc, g++, make, Python, and libuv
# - Even with build tools installed, linking fails due to glibc/musl mismatch
#
# Workaround: Use migration-builder stage which skips mediasoup (--ignore-scripts)
# Impact: WebRTC features (real-time video/audio proctoring) are disabled
#
# Potential solutions (for future investigation):
# 1. Use Debian-based base image (node:22-bookworm-slim) instead of Alpine
# 2. Cross-compile mediasoup workers in separate glibc stage, copy to Alpine
# 3. Use WebRTCDataChannels as fallback (requires code changes)
# 4. Run mediasoup in separate glibc container, communicate via IPC
#
# Tracking: Create GitHub issue to document build errors and investigate solutions
# ----------------------------------------------------------------------------

# ----------------------------------------------------------------------------
# Production stage
# ----------------------------------------------------------------------------
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy from migration-builder (mediasoup not included - WebRTC disabled)
COPY --from=migration-builder /app/node_modules ./node_modules
COPY --from=migration-builder /app/dist ./dist
COPY --from=migration-builder /app/package*.json ./

# Create directories and set permissions
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app/logs /app/uploads /app/node_modules /app/dist && \
    chmod -R u+rX /app/dist /app/node_modules

USER nodejs

EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "/app/dist/index.js"]

# ----------------------------------------------------------------------------
# Migration production stage
# ----------------------------------------------------------------------------
FROM node:22-alpine AS migration

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy from migration-builder
COPY --from=migration-builder /app/node_modules ./node_modules
COPY --from=migration-builder /app/dist ./dist
COPY --from=migration-builder /app/src ./src
COPY --from=migration-builder /app/package*.json ./
COPY --from=migration-builder /app/scripts ./scripts

# Set permissions
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command can be overridden
CMD ["node", "/app/dist/index.js"]

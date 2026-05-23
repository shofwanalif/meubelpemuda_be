# # ─── Stage 1: Builder ───────────────────────────────────────────────
# FROM node:20-alpine AS builder

# WORKDIR /app

# # Copy dependency files dulu (layer cache)
# COPY package*.json ./
# COPY prisma ./prisma/
# COPY prisma.config.ts ./

# # Install semua deps (termasuk devDependencies untuk build)
# RUN npm ci

# # Copy source code
# COPY tsconfig.json ./
# COPY src ./src

# # Generate Prisma client
# RUN npx prisma generate

# # Build TypeScript → dist/
# RUN npm run build

# # ─── Stage 2: Production ────────────────────────────────────────────
# FROM node:20-alpine AS production

# WORKDIR /app

# # Copy hanya package files untuk install production deps
# COPY package*.json ./
# COPY prisma ./prisma/
# COPY prisma.config.ts ./  

# # Install production dependencies only
# RUN npm ci --omit=dev

# # Generate Prisma client di production image
# RUN npx prisma generate

# # Copy hasil build dari stage builder
# COPY --from=builder /app/dist ./dist

# # Expose port (sesuaikan dengan port Express kamu)
# EXPOSE 4000

# # Jalankan app
# CMD ["node", "dist/src/main.js"]

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Salin package files
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies (termasuk devDependencies untuk build)
RUN npm install && \
    npm cache clean --force

# Salin source code
COPY . .

ENV DATABASE_URL="mysql://root:root@localhost:3306/db"

# Generate Prisma Client (Penting agar Prisma tahu kita pakai MariaDB adapter)
RUN npx prisma generate && \
    npm run build

# Build TypeScript ke folder /dist
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Copy production dependencies dan Prisma client
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

COPY --from=builder /app/prisma.config.ts ./
# Expose port 
EXPOSE 4000

CMD ["npm", "start"]
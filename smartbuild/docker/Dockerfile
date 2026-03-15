# ══════════════════════════════════════════════════════════════════
# SmartBuild PRO — Dockerfile Multi-Stage
# Stage 1: build (compila frontend + backend)
# Stage 2: runtime (solo lo necesario para producción)
# ══════════════════════════════════════════════════════════════════

# ── Stage 1: Builder ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos primero (cache de layers)
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.ts ./
COPY drizzle.config.ts ./
COPY components.json ./

# Instalar dependencias
RUN npm ci --frozen-lockfile

# Copiar código fuente
COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/
COPY script/ ./script/

# Build producción (frontend + backend)
RUN npm run build

# ── Stage 2: Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Solo dependencias de producción
COPY package*.json ./
RUN npm ci --frozen-lockfile --omit=dev && npm cache clean --force

# Copiar build desde stage anterior
COPY --from=builder /app/dist ./dist

# Usuario no-root por seguridad
RUN addgroup -S smartbuild && adduser -S smartbuild -G smartbuild
RUN chown -R smartbuild:smartbuild /app
USER smartbuild

# Variables de entorno (se inyectan en runtime)
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "dist/index.cjs"]

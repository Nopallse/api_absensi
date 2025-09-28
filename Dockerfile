# -------------------------
# Stage 1: Build frontend
# -------------------------
FROM node:18-alpine AS frontend
WORKDIR /frontend

# Copy & install deps
COPY presensi-web/package*.json ./
RUN npm install

# Copy source dan build
COPY presensi-web/ .
RUN npm run build

# -------------------------
# Stage 2: Backend + frontend
# -------------------------
FROM node:18-alpine AS backend
WORKDIR /app

# Copy & install deps backend
COPY api_absensi/package*.json ./
RUN npm ci --only=production


# Copy backend source
COPY api_absensi/ .

# Copy hasil build frontend ke dalam backend
COPY --from=frontend /frontend/dist ./presensi-web/dist

# Pastikan ada folder uploads
RUN mkdir -p uploads

EXPOSE 3000

CMD ["npm", "start"]
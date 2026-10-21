# ==============================================================================
# Dockerfile: Hino OPF Monitoring & Tracking Dashboard (Optimized for Render)
# ==============================================================================

FROM oven/bun:latest

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Salin file konfigurasi dependensi
COPY package.json ./
COPY bun.lock* ./

# Install dependensi menggunakan Bun (bebas dari bug npm & apt-get)
RUN bun install

# Salin seluruh kode sumber aplikasi
COPY . .

# Buat direktori data untuk penyimpanan lokal jika diperlukan
RUN mkdir -p /app/data

# Build frontend React menggunakan Vite via Bun
RUN bun run build

# Buka port untuk Render & platform cloud lainnya
EXPOSE 3000 7860

# Jalankan server aplikasi
CMD ["bun", "run", "start"]

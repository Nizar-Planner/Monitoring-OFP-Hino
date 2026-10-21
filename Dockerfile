# ==============================================================================
# Dockerfile: Hino OPF Monitoring & Tracking Dashboard
# Dioptimalkan untuk Render.com (Free Tier) dengan Chromium & Puppeteer Headless
# ==============================================================================

FROM node:20-slim

# Pasang dependensi sistem operasi Linux untuk Chromium & Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    ca-certificates \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Konfigurasi environment Puppeteer agar menggunakan Chromium sistem
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Salin package manifest
COPY package*.json ./

# Bersihkan cache npm lalu install dependensi tanpa meng-upgrade npm global
RUN npm cache clean --force
RUN npm install --legacy-peer-deps --no-package-lock

# Salin seluruh kode aplikasi
COPY . .

# Buat folder data untuk penyimpanan database SQLite file
RUN mkdir -p /app/data

# Build frontend React menggunakan Vite
RUN npm run build

# Buat non-root user (UID 1000 standar untuk Hugging Face Spaces, Koyeb, dan Render)
RUN useradd -m -u 1000 user && \
    mkdir -p /app/data && \
    chown -R user:user /app

USER user

# Port fleksibel (3000 untuk Render/Koyeb, 7860 untuk Hugging Face Spaces)
EXPOSE 3000 7860

# Jalankan server Express full-stack
CMD ["npm", "start"]

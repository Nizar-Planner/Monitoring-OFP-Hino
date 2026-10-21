# ==============================================================================
# Dockerfile: Hino OPF Monitoring & Tracking Dashboard
# Render-safe build with Chromium + Puppeteer headless
# ==============================================================================

FROM node:20-slim

# Install dependencies for Chromium/Puppeteer on Linux
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

WORKDIR /app

# Copy dependency manifests first for caching
COPY package*.json ./

# IMPORTANT: tsx is in devDependencies, so in production builds we must still install dev deps.
RUN npm cache clean --force && npm install --legacy-peer-deps --include=dev

# Copy source code
COPY . .

# Prepare SQLite data directory
RUN mkdir -p /app/data

# Build frontend
RUN npm run build

ENV NODE_ENV=production \
    PORT=3000 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Render uses the PORT env variable; do not hardcode multiple ports here
EXPOSE 3000

# Run via npm so node_modules/.bin is on PATH and Render can pass PORT correctly
CMD ["sh", "-c", "npm start -- --host 0.0.0.0 --port ${PORT:-3000}"]

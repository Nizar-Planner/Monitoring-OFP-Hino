FROM oven/bun:1.2-debian

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-freefont-ttf \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json ./
COPY bun.lock* bun.lockb* ./
RUN bun install

COPY . .
RUN mkdir -p /app/data

# Build dulu, baru set production
RUN bun run build
ENV NODE_ENV=production

EXPOSE 10000
CMD ["bun", "run", "start"]

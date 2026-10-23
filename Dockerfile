FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm cache clean --force && npm install --legacy-peer-deps --include=dev

COPY . .
RUN mkdir -p /app/data
RUN npm run build

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "npm start -- --host 0.0.0.0 --port ${PORT:-3000}"]


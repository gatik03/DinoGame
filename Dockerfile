FROM node:20-alpine

WORKDIR /app

# Install build tools needed for better-sqlite3 native module and curl for healthcheck
RUN apk add --no-cache python3 make g++ curl

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p /app/data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/stats || exit 1

CMD ["node", "server.js"]

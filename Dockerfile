FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build application
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Install only runtime deps and a tiny static server
COPY package*.json ./
RUN npm install --omit=dev && npm install --global serve

# Copy build artifacts
COPY --from=builder /app/dist ./dist

EXPOSE 5300
ENV PORT=5300

CMD ["serve", "-s", "dist", "-l", "5300"]

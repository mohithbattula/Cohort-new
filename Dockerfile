## Multi‑stage Dockerfile for Vite + Nginx
# ---------- Build Stage ----------
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
# Build the Vite app (outputs to /app/dist)
RUN npm run build

# ---------- Production Stage ----------
FROM nginx:stable-alpine
# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html
# Optional: custom nginx config can be added later
EXPOSE 80
CMD ["nginx", "-g", "daemon off;" ]

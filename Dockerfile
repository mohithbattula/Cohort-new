## Multi-stage Dockerfile for Vite + Nginx
# ---------- Build Stage ----------
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . ./

# --- VITE BUILD ARGUMENTS ---
# Accept variables from docker-compose
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set them as environment variables so 'npm run build' can see them
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
# ----------------------------

# Build the Vite app (outputs to /app/dist)
RUN npm run build

# ---------- Production Stage ----------
FROM nginx:stable-alpine
# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html
# Optional: custom nginx config can be added later
EXPOSE 80
CMD ["nginx", "-g", "daemon off;" ]
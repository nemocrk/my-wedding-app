# Nginx Gateways Dockerfile
# Multi-stage build for Public and Intranet gateways

# Base image
FROM nginx:alpine AS base
# Ensure certs directory exists (for volume mounting if needed)
RUN mkdir -p /etc/nginx/certs

# ==============================================
# Target: Public Gateway
# ==============================================
FROM base AS public
COPY public.conf /etc/nginx/nginx.conf

# ==============================================
# Target: Intranet Gateway
# ==============================================
FROM base AS intranet
COPY intranet.conf /etc/nginx/nginx.conf

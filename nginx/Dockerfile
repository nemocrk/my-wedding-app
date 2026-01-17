# Nginx Gateways Dockerfile
# Multi-stage build for Public and Intranet gateways

# Base image
FROM nginx:alpine AS base
# Ensure certs directory exists (for volume mounting if needed)
RUN mkdir -p /etc/nginx/certs
# Create i18n directory for static JSON files
RUN mkdir -p /usr/share/nginx/html/i18n

# ==============================================
# Target: Public Gateway
# ==============================================
FROM base AS public
COPY public.conf /etc/nginx/nginx.conf
# Copy i18n files
COPY ../i18n/*.json /usr/share/nginx/html/i18n/

# ==============================================
# Target: Intranet Gateway
# ==============================================
FROM base AS intranet
COPY intranet.conf /etc/nginx/nginx.conf
# Copy i18n files
COPY ../i18n/*.json /usr/share/nginx/html/i18n/

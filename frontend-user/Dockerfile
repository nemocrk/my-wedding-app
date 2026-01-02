# frontend-user/Dockerfile
# Multi-stage build for development and production

# ==============================================
# Stage 1: Build - Compile React app
# ==============================================
FROM node:alpine as build

WORKDIR /app

# Copia package files per layer caching
COPY package*.json ./

# Installa dipendenze
RUN npm ci --only=production && \
    npm cache clean --force

# Copia tutto il codice sorgente
COPY . .

# Build argument per API URL
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build dell'applicazione
RUN npm run build

# Esegui i test (opzionale - decommentare per strict mode)
# RUN npm test -- --coverage --watchAll=false

# ==============================================
# Stage 2: Production - Nginx server
# ==============================================
FROM nginx:alpine as production

# Installa wget per healthchecks
RUN apk add --no-cache wget

# Copia i file compilati dallo stage di build
COPY --from=build /app/dist /usr/share/nginx/html

# Copia configurazione nginx custom (se presente)
# COPY nginx.conf /etc/nginx/nginx.conf

# Crea utente non-root (nginx già usa nginx user)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ==============================================
# Stage 3: Development - Hot reload
# ==============================================
FROM node:alpine as development

WORKDIR /app

# Copia package files
COPY package*.json ./

# Installa tutte le dipendenze (incluse devDependencies)
RUN npm install && \
    npm cache clean --force

# Copia tutto il codice
COPY . .

EXPOSE 80

# Comando per avviare Vite dev server con hot-reload su porta 80
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "80"]

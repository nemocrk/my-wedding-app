# frontend-user/Dockerfile

# --- Stage 1: Build ---
FROM node:alpine as build
WORKDIR /app
COPY package*.json ./
# Installa le dipendenze
RUN npm ci 
COPY . .
# Compila l'applicazione per la produzione
RUN npm run build

# --- Stage 2: Serve ---
FROM nginx:alpine
# Copia i file compilati dallo stage precedente alla cartella di Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# (Nota: se usi create-react-app invece di Vite, la cartella è /app/build invece di /app/dist)

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
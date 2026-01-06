# Stage 1: Base
FROM node:alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Stage 2: Development
FROM base AS development
ENV NODE_ENV=development
RUN npm install nodemon -g
COPY . .
CMD ["npm", "run", "dev"]

# Stage 3: Production
FROM node:alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .
CMD ["npm", "start"]

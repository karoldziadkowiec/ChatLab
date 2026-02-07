# WebClient Dockerfile (development)
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
# Use npm install to update lockfile in container when out of sync
RUN npm install --no-audit --no-fund

COPY . .
EXPOSE 3000
CMD ["npm", "start"]

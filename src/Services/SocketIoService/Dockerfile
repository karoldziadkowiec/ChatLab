# SocketIoService Dockerfile
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
ENV NODE_ENV=production
ENV SOCKETIO_PORT=8016
ENV GATEWAY_URL=http://gateway:8000
ENV WEBCLIENT_ORIGIN=http://localhost:3000
EXPOSE 8016
CMD ["npm", "start"]

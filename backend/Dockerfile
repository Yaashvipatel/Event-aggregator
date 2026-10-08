FROM node:20-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev --omit=optional
COPY backend/ ./
COPY frontend/ /app/frontend/
EXPOSE 3000
CMD ["node", "server.js"]

FROM node:18-bullseye-slim

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend ./backend

WORKDIR /app/backend

ENV NODE_ENV=production

CMD ["node", "server.js"]

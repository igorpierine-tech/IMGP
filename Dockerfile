FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV RAILWAY_VOLUME_MOUNT_PATH=/data
EXPOSE 3000

CMD ["npm", "run", "start:railway"]

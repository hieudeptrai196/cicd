# Multi-stage build: stage "base" cài dependency, stage cuối chỉ copy những gì
# cần để chạy - giữ image production nhỏ và không có dev-dependencies/test files.
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

EXPOSE 3000
# Chạy bằng user "node" có sẵn trong base image thay vì root - giảm rủi ro
# nếu container bị compromise (defense in depth).
USER node
CMD ["node", "src/index.js"]

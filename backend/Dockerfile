FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "start"]

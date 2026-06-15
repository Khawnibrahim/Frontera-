# Frontera API — local Docker (dev + migrate). Production Lambda deploy stays serverless.
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

FROM deps AS production
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]

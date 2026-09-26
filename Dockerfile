FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /app ./
RUN mkdir -p /app/public/uploads && chmod +x /app/docker-entrypoint.sh
EXPOSE 3000
CMD ["sh","/app/docker-entrypoint.sh"]

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm install
COPY . .
RUN npm run db:generate -w backend
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "npm run db:deploy -w backend && npm run start -w backend"]

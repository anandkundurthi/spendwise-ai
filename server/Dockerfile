FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json

RUN npm ci --omit=dev --workspace=server --include-workspace-root=false

WORKDIR /app/server

COPY server/src ./src

RUN mkdir -p uploads && chown node:node uploads

ENV PORT=5001
EXPOSE 5001

USER node

CMD ["node", "src/server.js"]

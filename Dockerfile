# Goldthread: production image. Untested here (no Docker on the build machine);
# the same production start is exercised by `npm run build && npm start`.
#   docker build -t goldthread .
#   docker run -p 4300:4300 -v goldthread-data:/data -e GT_PUBLIC_URL=https://goldthread.example.com goldthread

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4300 GT_DATA=/data GT_DEMO=0
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/web/dist ./web/dist
COPY core ./core
COPY server ./server
COPY mcp ./mcp
COPY cli ./cli
COPY book ./book
COPY LICENSE NOTICE README.md ./
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 4300
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:4300/api/health >/dev/null || exit 1
CMD ["node", "server/index.ts"]

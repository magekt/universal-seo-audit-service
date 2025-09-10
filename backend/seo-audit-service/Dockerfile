FROM node:18-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY . .

RUN groupadd -r seoaudit && useradd -r -g seoaudit seoaudit \
    && chown -R seoaudit:seoaudit /app

USER seoaudit

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

CMD ["npm", "start"]

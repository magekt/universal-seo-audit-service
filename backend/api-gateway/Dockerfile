FROM node:18-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY . .

RUN groupadd -r apigateway && useradd -r -g apigateway apigateway \
    && chown -R apigateway:apigateway /app

USER apigateway

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]

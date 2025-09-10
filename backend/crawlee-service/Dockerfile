# Use Node.js 18 with Playwright
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user for security
RUN groupadd -r crawler && useradd -r -g crawler -G audio,video crawler \
    && mkdir -p /home/crawler/Downloads \
    && chown -R crawler:crawler /home/crawler \
    && chown -R crawler:crawler /app

# Switch to non-root user
USER crawler

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the service
CMD ["npm", "start"]

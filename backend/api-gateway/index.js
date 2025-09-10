require('../shared/utils/validateEnv')();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Proxy targets
const services = {
  crawlee: process.env.CRAWLEE_SERVICE_URL,
  lighthouse: process.env.LIGHTHOUSE_SERVICE_URL,
  seo: process.env.SEO_SERVICE_URL
};

// Routes
app.use('/api/crawl', createProxyMiddleware({
  target: services.crawlee,
  changeOrigin: true
}));

app.use('/api/lighthouse', createProxyMiddleware({
  target: services.lighthouse,
  changeOrigin: true
}));

app.use('/api/seo', createProxyMiddleware({
  target: services.seo,
  changeOrigin: true
}));

// Orchestrator
app.post('/api/audit', async (req, res) => {
  const { url, options = {} } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  const auditId = 'audit_' + Date.now();
  res.json({ auditId, status: 'started' });
});

app.listen(PORT, () => {
  console.log(\`API Gateway running on port \${PORT}\`);
});

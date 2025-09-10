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

// Rate limiting for free tier
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Free tier: 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Service endpoints
const services = {
  crawlee: process.env.CRAWLEE_SERVICE_URL || 'http://crawlee-service:3001',
  lighthouse: process.env.LIGHTHOUSE_SERVICE_URL || 'http://lighthouse-service:3002',
  seo: process.env.SEO_SERVICE_URL || 'http://seo-service:3003'
};

// Proxy configuration
app.use('/api/crawl', createProxyMiddleware({ 
  target: services.crawlee, 
  changeOrigin: true,
  pathRewrite: { '^/api/crawl': '' }
}));

app.use('/api/lighthouse', createProxyMiddleware({ 
  target: services.lighthouse, 
  changeOrigin: true,
  pathRewrite: { '^/api/lighthouse': '' }
}));

app.use('/api/seo', createProxyMiddleware({ 
  target: services.seo, 
  changeOrigin: true,
  pathRewrite: { '^/api/seo': '' }
}));

// Main audit endpoint that orchestrates all services
app.post('/api/audit', async (req, res) => {
  const { url, options = {} } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const auditId = generateAuditId();
    
    // Start audit job
    const auditJob = {
      id: auditId,
      url,
      options,
      status: 'started',
      createdAt: new Date().toISOString(),
      services: {
        crawlee: { status: 'pending' },
        lighthouse: { status: 'pending' },
        seo: { status: 'pending' }
      }
    };

    // Store audit job in database/cache
    await storeAuditJob(auditJob);

    // Trigger parallel processing
    processAuditAsync(auditId, url, options);

    res.json({
      auditId,
      status: 'started',
      estimatedTime: '2-5 minutes',
      checkStatusUrl: `/api/audit/${auditId}/status`
    });

  } catch (error) {
    console.error('Audit initiation failed:', error);
    res.status(500).json({ error: 'Failed to start audit' });
  }
});

// Status endpoint
app.get('/api/audit/:auditId/status', async (req, res) => {
  try {
    const audit = await getAuditJob(req.params.auditId);
    if (!audit) {
      return res.status(404).json({ error: 'Audit not found' });
    }
    res.json(audit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get audit status' });
  }
});

// Results endpoint
app.get('/api/audit/:auditId/results', async (req, res) => {
  try {
    const results = await getAuditResults(req.params.auditId);
    if (!results) {
      return res.status(404).json({ error: 'Results not found' });
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get audit results' });
  }
});

async function processAuditAsync(auditId, url, options) {
  try {
    // Parallel processing of all services
    const [crawleeResults, lighthouseResults, seoResults] = await Promise.allSettled([
      fetch(`${services.crawlee}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, options })
      }).then(r => r.json()),
      
      fetch(`${services.lighthouse}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, options })
      }).then(r => r.json()),
      
      fetch(`${services.seo}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, options })
      }).then(r => r.json())
    ]);

    // Aggregate results
    const finalResults = await aggregateResults(auditId, {
      crawlee: crawleeResults,
      lighthouse: lighthouseResults,
      seo: seoResults
    });

    // Store final results
    await storeAuditResults(auditId, finalResults);
    
  } catch (error) {
    console.error(`Audit ${auditId} failed:`, error);
    await updateAuditStatus(auditId, 'failed', error.message);
  }
}

function generateAuditId() {
  return 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Mock functions - replace with actual database/cache implementation
async function storeAuditJob(job) { /* Implementation */ }
async function getAuditJob(id) { /* Implementation */ }
async function storeAuditResults(id, results) { /* Implementation */ }
async function getAuditResults(id) { /* Implementation */ }
async function updateAuditStatus(id, status, message) { /* Implementation */ }
async function aggregateResults(id, results) { /* Implementation */ }

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

module.exports = app;

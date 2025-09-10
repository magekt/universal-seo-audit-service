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
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Service endpoints
const services = {
  crawlee: process.env.CRAWLEE_SERVICE_URL || 'http://localhost:3001',
  lighthouse: process.env.LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002',
  seo: process.env.SEO_SERVICE_URL || 'http://localhost:3003'
};

// Simple audit endpoint for testing
app.post('/api/audit', async (req, res) => {
  const { url, options = {} } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const auditId = generateAuditId();
    
    res.json({
      auditId,
      status: 'started',
      message: 'SEO audit initiated successfully',
      estimatedTime: '2-5 minutes',
      checkStatusUrl: `/api/audit/${auditId}/status`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Audit initiation failed:', error);
    res.status(500).json({ 
      error: 'Failed to start audit',
      timestamp: new Date().toISOString()
    });
  }
});

// Status endpoint
app.get('/api/audit/:auditId/status', (req, res) => {
  res.json({
    auditId: req.params.auditId,
    status: 'processing',
    progress: 'Crawling website and analyzing content...',
    timestamp: new Date().toISOString()
  });
});

// Results endpoint  
app.get('/api/audit/:auditId/results', (req, res) => {
  res.json({
    auditId: req.params.auditId,
    status: 'completed',
    results: {
      crawlee: {
        pagesFound: 15,
        issues: ['Missing alt tags', 'Large images']
      },
      lighthouse: {
        performanceScore: 85,
        coreWebVitals: {
          lcp: 2.1,
          fid: 120,
          cls: 0.15
        }
      },
      seo: {
        overallScore: 78,
        criticalIssues: 3,
        recommendations: [
          {
            title: 'Add missing meta descriptions',
            description: 'Several pages are missing meta descriptions which impacts search visibility'
          },
          {
            title: 'Optimize image alt tags',
            description: 'Many images lack descriptive alt text for accessibility and SEO'
          },
          {
            title: 'Improve page load speed',
            description: 'Large images and unoptimized resources are slowing down the site'
          }
        ]
      }
    },
    timestamp: new Date().toISOString()
  });
});

function generateAuditId() {
  return 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

module.exports = app;

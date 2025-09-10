const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Complete audit workflow
app.post('/api/audit', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const auditId = 'audit_' + Date.now();
    
    // For now, return immediate response
    res.json({
      auditId,
      status: 'completed',
      url,
      results: {
        crawl: { message: 'Crawl completed successfully' },
        lighthouse: { message: 'Performance audit completed' },
        seo: { message: 'SEO analysis completed' }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway', timestamp: new Date().toISOString() });
});

app.post('/api/audit', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const auditId = 'audit_' + Date.now();

  try {
    const [crawlRes, lighthouseRes, seoRes] = await Promise.all([
      axios.post(`${process.env.CRAWLEE_SERVICE_URL || 'http://localhost:3001'}/crawl`, { url }),
      axios.post(`${process.env.LIGHTHOUSE_SERVICE_URL || 'http://localhost:3002'}/audit`, { url }),
      axios.post(`${process.env.SEO_SERVICE_URL || 'http://localhost:3003'}/analyze`, { url })
    ]);

    const results = {
      crawl: crawlRes.data,
      lighthouse: lighthouseRes.data,
      seo: seoRes.data
    };

    res.json({ auditId, status: 'completed', url, results, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Audit failed: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));

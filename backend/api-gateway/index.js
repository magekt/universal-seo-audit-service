const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'api-gateway', 
    timestamp: new Date().toISOString() 
  });
});

app.post('/api/audit', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  const auditId = 'audit_' + Date.now();
  res.json({
    auditId,
    status: 'completed',
    url,
    results: {
      crawl: { success: true, pages: 5 },
      lighthouse: { performance: 85, accessibility: 90 },
      seo: { score: 88, issues: 2 }
    },
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

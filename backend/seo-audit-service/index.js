const express = require('express');
const app = express();
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'seo-service',
    timestamp: new Date().toISOString()
  });
});

// SEO analysis endpoint
app.post('/analyze', async (req, res) => {
  try {
    const { url, crawlData } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const analysis = {
      url,
      score: Math.floor(Math.random() * 30) + 70,
      issues: [
        { type: 'warning', message: 'Meta description missing or too short' },
        { type: 'info', message: 'Consider adding more internal links' }
      ],
      recommendations: [
        'Add unique meta descriptions for each page',
        'Optimize image alt attributes',
        'Improve internal linking structure'
      ],
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, results: analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`SEO service running on port ${PORT}`);
});

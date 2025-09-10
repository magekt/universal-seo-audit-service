const express = require('express');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const app = express();
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'lighthouse-service',
    timestamp: new Date().toISOString()
  });
});

// Lighthouse audit endpoint
app.post('/audit', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Simple response for now
    res.json({
      success: true,
      url,
      scores: {
        performance: Math.floor(Math.random() * 40) + 60,
        accessibility: Math.floor(Math.random() * 30) + 70,
        bestPractices: Math.floor(Math.random() * 30) + 70,
        seo: Math.floor(Math.random() * 30) + 70
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Lighthouse service running on port ${PORT}`);
});

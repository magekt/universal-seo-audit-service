const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'lighthouse-service', 
    timestamp: new Date().toISOString() 
  });
});

app.post('/audit', (req, res) => {
  const { url } = req.body;
  res.json({ 
    success: true, 
    url,
    scores: { performance: 85, accessibility: 90, seo: 88 },
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Lighthouse service running on port ${PORT}`);
});

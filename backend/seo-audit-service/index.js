const express = require('express');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'seo-service', 
    timestamp: new Date().toISOString() 
  });
});

app.post('/analyze', (req, res) => {
  const { url } = req.body;
  res.json({ 
    success: true, 
    url,
    score: 88,
    issues: ['Add meta description', 'Optimize images', 'Improve page speed'],
    recommendations: ['Use descriptive titles', 'Add alt text to images'],
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`SEO service running on port ${PORT}`);
});

app.get('/health', (req,res)=>res.json({status:'healthy',service:'seo-service',timestamp:new Date().toISOString()}));

app.get('/health', (req,res)=>res.json({status:'healthy',service:'seo-service',timestamp:new Date().toISOString()}));

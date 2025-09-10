const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'seo-service', timestamp: new Date().toISOString() });
});

app.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const score = 88; // Placeholder; calculate based on checks
    const issues = [];
    const recommendations = [];

    if (!$('meta[name="description"]').attr('content')) {
      issues.push('Missing meta description');
      recommendations.push('Add a meta description tag');
    }
    if ($('h1').length === 0) {
      issues.push('No H1 tag found');
      recommendations.push('Add an H1 heading');
    }

    res.json({ success: true, score, issues, recommendations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`SEO service running on port ${PORT}`));

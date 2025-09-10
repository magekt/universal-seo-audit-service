const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'crawlee-service', timestamp: new Date().toISOString() });
});

app.post('/crawl', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const results = {
      title: $('title').text(),
      description: $('meta[name="description"]').attr('content') || '',
      h1: $('h1').first().text(),
      links: $('a').length,
      images: $('img').length,
      issues: []
    };

    if (!results.description) results.issues.push('Missing meta description');
    if (results.images > 0 && $('img[alt=""]').length > 0) results.issues.push('Images missing alt text');

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Crawlee service running on port ${PORT}`));

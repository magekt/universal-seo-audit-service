const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'crawlee-service',
    timestamp: new Date().toISOString()
  });
});

// Simple crawl endpoint
app.post('/crawl', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const response = await axios.get(url, { timeout: 10000 });
    const $ = cheerio.load(response.data);

    const result = {
      url,
      title: $('title').text(),
      description: $('meta[name="description"]').attr('content') || '',
      h1: $('h1').map((i, el) => $(el).text()).get(),
      h2: $('h2').map((i, el) => $(el).text()).get(),
      links: $('a[href]').map((i, el) => ({ 
        href: $(el).attr('href'), 
        text: $(el).text().trim() 
      })).get().slice(0, 50),
      images: $('img').map((i, el) => ({
        src: $(el).attr('src'),
        alt: $(el).attr('alt') || ''
      })).get().slice(0, 20),
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, results: result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Crawlee service running on port ${PORT}`);
});

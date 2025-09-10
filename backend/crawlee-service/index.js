const express = require('express');
const cheerio = require('cheerio');

const app = express();
app.use(express.json());

// Simple crawler without Playwright for now (Render free tier limitation)
class SimpleCrawler {
  async crawlWebsite(url) {
    try {
      // For now, return mock data due to Render's Playwright limitations
      const mockResults = {
        pages: [
          {
            url: url,
            title: "Sample Page Title",
            description: "Sample meta description",
            h1: ["Main Heading"],
            images: [
              { src: "/image1.jpg", alt: "Sample image" },
              { src: "/image2.jpg", alt: "" }
            ],
            links: [
              { href: "/about", text: "About Us" },
              { href: "/contact", text: "Contact" }
            ],
            wordCount: 500,
            status: 200,
            loadTime: 1200
          }
        ],
        metadata: {
          totalPages: 1,
          totalErrors: 0,
          averageLoadTime: 1200,
          pagesWithoutTitles: 0,
          pagesWithoutDescriptions: 0,
          imagesWithoutAlt: 1
        }
      };

      return mockResults;
    } catch (error) {
      throw new Error(`Crawling failed: ${error.message}`);
    }
  }
}

// API endpoints
app.post('/crawl', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const crawler = new SimpleCrawler();
    const results = await crawler.crawlWebsite(url);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      url,
      results
    });

  } catch (error) {
    console.error('Crawling failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'crawlee-service',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Crawlee service running on port ${PORT}`);
});

module.exports = app;

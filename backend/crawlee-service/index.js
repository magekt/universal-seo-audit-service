const { PlaywrightCrawler, Dataset } = require('crawlee');
const express = require('express');
const cheerio = require('cheerio');

const app = express();
app.use(express.json());

class WebsiteCrawler {
  constructor(options = {}) {
    this.options = {
      maxRequestsPerCrawl: options.maxPages || 50,
      maxConcurrency: options.concurrency || 3,
      requestHandlerTimeoutSecs: 60,
      ...options
    };
  }

  async crawlWebsite(url) {
    const results = {
      pages: [],
      links: [],
      images: [],
      metadata: {},
      errors: []
    };

    const crawler = new PlaywrightCrawler({
      ...this.options,
      async requestHandler({ request, page, enqueueLinks, log }) {
        try {
          const title = await page.title();
          const content = await page.content();
          const $ = cheerio.load(content);

          // Extract page metadata
          const pageData = {
            url: request.loadedUrl,
            title,
            description: $('meta[name="description"]').attr('content') || '',
            keywords: $('meta[name="keywords"]').attr('content') || '',
            h1: $('h1').map((i, el) => $(el).text()).get(),
            h2: $('h2').map((i, el) => $(el).text()).get(),
            images: $('img').map((i, el) => ({
              src: $(el).attr('src'),
              alt: $(el).attr('alt') || '',
              title: $(el).attr('title') || ''
            })).get(),
            links: $('a[href]').map((i, el) => ({
              href: $(el).attr('href'),
              text: $(el).text().trim(),
              title: $(el).attr('title') || ''
            })).get(),
            wordCount: $('body').text().split(/\s+/).length,
            status: 200,
            loadTime: Date.now() - request.loadedAt,
            charset: $('meta[charset]').attr('charset') || 'utf-8',
            viewport: $('meta[name="viewport"]').attr('content') || '',
            canonicalUrl: $('link[rel="canonical"]').attr('href') || '',
            ogTitle: $('meta[property="og:title"]').attr('content') || '',
            ogDescription: $('meta[property="og:description"]').attr('content') || '',
            ogImage: $('meta[property="og:image"]').attr('content') || '',
            twitterCard: $('meta[name="twitter:card"]').attr('content') || '',
            schemaMarkup: $('script[type="application/ld+json"]').map((i, el) => {
              try {
                return JSON.parse($(el).html());
              } catch (e) {
                return null;
              }
            }).get().filter(Boolean)
          };

          results.pages.push(pageData);
          
          // Extract and enqueue links for further crawling
          await enqueueLinks({
            selector: 'a[href]',
            label: 'page'
          });

          log.info(`Crawled: ${title} (${request.loadedUrl})`);

        } catch (error) {
          log.error(`Error crawling ${request.loadedUrl}:`, error);
          results.errors.push({
            url: request.loadedUrl,
            error: error.message
          });
        }
      },

      failedRequestHandler({ request, error }) {
        results.errors.push({
          url: request.url,
          error: error.message
        });
      }
    });

    await crawler.run([url]);

    // Analyze collected data
    results.metadata = this.analyzeWebsite(results);
    
    return results;
  }

  analyzeWebsite(results) {
    const { pages, errors } = results;
    
    return {
      totalPages: pages.length,
      totalErrors: errors.length,
      averageLoadTime: pages.reduce((sum, p) => sum + (p.loadTime || 0), 0) / pages.length,
      pagesWithoutTitles: pages.filter(p => !p.title || p.title.length === 0).length,
      pagesWithoutDescriptions: pages.filter(p => !p.description || p.description.length === 0).length,
      pagesWithoutH1: pages.filter(p => !p.h1 || p.h1.length === 0).length,
      imagesWithoutAlt: pages.reduce((sum, p) => sum + p.images.filter(img => !img.alt).length, 0),
      internalLinks: pages.reduce((sum, p) => sum + p.links.filter(link => 
        link.href && (link.href.startsWith('/') || link.href.includes(new URL(pages[0]?.url || '').hostname))
      ).length, 0),
      externalLinks: pages.reduce((sum, p) => sum + p.links.filter(link => 
        link.href && link.href.startsWith('http') && !link.href.includes(new URL(pages[0]?.url || '').hostname)
      ).length, 0),
      schemaPages: pages.filter(p => p.schemaMarkup && p.schemaMarkup.length > 0).length,
      duplicateTitles: this.findDuplicates(pages.map(p => p.title)),
      duplicateDescriptions: this.findDuplicates(pages.map(p => p.description))
    };
  }

  findDuplicates(array) {
    const counts = {};
    array.forEach(item => {
      if (item && item.trim()) {
        counts[item] = (counts[item] || 0) + 1;
      }
    });
    return Object.keys(counts).filter(key => counts[key] > 1).length;
  }
}

// API endpoints
app.post('/crawl', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const crawler = new WebsiteCrawler(options);
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
  res.json({ status: 'healthy', service: 'crawlee-service' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Crawlee service running on port ${PORT}`);
});

module.exports = app;

const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const app = express();
app.use(express.json());

class ModernWebCrawler {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ]
      });
    }
    return this.browser;
  }

  async crawlWebsite(url, options = {}) {
    const maxPages = options.maxPages || 10;
    const results = {
      pages: [],
      links: new Set(),
      images: [],
      errors: []
    };

    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (compatible; SEO-Audit-Bot/1.0)');

      // Navigate to the main page
      console.log(`Crawling: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Wait for any dynamic content to load
      await page.waitForTimeout(3000);

      // Extract page data
      const pageData = await this.extractPageData(page, url);
      results.pages.push(pageData);

      // Find all links on the page
      const links = await page.$$eval('a[href]', anchors => 
        anchors.map(anchor => ({
          href: anchor.href,
          text: anchor.textContent.trim(),
          title: anchor.title || ''
        }))
      );

      // Filter and process internal links
      const baseUrl = new URL(url);
      const internalLinks = links
        .filter(link => {
          try {
            const linkUrl = new URL(link.href);
            return linkUrl.hostname === baseUrl.hostname;
          } catch (e) {
            return false;
          }
        })
        .slice(0, maxPages - 1); // Reserve space for main page

      // Crawl internal pages
      for (const link of internalLinks.slice(0, Math.min(5, maxPages - 1))) {
        try {
          console.log(`Crawling internal page: ${link.href}`);
          await page.goto(link.href, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
          });
          await page.waitForTimeout(2000);

          const internalPageData = await this.extractPageData(page, link.href);
          results.pages.push(internalPageData);
        } catch (error) {
          console.error(`Error crawling ${link.href}:`, error.message);
          results.errors.push({
            url: link.href,
            error: error.message
          });
        }
      }

      await page.close();

      // Analyze collected data
      results.metadata = this.analyzeWebsite(results);
      
      return results;

    } catch (error) {
      console.error('Crawling failed:', error);
      results.errors.push({
        url,
        error: error.message
      });
      return results;
    }
  }

  async extractPageData(page, url) {
    // Wait for dynamic content
    await page.waitForTimeout(2000);

    // Get page content after JavaScript execution
    const content = await page.content();
    const $ = cheerio.load(content);

    // Extract comprehensive page data
    const pageData = {
      url,
      title: await page.title(),
      description: await page.$eval('meta[name="description"]', el => el.content).catch(() => ''),
      keywords: await page.$eval('meta[name="keywords"]', el => el.content).catch(() => ''),
      
      // Headers
      h1: await page.$$eval('h1', elements => elements.map(el => el.textContent.trim())),
      h2: await page.$$eval('h2', elements => elements.map(el => el.textContent.trim())),
      h3: await page.$$eval('h3', elements => elements.map(el => el.textContent.trim())),

      // Images
      images: await page.$$eval('img', images => 
        images.map(img => ({
          src: img.src,
          alt: img.alt || '',
          title: img.title || '',
          width: img.width,
          height: img.height
        }))
      ),

      // Links
      links: await page.$$eval('a[href]', anchors =>
        anchors.map(anchor => ({
          href: anchor.href,
          text: anchor.textContent.trim(),
          title: anchor.title || ''
        }))
      ),

      // Performance metrics
      loadTime: await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return navigation ? navigation.loadEventEnd - navigation.fetchStart : 0;
      }),

      // Content analysis
      wordCount: await page.$eval('body', body => body.textContent.split(/\s+/).length),
      
      // Technical SEO
      charset: $('meta[charset]').attr('charset') || 'utf-8',
      viewport: $('meta[name="viewport"]').attr('content') || '',
      canonicalUrl: $('link[rel="canonical"]').attr('href') || '',
      
      // Open Graph
      ogTitle: $('meta[property="og:title"]').attr('content') || '',
      ogDescription: $('meta[property="og:description"]').attr('content') || '',
      ogImage: $('meta[property="og:image"]').attr('content') || '',
      
      // Twitter Cards
      twitterCard: $('meta[name="twitter:card"]').attr('content') || '',
      
      // Schema markup
      schemaMarkup: $('script[type="application/ld+json"]').map((i, el) => {
        try {
          return JSON.parse($(el).html());
        } catch (e) {
          return null;
        }
      }).get().filter(Boolean),

      // JavaScript detection
      hasJavaScript: await page.evaluate(() => {
        return !!(window.React || window.Vue || window.angular || 
                 document.querySelector('[data-reactroot]') ||
                 document.querySelector('[ng-app]') ||
                 document.querySelector('.vue-app'));
      }),

      status: 200,
      timestamp: new Date().toISOString()
    };

    return pageData;
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
      javascriptPages: pages.filter(p => p.hasJavaScript).length,
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

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Global crawler instance
const crawler = new ModernWebCrawler();

// API endpoints
app.post('/crawl', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Starting crawl for: ${url}`);
    const results = await crawler.crawlWebsite(url, options);
    
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
    capabilities: [
      'JavaScript rendering',
      'Dynamic content crawling',
      'SPA support (React, Vue, Angular)',
      'Performance metrics',
      'Schema markup detection',
      'Open Graph extraction'
    ],
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await crawler.cleanup();
  process.exit(0);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Modern Web Crawler service running on port ${PORT}`);
  console.log('🚀 Features enabled: JavaScript rendering, SPA support, dynamic content');
});

module.exports = app;

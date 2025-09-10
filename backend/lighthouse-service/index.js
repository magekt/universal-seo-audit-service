const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const express = require('express');

const app = express();
app.use(express.json());

class LighthouseAuditor {
  constructor(options = {}) {
    this.options = {
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      ...options
    };
  }

  async auditUrl(url) {
    const chrome = await chromeLauncher.launch({
      chromeFlags: this.options.chromeFlags
    });

    const config = {
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: this.options.onlyCategories,
        formFactor: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        },
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    try {
      const runnerResult = await lighthouse(url, {
        port: chrome.port,
        ...this.options
      }, config);

      await chrome.kill();

      return this.processLighthouseResults(runnerResult);

    } catch (error) {
      await chrome.kill();
      throw error;
    }
  }

  processLighthouseResults(runnerResult) {
    const { lhr } = runnerResult;
    
    const categories = {};
    Object.keys(lhr.categories).forEach(key => {
      categories[key] = {
        score: Math.round(lhr.categories[key].score * 100),
        title: lhr.categories[key].title,
        description: lhr.categories[key].description
      };
    });

    const coreWebVitals = {
      fcp: lhr.audits['first-contentful-paint']?.numericValue || 0,
      lcp: lhr.audits['largest-contentful-paint']?.numericValue || 0,
      cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
      fid: lhr.audits['max-potential-fid']?.numericValue || 0,
      ttfb: lhr.audits['server-response-time']?.numericValue || 0,
      tbt: lhr.audits['total-blocking-time']?.numericValue || 0,
      si: lhr.audits['speed-index']?.numericValue || 0
    };

    const performanceMetrics = {
      performanceScore: categories.performance?.score || 0,
      loadTime: lhr.audits['speed-index']?.numericValue || 0,
      firstContentfulPaint: lhr.audits['first-contentful-paint']?.numericValue || 0,
      largestContentfulPaint: lhr.audits['largest-contentful-paint']?.numericValue || 0,
      timeToInteractive: lhr.audits['interactive']?.numericValue || 0,
      totalBlockingTime: lhr.audits['total-blocking-time']?.numericValue || 0,
      cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.numericValue || 0
    };

    const seoAudits = {
      metaDescription: lhr.audits['meta-description']?.score === 1,
      documentTitle: lhr.audits['document-title']?.score === 1,
      imageAlt: lhr.audits['image-alt']?.score === 1,
      linkText: lhr.audits['link-text']?.score === 1,
      crawlable: lhr.audits['is-crawlable']?.score === 1,
      hreflang: lhr.audits['hreflang']?.score === 1,
      canonical: lhr.audits['canonical']?.score === 1,
      robotsTxt: lhr.audits['robots-txt']?.score === 1
    };

    const accessibilityAudits = {
      colorContrast: lhr.audits['color-contrast']?.score === 1,
      imageAlt: lhr.audits['image-alt']?.score === 1,
      labelText: lhr.audits['label']?.score === 1,
      linkName: lhr.audits['link-name']?.score === 1,
      buttonName: lhr.audits['button-name']?.score === 1
    };

    const opportunities = lhr.audits ? Object.keys(lhr.audits)
      .filter(key => lhr.audits[key].score !== null && lhr.audits[key].score < 1)
      .map(key => ({
        id: key,
        title: lhr.audits[key].title,
        description: lhr.audits[key].description,
        score: lhr.audits[key].score,
        numericValue: lhr.audits[key].numericValue,
        displayValue: lhr.audits[key].displayValue
      })) : [];

    return {
      url: lhr.finalUrl,
      categories,
      coreWebVitals,
      performanceMetrics,
      seoAudits,
      accessibilityAudits,
      opportunities: opportunities.slice(0, 10), // Top 10 opportunities
      overallScore: Math.round(Object.values(categories).reduce((sum, cat) => sum + cat.score, 0) / Object.keys(categories).length),
      reportUrl: lhr.finalUrl,
      timestamp: new Date().toISOString(),
      lighthouseVersion: lhr.lighthouseVersion
    };
  }
}

// API endpoints
app.post('/audit', async (req, res) => {
  try {
    const { url, options = {} } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const auditor = new LighthouseAuditor(options);
    const results = await auditor.auditUrl(url);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      url,
      results
    });

  } catch (error) {
    console.error('Lighthouse audit failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'lighthouse-service' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Lighthouse service running on port ${PORT}`);
});

module.exports = app;

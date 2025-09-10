const express = require('express');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'lighthouse-service', timestamp: new Date().toISOString() });
});

app.post('/audit', async (req, res) => {
  const { url } = req.body;
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = { logLevel: 'info', output: 'json', onlyCategories: ['performance', 'accessibility', 'seo'], port: chrome.port };

  try {
    const runnerResult = await lighthouse(url, options);
    const scores = {
      performance: runnerResult.lhr.categories.performance.score * 100,
      accessibility: runnerResult.lhr.categories.accessibility.score * 100,
      seo: runnerResult.lhr.categories.seo.score * 100
    };
    res.json({ success: true, scores });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    await chrome.kill();
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Lighthouse service running on port ${PORT}`));

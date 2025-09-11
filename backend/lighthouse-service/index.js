import express from 'express';
import chromeLauncher from 'chrome-launcher';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'lighthouse-service', timestamp: new Date().toISOString() });
});

app.post('/audit', async (req, res) => {
  const { url } = req.body;
  try {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const lighthouse = await import('lighthouse');
    const options = { logLevel: 'info', output: 'json', onlyCategories: ['performance', 'accessibility', 'seo'], port: chrome.port };
    const runnerResult = await lighthouse.lighthouse(url, options);
    const scores = {
      performance: runnerResult.lhr.categories.performance.score * 100,
      accessibility: runnerResult.lhr.categories.accessibility.score * 100,
      seo: runnerResult.lhr.categories.seo.score * 100
    };
    res.json({ success: true, scores });
    await chrome.kill();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => console.log(`Lighthouse service running on port ${PORT}`));
// Replace the last line with proper binding

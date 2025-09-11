import express from 'express';
import { launch } from 'chrome-launcher';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'lighthouse-service', timestamp: new Date().toISOString() });
});

app.post('/audit', async (req, res) => {
  const { url } = req.body;
  try {
    const chrome = await launch({ chromeFlags: ['--headless'] });
    const lighthouse = await import('lighthouse');
    const options = { logLevel: 'info', output: 'json', onlyCategories: ['performance', 'accessibility', 'seo'], port: chrome.port };
    const runnerResult = await lighthouse.default(url, options);
    const scores = {
      performance: Math.round(runnerResult.lhr.categories.performance.score * 100),
      accessibility: Math.round(runnerResult.lhr.categories.accessibility.score * 100),
      seo: Math.round(runnerResult.lhr.categories.seo.score * 100)
    };
    await chrome.kill();
    res.json({ success: true, scores });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => console.log(`Lighthouse service running on port ${PORT}`));

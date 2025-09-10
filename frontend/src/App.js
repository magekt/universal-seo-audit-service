import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  // Use the correct base URL and include /api prefix in calls
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://universal-seo-audit-service.onrender.com';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const postUrl = `${API_BASE_URL}/api/audit`;
      console.log('Making request to:', postUrl);

      const response = await axios.post(postUrl, {
        url: url,
        options: {
          maxPages: 25,
          includeImages: true,
          checkMobile: true
        }
      });

      console.log('API Response:', response.data);
      const auditId = response.data.auditId;

      if (!auditId) {
        throw new Error('No audit ID received from server');
      }

      // Fetch results immediately for simplicity
      const getUrl = `${API_BASE_URL}/api/audit/${auditId}/results`;
      console.log('Fetching results from:', getUrl);

      const resultResponse = await axios.get(getUrl);
      setResults(resultResponse.data);
      setLoading(false);
    } catch (err) {
      console.error('API Error:', err);
      console.error('Error response:', err.response);
      setError('Failed to start audit: ' + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Universal SEO Audit Service</h1>
        <p>Free, comprehensive SEO auditing for everyone</p>
        <p>API URL: {API_BASE_URL}</p>
      </header>

      <main className="audit-container">
        <form onSubmit={handleSubmit} className="audit-form">
          <div className="form-group">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL (e.g., https://example.com)"
              required
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading || !url}>
            {loading ? 'Analyzing...' : 'Start SEO Audit'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {results && (
          <div className="results-container">
            <div className="results-header">
              <h2>📊 Audit Results</h2>
            </div>
            
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Overall Score</h3>
                <div className="metric-value">
                  {results.results?.seo?.overallScore ||
                    results.results?.seo?.score || 'N/A'}/100
                </div>
              </div>
              
              <div className="metric-card">
                <h3>Pages Crawled</h3>
                <div className="metric-value">
                  {results.results?.crawlee?.pagesFound ||
                    results.results?.crawl?.pages || 'N/A'}
                </div>
              </div>
              
              <div className="metric-card">
                <h3>Performance</h3>
                <div className="metric-value">
                  {results.results?.lighthouse?.performanceScore ||
                    results.results?.lighthouse?.performance || 'N/A'}/100
                </div>
              </div>
              
              <div className="metric-card">
                <h3>Issues Found</h3>
                <div className="metric-value">
                  {results.results?.seo?.criticalIssues ||
                    results.results?.seo?.issues || 'N/A'}
                </div>
              </div>
            </div>

            <div className="issues-section">
              <h3>🔍 Key Issues</h3>
              {results.results?.seo?.recommendations ? (
                results.results.seo.recommendations.slice(0, 5).map((rec, index) => (
                  <div key={index} className="issue-item">
                    <h4>{rec.title || `Issue ${index + 1}`}</h4>
                    <p>{rec.description || rec}</p>
                  </div>
                ))
              ) : (
                <p>No specific recommendations available.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

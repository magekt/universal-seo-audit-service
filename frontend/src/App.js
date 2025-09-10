import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await axios.post('/api/audit', {
        url: url,
        options: {
          maxPages: 25,
          includeImages: true,
          checkMobile: true
        }
      });

      const auditId = response.data.auditId;
      
      // Poll for results
      const checkResults = async () => {
        try {
          const resultResponse = await axios.get(`/api/audit/${auditId}/results`);
          setResults(resultResponse.data);
          setLoading(false);
        } catch (error) {
          if (error.response?.status === 404) {
            // Still processing, check again in 5 seconds
            setTimeout(checkResults, 5000);
          } else {
            setError('Failed to get audit results');
            setLoading(false);
          }
        }
      };

      // Start checking for results after 30 seconds
      setTimeout(checkResults, 30000);

    } catch (error) {
      setError('Failed to start audit: ' + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Universal SEO Audit Service</h1>
        <p>Free, comprehensive SEO auditing for everyone</p>
      </header>

      <main className="container">
        <div className="audit-form">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL (e.g., https://example.com)"
                required
                disabled={loading}
              />
              <button type="submit" disabled={loading || !url}>
                {loading ? 'Auditing...' : 'Start Audit'}
              </button>
            </div>
          </form>

          {error && (
            <div className="error">
              <p>❌ {error}</p>
            </div>
          )}

          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Running comprehensive SEO audit...</p>
              <p>This may take 2-5 minutes to complete.</p>
            </div>
          )}

          {results && (
            <div className="results">
              <h2>📊 Audit Results</h2>
              
              <div className="summary-cards">
                <div className="card">
                  <h3>Overall Score</h3>
                  <div className="score">{results.results?.seo?.overallScore || 'N/A'}/100</div>
                </div>
                
                <div className="card">
                  <h3>Pages Crawled</h3>
                  <div className="score">{results.results?.crawlee?.pagesFound || 'N/A'}</div>
                </div>
                
                <div className="card">
                  <h3>Performance</h3>
                  <div className="score">{results.results?.lighthouse?.performanceScore || 'N/A'}/100</div>
                </div>
                
                <div className="card">
                  <h3>Issues Found</h3>
                  <div className="score critical">{results.results?.seo?.criticalIssues || 'N/A'}</div>
                </div>
              </div>

              <div className="detailed-results">
                <h3>🔍 Key Issues</h3>
                {results.results?.seo?.recommendations?.slice(0, 5).map((rec, index) => (
                  <div key={index} className="recommendation">
                    <h4>{rec.title}</h4>
                    <p>{rec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer>
        <p>Made with ❤️ by the Universal SEO Audit Team</p>
        <p>Open source and free forever!</p>
      </footer>
    </div>
  );
}

export default App;

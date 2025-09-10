const express = require('express');
const cheerio = require('cheerio');

const app = express();
app.use(express.json());

class SEOAuditor {
  async analyzePage(pageData) {
    const issues = [];
    
    // Critical SEO checks
    if (!pageData.title || pageData.title.trim().length === 0) {
      issues.push({
        severity: 'critical',
        rule: 'title_missing',
        message: 'Page is missing a title tag',
        recommendation: 'Add a unique, descriptive title tag (50-60 characters)',
        url: pageData.url
      });
    }

    if (!pageData.description || pageData.description.trim().length === 0) {
      issues.push({
        severity: 'critical',
        rule: 'meta_description_missing',
        message: 'Page is missing a meta description',
        recommendation: 'Add a compelling meta description (150-160 characters)',
        url: pageData.url
      });
    }

    if (!pageData.h1 || pageData.h1.length === 0) {
      issues.push({
        severity: 'critical',
        rule: 'h1_missing',
        message: 'Page is missing an H1 tag',
        recommendation: 'Add a single, descriptive H1 tag to each page',
        url: pageData.url
      });
    }

    // Image optimization checks
    const imagesWithoutAlt = pageData.images?.filter(img => !img.alt || img.alt.trim().length === 0) || [];
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        severity: 'high',
        rule: 'missing_alt_tags',
        message: `${imagesWithoutAlt.length} images are missing alt tags`,
        recommendation: 'Add descriptive alt text to all images for accessibility and SEO',
        url: pageData.url
      });
    }

    return issues;
  }

  async analyzeWebsite(crawleeResults) {
    const { pages = [] } = crawleeResults.results || {};
    
    if (!pages || pages.length === 0) {
      throw new Error('No pages found to analyze');
    }

    const allIssues = [];
    const pageAnalysis = [];

    // Analyze each page
    for (const page of pages) {
      const pageIssues = await this.analyzePage(page);
      allIssues.push(...pageIssues);
      
      pageAnalysis.push({
        url: page.url,
        title: page.title,
        issues: pageIssues.length,
        score: this.calculatePageScore(pageIssues),
        recommendations: pageIssues.slice(0, 3)
      });
    }

    const overallScore = this.calculateOverallScore(allIssues, pages.length);
    const issuesBySeverity = this.groupIssuesBySeverity(allIssues);
    const actionPlan = this.generateActionPlan(issuesBySeverity);

    return {
      url: pages[0]?.url || 'Unknown',
      overallScore,
      totalPages: pages.length,
      totalIssues: allIssues.length,
      issuesBySeverity,
      pageAnalysis,
      actionPlan,
      timestamp: new Date().toISOString()
    };
  }

  calculatePageScore(issues) {
    let deductions = 0;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': deductions += 25; break;
        case 'high': deductions += 15; break;
        case 'medium': deductions += 8; break;
        case 'low': deductions += 3; break;
      }
    });

    return Math.max(0, 100 - deductions);
  }

  calculateOverallScore(issues, pageCount) {
    const severityCounts = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };

    const weightedScore = 100 - (
      (severityCounts.critical * 20) + 
      (severityCounts.high * 12) + 
      (severityCounts.medium * 6) + 
      (severityCounts.low * 2)
    ) / Math.max(1, pageCount);

    return Math.max(0, Math.round(weightedScore));
  }

  groupIssuesBySeverity(issues) {
    return {
      critical: issues.filter(i => i.severity === 'critical'),
      high: issues.filter(i => i.severity === 'high'),
      medium: issues.filter(i => i.severity === 'medium'),
      low: issues.filter(i => i.severity === 'low')
    };
  }

  generateActionPlan(issuesBySeverity) {
    const actionItems = [];

    if (issuesBySeverity.critical.length > 0) {
      actionItems.push({
        priority: 'IMMEDIATE',
        title: 'Fix Critical SEO Issues',
        description: `Address ${issuesBySeverity.critical.length} critical issues`,
        estimatedTime: '1-2 hours',
        impact: 'High'
      });
    }

    if (issuesBySeverity.high.length > 0) {
      actionItems.push({
        priority: 'HIGH',
        title: 'Resolve High-Priority Issues',
        description: `Fix ${issuesBySeverity.high.length} high-priority issues`,
        estimatedTime: '2-4 hours',
        impact: 'Medium-High'
      });
    }

    return actionItems;
  }
}

// API endpoints
app.post('/analyze', async (req, res) => {
  try {
    const { crawleeResults, options = {} } = req.body;
    
    if (!crawleeResults) {
      return res.status(400).json({ error: 'Crawlee results are required' });
    }

    const auditor = new SEOAuditor();
    const results = await auditor.analyzeWebsite(crawleeResults);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });

  } catch (error) {
    console.error('SEO analysis failed:', error);
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
    service: 'seo-audit-service',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`SEO Audit service running on port ${PORT}`);
});

module.exports = app;

const express = require('express');
const cheerio = require('cheerio');
const validator = require('validator');

const app = express();
app.use(express.json());

class SEOAuditor {
  constructor() {
    this.rules = {
      critical: [
        { id: 'title_missing', name: 'Missing Title Tag', weight: 100 },
        { id: 'meta_description_missing', name: 'Missing Meta Description', weight: 90 },
        { id: 'h1_missing', name: 'Missing H1 Tag', weight: 85 },
        { id: 'broken_internal_links', name: 'Broken Internal Links', weight: 80 }
      ],
      high: [
        { id: 'duplicate_title', name: 'Duplicate Title Tags', weight: 70 },
        { id: 'duplicate_meta_desc', name: 'Duplicate Meta Descriptions', weight: 65 },
        { id: 'missing_alt_tags', name: 'Missing Image Alt Tags', weight: 60 },
        { id: 'poor_url_structure', name: 'Poor URL Structure', weight: 55 }
      ],
      medium: [
        { id: 'missing_schema', name: 'Missing Schema Markup', weight: 50 },
        { id: 'no_internal_linking', name: 'Poor Internal Linking', weight: 45 },
        { id: 'missing_canonical', name: 'Missing Canonical Tags', weight: 40 }
      ]
    };
  }

  async analyzePage(pageData) {
    const issues = [];
    const $ = cheerio.load(pageData.content || '');
    
    // Critical SEO checks
    if (!pageData.title || pageData.title.trim().length === 0) {
      issues.push({
        severity: 'critical',
        rule: 'title_missing',
        message: 'Page is missing a title tag',```      recommendation: 'Add a unique```escriptive title tag```0-60 characters)',
        url: pageData.url
      });
    } else if (pageData.title.length > 60) {
      issues.push({
        severity: 'high',
        rule: 'title_too_long',
        message: `Title tag is too long (${pageData.title.length} characters)`,
        recommendation: 'Keep title tags```der 60 characters',
        url: pageData.url
      });
    }

    if (!pageData.description || pageData.description.trim().length === 0) {
      issues.push({
        severity: 'critical',
        rule: 'meta_description_missing',```      message: 'Page is missing a meta description',
        recommendation: 'Add a compelling```ta description (150-160 characters)',
        url: pageData.url
      });
    } else if (pageData.description.length > 160) {
      issues.push({
        severity: 'high',
        rule: 'meta_desc_too_long',
        message: `Meta description is too long (${pageData.description.length} characters)`,
        recommendation: 'Keep meta descriptions under 160 characters',
        url: pageData.url
      });
    }

    if (!pageData.h1 || pageData.h1.length === 0) {
      issues.push({
        severity: 'critical',
        rule: 'h1_missing',
        message: 'Page is missing an``` tag',
        recommendation: 'Add a single, descript``` H1 tag to each page',
        url: pageData.url
      });
    } else if (pageData.h1.length > 1) {
      issues.push({
        severity: 'high',
        rule: 'multiple_h1',
        message: `Page has ${pageData.h1.length} H1 tags`,
        recommendation: 'Use only one H1 tag per page',
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
        recommendation: 'Add descriptive alt text to```l images for accessibility an```EO',
        url: pageData.url,
        details: imagesWithoutAlt.map(img => img.src).slice(0, 5)
      });
    }

    // Schema markup check
    if (!pageData.schemaMarkup || pageData.sch```Markup.length === 0) {
      issues.push({
        severity: 'medium',
        rule: 'missing_schema',
        message: 'Page is missing structure```ata markup```        recommendation: 'Add relevant```ON-LD schema markup for better search visibility```        url: pageData.url
      });
    }

    // Canonical URL check
    if (!pageData.canonicalUrl) {
      issues.push({
        severity: 'medium',
        rule: 'missing_canonical',
        message: 'Page is missing a canonical URL',
        recommendation: 'Add a canonical link tag to prevent```plicate content issues',
        url: pageData.url
      });
    }

    // URL structure analysis
    if (pageData.url && this.analyzePoorUrl```ucture(pageData.url)) {
      issues.push({
        severity: 'high',
        rule: 'poor_url_structure',
        message: 'URL structure could be improved',
        recommendation: 'Use clean, descriptive URLs with h```ens instead of underscores',
        url: pageData.url
      });
    }

    return issues;
  }

  analyzePoorUrlStructure(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      // Check for poor URL practices
      return (
        path.includes('_') || // Underscores instead of hyphens
        path.includes('%20') || // Spaces in URL
        path.includes('?id=') || // Query parameters for content
        path.split('/').some(segment => segment.length > 50) || // Very long URL segments
        /[A-Z]/.test(path) // Uppercase letters
      );
    } catch (error) {
      return false;
    }
  }

  async analyzeWebsite(crawleeResults) {
    const { pages = [], metadata = {} } = crawleeResults.results || {};
    
    if (!pages || pages.length === 0) {
      throw new Error('No pages found to analyze');
    }

    const allIssues = [];
    const pageAnalysis = [];

    // Analyze each page
    for (const page of pages) {
      const pageIssues = await this.analyz```ge(page);
      allIssues.push(...pageIssues);
      
      pageAnalysis.push({
        url: page.url,
        title: page.title,
        issues: pageIssues.length,
        score: this.calculatePageScore(pageIssues),
        recommendations: pageIssues.slice``` 3) // Top 3 issues per page
      });
    }

    // Site-wide analysis
    const siteWideIssues = this.analyzeSiteWide(pages);
    allIssues.push(...siteWideIssues);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(allIssues, pages.length);
    
    // Group issues by severity
    const issuesBySeverity = this.groupIssuesB```verity(allIssues);

    // Generate action plan
    const actionPlan = this.generateActionPlan(issuesBySeverity);

    return {
      url: pages[0]?.url || 'Unknown',
      overallScore,
      totalPages: pages.length,
      totalIssues: allIssues.length,
      issuesBySeverity,
      pageAnalysis: pageAnalysis.slice``` 10), // Top 10 pages
      actionPlan,
      siteWideAnalysis: {
        duplicateTitles: metadata.duplicateTitles || ```        duplicateDescriptions: metadata.duplicateDescriptions``` 0,
        pagesWithoutTitles: metadata.pagesWithout```les || 0,
        pagesWithoutDescriptions: metadata.pagesWithoutDescriptions``` 0,
        imagesWithoutAlt: metadata.```gesWithoutAlt || ```     },
      timestamp: new Date().toISOString()
    };
  }

  analyzeSiteWide(pages) {
    const issues = [];
    const titles = {};
    const descriptions = {};

    // Find duplicate titles and descriptions
    pages.forEach(page => {
      if (page.title && page.title.trim()) {
        titles[page.title] = (titles[page.title] || []);
        titles[page.title].push(page.url);
      }
      
      if (page.description && page.description.trim``` {
        descriptions[page.description] = (descriptions[page.description] || []);
        descriptions[page.description].push(page.url);
      }
    });

    // Report duplicate titles
    Object.entries(titles).forEach(([title, urls]) => {
      if (urls.length > 1) {
        issues.push({
          severity: 'high',
          rule: 'duplicate_title',
          message: `Title "${title}" is used on ${urls.length} pages`,
          recommendation: 'Create unique,```scriptive titles for each page',```        urls: urls.slice(0, 5) // Show first 5 URLs
        });
      }
    });

    // Report duplicate descriptions
    Object.entries(descriptions).forEach(([description, urls]) => {
      if (urls.length > 1) {
        issues.push({
          severity: 'high',
          rule: 'duplicate_meta_desc',
          message: `Meta description "${description.substring(0, 50)}..." is used on ${urls.length} pages`,
          recommendation: 'Create unique meta descriptions for each```ge',
          urls: urls.slice(0, 5)
        });
      }
    });

    return issues;
  }

  calculatePageScore(issues) {
    let deductions = 0;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          deductions += 25;
          break;
        case 'high':
          deductions += 15;
          break;
        case 'medium':
          deductions += 8;
          break;
        case 'low':
          deductions += 3;
          break;
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

    // Weight issues by severity an```age count
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

    // Critical issues first
    if (issuesBySeverity.critical.length > ```{
      actionItems.push({
        priority: 'IMMEDIATE',
        title: 'Fix Critical SEO Issues',
        description: `Address ${issuesBySeverity.critical.length} critical issues that are severely impacting SE```
        estimatedTime: '1-2 hours',
        impact: 'High',
        issues: issuesBySeverity.critical.slice``` 5)
      });
    }

    // High priority issues
    if (issuesBySeverity.high.length > 0) {
      actionItems.push({
        priority: 'HIGH',
        title: 'Resolve High-Priority Issues',
        description: `Fix ${issuesBySeverity.high.length} high-priority issues for better rankings`,
        estimatedTime: '2-4 hours',
        impact: 'Medium-High',
        issues: issuesBySeverity.high.slice``` 5)
      });
    }

    // Medium priority issues
    if (issuesBySeverity.medium.length > 0) {
      actionItems.push({
        priority: 'MEDIUM',
        title: 'Optimize Technical SEO',
        description: `Improve ${issuesBySeverity.medium.length} technical SEO aspects`,
        estimatedTime: '3-6 hours',
        impact: 'Medium',
        issues: issuesBySeverity.medium.```ce(0, 3)
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
    const results = await auditor.analyzeWeb```e(crawleeResults);
    
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
  res.json({ status: 'healthy', service: 'seo-audit-service' });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`SEO Audit service running on port ${PORT}`);
});

module.exports = app;

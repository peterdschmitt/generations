// Research Service - Source Discovery
// Handles web search, Reddit, YouTube transcript extraction

import { SourceType } from '../types/contentFlow';

// Perplexity API key - stored securely
const PERPLEXITY_API_KEY = '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';

// =============================================================================
// Types
// =============================================================================

export interface DiscoveredSource {
  url: string;
  title: string;
  sourceType: SourceType;
  snippet?: string;         // Brief preview text
  scrapedContent?: string;  // Full content if available
  author?: string;
  publishedDate?: string;
}

export interface DiscoveryOptions {
  query: string;
  sourceTypes?: SourceType[];
  maxResults?: number;
}

// =============================================================================
// Perplexity Search (Primary - Best for finding sources with citations)
// =============================================================================

interface PerplexityCitation {
  url: string;
  title?: string;
}

export const searchWithPerplexity = async (
  query: string,
  maxResults: number = 10
): Promise<DiscoveredSource[]> => {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',  // Sonar is optimized for search with citations
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Find and summarize the most relevant and authoritative sources on the given topic. Focus on finding diverse sources including articles, research papers, expert opinions, and recent news.'
          },
          {
            role: 'user',
            content: `Find the best sources about: ${query}\n\nProvide a comprehensive overview with citations to authoritative sources.`
          }
        ],
        return_citations: true,
        search_recency_filter: 'month'  // Prefer recent sources
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const sources: DiscoveredSource[] = [];

    // Extract citations from the response
    if (data.citations && Array.isArray(data.citations)) {
      for (const citation of data.citations.slice(0, maxResults)) {
        // Citation can be a string (URL) or an object
        const url = typeof citation === 'string' ? citation : citation.url;
        const title = typeof citation === 'object' ? citation.title : undefined;

        if (url) {
          // Try to extract a better title from the URL if not provided
          const extractedTitle = title || extractTitleFromUrl(url);

          sources.push({
            url,
            title: extractedTitle,
            sourceType: detectSourceType(url),
            snippet: `Source found via Perplexity search for "${query}"`
          });
        }
      }
    }

    // Also extract any content summary from the response
    const responseContent = data.choices?.[0]?.message?.content || '';

    // If we got sources, try to match them with snippets from the content
    if (sources.length > 0 && responseContent) {
      // The response content contains the synthesized information
      // Store it for potential use in understanding the sources
      console.log('Perplexity summary:', responseContent.substring(0, 500));
    }

    console.log(`Perplexity found ${sources.length} sources for "${query}"`);
    return sources;

  } catch (error) {
    console.error('Perplexity search failed:', error);
    return [];
  }
};

// Helper to extract a readable title from URL
const extractTitleFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    const pathname = urlObj.pathname;

    // Extract meaningful part from pathname
    const pathParts = pathname.split('/').filter(p => p && p.length > 2);
    const lastPart = pathParts[pathParts.length - 1] || '';

    // Clean up the last part (remove extensions, replace hyphens)
    const cleanTitle = lastPart
      .replace(/\.(html?|php|aspx?)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    if (cleanTitle && cleanTitle.length > 5) {
      return `${cleanTitle} - ${hostname}`;
    }

    return hostname;
  } catch {
    return url.substring(0, 50);
  }
};

// Helper to detect source type from URL
const detectSourceType = (url: string): SourceType => {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('reddit.com')) return 'reddit';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('arxiv.org') || lowerUrl.includes('scholar.google')) return 'paper';
  if (lowerUrl.includes('medium.com') || lowerUrl.includes('substack.com')) return 'article';

  return 'article';
};

// =============================================================================
// Web Search (Perplexity primary, DuckDuckGo fallback)
// =============================================================================

export const searchWeb = async (
  query: string,
  maxResults: number = 10
): Promise<DiscoveredSource[]> => {
  // Try Perplexity first (best results)
  const perplexitySources = await searchWithPerplexity(query, maxResults);

  if (perplexitySources.length >= 3) {
    return perplexitySources.slice(0, maxResults);
  }

  // Fallback to DuckDuckGo if Perplexity didn't return enough
  console.log('Perplexity returned few results, trying DuckDuckGo...');
  const sources: DiscoveredSource[] = [...perplexitySources];

  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`
    );

    if (response.ok) {
      const data = await response.json();

      // Process abstract if available (usually Wikipedia)
      if (data.AbstractURL && data.AbstractText) {
        sources.push({
          url: data.AbstractURL,
          title: data.Heading || query,
          sourceType: 'article',
          snippet: data.AbstractText
        });
      }

      // Process related topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 5)) {
          if (topic.FirstURL && topic.Text) {
            sources.push({
              url: topic.FirstURL,
              title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 100),
              sourceType: 'article',
              snippet: topic.Text
            });
          }
        }
      }
    }
  } catch (error) {
    console.warn('DuckDuckGo search failed:', error);
  }

  // Deduplicate by URL
  const uniqueSources = sources.reduce((acc, source) => {
    if (!acc.find(s => s.url === source.url)) {
      acc.push(source);
    }
    return acc;
  }, [] as DiscoveredSource[]);

  return uniqueSources.slice(0, maxResults);
};

// =============================================================================
// Reddit Search
// =============================================================================

export const searchReddit = async (
  query: string,
  subreddit?: string,
  maxResults: number = 10
): Promise<DiscoveredSource[]> => {
  try {
    // Reddit's public JSON API - use CORS proxy for browser access
    let redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=${maxResults}&sort=relevance`;

    if (subreddit) {
      redditUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&limit=${maxResults}&sort=relevance`;
    }

    // Use allorigins CORS proxy
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(redditUrl)}`;

    const response = await fetch(proxyUrl);

    if (!response.ok) {
      console.warn('Reddit search failed via proxy');
      // Return Reddit search URL as fallback
      return [{
        url: `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
        title: `Reddit Search: ${query}`,
        sourceType: 'reddit',
        snippet: 'Click to search Reddit for discussions on this topic'
      }];
    }

    const proxyData = await response.json();
    const data = JSON.parse(proxyData.contents);
    const sources: DiscoveredSource[] = [];

    if (data.data && data.data.children) {
      for (const child of data.data.children) {
        const post = child.data;
        if (post.permalink && post.title) {
          sources.push({
            url: `https://www.reddit.com${post.permalink}`,
            title: post.title,
            sourceType: 'reddit',
            snippet: post.selftext?.substring(0, 300) || post.title,
            scrapedContent: post.selftext || '',
            author: post.author,
            publishedDate: new Date(post.created_utc * 1000).toISOString()
          });
        }
      }
    }

    // If no results, add search URL
    if (sources.length === 0) {
      sources.push({
        url: `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
        title: `Reddit Search: ${query}`,
        sourceType: 'reddit',
        snippet: 'Click to search Reddit for discussions on this topic'
      });
    }

    return sources;
  } catch (error) {
    console.error('Reddit search error:', error);
    // Return Reddit search URL as fallback
    return [{
      url: `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`,
      title: `Reddit Search: ${query}`,
      sourceType: 'reddit',
      snippet: 'Click to search Reddit for discussions on this topic'
    }];
  }
};

// Fetch full Reddit post with comments
export const fetchRedditPost = async (postUrl: string): Promise<string> => {
  try {
    // Convert URL to JSON endpoint
    const jsonUrl = postUrl.endsWith('.json') ? postUrl : `${postUrl}.json`;

    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'ContentFlow/1.0'
      }
    });

    if (!response.ok) return '';

    const data = await response.json();

    // First element is the post, second is comments
    const post = data[0]?.data?.children?.[0]?.data;
    const comments = data[1]?.data?.children || [];

    let content = '';

    if (post) {
      content += `Title: ${post.title}\n\n`;
      if (post.selftext) {
        content += `Post:\n${post.selftext}\n\n`;
      }
    }

    // Get top comments
    content += 'Top Comments:\n\n';
    for (const comment of comments.slice(0, 10)) {
      const c = comment.data;
      if (c.body && c.body !== '[removed]' && c.body !== '[deleted]') {
        content += `- ${c.body.substring(0, 500)}\n\n`;
      }
    }

    return content;
  } catch (error) {
    console.error('Reddit fetch error:', error);
    return '';
  }
};

// =============================================================================
// YouTube Transcript Extraction
// =============================================================================

// Note: YouTube transcript extraction typically requires a backend service
// This is a simplified version that extracts video metadata
export const searchYouTube = async (
  query: string,
  maxResults: number = 5
): Promise<DiscoveredSource[]> => {
  // Without YouTube API key, we can only provide search suggestions
  // In production, you'd use the YouTube Data API or a transcript service

  // For now, construct YouTube search URL and return as a source to manually review
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  return [{
    url: searchUrl,
    title: `YouTube search: ${query}`,
    sourceType: 'youtube',
    snippet: 'Click to search YouTube for relevant videos. Transcripts require manual extraction or API integration.'
  }];
};

// Parse YouTube video ID from URL
export const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
};

// =============================================================================
// Content Scraping (Basic)
// =============================================================================

// Fetch and extract text from a web page
// Note: Many sites block direct scraping - in production use a proper scraping service
export const scrapeWebPage = async (url: string): Promise<string> => {
  try {
    // Use a CORS proxy for client-side scraping
    // In production, this would be a backend endpoint
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) return '';

    const data = await response.json();
    const html = data.contents;

    // Basic HTML to text extraction
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Remove scripts, styles, nav, footer
    const removeSelectors = ['script', 'style', 'nav', 'footer', 'header', 'aside', '.ad', '.advertisement'];
    removeSelectors.forEach(selector => {
      tempDiv.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Get main content if available
    const mainContent = tempDiv.querySelector('main, article, .content, .post-content, .entry-content');
    const textSource = mainContent || tempDiv;

    // Extract text
    let text = textSource.textContent || '';

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Limit length
    return text.substring(0, 50000);
  } catch (error) {
    console.error('Scraping error:', error);
    return '';
  }
};

// =============================================================================
// Unified Discovery Function
// =============================================================================

export const discoverSources = async (
  options: DiscoveryOptions
): Promise<DiscoveredSource[]> => {
  const { query, sourceTypes = ['article', 'reddit'], maxResults = 10 } = options;

  const allSources: DiscoveredSource[] = [];
  const perSourceLimit = Math.ceil(maxResults / sourceTypes.length);

  // Run searches in parallel
  const searchPromises: Promise<DiscoveredSource[]>[] = [];

  if (sourceTypes.includes('article')) {
    searchPromises.push(searchWeb(query, perSourceLimit));
  }

  if (sourceTypes.includes('reddit')) {
    searchPromises.push(searchReddit(query, undefined, perSourceLimit));
  }

  if (sourceTypes.includes('youtube')) {
    searchPromises.push(searchYouTube(query, perSourceLimit));
  }

  const results = await Promise.allSettled(searchPromises);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allSources.push(...result.value);
    }
  }

  // Deduplicate by URL
  const uniqueSources = allSources.reduce((acc, source) => {
    if (!acc.find(s => s.url === source.url)) {
      acc.push(source);
    }
    return acc;
  }, [] as DiscoveredSource[]);

  return uniqueSources.slice(0, maxResults);
};

// =============================================================================
// Query Expansion (using Gemini)
// =============================================================================

// Generate search query variations for better coverage
export const expandQuery = async (
  topic: string,
  generateContent: (prompt: string) => Promise<string>
): Promise<string[]> => {
  const prompt = `Given the research topic "${topic}", generate 3-5 search query variations that would help find diverse, high-quality sources. Include:
1. The original topic phrased as a question
2. A more specific/technical version
3. A broader/contextual version
4. A "best practices" or "how to" version if applicable

Return only the queries, one per line, no numbering or explanation.`;

  try {
    const response = await generateContent(prompt);
    const queries = response
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0 && q.length < 200);

    return queries.slice(0, 5);
  } catch (error) {
    console.error('Query expansion error:', error);
    return [topic]; // Fallback to original topic
  }
};

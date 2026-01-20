/**
 * News Tools
 * Fetches world news from free APIs
 * Uses NewsAPI.org free tier (100 requests/day) or falls back to RSS
 */

export interface NewsArticle {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  category?: string;
}

export interface NewsResult {
  success: boolean;
  data?: {
    articles: NewsArticle[];
    totalResults: number;
    category: string;
    fetchedAt: string;
  };
  error?: string;
}

// Categories supported by most news APIs
export type NewsCategory = 'general' | 'business' | 'technology' | 'science' | 'health' | 'sports' | 'entertainment';

/**
 * Fetch top headlines from NewsAPI.org
 * Requires NEWSAPI_KEY environment variable
 * Free tier: 100 requests/day
 */
export async function getTopHeadlines(
  category: NewsCategory = 'general',
  country: string = 'us',
  limit: number = 5
): Promise<NewsResult> {
  const apiKey = process.env.NEWSAPI_KEY;
  
  if (!apiKey) {
    // Fall back to a simple summary if no API key
    return {
      success: true,
      data: {
        articles: [{
          title: 'News API not configured',
          description: 'To get real news, please add NEWSAPI_KEY to your environment variables. Get a free API key at https://newsapi.org',
          source: 'System',
          url: 'https://newsapi.org',
          publishedAt: new Date().toISOString(),
        }],
        totalResults: 0,
        category,
        fetchedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const url = new URL('https://newsapi.org/v2/top-headlines');
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('country', country);
    url.searchParams.set('category', category);
    url.searchParams.set('pageSize', String(limit));

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'ok') {
      return {
        success: false,
        error: data.message || 'Failed to fetch news',
      };
    }

    const articles: NewsArticle[] = data.articles.map((article: any) => ({
      title: article.title,
      description: article.description || 'No description available',
      source: article.source?.name || 'Unknown',
      url: article.url,
      publishedAt: article.publishedAt,
      category,
    }));

    return {
      success: true,
      data: {
        articles,
        totalResults: data.totalResults,
        category,
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch news: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Search news articles by keyword
 */
export async function searchNews(
  query: string,
  limit: number = 5
): Promise<NewsResult> {
  const apiKey = process.env.NEWSAPI_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      error: 'News API key not configured. Add NEWSAPI_KEY to environment variables.',
    };
  }

  try {
    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('q', query);
    url.searchParams.set('pageSize', String(limit));
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('language', 'en');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'ok') {
      return {
        success: false,
        error: data.message || 'Failed to search news',
      };
    }

    const articles: NewsArticle[] = data.articles.map((article: any) => ({
      title: article.title,
      description: article.description || 'No description available',
      source: article.source?.name || 'Unknown',
      url: article.url,
      publishedAt: article.publishedAt,
    }));

    return {
      success: true,
      data: {
        articles,
        totalResults: data.totalResults,
        category: 'search',
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to search news: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Format news articles for voice output
 */
export function formatNewsForVoice(articles: NewsArticle[]): string {
  if (articles.length === 0) {
    return "I couldn't find any news articles.";
  }

  const headlines = articles.slice(0, 5).map((article, i) => {
    const timeAgo = getTimeAgo(new Date(article.publishedAt));
    return `${i + 1}. ${article.title} - from ${article.source}, ${timeAgo}`;
  });

  return `Here are the top headlines:\n${headlines.join('\n')}`;
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}

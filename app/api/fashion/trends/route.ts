import { NextRequest, NextResponse } from 'next/server';

// Current fashion trends - updated periodically
// In production, this could be fetched from a fashion API or web scraping
const CURRENT_TRENDS_2026 = {
  colors: {
    trending: ['butter yellow', 'cherry red', 'cobalt blue', 'sage green', 'soft pink', 'cream', 'chocolate brown'],
    classic: ['black', 'white', 'navy', 'grey', 'beige'],
    seasonal: {
      spring: ['pastels', 'mint green', 'lavender', 'peach'],
      summer: ['bright coral', 'turquoise', 'lemon yellow', 'hot pink'],
      autumn: ['burgundy', 'rust', 'mustard', 'forest green', 'terracotta'],
      winter: ['emerald', 'deep purple', 'midnight blue', 'silver', 'gold'],
    },
  },
  styles: {
    trending: [
      'quiet luxury - understated elegance with high-quality fabrics',
      'elevated basics - premium versions of everyday essentials',
      'modern minimalism - clean lines and neutral palettes',
      'soft tailoring - relaxed blazers and flowing trousers',
      'romantic femininity - ruffles, florals, and flowing silhouettes',
      'sporty chic - athletic-inspired pieces styled elegantly',
      'vintage revival - 90s and Y2K inspired looks',
    ],
    classics: [
      'tailored blazers',
      'well-fitted jeans',
      'crisp white shirts',
      'little black dress',
      'trench coats',
      'cashmere sweaters',
    ],
  },
  patterns: {
    trending: ['bold stripes', 'abstract prints', 'nature-inspired florals', 'geometric patterns', 'animal prints (subtle)'],
    timeless: ['polka dots', 'classic stripes', 'houndstooth', 'plaid'],
  },
  accessories: {
    trending: ['statement earrings', 'layered necklaces', 'oversized sunglasses', 'structured bags', 'chunky loafers', 'ballet flats'],
    bags: ['shoulder bags', 'crossbody', 'tote bags', 'mini bags'],
  },
  fabrics: {
    trending: ['linen', 'silk', 'cashmere', 'organic cotton', 'recycled materials'],
    luxury: ['leather', 'suede', 'velvet', 'satin'],
  },
  advice: {
    general: [
      'Invest in quality basics that can be mixed and matched',
      'Choose colors that complement your skin tone',
      'Fit is everything - well-fitted clothes always look more polished',
      'Accessories can transform a simple outfit',
      'Confidence is the best accessory you can wear',
    ],
    bodyPositive: [
      'Every body is a good body - wear what makes you feel amazing',
      'Style has no size - fashion is for everyone',
      'Dress for yourself, not for others',
      'The best outfit is one that makes you smile',
    ],
  },
};

// Get current season based on date
function getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

// Generate fashion context for a specific item or color
function getFashionContext(item?: string, color?: string): string {
  const season = getCurrentSeason();
  const seasonalColors = CURRENT_TRENDS_2026.colors.seasonal[season];
  
  let context = `Current Fashion Insights (${season.charAt(0).toUpperCase() + season.slice(1)} 2026):\n\n`;
  
  // Trending colors
  context += `Trending Colors: ${CURRENT_TRENDS_2026.colors.trending.join(', ')}\n`;
  context += `Seasonal Colors for ${season}: ${seasonalColors.join(', ')}\n\n`;
  
  // If a specific color is mentioned, give advice on it
  if (color) {
    const colorLower = color.toLowerCase();
    const isTrending = CURRENT_TRENDS_2026.colors.trending.some(c => colorLower.includes(c.toLowerCase()));
    const isClassic = CURRENT_TRENDS_2026.colors.classic.some(c => colorLower.includes(c.toLowerCase()));
    const isSeasonal = seasonalColors.some(c => colorLower.includes(c.toLowerCase()));
    
    if (isTrending) {
      context += `${color} is ON TREND right now! Great choice.\n`;
    } else if (isClassic) {
      context += `${color} is a timeless classic that never goes out of style.\n`;
    } else if (isSeasonal) {
      context += `${color} is perfect for this ${season} season!\n`;
    }
  }
  
  // Current style trends
  context += `\nPopular Styles:\n`;
  CURRENT_TRENDS_2026.styles.trending.slice(0, 3).forEach(style => {
    context += `- ${style}\n`;
  });
  
  // Add some positive advice
  const randomAdvice = CURRENT_TRENDS_2026.advice.bodyPositive[
    Math.floor(Math.random() * CURRENT_TRENDS_2026.advice.bodyPositive.length)
  ];
  context += `\nRemember: ${randomAdvice}`;
  
  return context;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const item = searchParams.get('item') || undefined;
  const color = searchParams.get('color') || undefined;
  
  const context = getFashionContext(item, color);
  
  return NextResponse.json({
    success: true,
    season: getCurrentSeason(),
    trends: CURRENT_TRENDS_2026,
    context,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item, color, description } = body;
    
    const context = getFashionContext(item, color);
    
    // Extract colors mentioned in description
    let colorAdvice = '';
    if (description) {
      const descLower = description.toLowerCase();
      CURRENT_TRENDS_2026.colors.trending.forEach(trendColor => {
        if (descLower.includes(trendColor.toLowerCase())) {
          colorAdvice += `${trendColor} is very on-trend right now! `;
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      season: getCurrentSeason(),
      context,
      colorAdvice: colorAdvice || null,
      tips: CURRENT_TRENDS_2026.advice.general.slice(0, 2),
    });
  } catch (error) {
    console.error('Fashion trends error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get fashion trends' },
      { status: 500 }
    );
  }
}

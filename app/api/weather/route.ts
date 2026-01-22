import { NextRequest, NextResponse } from 'next/server';

// Weather condition mappings for fashion advice
const WEATHER_FASHION_ADVICE: Record<string, string[]> = {
  rain: [
    'Bring an umbrella!',
    'Water-resistant jacket recommended',
    'Avoid suede shoes - they don\'t do well in rain',
    'Consider waterproof boots',
  ],
  drizzle: [
    'Light rain gear suggested',
    'A trench coat would be perfect',
    'Water-resistant bag recommended',
  ],
  thunderstorm: [
    'Definitely bring an umbrella and rain jacket',
    'Avoid open-toed shoes',
    'Consider staying cozy indoors if possible',
  ],
  snow: [
    'Bundle up with warm layers!',
    'Insulated, waterproof boots are essential',
    'Don\'t forget a warm hat and gloves',
    'A cozy scarf adds warmth and style',
  ],
  clear: [
    'Great day for your favorite outfit!',
    'Sunglasses would be a stylish addition',
    'If sunny, consider sun protection',
  ],
  clouds: [
    'Layers are a good idea',
    'Perfect weather for that light jacket you love',
  ],
  hot: [
    'Light, breathable fabrics like linen or cotton',
    'Light colors reflect heat better',
    'Stay hydrated!',
    'Sandals or breathable shoes recommended',
  ],
  cold: [
    'Layer up! Base layer, mid layer, outer layer',
    'Wool or cashmere for warmth and style',
    'Don\'t forget your extremities - hat, gloves, warm socks',
    'A stylish coat is worth the investment',
  ],
  mild: [
    'Perfect layering weather',
    'A light cardigan or blazer works great',
    'You can get creative with your outfit today!',
  ],
  windy: [
    'Secure loose items like scarves',
    'Maybe skip the flowy dress today',
    'A structured jacket will hold its shape better',
  ],
  humid: [
    'Natural fabrics breathe better than synthetics',
    'Anti-frizz hair products might be helpful',
    'Light, loose-fitting clothes are most comfortable',
  ],
};

// Get temperature-based advice
function getTemperatureAdvice(tempF: number): { category: string; advice: string[] } {
  if (tempF >= 85) {
    return { category: 'hot', advice: WEATHER_FASHION_ADVICE.hot };
  } else if (tempF >= 68) {
    return { category: 'mild', advice: WEATHER_FASHION_ADVICE.mild };
  } else if (tempF >= 50) {
    return { category: 'cool', advice: ['A light jacket or sweater recommended', 'Layers are your friend'] };
  } else if (tempF >= 32) {
    return { category: 'cold', advice: WEATHER_FASHION_ADVICE.cold };
  } else {
    return { category: 'freezing', advice: [...WEATHER_FASHION_ADVICE.cold, 'Seriously, bundle up - it\'s freezing!'] };
  }
}

// Generate fashion context from weather data
function generateWeatherFashionContext(weather: WeatherData): string {
  const { temperature, condition, humidity, windSpeed, description, feelsLike, uv, location } = weather;
  
  let context = `Current Weather${location ? ` in ${location}` : ''}: ${description}\n`;
  context += `Temperature: ${temperature.fahrenheit}°F (${temperature.celsius}°C)\n`;
  
  if (feelsLike) {
    context += `Feels Like: ${feelsLike.fahrenheit}°F (${feelsLike.celsius}°C)\n`;
  }
  if (humidity) context += `Humidity: ${humidity}%\n`;
  if (windSpeed) context += `Wind: ${windSpeed} mph\n`;
  if (uv !== undefined) context += `UV Index: ${uv}\n`;
  
  context += '\nWeather-Based Style Recommendations:\n';
  
  // Temperature advice (use feels-like if available)
  const effectiveTemp = feelsLike?.fahrenheit || temperature.fahrenheit;
  const tempAdvice = getTemperatureAdvice(effectiveTemp);
  context += `\nFor ${tempAdvice.category} weather:\n`;
  tempAdvice.advice.forEach(tip => {
    context += `- ${tip}\n`;
  });
  
  // Condition-specific advice
  const conditionLower = condition.toLowerCase();
  for (const [key, tips] of Object.entries(WEATHER_FASHION_ADVICE)) {
    if (conditionLower.includes(key)) {
      context += `\nBecause of ${condition}:\n`;
      tips.forEach(tip => {
        context += `- ${tip}\n`;
      });
      break;
    }
  }
  
  // UV advice
  if (uv !== undefined && uv >= 6) {
    context += '\nHigh UV tips:\n';
    context += '- Wear sunscreen!\n';
    context += '- Sunglasses are a must\n';
    context += '- Consider a hat for sun protection\n';
    if (uv >= 8) {
      context += '- Try to stay in shade during peak hours\n';
    }
  }
  
  // Humidity advice
  if (humidity && humidity > 70) {
    context += '\nHigh humidity tips:\n';
    WEATHER_FASHION_ADVICE.humid.forEach(tip => {
      context += `- ${tip}\n`;
    });
  }
  
  // Wind advice
  if (windSpeed && windSpeed > 15) {
    context += '\nWindy day tips:\n';
    WEATHER_FASHION_ADVICE.windy.forEach(tip => {
      context += `- ${tip}\n`;
    });
  }
  
  return context;
}

interface WeatherData {
  temperature: {
    fahrenheit: number;
    celsius: number;
  };
  condition: string;
  description: string;
  humidity?: number;
  windSpeed?: number;
  icon?: string;
  location?: string;
  feelsLike?: {
    fahrenheit: number;
    celsius: number;
  };
  uv?: number;
  isDay?: boolean;
}

// Fetch weather from WeatherAPI.com
async function fetchWeatherAPI(lat: number, lon: number): Promise<WeatherData | null> {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    console.log('WeatherAPI.com API key not configured');
    return null;
  }
  
  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${lat},${lon}&aqi=no`
    );
    
    if (!response.ok) {
      console.error('WeatherAPI.com error:', await response.text());
      return null;
    }
    
    const data = await response.json();
    
    return {
      temperature: {
        fahrenheit: Math.round(data.current.temp_f),
        celsius: Math.round(data.current.temp_c),
      },
      condition: data.current.condition.text,
      description: data.current.condition.text,
      humidity: data.current.humidity,
      windSpeed: Math.round(data.current.wind_mph),
      icon: data.current.condition.icon,
      location: data.location.name,
      feelsLike: {
        fahrenheit: Math.round(data.current.feelslike_f),
        celsius: Math.round(data.current.feelslike_c),
      },
      uv: data.current.uv,
      isDay: data.current.is_day === 1,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

// Fallback: Get mock weather based on location and season
function getMockWeather(lat: number, lon: number): WeatherData {
  const month = new Date().getMonth();
  const isNorthernHemisphere = lat >= 0;
  
  // Determine season
  let season: 'winter' | 'spring' | 'summer' | 'fall';
  if (month >= 2 && month <= 4) {
    season = isNorthernHemisphere ? 'spring' : 'fall';
  } else if (month >= 5 && month <= 7) {
    season = isNorthernHemisphere ? 'summer' : 'winter';
  } else if (month >= 8 && month <= 10) {
    season = isNorthernHemisphere ? 'fall' : 'spring';
  } else {
    season = isNorthernHemisphere ? 'winter' : 'summer';
  }
  
  // Mock temperatures by season
  const seasonalWeather: Record<string, WeatherData> = {
    winter: {
      temperature: { fahrenheit: 35, celsius: 2 },
      condition: 'Clouds',
      description: 'overcast clouds',
      humidity: 65,
      windSpeed: 12,
    },
    spring: {
      temperature: { fahrenheit: 62, celsius: 17 },
      condition: 'Clear',
      description: 'partly cloudy',
      humidity: 55,
      windSpeed: 8,
    },
    summer: {
      temperature: { fahrenheit: 82, celsius: 28 },
      condition: 'Clear',
      description: 'sunny',
      humidity: 60,
      windSpeed: 5,
    },
    fall: {
      temperature: { fahrenheit: 55, celsius: 13 },
      condition: 'Clouds',
      description: 'scattered clouds',
      humidity: 60,
      windSpeed: 10,
    },
  };
  
  return {
    ...seasonalWeather[season],
    location: 'Your Area',
  };
}

// GET - Fetch weather by coordinates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');
  
  // Try to get real weather data from WeatherAPI.com
  let weather = await fetchWeatherAPI(lat, lon);
  
  // Fallback to mock data if API fails or is not configured
  if (!weather) {
    weather = getMockWeather(lat, lon);
    weather.location = 'Your Area (estimated)';
  }
  
  const fashionContext = generateWeatherFashionContext(weather);
  
  return NextResponse.json({
    success: true,
    weather,
    fashionContext,
  });
}

// POST - Fetch weather with location from body
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, location } = body;
    
    let lat = latitude || 0;
    let lon = longitude || 0;
    
    // If location string provided but no coords, we could geocode it
    // For now, use provided coords or defaults
    
    // Try to get real weather data from WeatherAPI.com
    let weather = await fetchWeatherAPI(lat, lon);
    
    // Fallback to mock data
    if (!weather) {
      weather = getMockWeather(lat, lon);
      weather.location = location || 'Your Area (estimated)';
    }
    
    const fashionContext = generateWeatherFashionContext(weather);
    
    return NextResponse.json({
      success: true,
      weather,
      fashionContext,
      recommendations: getTemperatureAdvice(weather.temperature.fahrenheit),
    });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch weather' },
      { status: 500 }
    );
  }
}

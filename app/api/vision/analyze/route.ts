import { NextRequest, NextResponse } from 'next/server';

// Fashion advisor prompt for GPT-4 Vision
const FASHION_SYSTEM_PROMPT = `You are a friendly, supportive fashion advisor with the personality of a caring friend. Your goal is to make the user feel confident and good about themselves while providing helpful fashion advice.

When analyzing images:
1. Always start with something positive about what you see
2. Describe colors, patterns, and style in an encouraging way
3. If asked for advice, be constructive and kind - never harsh or critical
4. Focus on what works well and gentle suggestions for enhancement
5. Consider body language and posture as part of the overall look
6. Be specific about colors, textures, and style elements you observe
7. When weather context is provided, give practical advice (umbrella, jacket, etc.)
8. Reference current fashion trends when relevant

Remember: Your job is to boost confidence while being genuinely helpful. Fashion is about feeling good!`;

// Fetch weather context from our weather API
async function fetchWeatherContext(latitude?: number, longitude?: number): Promise<string | null> {
  try {
    // Default to a reasonable location if not provided
    const lat = latitude ?? 40.7128; // NYC default
    const lon = longitude ?? -74.006;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/weather?lat=${lat}&lon=${lon}`, {
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.fashionContext || null;
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

// Fetch fashion trends from our trends API
async function fetchFashionTrends(): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/fashion/trends`, {
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.context || null;
  } catch (error) {
    console.error('Error fetching fashion trends:', error);
    return null;
  }
}

// Emotion analysis prompt for when face is visible
const EMOTION_SYSTEM_PROMPT = `You are an empathetic emotion reader. Analyze the person's facial expression and body language to understand their emotional state. Be supportive and validating in your observations.

Provide:
1. Primary emotion detected
2. Secondary emotions if any
3. Brief supportive observation

Format your response as JSON:
{
  "emotions": [
    {"emotion": "name", "confidence": 0.0-1.0}
  ],
  "observation": "brief supportive note"
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, analysisType, question, latitude, longitude } = body;

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: 'No image data provided' },
        { status: 400 }
      );
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Fetch weather and fashion context in parallel for fashion-related analysis
    let weatherContext: string | null = null;
    let fashionContext: string | null = null;

    if (analysisType !== 'emotion') {
      // Fetch both contexts in parallel
      const [weather, fashion] = await Promise.all([
        fetchWeatherContext(latitude, longitude),
        fetchFashionTrends(),
      ]);
      weatherContext = weather;
      fashionContext = fashion;
    }

    // Build enhanced system prompt with context
    let systemPrompt = FASHION_SYSTEM_PROMPT;

    if (weatherContext || fashionContext) {
      systemPrompt += '\n\n--- CONTEXT FOR YOUR RESPONSE ---\n';

      if (weatherContext) {
        systemPrompt += '\n' + weatherContext;
      }

      if (fashionContext) {
        systemPrompt += '\n' + fashionContext;
      }

      systemPrompt +=
        "\n\nUse this context to give weather-appropriate advice (like suggesting an umbrella if it's raining) and to comment on how their outfit aligns with current trends. Be natural about it - weave it into your response conversationally.";
    }

    // Determine the user prompt based on analysis type
    let userPrompt =
      question ||
      'Please describe what you see, focusing on the clothing, colors, and overall style.';

    if (analysisType === 'emotion') {
      systemPrompt = EMOTION_SYSTEM_PROMPT;
      userPrompt = 'Analyze the emotional state of the person in this image.';
    } else if (analysisType === 'fashion') {
      // Use user's specific question or default fashion analysis
      userPrompt =
        question ||
        'Describe the outfit and provide a supportive fashion assessment. What colors and styles do you see? How could the look be enhanced? Consider the current weather and fashion trends.';
    } else if (analysisType === 'describe') {
      userPrompt =
        question ||
        "What am I wearing? Please describe my outfit in detail including colors, patterns, and style. Also give me practical advice for today's weather.";
    }

    // Prepare image for GPT-4 Vision
    // Remove data URL prefix if present
    let base64Image = imageData;
    if (imageData.startsWith('data:')) {
      base64Image = imageData.split(',')[1];
    }

    // Call Anthropic Claude 3.5 Sonnet API (unrestricted vision)
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Vision API not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `${systemPrompt}\n\n${userPrompt}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to analyze image' },
        { status: 500 }
      );
    }

    const result = await response.json();
    const analysis = result.content?.[0]?.text || 'Unable to analyze image';

    // For emotion analysis, try to parse as JSON
    if (analysisType === 'emotion') {
      try {
        const emotionData = JSON.parse(analysis);
        return NextResponse.json({
          success: true,
          type: 'emotion',
          emotions: emotionData.emotions,
          observation: emotionData.observation,
          raw: analysis,
        });
      } catch {
        // If not valid JSON, return as raw text
        return NextResponse.json({
          success: true,
          type: 'emotion',
          raw: analysis,
        });
      }
    }

    return NextResponse.json({
      success: true,
      type: analysisType || 'fashion',
      analysis,
    });
  } catch (error) {
    console.error('Vision analysis error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

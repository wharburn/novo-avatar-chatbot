import { NextRequest, NextResponse } from 'next/server';

const FASHION_SYSTEM_PROMPT = `You are a fashion expert AI assistant. Analyze the image and provide detailed fashion advice.
Focus on:
1. Clothing items and their colors
2. Overall style and aesthetic
3. How well items coordinate
4. Suggestions for improvement
5. Appropriateness for different occasions
Be encouraging and constructive in your feedback.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData, question } = body;

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: 'No image data provided' },
        { status: 400 }
      );
    }

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      console.error('OPENROUTER_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Extract base64 from data URL if needed
    let base64Image = imageData;
    if (imageData.startsWith('data:')) {
      base64Image = imageData.split(',')[1];
    }

    const userPrompt = question || 'Describe the clothing and fashion in this image in detail.';

    console.log('👗 Analyzing fashion with Claude 3.5 Sonnet');

    // Call Claude 3.5 Sonnet via OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'NoVo Avatar Chatbot',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
              {
                type: 'text',
                text: `${FASHION_SYSTEM_PROMPT}\n\n${userPrompt}`,
              },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to analyze fashion' },
        { status: 500 }
      );
    }

    const result = await response.json();
    const analysis = result.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Fashion analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


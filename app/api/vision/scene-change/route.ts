import { NextRequest, NextResponse } from 'next/server';

const SCENE_CHANGE_PROMPT = `You are analyzing two images taken 4 seconds apart to detect if the scene has changed.

Analyze both images and determine:
1. Has the person moved significantly out of frame?
2. Has the camera been pointed in a different direction?
3. Has the background changed?
4. Is the person still visible in the frame?

Respond with a JSON object:
{
  "sceneChanged": boolean,
  "changeType": "person_moved" | "camera_moved" | "background_changed" | "no_change",
  "description": "brief description of what changed",
  "personVisible": boolean
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentFrame, previousFrame } = body;

    if (!currentFrame || !previousFrame) {
      return NextResponse.json(
        { success: false, error: 'Both current and previous frames required' },
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
    const extractBase64 = (dataUrl: string) => {
      if (dataUrl.startsWith('data:')) {
        return dataUrl.split(',')[1];
      }
      return dataUrl;
    };

    const currentBase64 = extractBase64(currentFrame);
    const previousBase64 = extractBase64(previousFrame);

    console.log('🎥 Analyzing scene change between frames');

    // Call Claude 3.5 Sonnet via OpenRouter with both images
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
                type: 'text',
                text: 'This is the PREVIOUS frame (4 seconds ago):',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${previousBase64}`,
                },
              },
              {
                type: 'text',
                text: 'This is the CURRENT frame (now):',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${currentBase64}`,
                },
              },
              {
                type: 'text',
                text: SCENE_CHANGE_PROMPT,
              },
            ],
          },
        ],
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to analyze scene change' },
        { status: 500 }
      );
    }

    const result = await response.json();
    const analysisText = result.choices?.[0]?.message?.content || '';

    try {
      // Extract JSON from response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          success: true,
          sceneChanged: analysis.sceneChanged,
          changeType: analysis.changeType,
          description: analysis.description,
          personVisible: analysis.personVisible,
        });
      }
    } catch (parseError) {
      console.error('Failed to parse scene change response:', parseError);
    }

    return NextResponse.json({
      success: true,
      sceneChanged: false,
      changeType: 'no_change',
      description: 'Unable to determine scene change',
      personVisible: true,
    });
  } catch (error) {
    console.error('Scene change analysis error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


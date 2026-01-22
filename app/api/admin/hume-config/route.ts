import { NextRequest, NextResponse } from 'next/server';

const HUME_API_URL = 'https://api.hume.ai/v0/evi/configs';

// GET - Fetch current config
export async function GET(request: NextRequest) {
  try {
    const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID;
    const apiKey = process.env.HUME_API_KEY;

    if (!configId || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing Hume configuration' },
        { status: 500 }
      );
    }

    // Hume returns a paginated list, so we need to get the specific config
    const response = await fetch(`${HUME_API_URL}?id=${configId}`, {
      headers: {
        'X-Hume-Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { success: false, error: `Hume API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const config = data.configs_page?.[0];
    
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Config not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        name: config.name,
        prompt: config.prompt?.text,
        voice: config.voice?.name,
        tools: config.tools?.map((t: any) => ({
          name: t.name,
          description: t.description,
          id: t.id,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching Hume config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

// POST - Update system prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, adminPin } = body;

    // Simple admin authentication
    const expectedPin = process.env.ADMIN_PIN;
    if (expectedPin && adminPin !== expectedPin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID;
    const apiKey = process.env.HUME_API_KEY;

    if (!configId || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing Hume configuration' },
        { status: 500 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // First, get the current config to preserve other settings
    const getResponse = await fetch(`${HUME_API_URL}/${configId}`, {
      headers: {
        'X-Hume-Api-Key': apiKey,
      },
    });

    if (!getResponse.ok) {
      const error = await getResponse.text();
      return NextResponse.json(
        { success: false, error: `Failed to fetch current config: ${error}` },
        { status: getResponse.status }
      );
    }

    const currentConfig = await getResponse.json();

    // Update the config with new prompt
    // Note: Hume API uses PATCH to update configs and requires 'name' field
    const updateResponse = await fetch(`${HUME_API_URL}/${configId}`, {
      method: 'PATCH',
      headers: {
        'X-Hume-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: currentConfig.name || 'Novo Companion',
        prompt: {
          text: prompt,
        },
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      return NextResponse.json(
        { success: false, error: `Failed to update config: ${error}` },
        { status: updateResponse.status }
      );
    }

    const updatedConfig = await updateResponse.json();

    return NextResponse.json({
      success: true,
      message: 'System prompt updated successfully',
      configId: updatedConfig.id,
    });
  } catch (error) {
    console.error('Error updating Hume config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update config' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/hume/webhook
 * Webhook endpoint for Hume AI to send tool calls
 * This receives tool calls from Hume AI and executes them
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[Hume Webhook] Received event:', body.event_name);
    console.log('[Hume Webhook] Full payload:', JSON.stringify(body, null, 2));

    // Only handle tool_call events
    if (body.event_name !== 'tool_call') {
      console.log('[Hume Webhook] Ignoring non-tool_call event');
      return NextResponse.json({ success: true });
    }

    // Extract tool call information from the correct structure
    const { tool_call_message } = body;
    const { name, parameters, tool_call_id, response_required } = tool_call_message;

    console.log('[Hume Webhook] Tool call:', { name, parameters, tool_call_id });

    // Parse parameters (they come as a JSON string)
    const params = typeof parameters === 'string' ? JSON.parse(parameters) : parameters;

    // Execute the tool based on name
    let result;

    switch (name) {
      case 'take_picture':
        result = await handleTakePicture(params);
        break;

      case 'send_email_picture':
        result = await handleSendEmailPicture(params);
        break;

      case 'send_email_summary':
        result = await handleSendEmailSummary(params);
        break;

      default:
        result = {
          success: false,
          error: `Unknown tool: ${name}`,
        };
    }

    console.log('[Hume Webhook] Tool result:', result);

    // Return the response in Hume AI webhook format
    if (response_required) {
      return NextResponse.json({
        type: 'tool_response',
        tool_call_id,
        content: result.success ? result.message || JSON.stringify(result.data) : result.error,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Hume Webhook] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle take_picture tool call
 */
async function handleTakePicture(parameters: any) {
  console.log('[Hume Webhook] Handling take_picture with params:', parameters);

  // The take_picture tool is handled client-side (opens camera)
  // We just acknowledge it here
  return {
    success: true,
    message:
      'Picture taken successfully! I can see the photo. Would you like me to email it to you?',
    data: {
      status: 'captured',
    },
  };
}

/**
 * Handle send_email_picture tool call
 */
async function handleSendEmailPicture(parameters: any) {
  console.log('[Hume Webhook] Handling send_email_picture with params:', parameters);

  const { email, user_name, image_url, caption } = parameters;

  // Call the existing tool execution endpoint
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tools/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      toolName: 'send_email_picture',
      parameters: { email, user_name, image_url, caption },
    }),
  });

  const result = await response.json();
  return result;
}

/**
 * Handle send_email_summary tool call
 */
async function handleSendEmailSummary(parameters: any) {
  console.log('[Hume Webhook] Handling send_email_summary with params:', parameters);

  const { email, user_name } = parameters;

  // Call the existing tool execution endpoint
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/tools/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      toolName: 'send_email_summary',
      parameters: { email, user_name },
    }),
  });

  const result = await response.json();
  return result;
}

/**
 * GET /api/hume/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Hume AI webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}

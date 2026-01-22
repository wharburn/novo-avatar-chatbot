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
    const { tool_call_message, chat_id } = body;
    const { name, parameters, tool_call_id, response_required } = tool_call_message;

    console.log('[Hume Webhook] Tool call:', { name, parameters, tool_call_id, chat_id });

    // Parse parameters (they come as a JSON string)
    const params = typeof parameters === 'string' ? JSON.parse(parameters) : parameters;

    // Execute the tool based on name
    let result;

    switch (name) {
      case 'take_picture':
        result = await handleTakePicture(params, chat_id, tool_call_id);
        break;

      case 'send_email_picture':
        result = await handleSendEmailPicture(params);
        break;

      case 'send_email_summary':
        result = await handleSendEmailSummary(params, chat_id, tool_call_id);
        break;

      case 'get_weather':
      case 'analyze_vision':
        // These tools are handled client-side, not via webhook
        console.log(`[Hume Webhook] ${name} - handled client-side, ignoring webhook`);
        return NextResponse.json({
          success: true,
          message: 'Tool handled client-side',
        });

      default:
        result = {
          success: false,
          error: `Unknown tool: ${name}`,
        };
    }

    console.log('[Hume Webhook] Tool result:', result);

    // Return the response in Hume AI webhook format
    // IMPORTANT: For take_picture and send_email_summary, we DON'T return a tool_response here
    // The client will send the response with the actual data
    if (name === 'take_picture' || name === 'send_email_summary') {
      console.log(`[Hume Webhook] ${name} - NOT sending response, client will handle it`);
      // Return 200 OK but no tool_response - client will send it
      return NextResponse.json({
        success: true,
        message: 'Tool call received, client will handle response',
      });
    }

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
 * NOTE: The actual camera capture happens client-side in Chat.tsx
 * This webhook notifies the client to open the camera
 */
async function handleTakePicture(parameters: any, chatId: string, toolCallId: string) {
  console.log('[Hume Webhook] Handling take_picture with params:', parameters);
  console.log('[Hume Webhook] Chat ID:', chatId, 'Tool Call ID:', toolCallId);

  // Notify the client about this tool call via the tool-calls API
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://novo-avatar-chatbot.onrender.com';
    await fetch(`${appUrl}/api/tool-calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: chatId || 'default',
        toolCallId,
        name: 'take_picture',
        parameters,
      }),
    });
    console.log('[Hume Webhook] Notified client about take_picture tool call');
  } catch (error) {
    console.error('[Hume Webhook] Failed to notify client:', error);
  }

  // The take_picture tool is handled client-side (opens camera)
  // We return a pending status here - the real result comes from the client
  return {
    success: true,
    message: 'Opening camera to take a picture. Please look at the camera and smile!',
    data: {
      status: 'camera_opening',
      note: 'Actual capture will be handled by the client',
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
 * NOTE: This needs client-side data (messages), so we notify the client
 */
async function handleSendEmailSummary(parameters: any, chatId: string, toolCallId: string) {
  console.log('[Hume Webhook] Handling send_email_summary with params:', parameters);
  console.log('[Hume Webhook] Chat ID:', chatId, 'Tool Call ID:', toolCallId);

  const { email, user_name } = parameters;

  // Notify the client about this tool call so it can send the messages
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://novo-avatar-chatbot.onrender.com';
    await fetch(`${appUrl}/api/tool-calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: chatId || 'default',
        toolCallId,
        name: 'send_email_summary',
        parameters: { email, user_name },
      }),
    });
    console.log('[Hume Webhook] Notified client about send_email_summary tool call');
  } catch (error) {
    console.error('[Hume Webhook] Failed to notify client:', error);
  }

  // Return a pending response - client will send the real one with messages
  return {
    success: true,
    message: 'Preparing conversation summary to send to your email...',
    data: {
      status: 'preparing',
      note: 'Client will send the actual summary with conversation history',
    },
  };
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

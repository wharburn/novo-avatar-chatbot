import { NextRequest, NextResponse } from 'next/server';

// In-memory store for pending tool calls (in production, use Redis)
// Key: session ID or chat ID, Value: tool call data
const pendingToolCalls = new Map<string, {
  toolCallId: string;
  name: string;
  parameters: string;
  timestamp: number;
}>();

// Clean up old entries (older than 60 seconds)
function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, value] of pendingToolCalls.entries()) {
    if (now - value.timestamp > 60000) {
      pendingToolCalls.delete(key);
    }
  }
}

/**
 * POST /api/tool-calls
 * Called by the webhook to store a pending tool call
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, toolCallId, name, parameters } = body;

    console.log('[Tool Calls API] Storing pending tool call:', { chatId, name, toolCallId });

    // Store the pending tool call
    pendingToolCalls.set(chatId || 'default', {
      toolCallId,
      name,
      parameters: typeof parameters === 'string' ? parameters : JSON.stringify(parameters),
      timestamp: Date.now(),
    });

    // Clean up old entries
    cleanupOldEntries();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Tool Calls API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to store tool call' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tool-calls
 * Called by the client to check for pending tool calls
 */
export async function GET(request: NextRequest) {
  try {
    const chatId = request.nextUrl.searchParams.get('chatId') || 'default';

    // Check if there's a pending tool call for this chat
    const pending = pendingToolCalls.get(chatId);

    if (pending) {
      // Remove it from the store (one-time read)
      pendingToolCalls.delete(chatId);
      
      console.log('[Tool Calls API] Returning pending tool call:', pending.name);
      
      return NextResponse.json({
        hasPending: true,
        toolCall: pending,
      });
    }

    return NextResponse.json({ hasPending: false });
  } catch (error) {
    console.error('[Tool Calls API] Error:', error);
    return NextResponse.json(
      { hasPending: false, error: 'Failed to check tool calls' },
      { status: 500 }
    );
  }
}

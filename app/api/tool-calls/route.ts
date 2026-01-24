import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

interface PendingToolCall {
  toolCallId: string;
  name: string;
  parameters: string;
  timestamp: number;
}

const TOOL_CALL_TTL_SECONDS = 60;
const TOOL_CALL_KEY_PREFIX = 'novo:toolcalls:';

const inMemoryToolCalls = new Map<string, PendingToolCall>();
let redisClient: Redis | null | undefined;

function hasRedisConfig() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getRedisClient(): Redis | null {
  if (!hasRedisConfig()) {
    return null;
  }

  if (redisClient === undefined) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    });
  }

  return redisClient;
}

function buildKey(chatId: string) {
  return `${TOOL_CALL_KEY_PREFIX}${chatId}`;
}

function getMemoryEntry(chatId: string): PendingToolCall | null {
  const pending = inMemoryToolCalls.get(chatId);
  if (!pending) return null;

  if (Date.now() - pending.timestamp > TOOL_CALL_TTL_SECONDS * 1000) {
    inMemoryToolCalls.delete(chatId);
    return null;
  }

  return pending;
}

async function storeToolCall(chatId: string, toolCall: PendingToolCall) {
  const client = getRedisClient();
  if (client) {
    await client.set(buildKey(chatId), toolCall, { ex: TOOL_CALL_TTL_SECONDS });
    return;
  }

  inMemoryToolCalls.set(chatId, toolCall);
}

async function readToolCall(chatId: string): Promise<PendingToolCall | null> {
  const client = getRedisClient();
  if (client) {
    const key = buildKey(chatId);
    const pending = (await client.get<PendingToolCall>(key)) || null;
    if (pending) {
      await client.del(key);
    }
    return pending;
  }

  const pending = getMemoryEntry(chatId);
  if (pending) {
    inMemoryToolCalls.delete(chatId);
  }
  return pending;
}

/**
 * POST /api/tool-calls
 * Called by the webhook to store a pending tool call
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, toolCallId, name, parameters } = body;

    const safeChatId = chatId || 'default';

    console.log('[Tool Calls API] Storing pending tool call:', { safeChatId, name, toolCallId });

    const toolCall: PendingToolCall = {
      toolCallId,
      name,
      parameters: typeof parameters === 'string' ? parameters : JSON.stringify(parameters),
      timestamp: Date.now(),
    };

    await storeToolCall(safeChatId, toolCall);

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

    const pending = await readToolCall(chatId);

    if (pending) {
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

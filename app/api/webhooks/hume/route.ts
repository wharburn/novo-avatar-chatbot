import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { ToolCallWebhookEvent } from '@/app/types/tools';

/**
 * Validate HMAC signature from Hume AI webhook
 * Based on: https://dev.hume.ai/docs/speech-to-speech-evi/configuration/webhooks
 */
function validateHmacSignature(payload: string, timestamp: string, signature: string): boolean {
  try {
    const apiKey = process.env.HUME_API_KEY;
    
    if (!apiKey) {
      console.error('[Hume Webhook] HUME_API_KEY not set');
      return false;
    }

    // Construct the message: payload.timestamp
    const message = `${payload}.${timestamp}`;
    
    // Calculate expected signature
    const expectedSig = crypto
      .createHmac('sha256', apiKey)
      .update(message)
      .digest('hex');

    // Timing-safe comparison
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedSigBuffer = Buffer.from(expectedSig, 'utf8');
    
    const validSignature =
      signatureBuffer.length === expectedSigBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedSigBuffer);

    if (!validSignature) {
      console.error('[Hume Webhook] Invalid HMAC signature');
      console.error(`Expected: ${expectedSig}, Received: ${signature}`);
    }

    return validSignature;
  } catch (error) {
    console.error('[Hume Webhook] Error validating HMAC:', error);
    return false;
  }
}

/**
 * Validate timestamp is not too old (within 180 seconds)
 */
function validateTimestamp(timestamp: string): boolean {
  try {
    const timestampInt = parseInt(timestamp, 10);
    
    if (isNaN(timestampInt)) {
      console.error('[Hume Webhook] Invalid timestamp format');
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const TIMESTAMP_VALIDATION_WINDOW = 180; // 3 minutes

    if (currentTime - timestampInt > TIMESTAMP_VALIDATION_WINDOW) {
      console.error('[Hume Webhook] Timestamp too old');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Hume Webhook] Error validating timestamp:', error);
    return false;
  }
}

/**
 * POST /api/webhooks/hume
 * Receives webhook events from Hume AI EVI
 * Events: chat_started, chat_ended, tool_call
 */
export async function POST(request: NextRequest) {
  try {
    // Get headers
    const timestamp = request.headers.get('x-hume-ai-webhook-timestamp');
    const signature = request.headers.get('x-hume-ai-webhook-signature');

    if (!timestamp || !signature) {
      console.error('[Hume Webhook] Missing required headers');
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Get raw body
    const body = await request.text();

    // Validate timestamp
    if (!validateTimestamp(timestamp)) {
      return NextResponse.json(
        { error: 'Invalid or expired timestamp' },
        { status: 400 }
      );
    }

    // Validate HMAC signature
    if (!validateHmacSignature(body, timestamp, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse event
    const event = JSON.parse(body);

    console.log('[Hume Webhook] Received event:', event.event_name);

    // Handle different event types
    switch (event.event_name) {
      case 'chat_started':
        console.log('[Hume Webhook] Chat started:', event.chat_id);
        // You can track chat sessions here
        break;

      case 'chat_ended':
        console.log('[Hume Webhook] Chat ended:', event.chat_id, 'Duration:', event.duration_seconds);
        // You can log chat analytics here
        break;

      case 'tool_call':
        console.log('[Hume Webhook] Tool call received:', event.tool_call_message.name);
        // Tool calls are handled separately via the WebSocket
        // This webhook is for logging/analytics
        break;

      default:
        console.warn('[Hume Webhook] Unknown event type:', event.event_name);
    }

    return NextResponse.json({
      status: 'success',
      message: `${event.event_name} processed`
    });

  } catch (error) {
    console.error('[Hume Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


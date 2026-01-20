import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/app/lib/greenapi';

/**
 * POST /api/webhooks/whatsapp
 * Receives incoming WhatsApp messages from Green API webhook
 * 
 * To configure:
 * 1. Go to Green API console
 * 2. Set webhook URL to: https://your-domain.com/api/webhooks/whatsapp
 * 3. Enable "Incoming messages and files" webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('[WhatsApp Webhook] Received:', JSON.stringify(body, null, 2));

    // Green API sends notifications in this format
    const { typeWebhook, messageData, senderData } = body;

    // Handle incoming text messages
    if (typeWebhook === 'incomingMessageReceived' && messageData?.typeMessage === 'textMessage') {
      const incomingMessage = messageData.textMessageData?.textMessage || '';
      const senderPhone = senderData?.sender?.replace('@c.us', '') || '';
      const senderName = senderData?.senderName || 'Unknown';

      console.log('[WhatsApp Webhook] Message from:', senderName, senderPhone);
      console.log('[WhatsApp Webhook] Message:', incomingMessage);

      // Here you can:
      // 1. Process the message with AI
      // 2. Store it in database
      // 3. Send auto-reply
      // 4. Forward to Hume AI for processing

      // Example: Simple echo bot
      if (incomingMessage.toLowerCase().startsWith('hello')) {
        await sendWhatsAppMessage(senderPhone, `Hi ${senderName}! I received your message: "${incomingMessage}"`);
      }

      // Example: Command handling
      if (incomingMessage.toLowerCase() === '/help') {
        const helpMessage = `
🤖 *NoVo WhatsApp Bot*

Available commands:
/help - Show this help message
/status - Check bot status
/chat - Start a conversation

Send any message to chat with me!
        `.trim();
        
        await sendWhatsAppMessage(senderPhone, helpMessage);
      }

      return NextResponse.json({
        status: 'success',
        message: 'Message processed'
      });
    }

    // Handle other webhook types
    if (typeWebhook === 'outgoingMessageStatus') {
      console.log('[WhatsApp Webhook] Outgoing message status:', messageData?.status);
    }

    if (typeWebhook === 'stateInstanceChanged') {
      console.log('[WhatsApp Webhook] Instance state changed:', body.stateInstance);
    }

    return NextResponse.json({
      status: 'success',
      message: 'Webhook received'
    });

  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/whatsapp
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'whatsapp-webhook',
    timestamp: new Date().toISOString()
  });
}


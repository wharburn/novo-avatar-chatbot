import { Resend } from 'resend';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface EmailSummaryParams {
  email: string;
  messages: ConversationMessage[];
  userName?: string;
}

/**
 * Generate a conversation summary from messages
 */
function generateSummary(messages: ConversationMessage[]): string {
  if (messages.length === 0) {
    return 'Thank you for chatting with NoVo! We look forward to our next conversation.';
  }

  const userMessages = messages.filter((m) => m.role === 'user');
  const assistantMessages = messages.filter((m) => m.role === 'assistant');

  const topics = new Set<string>();

  // Simple topic extraction (you can enhance this with AI later)
  userMessages.forEach((msg) => {
    const content = msg.content.toLowerCase();
    if (content.includes('translate')) topics.add('Translation');
    if (content.includes('whatsapp')) topics.add('WhatsApp Messaging');
    if (content.includes('open') || content.includes('website')) topics.add('Web Browsing');
    if (content.includes('help')) topics.add('General Assistance');
  });

  const topicsList = Array.from(topics).join(', ') || 'General conversation';

  return `You had a ${messages.length}-message conversation with NoVo covering: ${topicsList}. You asked ${userMessages.length} questions and received ${assistantMessages.length} responses.`;
}

/**
 * Format conversation as HTML
 */
function formatConversationHTML(messages: ConversationMessage[]): string {
  if (!messages || messages.length === 0) {
    return `
      <div style="text-align: center; padding: 20px; color: #666;">
        <p style="margin: 0;">No conversation messages recorded.</p>
      </div>
    `;
  }

  return messages
    .map((msg) => {
      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
      const isUser = msg.role === 'user';
      const content = msg.content || '(empty message)';

      return `
        <div style="margin-bottom: 20px; ${isUser ? 'text-align: right;' : 'text-align: left;'}">
          <div style="display: inline-block; max-width: 70%; padding: 12px 16px; border-radius: 16px; ${
            isUser
              ? 'background-color: #2563eb; color: white;'
              : 'background-color: #f3f4f6; color: #1f2937;'
          }">
            <p style="margin: 0; font-size: 14px; white-space: pre-wrap;">${content}</p>
            ${time ? `<p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.7;">${time}</p>` : ''}
          </div>
        </div>
      `;
    })
    .join('');
}

/**
 * Send conversation summary email
 */
export async function sendConversationSummary(
  params: EmailSummaryParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { email, messages, userName } = params;

    console.log('[Email Summary] Received params:', {
      email,
      userName,
      messageCount: messages?.length || 0,
    });
    
    if (messages && messages.length > 0) {
      console.log('[Email Summary] First message:', messages[0]);
      console.log('[Email Summary] Last message:', messages[messages.length - 1]);
    }

    if (!resend) {
      return {
        success: false,
        error: 'Email service not configured. Please set RESEND_API_KEY environment variable.',
      };
    }

    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: 'Invalid email address',
      };
    }

    const summary = generateSummary(messages);
    const conversationHTML = formatConversationHTML(messages);
    
    console.log('[Email Summary] Generated summary:', summary);
    console.log('[Email Summary] Conversation HTML length:', conversationHTML.length);
    const startTime =
      messages.length > 0
        ? new Date(messages[0].timestamp).toLocaleString()
        : new Date().toLocaleString();
    const endTime =
      messages.length > 0
        ? new Date(messages[messages.length - 1].timestamp).toLocaleString()
        : new Date().toLocaleString();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <!-- Header -->
  <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
    <h1 style="color: white; margin: 0; font-size: 28px;">NoVo Conversation Summary</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Your AI conversation recap</p>
  </div>

  <!-- Greeting -->
  <div style="margin-bottom: 24px;">
    <p style="font-size: 16px; margin: 0;">Hi ${userName || 'there'}! 👋</p>
    <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">Here's a summary of your conversation with NoVo.</p>
  </div>

  <!-- Summary Box -->
  <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
    <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #333;">📊 Summary</h2>
    <p style="margin: 0; font-size: 14px; color: #555;">${summary}</p>
  </div>

  <!-- Session Info -->
  <div style="background-color: #fff; border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
    <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #333;">⏰ Session Details</h3>
    <table style="width: 100%; font-size: 14px;">
      <tr>
        <td style="padding: 4px 0; color: #666;">Started:</td>
        <td style="padding: 4px 0; text-align: right; color: #333;">${startTime}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #666;">Ended:</td>
        <td style="padding: 4px 0; text-align: right; color: #333;">${endTime}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #666;">Messages:</td>
        <td style="padding: 4px 0; text-align: right; color: #333;">${messages.length}</td>
      </tr>
    </table>
  </div>

  <!-- Full Conversation -->
  <div style="margin-bottom: 24px;">
    <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #333;">💬 Full Conversation</h3>
    <div style="background-color: #fff; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px;">
      ${conversationHTML}
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #666; font-size: 12px;">
    <p style="margin: 0;">This summary was generated by <strong>NoVo</strong></p>
    <p style="margin: 8px 0 0 0;">Your empathetic AI assistant who can send emails, take pictures, and more</p>
  </div>

</body>
</html>
    `;

    const result = await resend.emails.send({
      from: 'NoVo <novo@novocomai.online>',
      to: email,
      subject: `Your NoVo Conversation Summary - ${new Date().toLocaleDateString()}`,
      html: htmlContent,
    });

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('[Resend] Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

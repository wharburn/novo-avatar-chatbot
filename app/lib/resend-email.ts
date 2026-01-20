import { Resend } from 'resend';
import { UserProfile } from './redis';

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
  userProfile?: Partial<UserProfile>;
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
  const actions = new Set<string>();

  // Extract topics and actions from the conversation
  const allContent = messages.map(m => m.content.toLowerCase()).join(' ');
  
  // Topics discussed
  if (allContent.includes('translate') || allContent.includes('translation')) topics.add('Translation');
  if (allContent.includes('whatsapp')) topics.add('WhatsApp messaging');
  if (allContent.includes('open') || allContent.includes('website') || allContent.includes('browser')) topics.add('Web browsing');
  if (allContent.includes('photo') || allContent.includes('picture') || allContent.includes('camera')) topics.add('Photography');
  if (allContent.includes('email')) topics.add('Email');
  if (allContent.includes('weather')) topics.add('Weather');
  if (allContent.includes('help') || allContent.includes('assist')) topics.add('General assistance');
  if (allContent.includes('name') || allContent.includes('who are you')) topics.add('Introductions');
  if (allContent.includes('work') || allContent.includes('job') || allContent.includes('career')) topics.add('Work & Career');
  if (allContent.includes('family') || allContent.includes('married') || allContent.includes('kids')) topics.add('Family');
  if (allContent.includes('hobby') || allContent.includes('hobbies') || allContent.includes('interests')) topics.add('Hobbies & Interests');

  // Actions taken
  if (allContent.includes('took a photo') || allContent.includes('picture captured') || allContent.includes('camera')) actions.add('Took a photo');
  if (allContent.includes('sent') && allContent.includes('email')) actions.add('Sent an email');
  if (allContent.includes('opened')) actions.add('Opened a website');

  const topicsList = Array.from(topics);
  const actionsList = Array.from(actions);

  let summary = `During this conversation, you exchanged ${messages.length} messages with NoVo — ${userMessages.length} from you and ${assistantMessages.length} from NoVo.`;
  
  if (topicsList.length > 0) {
    summary += ` You discussed: ${topicsList.join(', ')}.`;
  }
  
  if (actionsList.length > 0) {
    summary += ` Actions taken: ${actionsList.join(', ')}.`;
  }

  return summary;
}

/**
 * Format user profile as HTML
 */
function formatUserProfileHTML(profile?: Partial<UserProfile>): string {
  if (!profile) {
    return '';
  }

  const profileItems: { label: string; value: string }[] = [];

  // Basic info
  if (profile.name) profileItems.push({ label: 'Name', value: profile.name });
  if (profile.email) profileItems.push({ label: 'Email', value: profile.email });
  if (profile.phone) profileItems.push({ label: 'Phone', value: profile.phone });
  
  // Personal details
  if (profile.birthday) profileItems.push({ label: 'Birthday', value: profile.birthday });
  if (profile.age) profileItems.push({ label: 'Age', value: profile.age.toString() });
  if (profile.relationshipStatus) profileItems.push({ label: 'Relationship Status', value: profile.relationshipStatus });
  if (profile.occupation) profileItems.push({ label: 'Occupation', value: profile.occupation });
  if (profile.employer) profileItems.push({ label: 'Employer', value: profile.employer });
  if (profile.location) profileItems.push({ label: 'Location', value: profile.location });
  
  // Interests
  if (profile.interests && profile.interests.length > 0) {
    profileItems.push({ label: 'Interests', value: profile.interests.join(', ') });
  }
  
  // Preferences
  if (profile.preferences) {
    Object.entries(profile.preferences).forEach(([key, value]) => {
      profileItems.push({ label: key.charAt(0).toUpperCase() + key.slice(1), value });
    });
  }
  
  // Additional info
  if (profile.additionalInfo) {
    Object.entries(profile.additionalInfo).forEach(([key, value]) => {
      profileItems.push({ label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value });
    });
  }

  // Visit info
  if (profile.visitCount) {
    profileItems.push({ label: 'Total Visits', value: profile.visitCount.toString() });
  }
  if (profile.firstSeen) {
    profileItems.push({ label: 'First Visit', value: new Date(profile.firstSeen).toLocaleDateString() });
  }

  if (profileItems.length === 0) {
    return '';
  }

  return `
    <div style="background-color: #fff; border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
      <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #333;">👤 Your Profile</h3>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        ${profileItems.map(item => `
          <tr>
            <td style="padding: 8px 0; color: #666; border-bottom: 1px solid #f3f4f6; width: 40%;">${item.label}:</td>
            <td style="padding: 8px 0; text-align: right; color: #333; border-bottom: 1px solid #f3f4f6;">${item.value}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `;
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
    const { email, messages, userName, userProfile } = params;

    console.log('[Email Summary] Received params:', {
      email,
      userName,
      messageCount: messages?.length || 0,
      hasUserProfile: !!userProfile,
    });
    
    if (messages && messages.length > 0) {
      console.log('[Email Summary] First message:', messages[0]);
      console.log('[Email Summary] Last message:', messages[messages.length - 1]);
    }
    
    if (userProfile) {
      console.log('[Email Summary] User profile:', userProfile);
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
    const userProfileHTML = formatUserProfileHTML(userProfile);
    
    console.log('[Email Summary] Generated summary:', summary);
    console.log('[Email Summary] Conversation HTML length:', conversationHTML.length);
    console.log('[Email Summary] User Profile HTML length:', userProfileHTML.length);
    
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
    <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">Here's a summary of your conversation with NoVo, including all the information we've collected about you.</p>
  </div>

  <!-- User Profile Section -->
  ${userProfileHTML}

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

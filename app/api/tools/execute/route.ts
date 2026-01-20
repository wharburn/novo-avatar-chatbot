import { checkWhatsAppNumber, sendWhatsAppMessage } from '@/app/lib/greenapi';
import { sendConversationSummary } from '@/app/lib/resend-email';
import { sendImageEmail } from '@/app/lib/resend-image-email';
import { getSessionsByIp, getUserByIp } from '@/app/lib/redis';
import { OpenBrowserParams, SendWhatsAppParams, ToolExecutionResult } from '@/app/types/tools';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/tools/execute
 * Executes tool calls from Hume AI EVI
 */
export async function POST(request: NextRequest) {
  try {
    const { toolName, parameters } = await request.json();

    console.log('[Tool Execute] Executing tool:', toolName);
    console.log('[Tool Execute] Parameters:', parameters);

    let result: ToolExecutionResult;

    switch (toolName) {
      case 'open_browser':
        result = await executeOpenBrowser(parameters);
        break;

      case 'open_translator':
        result = await executeOpenTranslator(parameters);
        break;

      case 'translate_text':
        result = await executeTranslateText(parameters);
        break;

      case 'send_whatsapp':
        result = await executeSendWhatsApp(parameters);
        break;

      case 'send_email_summary':
        result = await executeSendEmailSummary(parameters);
        break;

      case 'take_picture':
        result = await executeTakePicture(parameters);
        break;

      case 'send_email_picture':
        result = await executeSendEmailPicture(parameters);
        break;

      // Legacy name support
      case 'send_picture_email':
        result = await executeSendEmailPicture(parameters);
        break;

      default:
        result = {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }

    console.log('[Tool Execute] Result:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Tool Execute] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Execute open_browser tool
 * Opens a URL in the user's browser (client-side action)
 */
async function executeOpenBrowser(params: OpenBrowserParams): Promise<ToolExecutionResult> {
  try {
    const { url } = params;

    if (!url) {
      return {
        success: false,
        error: 'URL parameter is required',
      };
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return {
        success: false,
        error: 'Invalid URL format',
      };
    }

    // Return the URL to be opened on the client side
    return {
      success: true,
      data: {
        url,
        action: 'open_browser',
        message: `Opening ${url} in your browser`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process URL',
    };
  }
}

/**
 * Execute open_translator tool
 * Opens the translation app with optional language parameters
 */
async function executeOpenTranslator(params: {
  language_from?: string;
  language_to?: string;
}): Promise<ToolExecutionResult> {
  try {
    const translatorUrl = process.env.TRANSLATOR_APP_URL || 'https://your-translator-app.com';

    // Build URL with optional language parameters
    let url = translatorUrl;
    const urlParams = new URLSearchParams();

    if (params.language_from) {
      urlParams.append('from', params.language_from);
    }
    if (params.language_to) {
      urlParams.append('to', params.language_to);
    }

    if (urlParams.toString()) {
      url += `?${urlParams.toString()}`;
    }

    return {
      success: true,
      data: {
        url,
        action: 'open_browser',
        message: `Opening translator app${params.language_from || params.language_to ? ` for ${params.language_from || 'auto'} to ${params.language_to || 'auto'} translation` : ''}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open translator',
    };
  }
}

/**
 * Execute translate_text tool
 * Translates text using MCP translation server or fallback API
 */
async function executeTranslateText(params: {
  text: string;
  target_language: string;
  source_language?: string;
}): Promise<ToolExecutionResult> {
  try {
    const { text, target_language, source_language } = params;

    if (!text || !target_language) {
      return {
        success: false,
        error: 'Text and target language are required',
      };
    }

    // For now, use a simple fallback response
    // In production, you would integrate with MCP translation server or API
    const translatorUrl = process.env.TRANSLATOR_APP_URL || 'https://your-translator-app.com';

    return {
      success: true,
      data: {
        original_text: text,
        source_language: source_language || 'auto',
        target_language,
        message: `I can help you translate that! For quick translations, I recommend opening our translation app. Would you like me to open it for you?`,
        suggestion: `open_translator_app`,
        translator_url: translatorUrl,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to translate text',
    };
  }
}

/**
 * Execute send_whatsapp tool
 * Sends a WhatsApp message via Green API
 */
async function executeSendWhatsApp(params: SendWhatsAppParams): Promise<ToolExecutionResult> {
  try {
    const { phoneNumber, message } = params;

    if (!phoneNumber || !message) {
      return {
        success: false,
        error: 'Phone number and message are required',
      };
    }

    // Validate phone number format (basic check)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return {
        success: false,
        error:
          'Invalid phone number format. Use international format without + (e.g., 79876543210)',
      };
    }

    // Optional: Check if number exists on WhatsApp
    const exists = await checkWhatsAppNumber(cleanPhone);
    if (!exists) {
      return {
        success: false,
        error: 'This phone number is not registered on WhatsApp',
      };
    }

    // Send the message
    const result = await sendWhatsAppMessage(cleanPhone, message);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to send WhatsApp message',
      };
    }

    return {
      success: true,
      data: {
        messageId: result.messageId,
        phoneNumber: cleanPhone,
        message: `WhatsApp message sent successfully to ${phoneNumber}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp message',
    };
  }
}

/**
 * Execute send_email_summary tool
 * Sends a conversation summary email via Resend
 */
async function executeSendEmailSummary(params: {
  email: string;
  user_name: string;
  messages?: { role: string; content: string; timestamp: number }[];
  userProfile?: Record<string, unknown>;
  ip_address?: string;
  session_id?: string;
}): Promise<ToolExecutionResult> {
  try {
    const { email, user_name, messages: providedMessages, userProfile: providedProfile, ip_address, session_id } = params;

    console.log('[Send Email Summary] Params:', { 
      email, 
      user_name, 
      providedMessagesCount: providedMessages?.length,
      hasUserProfile: !!providedProfile,
      ip_address, 
      session_id 
    });

    // Validate email address
    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: 'Please provide a valid email address in the format: name@example.com',
      };
    }

    // Validate user name is provided
    if (!user_name || user_name.trim().length === 0) {
      return {
        success: false,
        error: 'Please provide your full name before sending the email',
      };
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'The email address format appears to be invalid. Please check and try again.',
      };
    }

    // Use provided messages first, then try to get from Redis
    let messages: { role: 'user' | 'assistant'; content: string; timestamp: number }[] = [];

    if (providedMessages && providedMessages.length > 0) {
      // Use messages passed directly from the client
      messages = providedMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: m.timestamp,
      }));
      console.log('[Send Email Summary] Using', messages.length, 'messages from client');
    } else {
      // Try to get conversation messages from Redis
      try {
        // If we have an IP address, get the most recent session for that IP
        if (ip_address) {
          console.log('[Send Email Summary] Fetching sessions for IP:', ip_address);
          const sessions = await getSessionsByIp(ip_address);
          
          if (sessions && sessions.length > 0) {
            // Get the most recent session (sessions are sorted by time, newest first)
            const latestSession = sessions[0];
            messages = latestSession.messages || [];
            console.log('[Send Email Summary] Found', messages.length, 'messages in Redis session');
          }
        }
      } catch (redisError) {
        console.error('[Send Email Summary] Failed to fetch messages from Redis:', redisError);
        // Continue anyway - we'll send an email with no conversation history
      }
    }

    // If no messages found, add a placeholder message
    if (messages.length === 0) {
      console.log('[Send Email Summary] No messages found, sending basic summary');
    }

    // Get user profile - use provided one or fetch from Redis
    let userProfile: any = providedProfile;
    if (!userProfile && ip_address) {
      try {
        const fetchedProfile = await getUserByIp(ip_address);
        if (fetchedProfile) {
          userProfile = fetchedProfile;
          console.log('[Send Email Summary] Fetched user profile from Redis');
        }
      } catch (error) {
        console.error('[Send Email Summary] Failed to fetch user profile:', error);
      }
    }

    const result = await sendConversationSummary({
      email,
      messages,
      userName: user_name,
      userProfile: userProfile as any,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to send email summary',
      };
    }

    return {
      success: true,
      data: {
        messageId: result.messageId,
        email,
        messageCount: messages.length,
        message: `Conversation summary with ${messages.length} messages sent successfully to ${email}`,
      },
    };
  } catch (error) {
    console.error('[Send Email Summary] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email summary',
    };
  }
}

/**
 * Execute take_picture tool
 * Captures an image from the user's camera
 */
async function executeTakePicture(params: { image_url?: string }): Promise<ToolExecutionResult> {
  try {
    const { image_url } = params;

    // The take_picture tool from Hume AI will provide the image_url
    // We'll store it temporarily for the send_picture_email tool to use
    if (image_url) {
      console.log('[Take Picture] Image captured:', image_url);

      return {
        success: true,
        data: {
          image_url,
          message: 'Picture captured successfully! Would you like me to email it to you?',
        },
      };
    }

    return {
      success: true,
      data: {
        message: 'Picture taken! Would you like me to email it to you?',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to take picture',
    };
  }
}

/**
 * Execute send_email_picture tool
 * Sends a picture via email
 */
async function executeSendEmailPicture(params: {
  email: string;
  user_name: string;
  image_url: string;
  caption?: string;
}): Promise<ToolExecutionResult> {
  try {
    const { email, user_name, image_url, caption } = params;

    // Validate email address
    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: 'Please provide a valid email address in the format: name@example.com',
      };
    }

    // Validate user name is provided
    if (!user_name || user_name.trim().length === 0) {
      return {
        success: false,
        error: 'Please provide your full name before sending the email',
      };
    }

    // Validate image URL
    if (!image_url || image_url.trim().length === 0) {
      return {
        success: false,
        error: 'No image to send. Please take a picture first.',
      };
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'The email address format appears to be invalid. Please check and try again.',
      };
    }

    const result = await sendImageEmail({
      email,
      userName: user_name,
      imageUrl: image_url,
      imageCaption: caption,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to send picture email',
      };
    }

    return {
      success: true,
      data: {
        messageId: result.messageId,
        email,
        message: `Picture sent successfully to ${email}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send picture email',
    };
  }
}

import { checkWhatsAppNumber, sendWhatsAppMessage } from '@/app/lib/greenapi';
import { sendConversationSummary } from '@/app/lib/resend-email';
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
  user_name?: string;
}): Promise<ToolExecutionResult> {
  try {
    const { email, user_name } = params;

    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: 'Please provide a valid email address',
      };
    }

    // For now, we'll send a simple confirmation
    // In production, you'd get the actual conversation messages from the session
    const result = await sendConversationSummary({
      email,
      messages: [], // TODO: Get actual messages from session
      userName: user_name,
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
        message: `Email summary sent successfully to ${email}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email summary',
    };
  }
}

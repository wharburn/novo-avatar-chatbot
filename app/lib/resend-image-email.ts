import { Resend } from 'resend';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface SendImageEmailParams {
  email: string;
  userName: string;
  imageUrl: string;
  imageCaption?: string;
}

/**
 * Send an email with an image attachment
 */
export async function sendImageEmail(
  params: SendImageEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { email, userName, imageUrl, imageCaption } = params;

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

    if (!userName || userName.trim().length === 0) {
      return {
        success: false,
        error: 'User name is required',
      };
    }

    if (!imageUrl) {
      return {
        success: false,
        error: 'Image URL is required',
      };
    }

    const caption = imageCaption || 'Here is your picture from NoVo!';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">

  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">📸 Picture from NoVo</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Your AI-captured moment</p>
    </div>

    <!-- Content -->
    <div style="padding: 30px 20px;">

      <!-- Greeting -->
      <p style="font-size: 16px; margin: 0 0 20px 0;">Hi ${userName}! 👋</p>
      <p style="font-size: 14px; color: #666; margin: 0 0 24px 0;">${caption}</p>

      <!-- Image -->
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="cid:captured_photo" alt="Picture from NoVo" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
      </div>

      <!-- Info Box -->
      <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; color: #555;">
          📅 Captured: ${new Date().toLocaleString()}<br>
          🤖 Sent by: NoVo AI Assistant
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #666; font-size: 12px;">This picture was sent by <strong>NoVo</strong></p>
      <p style="margin: 8px 0 0 0; color: #999; font-size: 11px;">Your empathetic AI assistant</p>
    </div>

  </div>

</body>
</html>
    `;

    // Fetch the image and convert to base64 if it's a URL
    let imageBase64 = '';
    let imageMimeType = 'image/jpeg';

    try {
      if (imageUrl.startsWith('data:')) {
        // Already base64
        const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          imageMimeType = matches[1];
          imageBase64 = matches[2];
        }
      } else if (
        imageUrl.startsWith('http://localhost') ||
        imageUrl.startsWith('http://127.0.0.1')
      ) {
        // Local URL - fetch from filesystem
        const fs = await import('fs/promises');
        const path = await import('path');

        // Extract path from URL
        const urlPath = new URL(imageUrl).pathname;
        const filePath = path.join(process.cwd(), 'public', urlPath);

        console.log('📸 Reading image from:', filePath);
        const imageBuffer = await fs.readFile(filePath);
        imageBase64 = imageBuffer.toString('base64');
      } else {
        // External URL - fetch it
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        imageBase64 = buffer.toString('base64');

        // Try to get mime type from response
        const contentType = response.headers.get('content-type');
        if (contentType) {
          imageMimeType = contentType;
        }
      }
    } catch (error) {
      console.error('Failed to fetch image:', error);
      // Continue anyway - email will be sent without image
    }

    const result = await resend.emails.send({
      from: 'NoVo <novo@novocomai.online>',
      to: email,
      subject: `📸 Picture from NoVo - ${new Date().toLocaleDateString()}`,
      html: htmlContent,
      attachments: imageBase64
        ? [
            {
              filename: 'photo.jpg',
              content: imageBase64,
              contentId: 'captured_photo',
            },
          ]
        : undefined,
    });

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('[Resend] Failed to send image email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send image email',
    };
  }
}

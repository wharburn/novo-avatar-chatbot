/**
 * Green API WhatsApp Integration
 * Documentation: https://green-api.com/en/docs/
 */

const GREEN_API_URL = 'https://api.greenapi.com';

interface SendMessageParams {
  chatId: string;
  message: string;
  quotedMessageId?: string;
}

interface SendMessageResponse {
  idMessage: string;
}

interface GreenAPIError {
  error: string;
  details?: string;
}

/**
 * Send a WhatsApp message via Green API
 * @param phoneNumber - Phone number in format: 79876543210 (without + or @c.us)
 * @param message - Message text to send
 * @returns Message ID if successful
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const instanceId = process.env.GREEN_API_INSTANCE_ID;
    const apiToken = process.env.GREEN_API_TOKEN;

    if (!instanceId || !apiToken) {
      throw new Error('Green API credentials not configured. Set GREEN_API_INSTANCE_ID and GREEN_API_TOKEN in environment variables.');
    }

    // Format phone number - remove any non-digits and add @c.us suffix
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const chatId = `${cleanPhone}@c.us`;

    const url = `${GREEN_API_URL}/waInstance${instanceId}/sendMessage/${apiToken}`;

    const payload: SendMessageParams = {
      chatId,
      message
    };

    console.log('[Green API] Sending message to:', chatId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json() as GreenAPIError;
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as SendMessageResponse;

    console.log('[Green API] Message sent successfully:', data.idMessage);

    return {
      success: true,
      messageId: data.idMessage
    };
  } catch (error) {
    console.error('[Green API] Error sending message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Receive incoming WhatsApp notification
 * Uses the receiveNotification method to get incoming messages
 */
export async function receiveWhatsAppNotification(): Promise<any> {
  try {
    const instanceId = process.env.GREEN_API_INSTANCE_ID;
    const apiToken = process.env.GREEN_API_TOKEN;

    if (!instanceId || !apiToken) {
      throw new Error('Green API credentials not configured');
    }

    const url = `${GREEN_API_URL}/waInstance${instanceId}/receiveNotification/${apiToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Green API] Error receiving notification:', error);
    return null;
  }
}

/**
 * Delete a received notification
 */
export async function deleteWhatsAppNotification(receiptId: number): Promise<boolean> {
  try {
    const instanceId = process.env.GREEN_API_INSTANCE_ID;
    const apiToken = process.env.GREEN_API_TOKEN;

    if (!instanceId || !apiToken) {
      return false;
    }

    const url = `${GREEN_API_URL}/waInstance${instanceId}/deleteNotification/${apiToken}/${receiptId}`;

    const response = await fetch(url, { method: 'DELETE' });

    return response.ok;
  } catch (error) {
    console.error('[Green API] Error deleting notification:', error);
    return false;
  }
}

/**
 * Check if a WhatsApp number exists
 */
export async function checkWhatsAppNumber(phoneNumber: string): Promise<boolean> {
  try {
    const instanceId = process.env.GREEN_API_INSTANCE_ID;
    const apiToken = process.env.GREEN_API_TOKEN;

    if (!instanceId || !apiToken) {
      return false;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const url = `${GREEN_API_URL}/waInstance${instanceId}/checkWhatsapp/${apiToken}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phoneNumber: cleanPhone })
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.existsWhatsapp === true;
  } catch (error) {
    console.error('[Green API] Error checking WhatsApp number:', error);
    return false;
  }
}


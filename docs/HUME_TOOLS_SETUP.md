# Hume AI Tools - Complete Setup Guide

This document combines all tool configuration and setup instructions for NoVo Avatar Chatbot.

---

## Table of Contents

1. [Overview](#overview)
2. [Tool Configurations](#tool-configurations)
3. [Creating Tools in Hume Dashboard](#creating-tools-in-hume-dashboard)
4. [Picture Tools Setup](#picture-tools-setup)
5. [Email Tools Setup](#email-tools-setup)
6. [Translation & Browser Tools](#translation--browser-tools)
7. [WhatsApp Integration](#whatsapp-integration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Your NoVo chatbot supports these tools:

| Tool | Type | Description |
|------|------|-------------|
| `take_picture` | Custom | Takes photos with device camera |
| `send_email_picture` | Custom | Emails captured photos |
| `send_email_summary` | Custom | Emails conversation summaries |
| `open_browser` | Custom | Opens URLs in browser |
| `open_translator` | Custom | Opens translation app |
| `translate_text` | Custom | Helps with translations |
| `send_whatsapp` | Custom | Sends WhatsApp messages |

---

## Tool Configurations

### 1. take_picture

**Name:**
```
take_picture
```

**Description:**
```
Takes a picture using the device camera. IMPORTANT: Call this tool IMMEDIATELY when the user asks to take a picture. On laptops, there is only one camera (webcam). On phones/tablets, FIRST ask: "Would you like a selfie, or a picture of what you're looking at?" Then call the tool. The camera will open automatically for the user to capture the photo.
```

**Parameters:**
```json
{
  "type": "object",
  "required": [],
  "properties": {}
}
```

**Fallback Content:**
```
I'll take a picture for you now. Please allow camera access when prompted.
```

---

### 2. send_email_picture

**Name:**
```
send_email_picture
```

**Description:**
```
Sends a picture via email after the user has taken a photo using the take_picture tool. IMPORTANT: You MUST ask for and confirm BOTH the user's full name AND email address before calling this tool. This tool should only be called AFTER a picture has been taken with the take_picture tool. Ask 'What is your email address?' and 'What is your name?' to collect the required information.
```

**Parameters:**
```json
{
  "type": "object",
  "required": ["email", "user_name", "image_url"],
  "properties": {
    "email": {
      "type": "string",
      "description": "User's confirmed email address in valid format (e.g., john@example.com)"
    },
    "user_name": {
      "type": "string",
      "description": "User's full name. REQUIRED."
    },
    "image_url": {
      "type": "string",
      "description": "The URL of the image from the take_picture tool. This is provided by the take_picture tool response."
    },
    "caption": {
      "type": "string",
      "description": "Optional caption or message to include with the picture"
    }
  }
}
```

**Fallback Content:**
```
I'm sorry, I couldn't send the picture via email. Please make sure you've taken a picture first and provided your email address.
```

---

### 3. send_email_summary

**Name:**
```
send_email_summary
```

**Description:**
```
Sends a summary of the conversation via email. IMPORTANT: You MUST ask for and confirm BOTH the user's full name AND email address before calling this tool. Ask 'What is your full name?' and 'What is your email address?' separately. Repeat the information back to them for confirmation before sending. Use this only after the user has confirmed both pieces of information are correct.
```

**Parameters:**
```json
{
  "type": "object",
  "required": ["email", "user_name"],
  "properties": {
    "email": {
      "type": "string",
      "description": "User's confirmed email address in valid format (e.g., john@example.com). Must be verified by the user before sending."
    },
    "user_name": {
      "type": "string",
      "description": "User's full name as they provided it. REQUIRED - do not send email without this."
    }
  }
}
```

**Fallback Content:**
```
I'm sorry, I couldn't send the email summary. Please check the email address and try again.
```

---

### 4. open_browser

**Name:**
```
open_browser
```

**Description:**
```
Opens a website URL in the user's browser. Use this when the user asks to open a website, view a page, or navigate to a URL. Examples: 'open google', 'show me youtube', 'navigate to github.com'
```

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "description": "The full URL to open, including https:// protocol. If user doesn't specify protocol, add https://"
    }
  },
  "required": ["url"]
}
```

**Fallback Content:**
```
I'm sorry, I couldn't open that website. Please try again or provide a different URL.
```

---

### 5. open_translator

**Name:**
```
open_translator
```

**Description:**
```
Opens the translation app in the user's browser. Use this when the user needs to translate text or asks for translation help. Can optionally specify source and target languages.
```

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "language_from": {
      "type": "string",
      "description": "Source language code (e.g., 'en', 'es', 'fr'). Optional, defaults to auto-detect"
    },
    "language_to": {
      "type": "string",
      "description": "Target language code (e.g., 'en', 'es', 'fr'). Optional"
    }
  }
}
```

**Fallback Content:**
```
I'm sorry, I couldn't open the translator. Please try again.
```

---

### 6. translate_text

**Name:**
```
translate_text
```

**Description:**
```
Helps users with text translation by suggesting the translation app. Use this when the user asks to translate text, needs translation help, or wants to know what something means in another language.
```

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "description": "The text to translate"
    },
    "target_language": {
      "type": "string",
      "description": "Target language code (e.g., 'en', 'es', 'fr', 'de')"
    },
    "source_language": {
      "type": "string",
      "description": "Source language code (optional, defaults to auto-detect)"
    }
  },
  "required": ["text", "target_language"]
}
```

**Fallback Content:**
```
I can help you with translation! Let me open our translation app for you.
```

---

### 7. send_whatsapp

**Name:**
```
send_whatsapp
```

**Description:**
```
Sends a WhatsApp message to a phone number using Green API. Use this when the user asks to send a WhatsApp message, text someone on WhatsApp, or message a contact. The phone number must be in international format without the + symbol.
```

**Parameters:**
```json
{
  "type": "object",
  "properties": {
    "phoneNumber": {
      "type": "string",
      "description": "Phone number in international format without + symbol. Examples: 79876543210 (Russia), 14155551234 (USA), 447700900123 (UK). Remove all spaces, dashes, and special characters."
    },
    "message": {
      "type": "string",
      "description": "The message text to send via WhatsApp. Can include emojis and formatting."
    }
  },
  "required": ["phoneNumber", "message"]
}
```

**Fallback Content:**
```
I'm sorry, I couldn't send that WhatsApp message. Please check the phone number format and try again. The number should be in international format without the + symbol.
```

---

## Creating Tools in Hume Dashboard

### Step-by-Step Instructions

1. Go to https://platform.hume.ai/
2. Click **"EVI"** in the left sidebar
3. Click **"Tools"**
4. Click **"Create Tool"** button
5. Fill in the form with values from above
6. Click **"Save"**
7. Go to **EVI** -> **Configs**
8. Select your config
9. Click **"Edit"**
10. In **"Tools"** section, check the boxes for your tools
11. Click **"Save"**

---

## Picture Tools Setup

### Prerequisites

- Resend API key configured (`RESEND_API_KEY`)
- Custom domain verified (e.g., `novo@novocomai.online`)

### Camera Behavior

- **Phones/Tablets:** Uses front camera (selfie) by default, can switch to back
- **Laptops/Desktops:** Uses webcam
- **Permissions:** Browser will ask for camera permission on first use

### What Happens When Taking a Picture

1. **Hume AI** recognizes the intent
2. **Hume AI** calls `take_picture` tool
3. **Your app** receives the tool call
4. **Your app** opens the camera interface
5. **User** clicks capture button
6. **Your app** captures the photo
7. **Your app** sends tool response with image URL back to Hume AI
8. **Your app** plays camera click sound
9. **Your app** displays image in modal
10. **NoVo** asks: "Would you like me to email this to you?"

---

## Email Tools Setup

### Resend Configuration

1. Go to https://resend.com/
2. Sign up (free - 3,000 emails/month, 100/day)
3. Go to **API Keys** -> **Create API Key**
4. Copy your API key (starts with `re_`)
5. Add to environment variables:

```env
RESEND_API_KEY=re_your_actual_api_key_here
```

### Email Features

- Beautiful gradient header with NoVo branding
- Personalized greeting
- Embedded images for picture emails
- Conversation summary with topics covered
- Session details (timestamps, message counts)
- Full conversation history
- Professional footer

---

## Translation & Browser Tools

### Environment Variables

```env
# Translation App URL
TRANSLATOR_APP_URL=https://your-translator-app.com
```

### Usage Examples

- "Open Google"
- "I need to translate something"
- "Translate 'hello' to Spanish"
- "Open the translator for French to English"

---

## WhatsApp Integration

### Green API Setup

1. Go to https://green-api.com/
2. Sign up for an account
3. Create a new instance
4. Get your credentials:
   - Instance ID (e.g., `1101234567`)
   - API Token

### Environment Variables

```env
GREEN_API_INSTANCE_ID=your_instance_id_here
GREEN_API_TOKEN=your_api_token_here
NEXT_PUBLIC_WEBHOOK_URL=https://your-app.onrender.com
```

### Webhook Configuration

1. Go to Green API Console
2. Select your instance
3. Go to Settings -> Webhooks
4. Set webhook URL to: `https://your-app.onrender.com/api/webhooks/whatsapp`
5. Enable webhook types:
   - Incoming messages and files
   - Outgoing message status
   - State instance changed

---

## Troubleshooting

### Tool Not Being Called

- Check tool is added to EVI config
- Verify tool description is clear
- Check Hume dashboard logs

### Picture Not Taking

- Check camera permissions in browser
- Verify `take_picture` tool is enabled in EVI config
- Make sure you're using HTTPS (required for camera access)

### Email Not Sending

- Check `RESEND_API_KEY` is set correctly
- Verify domain is verified in Resend
- Check server logs for errors

### WhatsApp Not Sending

- Verify Green API credentials
- Check instance is authorized (QR code scanned)
- Verify phone number format (no + or spaces)

### Webhook Not Receiving

- Check webhook URL is publicly accessible
- Verify HTTPS (required for webhooks)
- Check webhook configuration in respective consoles

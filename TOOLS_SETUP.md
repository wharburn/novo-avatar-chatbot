# Hume AI Tools Integration Guide

This guide explains how to set up and use custom tools with your NoVo Avatar Chatbot, including browser control and WhatsApp messaging via Green API.

## 🎯 Overview

Your chatbot now supports:

1. **Open Browser** - Opens URLs when user asks
2. **Open Translator** - Opens your translation app with optional language parameters
3. **Translate Text** - Helps with translation requests and suggests your web app
4. **Send WhatsApp** - Sends WhatsApp messages via Green API
5. **WhatsApp Chat** - Receives and responds to WhatsApp messages

## 📋 Prerequisites

### 1. Green API Account

1. Go to [green-api.com](https://green-api.com/)
2. Sign up for an account
3. Create a new instance
4. Get your credentials:
   - Instance ID (e.g., `1101234567`)
   - API Token (long alphanumeric string)

### 2. Environment Variables

Add to your `.env.local`:

```env
# Green API Configuration
GREEN_API_INSTANCE_ID=your_instance_id_here
GREEN_API_TOKEN=your_api_token_here

# Webhook URL (your deployed app URL)
NEXT_PUBLIC_WEBHOOK_URL=https://your-app.onrender.com
```

## 🔧 Setup Steps

### Step 1: Create Tools in Hume AI Dashboard

Go to [Hume AI Platform](https://platform.hume.ai/) → EVI → Tools

#### Tool 1: Open Browser

```json
{
  "name": "open_browser",
  "description": "Opens a website URL in the user's browser. Use this when the user asks to open a website, view a page, or navigate to a URL.",
  "parameters": "{ \"type\": \"object\", \"properties\": { \"url\": { \"type\": \"string\", \"description\": \"The full URL to open, including https://\" } }, \"required\": [\"url\"] }",
  "fallback_content": "I'm sorry, I couldn't open that website. Please try again.",
  "version_description": "Opens URLs in user's browser"
}
```

#### Tool 2: Open Translator

```json
{
  "name": "open_translator",
  "description": "Opens the translation app in the user's browser. Use this when the user needs to translate text or asks for translation help. Can optionally specify source and target languages.",
  "parameters": "{ \"type\": \"object\", \"properties\": { \"language_from\": { \"type\": \"string\", \"description\": \"Source language code (e.g., 'en', 'es', 'fr'). Optional, defaults to auto-detect\" }, \"language_to\": { \"type\": \"string\", \"description\": \"Target language code (e.g., 'en', 'es', 'fr'). Optional\" } } }",
  "fallback_content": "I'm sorry, I couldn't open the translator. Please try again.",
  "version_description": "Opens translation app with optional language parameters"
}
```

#### Tool 3: Translate Text

```json
{
  "name": "translate_text",
  "description": "Helps users with text translation by suggesting the translation app. Use this when the user asks to translate text, needs translation help, or wants to know what something means in another language.",
  "parameters": "{ \"type\": \"object\", \"properties\": { \"text\": { \"type\": \"string\", \"description\": \"The text to translate\" }, \"target_language\": { \"type\": \"string\", \"description\": \"Target language code (e.g., 'en', 'es', 'fr', 'de')\" }, \"source_language\": { \"type\": \"string\", \"description\": \"Source language code (optional, defaults to auto-detect)\" } }, \"required\": [\"text\", \"target_language\"] }",
  "fallback_content": "I can help you with translation! Let me open our translation app for you.",
  "version_description": "Translation helper that suggests the web app"
}
```

#### Tool 4: Send WhatsApp

```json
{
  "name": "send_whatsapp",
  "description": "Sends a WhatsApp message to a phone number. Use this when the user asks to send a WhatsApp message to someone.",
  "parameters": "{ \"type\": \"object\", \"properties\": { \"phoneNumber\": { \"type\": \"string\", \"description\": \"Phone number in international format without + (e.g., 79876543210 for Russia, 14155551234 for USA)\" }, \"message\": { \"type\": \"string\", \"description\": \"The message text to send\" } }, \"required\": [\"phoneNumber\", \"message\"] }",
  "fallback_content": "I'm sorry, I couldn't send that WhatsApp message. Please check the phone number and try again.",
  "version_description": "Sends WhatsApp messages via Green API"
}
```

### Step 2: Add Tools to Your EVI Configuration

1. Go to your EVI Config in Hume dashboard
2. Click "Edit Configuration"
3. In the "Tools" section, add all four tools you created
4. Save the configuration

### Step 3: Configure Translation App URL

Add to your `.env.local`:

```env
# Translation App URL
TRANSLATOR_APP_URL=https://your-translator-app.com
```

Replace with your actual translation app URL.

### Step 3: Configure Green API Webhooks (Optional)

To receive incoming WhatsApp messages:

1. Go to Green API Console
2. Select your instance
3. Go to Settings → Webhooks
4. Set webhook URL to: `https://your-app.onrender.com/api/webhooks/whatsapp`
5. Enable these webhook types:
   - ✅ Incoming messages and files
   - ✅ Outgoing message status
   - ✅ State instance changed

### Step 4: Configure Hume AI Webhooks (Optional)

For analytics and logging:

1. In your Hume EVI Config
2. Add webhook URL: `https://your-app.onrender.com/api/webhooks/hume`
3. Enable events:
   - ✅ chat_started
   - ✅ chat_ended
   - ✅ tool_call

## 🧪 Testing

### Test Open Browser Tool

Say to your chatbot:

- "Open Google.com"
- "Show me the weather website"
- "Navigate to GitHub"

### Test Translator Tool

Say to your chatbot:

- "I need to translate something"
- "Open the translator"
- "Help me translate from English to Spanish"
- "Open translator for French to English"

### Test Translate Text Tool

Say to your chatbot:

- "Translate 'hello' to Spanish"
- "What does 'bonjour' mean in English?"
- "How do you say 'thank you' in German?"
- "Translate this text to French: I love you"

### Test WhatsApp Tool

Say to your chatbot:

- "Send a WhatsApp message to 14155551234 saying Hello!"
- "Text my friend at 79876543210 and say I'll be late"

### Test WhatsApp Incoming Messages

1. Send a message to your Green API WhatsApp number
2. The bot will receive it via webhook
3. Check logs in your app

## 📝 Example Conversations

**User:** "Hey, can you open YouTube for me?"
**Bot:** "Sure! Opening YouTube now." _[Browser opens youtube.com]_

**User:** "Send a WhatsApp to 14155551234 saying 'Meeting at 3pm'"
**Bot:** "I've sent the WhatsApp message to 14155551234." _[Message sent]_

## 🔍 Debugging

### Check Tool Execution Logs

```bash
# View server logs
npm run dev

# Look for these log messages:
# [Hume EVI] Tool call received: open_browser
# [Tool Execute] Executing tool: send_whatsapp
# [Green API] Message sent successfully
```

### Test API Endpoints Directly

```bash
# Test tool execution
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{"toolName":"send_whatsapp","parameters":{"phoneNumber":"14155551234","message":"Test"}}'

# Test WhatsApp webhook
curl http://localhost:3000/api/webhooks/whatsapp
```

## 🚀 Deployment

When deploying to Render:

1. Add environment variables in Render dashboard:
   - `GREEN_API_INSTANCE_ID`
   - `GREEN_API_TOKEN`
   - `NEXT_PUBLIC_WEBHOOK_URL` (your Render app URL)

2. Redeploy your app

3. Update webhook URLs in:
   - Green API console (use your Render URL)
   - Hume AI dashboard (use your Render URL)

## 🛠️ Customization

### Add More Tools

Create a new tool in `app/api/tools/execute/route.ts`:

```typescript
case 'your_tool_name':
  result = await executeYourTool(parameters);
  break;
```

### Modify WhatsApp Auto-Responses

Edit `app/api/webhooks/whatsapp/route.ts` to customize how the bot responds to incoming messages.

## 📚 Resources

- [Hume AI Tools Documentation](https://dev.hume.ai/reference/speech-to-speech-evi/tools/create-tool)
- [Green API Documentation](https://green-api.com/en/docs/)
- [Green API Send Message](https://green-api.com/en/docs/api/sending/SendMessage/)

## ❓ Troubleshooting

**Tool not being called:**

- Check tool is added to EVI config
- Verify tool description is clear
- Check Hume dashboard logs

**WhatsApp message not sending:**

- Verify Green API credentials
- Check instance is authorized (QR code scanned)
- Verify phone number format (no + or spaces)

**Webhook not receiving:**

- Check webhook URL is publicly accessible
- Verify HTTPS (required for webhooks)
- Check webhook configuration in Green API console

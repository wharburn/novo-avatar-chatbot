# Quick Reference: Hume AI Tool Configuration

This is a quick copy-paste reference for creating tools in the Hume AI dashboard.

## 📍 Where to Add Tools

1. Go to: https://platform.hume.ai/
2. Navigate to: **EVI → Tools**
3. Click: **"Create Tool"**
4. Copy the values below for each tool

---

## Tool 1: open_browser

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
{ "type": "object", "properties": { "url": { "type": "string", "description": "The full URL to open, including https:// protocol. If user doesn't specify protocol, add https://" } }, "required": ["url"] }
```

**Fallback Content:**
```
I'm sorry, I couldn't open that website. Please try again or provide a different URL.
```

**Version Description:**
```
Opens URLs in user's browser window
```

---

## Tool 2: open_translator

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
{ "type": "object", "properties": { "language_from": { "type": "string", "description": "Source language code (e.g., 'en', 'es', 'fr'). Optional, defaults to auto-detect" }, "language_to": { "type": "string", "description": "Target language code (e.g., 'en', 'es', 'fr'). Optional" } } }
```

**Fallback Content:**
```
I'm sorry, I couldn't open the translator. Please try again.
```

**Version Description:**
```
Opens translation app with optional language parameters
```

---

## Tool 3: translate_text

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
{ "type": "object", "properties": { "text": { "type": "string", "description": "The text to translate" }, "target_language": { "type": "string", "description": "Target language code (e.g., 'en', 'es', 'fr', 'de')" }, "source_language": { "type": "string", "description": "Source language code (optional, defaults to auto-detect)" } }, "required": ["text", "target_language"] }
```

**Fallback Content:**
```
I can help you with translation! Let me open our translation app for you.
```

**Version Description:**
```
Translation helper that suggests the web app
```

---

## Tool 4: send_whatsapp

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
{ "type": "object", "properties": { "phoneNumber": { "type": "string", "description": "Phone number in international format without + symbol. Examples: 79876543210 (Russia), 14155551234 (USA), 447700900123 (UK). Remove all spaces, dashes, and special characters." }, "message": { "type": "string", "description": "The message text to send via WhatsApp. Can include emojis and formatting." } }, "required": ["phoneNumber", "message"] }
```

**Fallback Content:**
```
I'm sorry, I couldn't send that WhatsApp message. Please check the phone number format and try again. The number should be in international format without the + symbol.
```

**Version Description:**
```
Sends WhatsApp messages via Green API integration
```

---

## After Creating Tools

1. Go to: **EVI → Configs**
2. Select your config (or create new)
3. Click: **"Edit"**
4. In **"Tools"** section, click **"Add Tool"**
5. Select all 4 tools you created
6. Click: **"Save"**

---

## Testing

After adding tools to your config, test with these phrases:

- "Open Google"
- "I need to translate something"
- "Translate 'hello' to Spanish"
- "Send a WhatsApp to 14155551234 saying hello"


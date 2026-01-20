# MCP Translation Integration Setup

This guide shows how to add translation capabilities to NoVo using MCP (Model Context Protocol) servers and your web-based translation app.

## 🎯 Strategy

NoVo now has a **hybrid translation approach**:

1. **Quick Translation Requests** → Suggests opening your translation app
2. **Complex Translation Needs** → Directs users to your full-featured web app
3. **Future: MCP Integration** → Can connect to MCP translation servers for in-chat translations

## 🔧 Setup in Hume AI Dashboard

### Step 1: Create the `translate_text` Tool

1. Go to [Hume AI Platform](https://platform.hume.ai/) → EVI → Tools
2. Click "Create Tool"
3. Fill in these values:

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

### Step 2: Add Tool to Your EVI Configuration

1. Go to your EVI Config in Hume dashboard
2. Click "Edit Configuration"
3. In the "Tools" section, add the `translate_text` tool
4. Save the configuration

## 💬 How It Works

When a user asks for translation:

1. **User says:** "Translate 'hello' to Spanish"
2. **Hume AI** detects the intent and calls `translate_text` tool
3. **NoVo responds:** "I can help you translate that! For quick translations, I recommend opening our translation app. Would you like me to open it for you?"
4. **User confirms** → NoVo opens your translation app

## 🧪 Test Examples

Try saying:

- "Translate 'hello' to Spanish"
- "What does 'bonjour' mean in English?"
- "How do you say 'thank you' in German?"
- "Translate this text to French: I love you"
- "Can you translate 'good morning' to Japanese?"

## 🚀 Future: Full MCP Integration

The codebase is ready for MCP server integration. To enable actual in-chat translations:

### Option 1: Use LibreTranslate (Free)

1. Install LibreTranslate MCP server:
```bash
npm install -g @modelcontextprotocol/server-libretranslate
```

2. Add to `.env.local`:
```env
LIBRETRANSLATE_URL=https://libretranslate.com
LIBRETRANSLATE_API_KEY=  # Optional, for rate limits
```

3. Update `app/lib/mcp-translation.ts` to initialize on startup

### Option 2: Use Google Translate API

1. Get Google Cloud API key with Translation API enabled
2. Add to `.env.local`:
```env
GOOGLE_TRANSLATE_API_KEY=your_api_key_here
```

3. Update MCP configuration to use Google provider

### Option 3: Build Custom MCP Server

Create your own MCP server that connects to your translation app's API:

```typescript
// Custom MCP server that uses your translation app
const server = new Server({
  name: 'novo-translator',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'translate',
    description: 'Translate text using NoVo translation app',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        target: { type: 'string' },
        source: { type: 'string' },
      },
      required: ['text', 'target'],
    },
  }],
}));
```

## 📝 Current Implementation

Right now, the `translate_text` tool:
- ✅ Captures translation requests
- ✅ Suggests opening your translation app
- ✅ Provides a helpful response
- ⏳ Can be extended to use MCP servers for actual translation

## 🔄 Workflow

```
User Request
    ↓
Hume AI detects translation intent
    ↓
Calls translate_text tool
    ↓
NoVo suggests translation app
    ↓
User confirms
    ↓
Opens your web app with pre-filled languages
```

## 🎨 Customization

To change the response message, edit `app/api/tools/execute/route.ts`:

```typescript
async function executeTranslateText(params) {
  // Customize this message
  return {
    success: true,
    data: {
      message: `Your custom message here!`,
      translator_url: translatorUrl,
    },
  };
}
```

## 📚 Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Hume AI Tools Guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use)


# Translation App Integration

This document explains how NoVo can direct users to your web-based translation app.

## 🎯 Overview

The `open_translator` tool allows users to ask NoVo for translation help, and NoVo will open your translation app in their browser. The tool can optionally pass language parameters to pre-configure the translator.

## 🔧 Setup

### 1. Configure Environment Variable

Add your translation app URL to `.env.local`:

```env
TRANSLATOR_APP_URL=https://your-translator-app.com
```

Replace `https://your-translator-app.com` with your actual translation app URL.

### 2. Create Tool in Hume AI Dashboard

1. Go to [Hume AI Platform](https://platform.hume.ai/) → EVI → Tools
2. Click "Create Tool"
3. Use these values:

**Name:** `open_translator`

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

### 3. Add Tool to Your EVI Configuration

1. Go to your EVI Config in Hume dashboard
2. Click "Edit Configuration"
3. In the "Tools" section, add the `open_translator` tool
4. Save the configuration

## 💬 Usage Examples

Users can say:

- "I need to translate something"
- "Open the translator"
- "Help me translate from English to Spanish"
- "Open translator for French to English"
- "I need translation help"

## 🔗 URL Parameters (Optional)

If your translation app supports URL parameters, the tool will automatically append them:

- `?from=en` - Source language
- `?to=es` - Target language

Example: `https://your-translator-app.com?from=en&to=es`

If your app uses different parameter names, you can modify the `executeOpenTranslator` function in `app/api/tools/execute/route.ts`.

## 🛠️ Customization

### Change Parameter Names

If your translation app uses different URL parameter names (e.g., `source` and `target` instead of `from` and `to`), edit `app/api/tools/execute/route.ts`:

```typescript
if (params.language_from) {
  urlParams.append('source', params.language_from); // Changed from 'from'
}
if (params.language_to) {
  urlParams.append('target', params.language_to); // Changed from 'to'
}
```

### Add More Parameters

You can extend the tool to pass additional parameters like text to translate:

1. Update the tool parameters in Hume AI dashboard
2. Modify `executeOpenTranslator` function to handle new parameters
3. Append them to the URL

## 🧪 Testing

1. Start your NoVo chatbot
2. Say: "I need to translate something"
3. NoVo should open your translation app in a new browser tab

## 📝 Notes

- The tool opens the translator in a new browser tab
- Language codes should follow ISO 639-1 standard (e.g., 'en', 'es', 'fr', 'de')
- If no language parameters are provided, the translator opens with default settings
- The tool works entirely client-side (no server processing needed)

## 🔍 Troubleshooting

**Tool not triggering:**
- Check that the tool is added to your EVI configuration
- Verify the tool name is exactly `open_translator`
- Try more explicit phrases like "open the translator app"

**Wrong URL opening:**
- Check `TRANSLATOR_APP_URL` in your `.env.local`
- Restart your Next.js dev server after changing environment variables

**Parameters not working:**
- Verify your translation app accepts URL parameters
- Check browser console for the actual URL being opened
- Adjust parameter names in `executeOpenTranslator` if needed


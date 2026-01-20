# NoVo Feature Implementation Guide

This document covers the implementation details of NoVo's key features.

---

## Table of Contents

1. [Picture Feature](#picture-feature)
2. [Email Features](#email-features)
3. [Translation Integration](#translation-integration)
4. [Webhook Architecture](#webhook-architecture)

---

## Picture Feature

### What's Been Implemented

#### 1. Camera Click Sound
- **File:** `app/utils/sounds.ts`
- **Features:**
  - Plays camera click sound when photo is taken
  - Fallback to synthesized beep if `camera-click.mp3` not found
  - Uses Web Audio API for fallback sound
  - Automatic error handling

#### 2. Image Viewer Component
- **File:** `app/components/Chat/ImageViewer.tsx`
- **Features:**
  - Beautiful modal overlay for displaying images
  - Works for **camera photos** AND **web images**
  - Download button to save images
  - Open in new tab button
  - Loading states with spinner
  - Error handling with retry option
  - Responsive design
  - Purple gradient header with icons
  - Timestamps and captions
  - Click outside to close

#### 3. Chat Integration
- **File:** `app/components/Chat/Chat.tsx`
- **Features:**
  - Listens for `tool_call` messages (plays click sound)
  - Listens for `tool_response` messages (displays image)
  - Auto-detects camera photos vs web images
  - Displays image immediately after capture
  - State management for displayed images

#### 4. Tool Execution
- **File:** `app/api/tools/execute/route.ts`
- **Features:**
  - `take_picture` handler
  - `send_picture_email` handler
  - Returns image URLs in responses

### User Experience Flow

#### Taking a Picture:

1. **User says:** "Take a picture"
2. **Hume AI:** Calls `take_picture` tool
3. **App:** 
   - Plays camera click sound
   - Browser requests camera permission (first time only)
   - Camera captures photo
4. **Hume AI:** Returns `tool_response` with `image_url`
5. **App:** 
   - Displays image in beautiful modal
   - User can download or view in new tab
6. **NoVo asks:** "Would you like me to email this to you?"
7. **User:** Provides email and name
8. **App:** Sends email with picture

### Camera Sound Setup

#### Required File
Place a camera click sound at: `public/sounds/camera-click.mp3`

#### Where to Get Sounds:
- **Freesound.org**: https://freesound.org/search/?q=camera+shutter
- **Zapsplat**: https://www.zapsplat.com/sound-effect-category/cameras/
- **Mixkit**: https://mixkit.co/free-sound-effects/camera/

#### File Requirements:
- **Format:** MP3
- **Duration:** 0.5 - 1 second
- **Size:** < 50KB recommended
- **Name:** `camera-click.mp3` (exact name)

---

## Email Features

### Picture Email Implementation

#### Files Created:
- `app/lib/resend-image-email.ts` - Email service for sending pictures

#### Email Template Features:
- Gradient header with camera emoji
- Embedded image display
- Personalized greeting
- Optional caption support
- Timestamp tracking
- Professional footer
- Uses verified domain: `novo@novocomai.online`

### Conversation Summary Email

#### Implementation:
- `app/lib/resend-email.ts` - Email service for summaries

#### Summary Includes:
- User profile data (name, email, etc.)
- Topics discussed (detected from keywords)
- Message counts (total, user, assistant)
- Full conversation transcript
- Actions taken during conversation

### Workflow

#### Picture Email:
1. User says: "Take a picture and email it to me"
2. NoVo calls `take_picture` tool
3. Hume AI captures image, returns `image_url`
4. NoVo asks for email and name
5. NoVo calls `send_email_picture` with all parameters
6. System sends beautiful HTML email with embedded picture
7. NoVo confirms: "Picture sent!"

#### Summary Email:
1. User says: "Email me a summary of our conversation"
2. NoVo asks for email and name
3. NoVo calls `send_email_summary` tool
4. System generates summary from conversation
5. System sends formatted HTML email
6. NoVo confirms: "Summary sent!"

---

## Translation Integration

### Strategy

NoVo has a **hybrid translation approach**:

1. **Quick Translation Requests** -> Suggests opening translation app
2. **Complex Translation Needs** -> Directs users to full-featured web app
3. **Future: MCP Integration** -> Can connect to MCP translation servers

### How It Works

1. **User says:** "Translate 'hello' to Spanish"
2. **Hume AI** detects the intent and calls `translate_text` tool
3. **NoVo responds:** "I can help you translate that! Would you like me to open our translation app?"
4. **User confirms** -> NoVo opens translation app with pre-filled languages

### Environment Setup

```env
TRANSLATOR_APP_URL=https://your-translator-app.com
```

### URL Parameters

If your translation app supports URL parameters:
- `?from=en` - Source language
- `?to=es` - Target language

Example: `https://your-translator-app.com?from=en&to=es`

### Future MCP Integration

The codebase is ready for MCP server integration:

#### Option 1: LibreTranslate (Free)
```bash
npm install -g @modelcontextprotocol/server-libretranslate
```

#### Option 2: Google Translate API
```env
GOOGLE_TRANSLATE_API_KEY=your_api_key_here
```

---

## Webhook Architecture

### The Challenge

When you configure webhooks in Hume AI, tool calls are sent to the webhook endpoint INSTEAD of the client WebSocket. This means:

1. User says "Take a picture"
2. Hume AI sends `tool_call` event to webhook (server-side)
3. Webhook responds with success
4. **Camera NEVER opens** because client-side code never receives the tool call

### The Solution: Bridge Pattern

We implemented a bridge between webhook and client using polling:

#### Files:
- `/api/hume/webhook/route.ts` - Receives tool calls from Hume
- `/api/tool-calls/route.ts` - Bridge for client polling

#### How It Works:
1. Webhook receives tool call from Hume
2. Webhook stores pending tool call in memory
3. Client polls `/api/tool-calls` every second
4. Client receives pending tool call
5. Client executes tool (opens camera, etc.)
6. Client sends tool response back

### Configuration

Webhook URL in Hume dashboard:
```
https://novo-avatar-chatbot.onrender.com/api/hume/webhook
```

### Alternative: Remove Webhook

For simpler camera-only functionality:
1. Go to Hume AI dashboard
2. Navigate to EVI -> Configs
3. Remove the webhook URL
4. Save

This allows the client to receive tool calls directly via WebSocket.

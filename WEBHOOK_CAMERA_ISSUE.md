# Webhook vs Client-Side Camera Issue

## 🚨 The Problem

When you configure webhooks in Hume AI, tool calls are sent to the webhook endpoint INSTEAD of the client WebSocket. This means:

1. User says "Take a picture"
2. Hume AI sends `tool_call` event to webhook (server-side)
3. Webhook responds with success
4. **Camera NEVER opens** because the client-side code never receives the tool call

## 🎯 The Solution

We have TWO options:

### Option 1: Remove Webhook (Recommended for Camera)

**Pros:**
- Camera opens immediately on client-side
- No server roundtrip needed
- Simpler architecture

**Cons:**
- Can't track tool calls server-side
- No server-side validation

**How to do it:**
1. Go to https://platform.hume.ai/
2. Navigate to EVI → Configs
3. Find your config
4. Click Edit
5. Remove the webhook URL
6. Save

### Option 2: Hybrid Approach (Use Webhooks for Email Only)

**Keep client-side handling for `take_picture`**
**Use webhooks for `send_email_picture` and `send_email_summary`**

This requires:
1. Removing webhook from Hume config
2. Handling email tools via API calls from client
3. Client receives all tool calls via WebSocket

## 🔧 Current Setup

Right now you have:
- ✅ Webhook endpoint created (`/api/hume/webhook`)
- ✅ Webhook configured in Hume AI dashboard
- ❌ Camera not opening (because webhook intercepts the tool call)

## 📝 Recommended Action

**Remove the webhook** and let the client handle all tool calls.

The client-side code in `Chat.tsx` already handles:
- Opening camera when `take_picture` is called
- Capturing photo
- Displaying image
- Sending email via API

The webhook is preventing this from working!

## 🚀 Next Steps

1. **Remove webhook from Hume AI config**
2. **Test:** Say "Take a picture" - camera should open
3. **Keep webhook endpoint** for future use (analytics, logging, etc.)



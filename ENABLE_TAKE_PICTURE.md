# 🚨 How to Enable take_picture Tool

## The Problem

NoVo is saying she can't take photos because the `take_picture` tool is **not enabled** in your Hume AI EVI configuration.

## The Solution

### Step 1: Go to Hume AI Dashboard

1. Open https://platform.hume.ai/
2. Log in to your account
3. Click on **"EVI"** in the left sidebar
4. Click on **"Configs"**

### Step 2: Edit Your Config

1. Find your current EVI config (the one you're using)
2. Click **"Edit"** or the config name
3. Scroll down to the **"Tools"** section

### Step 3: Enable take_picture

Look for **"Built-in Tools"** or **"Available Tools"** section.

You should see a list of built-in tools including:
- ✅ `take_picture` - **Enable this one!**
- `web_search`
- `get_weather`
- etc.

**Check the box next to `take_picture`** to enable it.

### Step 4: Save

1. Click **"Save"** at the bottom
2. Wait for the config to update

### Step 5: Test

1. Refresh your app at http://localhost:3000
2. Say: **"Take a picture"**
3. NoVo should now be able to take photos!

---

## Alternative: Check if Tool is Already Enabled

If the tool is already enabled but still not working, check:

### 1. Browser Permissions

- Make sure your browser has camera permission
- Check browser settings → Privacy → Camera
- Allow camera access for localhost

### 2. HTTPS Requirement

- Camera API requires HTTPS in production
- On localhost, HTTP is fine for testing
- Make sure you're accessing via `http://localhost:3000` not `http://127.0.0.1:3000`

### 3. Check Browser Console

Open browser console (F12) and look for errors like:
- `NotAllowedError: Permission denied`
- `NotFoundError: No camera found`
- `NotSupportedError: HTTPS required`

### 4. Test Camera Access

Open browser console and run:
```javascript
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    console.log('✅ Camera access works!');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => console.error('❌ Camera error:', err));
```

---

## What Happens When Enabled

Once `take_picture` is enabled in Hume AI:

1. **User says:** "Take a picture"
2. **Hume AI:** Recognizes the intent and calls `take_picture` tool
3. **Browser:** Requests camera permission (first time only)
4. **Camera:** Opens and captures photo
5. **Hume AI:** Returns image URL in tool response
6. **Your App:** 
   - 🔊 Plays camera click sound
   - 🖼️ Displays image in modal
   - 💬 NoVo asks if you want to email it

---

## Still Not Working?

### Check Your Config ID

Make sure you're using the correct config ID in your app.

**File:** `.env.local`
```
NEXT_PUBLIC_HUME_CONFIG_ID=your-config-id-here
```

The config ID should match the config where you enabled `take_picture`.

### Check Hume AI Logs

1. Go to https://platform.hume.ai/
2. Click **"EVI"** → **"Logs"**
3. Look for recent conversations
4. Check if `take_picture` tool is being called
5. Look for any error messages

### Contact Hume AI Support

If the tool is enabled but still not working:
- Check Hume AI documentation: https://docs.hume.ai/
- Contact Hume AI support
- Check if `take_picture` is available in your plan

---

## Quick Checklist

- [ ] Logged into https://platform.hume.ai/
- [ ] Opened EVI → Configs
- [ ] Edited your config
- [ ] Enabled `take_picture` in Built-in Tools
- [ ] Saved the config
- [ ] Refreshed the app
- [ ] Tested "Take a picture"
- [ ] Browser has camera permission
- [ ] Using correct config ID in .env.local

---

## Expected Behavior

✅ **When working correctly:**
- NoVo says: "Sure! Let me take a picture for you"
- Browser shows camera permission prompt (first time)
- Camera opens
- Photo is captured
- Click sound plays 🔊
- Image displays in modal 🖼️
- NoVo asks: "Would you like me to email this to you?"

❌ **When not enabled:**
- NoVo says: "I can't take pictures" or "I don't have that capability"
- No camera opens
- No tool call happens

---

**Need help? Check the browser console for errors!**


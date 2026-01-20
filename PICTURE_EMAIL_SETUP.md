# Picture Email Feature Setup

NoVo can now take pictures and email them to users using Hume AI's built-in `take_picture` tool!

## 🎯 What It Does

When users say "Take a picture and email it to me", NoVo will:
1. Use Hume AI's `take_picture` tool to capture an image
2. Ask for the user's email and name
3. Send a beautifully formatted email with the picture
4. Include timestamp and caption

## 🚀 Quick Setup

### Prerequisites

✅ You already have:
- Resend API key configured (`RESEND_API_KEY`)
- Custom domain verified (`novo@novocomai.online`)
- Email summary feature working

### Step 1: Enable take_picture Tool in Hume AI

The `take_picture` tool is **already built into Hume AI**! You just need to enable it:

1. Go to https://platform.hume.ai/ → **EVI** → **Configs**
2. Select your config
3. Click **"Edit"**
4. In **"Tools"** section, find and enable **`take_picture`**
5. Click **"Save"**

### Step 2: Create send_picture_email Tool in Hume AI

1. Go to https://platform.hume.ai/ → **EVI** → **Tools**
2. Click **"Create Tool"**
3. Fill in:

**Name:**
```
send_picture_email
```

**Description:**
```
Sends a picture via email after the user has taken a photo using the take_picture tool. IMPORTANT: You MUST ask for and confirm BOTH the user's full name AND email address before calling this tool. This tool should only be called AFTER a picture has been taken with the take_picture tool. Ask 'What is your email address?' and 'What is your name?' to collect the required information.
```

**Parameters:**
```json
{ "type": "object", "properties": { "email": { "type": "string", "description": "User's confirmed email address in valid format (e.g., john@example.com)" }, "user_name": { "type": "string", "description": "User's full name. REQUIRED." }, "image_url": { "type": "string", "description": "The URL of the image from the take_picture tool. This is provided by the take_picture tool response." }, "caption": { "type": "string", "description": "Optional caption or message to include with the picture" } }, "required": ["email", "user_name", "image_url"] }
```

**Fallback Content:**
```
I'm sorry, I couldn't send the picture via email. Please make sure you've taken a picture first and provided your email address.
```

**Version Description:**
```
Sends pictures via email using Resend - works with take_picture tool
```

4. Click **"Save"**

### Step 3: Add Tool to Your EVI Config

1. Go to **EVI** → **Configs**
2. Select your config
3. Click **"Edit"**
4. In **"Tools"** section, add both:
   - ✅ `take_picture` (built-in)
   - ✅ `send_picture_email` (custom)
5. Click **"Save"**

### Step 4: Test!

Say to NoVo:
- "Take a picture and email it to me"
- "Can you take a photo and send it to john@example.com?"
- "Capture an image and email it"

NoVo will:
1. Take the picture using the camera
2. Ask for your email address
3. Ask for your name
4. Send the picture via email

## 📧 Email Template

The email includes:
- ✅ Beautiful gradient header with camera emoji 📸
- ✅ Personalized greeting
- ✅ The captured image (embedded)
- ✅ Optional caption
- ✅ Timestamp of when picture was taken
- ✅ Professional footer

## 🔄 How It Works

### Workflow:

1. **User:** "Take a picture and email it to me"
2. **NoVo:** *Calls `take_picture` tool*
3. **Hume AI:** Captures image, returns `image_url`
4. **NoVo:** "Picture taken! What's your email address?"
5. **User:** "john@example.com"
6. **NoVo:** "And what's your name?"
7. **User:** "John Smith"
8. **NoVo:** *Calls `send_picture_email` with email, name, and image_url*
9. **System:** Sends email with picture
10. **NoVo:** "Picture sent to john@example.com!"

## 🎨 Customization

### Change Email Template

Edit `app/lib/resend-image-email.ts` to customize:
- Email design
- Header colors
- Caption text
- Footer branding

### Add Custom Captions

Users can say:
- "Take a picture and email it with the caption 'Great meeting!'"
- NoVo will include the custom caption in the email

## 🧪 Testing

### Test Locally

The picture-taking feature requires:
- Camera access in the browser
- Hume AI's take_picture tool enabled
- User permission for camera

### Test Flow:

1. Open http://localhost:3000
2. Allow camera access when prompted
3. Say: "Take a picture and email it to me"
4. Follow NoVo's prompts
5. Check your email!

## 📊 Features

- ✅ **Automatic image capture** via Hume AI
- ✅ **Email validation** before sending
- ✅ **Name requirement** for personalization
- ✅ **Beautiful HTML email** with embedded image
- ✅ **Optional captions** for context
- ✅ **Timestamp tracking** for when picture was taken
- ✅ **Error handling** for missing data

## 🔧 Troubleshooting

**Picture not taking?**
- ✅ Check camera permissions in browser
- ✅ Verify `take_picture` tool is enabled in EVI config
- ✅ Make sure you're using HTTPS (required for camera access)

**Email not sending?**
- ✅ Check `RESEND_API_KEY` is set
- ✅ Verify domain is verified in Resend
- ✅ Check Render logs for errors
- ✅ Ensure both email and name are provided

**Image not showing in email?**
- ✅ Check that `image_url` is valid
- ✅ Verify image is publicly accessible
- ✅ Check email client supports embedded images

## 🚀 Next Steps

1. **Add image storage** - Save images to cloud storage (S3, Cloudinary)
2. **Image processing** - Add filters, resize, compress
3. **Multiple images** - Send albums via email
4. **Image analysis** - Use AI to describe what's in the picture
5. **Gallery feature** - Store user's picture history

## 📚 Resources

- [Hume AI take_picture Tool](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use)
- [Resend Email API](https://resend.com/docs)
- [Camera API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

---

**That's it! NoVo can now take pictures and email them to users!** 📸✨


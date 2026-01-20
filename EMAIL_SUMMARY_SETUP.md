# Email Summary Feature Setup

NoVo can now send beautiful conversation summaries via email using Resend!

## 🎯 What It Does

When users ask "Email me a summary of our conversation", NoVo will:

1. Capture their email address
2. Generate a conversation summary
3. Send a beautifully formatted HTML email
4. Include session details and full conversation history

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Resend API Key

1. Go to <https://resend.com/>
2. Sign up (free - 3,000 emails/month, 100/day)
3. Go to **API Keys** → **Create API Key**
4. Copy your API key (starts with `re_`)

### Step 2: Add to Environment Variables

**On Render:**

1. Go to your Render dashboard
2. Select your NoVo service
3. Go to **Environment** tab
4. Add new variable:
   - **Key:** `RESEND_API_KEY`
   - **Value:** `re_your_actual_api_key_here`
5. Click **Save Changes**

**Locally (for testing):**
Add to `.env.local`:

```env
RESEND_API_KEY=re_your_actual_api_key_here
```

### Step 3: Create Tool in Hume AI Dashboard

1. Go to <https://platform.hume.ai/> → **EVI** → **Tools**
2. Click **"Create Tool"**
3. Fill in:

**Name:**

```
send_email_summary
```

**Description:**

```
Sends a conversation summary email to the user. IMPORTANT: You MUST ask for and confirm BOTH the user's full name AND email address before calling this tool. Ask 'What is your full name?' and 'What is your email address?' separately. Repeat the information back to them for confirmation before sending. Use this only after the user has confirmed both pieces of information are correct.
```

**Parameters:**

```json
{
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "description": "User's confirmed email address in valid format (e.g., john@example.com). Must be verified by the user before sending."
    },
    "user_name": {
      "type": "string",
      "description": "User's full name as they provided it. REQUIRED - do not send email without this."
    }
  },
  "required": ["email", "user_name"]
}
```

**Fallback Content:**

```
I'm sorry, I couldn't send the email summary. Please check the email address and try again.
```

**Version Description:**

```
Sends conversation summary via Resend email service
```

1. Click **"Save"**

### Step 4: Add Tool to Your EVI Config

1. Go to **EVI** → **Configs**
2. Select your config
3. Click **"Edit"**
4. In **"Tools"** section, add `send_email_summary`
5. Click **"Save"**

### Step 5: Test

Say to NoVo:

- "Email me a summary to <john@example.com>"
- "Send me a recap of our conversation"
- "Can you email me what we talked about?"

## 📧 Email Template

The email includes:

- ✅ Beautiful gradient header with NoVo branding
- ✅ Personalized greeting (if name provided)
- ✅ Conversation summary with topics covered
- ✅ Session details (start time, end time, message count)
- ✅ Full conversation history with timestamps
- ✅ Professional footer

## 🎨 Customization

### Change Email Sender

Edit `app/lib/resend-email.ts`:

```typescript
const result = await resend.emails.send({
  from: 'NoVo <onboarding@resend.dev>', // Change this
  to: email,
  subject: `Your NoVo Conversation Summary - ${new Date().toLocaleDateString()}`,
  html: htmlContent,
});
```

**Note:** To use a custom domain (e.g., `noreply@yourdomain.com`):

1. Go to Resend dashboard → **Domains**
2. Add your domain
3. Add DNS records
4. Verify domain
5. Update the `from` field

### Customize Email Design

Edit the `htmlContent` in `app/lib/resend-email.ts` to change:

- Colors
- Layout
- Branding
- Content sections

### Add More Intelligence

Currently uses simple keyword matching for topics. You can enhance with:

- AI-powered summarization (OpenAI, Anthropic)
- Sentiment analysis
- Key points extraction
- Action items detection

## 🧪 Testing

### Test Email Locally

```bash
npm run dev
```

Then use the dev console or voice to trigger:

```
"Email me a summary to your-email@example.com"
```

### Check Email Delivery

1. Go to Resend dashboard → **Emails**
2. See all sent emails with status
3. Click to view rendered email
4. Check delivery logs

## 📊 Resend Free Tier Limits

- **3,000 emails/month**
- **100 emails/day**
- **No credit card required**
- **All features included**

Perfect for most use cases!

## 🔧 Troubleshooting

**Email not sending?**

- ✅ Check `RESEND_API_KEY` is set correctly
- ✅ Verify API key is active in Resend dashboard
- ✅ Check Render logs for errors
- ✅ Ensure tool is added to EVI config

**Email going to spam?**

- ✅ Use a verified custom domain (not `onboarding@resend.dev`)
- ✅ Add SPF, DKIM, DMARC records
- ✅ Warm up your domain gradually

**Want to test without Hume?**

- Call the API directly:

```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "send_email_summary",
    "parameters": {
      "email": "test@example.com",
      "user_name": "John"
    }
  }'
```

## 🚀 Next Steps

1. **Add conversation tracking** - Store actual messages in session
2. **AI summarization** - Use GPT/Claude for better summaries
3. **Email preferences** - Let users choose summary format
4. **Scheduled summaries** - Daily/weekly recaps
5. **Analytics** - Track email open rates

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend React Email](https://react.email/) - Build emails with React
- [Hume AI Tools Guide](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use)

---

**That's it! Your users can now receive beautiful email summaries of their NoVo conversations!** 📧✨

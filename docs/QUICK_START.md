# NoVo Avatar Chatbot - Quick Start Guide

Get NoVo up and running in 10 minutes.

---

## Prerequisites

- Node.js 18+
- npm or yarn
- Hume AI account
- Resend account (for email features)

---

## Step 1: Install Dependencies (1 min)

```bash
npm install
```

---

## Step 2: Configure Environment Variables (2 min)

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Required - Hume AI
NEXT_PUBLIC_HUME_API_KEY=your_hume_api_key_here
NEXT_PUBLIC_HUME_CONFIG_ID=your_evi_config_id_here
HUME_SECRET_KEY=your_hume_secret_key_here

# Required - Email (Resend)
RESEND_API_KEY=re_your_resend_api_key_here

# Optional - Redis (for user sessions)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Optional - Translation
TRANSLATOR_APP_URL=https://your-translator-app.com

# Optional - WhatsApp (Green API)
GREEN_API_INSTANCE_ID=your_instance_id
GREEN_API_TOKEN=your_token
```

---

## Step 3: Get Hume AI Credentials (3 min)

1. Go to https://platform.hume.ai/
2. Sign up or log in
3. Navigate to **Settings > API Keys** to get your API key and Secret key
4. Navigate to **EVI > Configs** to create an EVI configuration
5. Copy the Config ID

---

## Step 4: Create Tools in Hume Dashboard (5 min)

1. Go to https://platform.hume.ai/ -> **EVI** -> **Tools**
2. Create these tools (see `docs/HUME_TOOLS_SETUP.md` for full configs):
   - `take_picture`
   - `send_email_picture`
   - `send_email_summary`
3. Go to **EVI** -> **Configs**
4. Select your config -> **Edit**
5. Add all tools to your config
6. **Save**

---

## Step 5: Run Development Server (1 min)

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Step 6: Test! (1 min)

Try these commands:

- **"Take a picture"** -> Camera should open
- **"What's your name?"** -> NoVo introduces herself
- **"Email me a summary"** -> NoVo asks for email/name

---

## Success Checklist

- [ ] Environment variables configured
- [ ] Dev server running
- [ ] Tools created in Hume dashboard
- [ ] Tools added to EVI config
- [ ] Tested "Take a picture" command
- [ ] Tested voice conversation

---

## Troubleshooting

### Tools not working?
- Check tool names match exactly (case-sensitive)
- Verify tools are added to your EVI config
- Restart dev server after env changes

### Camera not opening?
- Check browser has camera permission
- Verify `take_picture` tool is enabled
- Check browser console for errors

### Email not sending?
- Verify `RESEND_API_KEY` is set
- Check Resend dashboard for API key status
- Verify domain is verified in Resend

### Voice not connecting?
- Check `NEXT_PUBLIC_HUME_API_KEY` is correct
- Verify `NEXT_PUBLIC_HUME_CONFIG_ID` matches your config
- Check browser console for WebSocket errors

---

## Deployment

### Render

1. Push to GitHub
2. Connect repo to Render
3. Set environment variables in Render dashboard
4. Deploy

The included `render.yaml` configures:
- Production from `main` branch
- Staging from `develop` branch

### Environment Variables for Production

```
NEXT_PUBLIC_HUME_API_KEY=your_production_api_key
NEXT_PUBLIC_HUME_CONFIG_ID=your_evi_config_id
HUME_SECRET_KEY=your_secret_key
RESEND_API_KEY=your_resend_key
NODE_ENV=production
```

---

## Next Steps

1. **Customize the system prompt** - See `docs/SYSTEM_PROMPTS.txt`
2. **Add more tools** - See `docs/HUME_TOOLS_SETUP.md`
3. **Configure webhooks** - See `docs/FEATURE_IMPLEMENTATION.md`
4. **Add custom avatar sprites** - See main `README.md`

---

## Quick Links

- [Hume AI Platform](https://platform.hume.ai/)
- [Hume AI Docs](https://dev.hume.ai/docs)
- [Resend Dashboard](https://resend.com/)
- [Green API Docs](https://green-api.com/en/docs/)

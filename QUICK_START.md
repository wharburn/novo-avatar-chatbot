# 🚀 Quick Start: Add Translation & Tools to NoVo

## ⏱️ 10-Minute Setup

### Step 1: Configure Environment (2 min)

1. Open `.env.local` (or create it)
2. Add these variables:

```env
# Translation App URL
TRANSLATOR_APP_URL=https://your-translator-app.com

# Green API (for WhatsApp)
GREEN_API_INSTANCE_ID=your_instance_id
GREEN_API_TOKEN=your_token

# Hume AI (should already exist)
NEXT_PUBLIC_HUME_API_KEY=your_hume_key
HUME_SECRET_KEY=your_secret_key
```

3. Save and restart dev server: `npm run dev`

---

### Step 2: Create Tools in Hume Dashboard (5 min)

1. **Go to:** https://platform.hume.ai/
2. **Navigate to:** EVI → Tools
3. **Create 4 tools** using the exact values from `HUME_TOOL_CONFIG.md`:
   - `open_browser`
   - `open_translator`
   - `translate_text`
   - `send_whatsapp`

**💡 Tip:** Open `HUME_TOOL_CONFIG.md` and copy-paste each tool's configuration directly!

---

### Step 3: Add Tools to Your EVI Config (2 min)

1. **Navigate to:** EVI → Configs
2. **Select** your config (or create new)
3. **Click:** "Edit"
4. **In "Tools" section:** Click "Add Tool"
5. **Select all 4 tools** you just created
6. **Click:** "Save"

---

### Step 4: Test! (1 min)

Start your dev server if not running:
```bash
npm run dev
```

Open your chatbot and try:

- 🌐 **"Open Google"** → Should open Google.com
- 🔗 **"Open the translator"** → Should open your translation app
- 💬 **"Translate hello to Spanish"** → Should suggest opening translator
- 📱 **"Send WhatsApp to [number] saying hello"** → Should send message (if Green API configured)

---

## ✅ Success Checklist

- [ ] Environment variables configured
- [ ] Dev server restarted
- [ ] 4 tools created in Hume dashboard
- [ ] Tools added to EVI config
- [ ] Tested "Open Google" command
- [ ] Tested "Open translator" command
- [ ] Tested "Translate hello to Spanish" command

---

## 🆘 Troubleshooting

**Tools not working?**
- ✅ Check tool names match exactly (case-sensitive)
- ✅ Verify tools are added to your EVI config
- ✅ Restart dev server after env changes

**Translation app not opening?**
- ✅ Check `TRANSLATOR_APP_URL` in `.env.local`
- ✅ Make sure URL includes `https://`

**WhatsApp not sending?**
- ✅ Verify Green API credentials
- ✅ Check phone number format (no + symbol)
- ✅ Test Green API separately first

---

## 📚 Full Documentation

- **`HUME_TOOL_CONFIG.md`** - Copy-paste tool configurations
- **`TOOLS_SETUP.md`** - Detailed setup guide
- **`MCP_TRANSLATION_SETUP.md`** - Future MCP integration
- **`IMPLEMENTATION_SUMMARY.md`** - Complete overview

---

## 🎯 What You Get

✅ **Voice-controlled browser** - "Open any website"  
✅ **Translation app integration** - "Open the translator"  
✅ **Smart translation helper** - "Translate text for me"  
✅ **WhatsApp messaging** - "Send a WhatsApp message"  
✅ **Future-ready MCP** - Ready for advanced translation features

---

## 🎉 Next Steps

Once basic tools are working:

1. **Customize responses** in `app/api/tools/execute/route.ts`
2. **Add more tools** (calendar, email, etc.)
3. **Enable MCP translation** for in-chat translations
4. **Configure WhatsApp webhooks** for bidirectional chat

---

## 💡 Pro Tips

- **Test incrementally** - Add one tool at a time
- **Check browser console** - Helpful for debugging
- **Use descriptive tool descriptions** - Helps Hume AI understand when to use each tool
- **Keep fallback content friendly** - Users see this if tool fails

---

## 🔗 Quick Links

- [Hume AI Platform](https://platform.hume.ai/)
- [Hume AI Tools Docs](https://dev.hume.ai/docs/empathic-voice-interface-evi/tool-use)
- [Green API Docs](https://green-api.com/en/docs/)
- [MCP Documentation](https://modelcontextprotocol.io/)

---

**Ready to go? Start with Step 1! 🚀**


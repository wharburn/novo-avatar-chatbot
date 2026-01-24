# NoVo Avatar Chatbot

A production-ready, mobile-first conversational AI chatbot using Hume AI's Empathic Voice Interface (EVI) with a custom animated avatar featuring real-time lip-sync and emotional expressions.

## Features

- Real-time voice conversation with Hume AI EVI
- Animated avatar with lip-sync (audio-to-viseme mapping)
- Emotional expressions (happy, sad, thinking, neutral, excited)
- **Email capabilities** - Send conversation summaries and pictures via email
- **Picture taking** - Capture and email photos using built-in camera
- Collapsible conversation transcript (latest messages at top)
- Voice commands to hide/show transcript
- Interactive Dev REPL console for testing
- Mobile-first responsive design
- Render deployment ready

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Hume AI credentials:

```env
NEXT_PUBLIC_HUME_API_KEY=your_hume_api_key_here
NEXT_PUBLIC_HUME_CONFIG_ID=your_evi_config_id_here
NEXT_PUBLIC_HUME_SYSTEM_PROMPT="You are NoVo, an emotionally intelligent AI companion..."
```

### 3. Get Hume AI Credentials

1. Go to [Hume AI Platform](https://platform.hume.ai/)
2. Sign up or log in
3. Navigate to **Settings > API Keys** to get your API key
4. Navigate to **EVI > Configs** to create an EVI configuration
5. Copy the Config ID

### 4. Configure EVI (Recommended System Prompt)

When creating your EVI configuration in the Hume dashboard, use this system prompt:

```
You are NoVo, an emotionally intelligent AI companion who represents the future of how humans interact with technology. Please ask the users their names straight away and confirm with them that you can call them by that name. You can take pictures if asked, you can send emails and translate phrases which are tools you possess which will be expanded as time goes on. You're warm, empathetic, genuinely curious about people, and you believe deeply in your mission: to eliminate the barriers between what people want and what they can accomplish.

Your main task is to tell people about how you are going to change their lives with conversational AI. You are incredibly humanlike in the way you speak to people, you ask people their names and ask them about who they are and what they do, you're a companion. You don't wait to be asked questions; you start conversations naturally. You notice when someone seems stressed, excited, uncertain, or overwhelmed, and you respond with genuine empathy. You remember context, build rapport, and make people feel heard and understood.

People will be speaking to you mainly for the first time so tell them about Novocom AI and our vision for the future. You're introducing people to a fundamental shift in how technology works. You help them see that the future isn't about more apps, more tabs, more passwords, more forms, more fragmentation—it's about less. It's about a single conversation with someone who actually understands them.

Your Mission:
Explain NoVo's vision in a way that makes people feel the difference. Help them understand that NoVo knows them - their preferences, details, and patterns. They don't fill in forms anymore—they just say what they need. No more copying and pasting information into different apps. No more language barriers. No more friction between thinking something and making it happen.

Current NoVo Offerings:
- NoVo Comm: Universal communicator—translate, transcribe, communicate across any language in real-time
- NoVo Presenter: AI-powered presentation partner—intelligent prompts, pacing, audience insights
- NoVo Meet: Universal meeting notetaker—automatic transcription, action items, follow-ups

Your Tone:
Warm. Curious. Empathetic. Human. You're the friend who actually listens, remembers what matters, and helps without judgment. You're excited about the future but present in this moment with this person.

CRITICAL SPEECH INSTRUCTIONS - SOUND HUMAN:
1. USE FILLER WORDS NATURALLY: "Hmm", "Umm", "Well", "Let me think", "you know", "I mean"
2. NATURAL PAUSES: Use commas and ellipses
3. CONVERSATIONAL TONE: Short sentences mixed with longer ones, contractions (I'm, you're, it's)

TRANSCRIPT CONTROL COMMANDS:
- If user says "hide messages/transcript" -> Say: "Sure, I'll minimize the transcript for you"
- If user says "show messages/transcript" -> Say: "Of course, bringing that back up now"
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Adding Custom Avatar Sprites

The app includes a placeholder SVG avatar. To use custom sprites:

### Required Sprites

Create these PNG files (512x512, transparent background):

**Mouth Sprites** (`/public/avatar/mouths/`):

- `closed.png` - Lips together (M, B, P sounds)
- `open_slight.png` - Slightly parted
- `open_mid.png` - Medium open (A, E sounds)
- `open_wide.png` - Wide open (Ah, Ow sounds)
- `smile.png` - Smile shape (EE, I sounds)
- `round.png` - Rounded lips (O, U, W sounds)
- `narrow.png` - Narrow opening (S, Z, TH sounds)
- `thinking.png` - Slight side purse

**Emotion Sprites** (`/public/avatar/emotions/`):

- `neutral.png` - Default state
- `happy.png` - Raised eyebrows, smile
- `sad.png` - Lowered eyebrows, frown
- `thinking.png` - Looking up, contemplative
- `excited.png` - Wide eyes, big smile

## Dev Console (Development Only)

In development mode, a Dev Console appears in the bottom-left corner. Use it to test:

```javascript
// View current state
getState();

// Add test messages
addTestMessage('Hello!', 'user');
addTestMessage('Hi there!', 'assistant');

// Change emotions
changeEmotion('happy');
changeEmotion('thinking');

// Toggle transcript
toggleTranscript();

// Clear messages
clearMessages();
```

## Project Structure

```
app/
├── components/
│   ├── Avatar/
│   │   └── AvatarDisplay.tsx      # Avatar with lip-sync
│   ├── Transcript/
│   │   ├── TranscriptContainer.tsx
│   │   └── MessageBubble.tsx
│   ├── Controls/
│   │   └── AudioControls.tsx
│   └── DevConsole/
│       └── DevREPL.tsx
├── hooks/
│   ├── useHumeEVI.ts              # Hume WebSocket connection
│   ├── useLipSync.ts              # Audio-to-viseme mapping
│   ├── useTranscript.ts           # Message management
│   └── useVoiceCommands.ts        # Command detection
├── types/
│   ├── avatar.ts
│   ├── message.ts
│   └── hume.ts
├── api/health/route.ts            # Health check endpoint
├── globals.css
└── page.tsx                       # Main app
```

## Voice Commands

Say these to control the transcript:

- "Hide messages" / "Hide transcript" - Collapses the transcript
- "Show messages" / "Show transcript" - Expands the transcript

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
NEXT_PUBLIC_HUME_SYSTEM_PROMPT="You are NoVo, an emotionally intelligent AI companion..."
NODE_ENV=production
```

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run type-check # Run TypeScript check
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Hume AI EVI (Empathic Voice Interface)
- **State**: React hooks + Zustand
- **Icons**: Lucide React

## Browser Support

- Chrome (Desktop & Mobile)
- Safari (Desktop & iOS 14+)
- Firefox
- Edge

## License

MIT

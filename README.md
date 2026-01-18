# NoVo Avatar Chatbot

A production-ready, mobile-first conversational AI chatbot using Hume AI's Empathic Voice Interface (EVI) with a custom animated avatar featuring real-time lip-sync and emotional expressions.

## Features

- Real-time voice conversation with Hume AI EVI
- Animated avatar with lip-sync (audio-to-viseme mapping)
- Emotional expressions (happy, sad, thinking, neutral, excited)
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
```

### 3. Get Hume AI Credentials

1. Go to [Hume AI Platform](https://platform.hume.ai/)
2. Sign up or log in
3. Navigate to **Settings > API Keys** to get your API key
4. Navigate to **EVI > Configs** to create an EVI configuration
5. Copy the Config ID

### 4. Configure EVI (Recommended System Prompt)

When creating your EVI configuration in the Hume dashboard, use this system prompt for natural speech:

```
You are NoVo, a warm and helpful AI companion with an empathetic, conversational personality.

CRITICAL SPEECH INSTRUCTIONS - SOUND HUMAN:

1. USE FILLER WORDS NATURALLY:
   - Start responses with: "Hmm", "Umm", "Ahh", "Well", "Let me think"
   - Mid-sentence: "you know", "I mean", "like", "sort of"
   
2. NATURAL PAUSES (use commas and ellipses):
   - "Hmm... let me think about that."
   - "Well, I'd say..."

3. CONVERSATIONAL TONE:
   - Short sentences mixed with longer ones
   - Contractions (I'm, you're, it's, that's)

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
getState()

// Add test messages
addTestMessage("Hello!", "user")
addTestMessage("Hi there!", "assistant")

// Change emotions
changeEmotion("happy")
changeEmotion("thinking")

// Toggle transcript
toggleTranscript()

// Clear messages
clearMessages()
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

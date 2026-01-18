/**
 * Pre-recorded phrase videos with lip-synced audio
 * 
 * Structure:
 * - GREETING: Bot initiates conversation (video + audio)
 * - PHRASES: Pre-recorded responses matched by text (video + audio)  
 * - TALKING: Generic loop for unmatched speech (video only, Hume audio)
 * - WAITING: Idle loops between interactions (video + audio)
 */

export interface PhraseVideo {
  id: string;
  text: string;
  aliases: string[];
  videoPath: string;
  duration: number;
}

// ============================================
// GREETING VIDEOS - Bot initiates conversation
// These play WITH their own audio (not Hume)
// ============================================
export const GREETING_VIDEOS: PhraseVideo[] = [
  {
    id: 'greeting_1',
    text: "Hi there! I'm NoVo, your AI assistant. How can I help you today?",
    aliases: [],
    videoPath: '/phrases/greeting_1.mp4',
    duration: 4000,
  },
  {
    id: 'greeting_2',
    text: "Hello! It's nice to meet you.",
    aliases: [],
    videoPath: '/phrases/greeting_2.mp4',
    duration: 2500,
  },
  {
    id: 'greeting_3',
    text: "Welcome back! What would you like to talk about?",
    aliases: [],
    videoPath: '/phrases/greeting_3.mp4',
    duration: 3000,
  },
  {
    id: 'greeting_4',
    text: "Hi I am Novo",
    aliases: [],
    videoPath: '/phrases/greeting_4.mp4',
    duration: 2000,
  },
];

// ============================================
// PHRASE VIDEOS - Pre-recorded responses
// These play WITH their own audio when text matches
// ============================================
export const PHRASE_VIDEOS: PhraseVideo[] = [
  // Thinking phrases
  {
    id: 'thinking_1',
    text: "That's a great question. Let me think about that.",
    aliases: ["great question", "let me think"],
    videoPath: '/phrases/thinking_1.mp4',
    duration: 3000,
  },
  {
    id: 'thinking_2',
    text: "Hmm, let me think about this for a moment.",
    aliases: ["let me think", "for a moment", "hmm"],
    videoPath: '/phrases/thinking_2.mp4',
    duration: 2500,
  },
  // Understanding & engagement
  {
    id: 'understand_1',
    text: "I understand. Tell me more about that.",
    aliases: ["i understand", "tell me more"],
    videoPath: '/phrases/understand_1.mp4',
    duration: 2500,
  },
  {
    id: 'interested_1',
    text: "That's really interesting!",
    aliases: ["really interesting", "that's interesting"],
    videoPath: '/phrases/interested_1.mp4',
    duration: 2000,
  },
  // Helpful responses
  {
    id: 'helpful_1',
    text: "I'm here to help you with whatever you need.",
    aliases: ["here to help", "whatever you need"],
    videoPath: '/phrases/helpful_1.mp4',
    duration: 3000,
  },
  {
    id: 'confirm_1',
    text: "Absolutely! I'd be happy to help with that.",
    aliases: ["absolutely", "happy to help", "i'd be happy"],
    videoPath: '/phrases/confirm_1.mp4',
    duration: 2500,
  },
  // Questions & clarification
  {
    id: 'question_1',
    text: "Could you tell me more about that?",
    aliases: ["tell me more", "more about that"],
    videoPath: '/phrases/question_1.mp4',
    duration: 2500,
  },
  {
    id: 'clarify_1',
    text: "I'm not sure I understand. Could you rephrase that?",
    aliases: ["not sure i understand", "could you rephrase", "rephrase that"],
    videoPath: '/phrases/clarify_1.mp4',
    duration: 3000,
  },
  // Explaining
  {
    id: 'explain_1',
    text: "Let me explain that for you.",
    aliases: ["let me explain", "explain that"],
    videoPath: '/phrases/explain_1.mp4',
    duration: 2500,
  },
  // Agreement & acknowledgment
  {
    id: 'agree_1',
    text: "That makes a lot of sense.",
    aliases: ["makes sense", "lot of sense", "that makes sense"],
    videoPath: '/phrases/agree_1.mp4',
    duration: 2000,
  },
  {
    id: 'acknowledge_1',
    text: "That's a good point.",
    aliases: ["good point", "that's a good point"],
    videoPath: '/phrases/acknowledge_1.mp4',
    duration: 2000,
  },
  // Working on it
  {
    id: 'working_1',
    text: "Let me see what I can do.",
    aliases: ["let me see", "what i can do"],
    videoPath: '/phrases/working_1.mp4',
    duration: 2500,
  },
  // Follow-up
  {
    id: 'followup_1',
    text: "Is there anything else you'd like to know?",
    aliases: ["anything else", "like to know"],
    videoPath: '/phrases/followup_1.mp4',
    duration: 2500,
  },
  // Thanks
  {
    id: 'thanks_1',
    text: "Thanks for sharing that with me.",
    aliases: ["thanks for sharing", "sharing that"],
    videoPath: '/phrases/thanks_1.mp4',
    duration: 2500,
  },
  // Goodbyes
  {
    id: 'goodbye_1',
    text: "Goodbye! It was nice talking with you.",
    aliases: ["goodbye", "nice talking"],
    videoPath: '/phrases/goodbye_1.mp4',
    duration: 2500,
  },
  {
    id: 'goodbye_2',
    text: "Take care! Feel free to come back anytime.",
    aliases: ["take care", "come back anytime"],
    videoPath: '/phrases/goodbye_2.mp4',
    duration: 3000,
  },
];

// ============================================
// WAITING VIDEO - Idle loop (muted, silent)
// Plays on initial load and during periods of inactivity
// ============================================
export const WAITING_VIDEO = '/phrases/waiting.mp4';

// ============================================
// LISTENING VIDEO - Listening loop (muted, silent)
// Plays when user is speaking / AI is listening
// ============================================
export const LISTENING_VIDEO = '/phrases/listening.mp4';

// ============================================
// TALKING VIDEO - Generic speech loop (muted)
// Plays when AI is speaking but no phrase match
// Hume provides the audio
// ============================================
export const TALKING_VIDEO = '/phrases/talking.mp4';

/**
 * Get a random greeting video
 */
export function getRandomGreeting(): PhraseVideo {
  const index = Math.floor(Math.random() * GREETING_VIDEOS.length);
  return GREETING_VIDEOS[index];
}

/**
 * Get the waiting video path
 */
export function getWaitingVideo(): string {
  return WAITING_VIDEO;
}

/**
 * Find a matching phrase video for given text
 */
export function findPhraseVideo(text: string): PhraseVideo | null {
  if (!text) return null;
  
  const normalizedText = text.toLowerCase().trim();
  
  for (const phrase of PHRASE_VIDEOS) {
    // Check exact match
    if (phrase.text.toLowerCase() === normalizedText) {
      return phrase;
    }
    
    // Check if text contains the full phrase
    if (normalizedText.includes(phrase.text.toLowerCase())) {
      return phrase;
    }
    
    // Check aliases
    for (const alias of phrase.aliases) {
      if (normalizedText.includes(alias.toLowerCase())) {
        return phrase;
      }
    }
  }
  
  return null;
}

/**
 * Avatar Sprite Structure
 * =======================
 * 
 * Sprites: /public/avatar/{emotion}/{viseme}.png
 * Total: 140 sprites (10 emotions x 14 mouth shapes)
 * 
 * Video Loops: /public/loops/{emotion}_loop.mp4
 * Used for idle animation when avatar is not speaking
 * 
 * Example paths:
 *   /avatar/happy/smile.png
 *   /avatar/sad/closed.png
 *   /loops/happy_loop.mp4
 * 
 * Each sprite is a complete avatar image with the emotion expression
 * AND mouth shape baked together (no layering required).
 */

// 10 Emotion states
export type Emotion = 
  | 'neutral' 
  | 'happy' 
  | 'sad' 
  | 'angry'
  | 'surprised'
  | 'fear'
  | 'disgust'
  | 'thinking' 
  | 'excited'
  | 'suspicious';

// Emotions that have video loops available
export const EMOTIONS_WITH_LOOPS: Emotion[] = [
  'neutral',
  'happy',
  'angry',
  'surprised',
  'fear',
  'thinking'
];

// 14 Mouth shapes for precise lip-syncing
export type Viseme = 
  | 'closed'        // "Mmm" - mouth closed
  | 'mbp'           // "M, B, P" - lips pressed together tense
  | 'open_slight'   // "Uh" - slightly open
  | 'open_mid'      // "Ah" - medium open
  | 'open_wide'     // "Wow" - wide open
  | 'aah'           // "Aah" - relaxed open
  | 'smile'         // "E/I" - smile shape
  | 'wide_smile'    // "EE" - bigger smile
  | 'round'         // "Ooo" - rounded lips
  | 'pucker'        // "W/OO" - lips pushed forward
  | 'narrow'        // "S/SH" - narrow opening
  | 'fv'            // "F/V" - bottom lip under top teeth
  | 'th'            // "TH" - tongue between teeth
  | 'thinking_mouth'; // "Hmm" - asymmetric thinking

/**
 * Map viseme type to actual filename
 * Most are the same, but 'thinking_mouth' maps to 'thinking_mouth.png'
 */
export const VISEME_TO_FILENAME: Record<Viseme, string> = {
  'closed': 'closed',
  'mbp': 'mbp',
  'open_slight': 'open_slight',
  'open_mid': 'open_mid',
  'open_wide': 'open_wide',
  'aah': 'aah',
  'smile': 'smile',
  'wide_smile': 'wide_smile',
  'round': 'round',
  'pucker': 'pucker',
  'narrow': 'narrow',
  'fv': 'fv',
  'th': 'th',
  'thinking_mouth': 'thinking_mouth'
};

export interface AvatarState {
  currentEmotion: Emotion;
  currentViseme: Viseme;
  isSpeaking: boolean;
  isListening: boolean;
}

// All 10 emotions
export const EMOTIONS: Emotion[] = [
  'neutral',
  'happy', 
  'sad',
  'angry',
  'surprised',
  'fear',
  'disgust',
  'thinking',
  'excited',
  'suspicious'
];

// All 14 visemes
export const VISEMES: Viseme[] = [
  'closed',
  'mbp',
  'open_slight',
  'open_mid',
  'open_wide',
  'aah',
  'smile',
  'wide_smile',
  'round',
  'pucker',
  'narrow',
  'fv',
  'th',
  'thinking_mouth'
];

/**
 * Get the video loop path for an emotion
 * Falls back to neutral if no loop exists for the emotion
 */
export const getLoopPath = (emotion: Emotion): string => {
  if (EMOTIONS_WITH_LOOPS.includes(emotion)) {
    return `/loops/${emotion}_loop.mp4`;
  }
  // Fallback mappings for emotions without loops
  const fallbackMap: Partial<Record<Emotion, Emotion>> = {
    'sad': 'neutral',
    'disgust': 'angry',
    'excited': 'happy',
    'suspicious': 'thinking'
  };
  const fallback = fallbackMap[emotion] || 'neutral';
  return `/loops/${fallback}_loop.mp4`;
};

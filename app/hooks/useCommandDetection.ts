'use client';

import { useCallback, useRef } from 'react';

// Command types that can be detected
export type CommandType =
  | 'enable_camera' // "turn on camera", "show you something", "see my clothes"
  | 'vision_request' // "what am I wearing?", "do I look good?"
  | 'fashion_analysis' // "analyze my outfit", "what do you think of my clothes?"
  | 'show_boxes' // "show me the boxes", "display bounding boxes"
  | 'hide_boxes' // "hide the boxes", "remove bounding boxes"
  | 'take_picture' // "take a picture", "take a photo"
  | 'photo_session' // "take a series of photos", "photo shoot"
  | 'end_photo_session' // "that's it", "I'm finished", "done with photos"
  | 'explain_photo_session' // "tell me about photo session", "how does it work"
  | 'send_email_picture' // "email me the picture", "send the photo"
  | 'send_email_summary' // "email me a summary", "send conversation recap"
  | null;

// Patterns for detecting commands in user speech
const COMMAND_PATTERNS: Record<Exclude<CommandType, null>, RegExp[]> = {
  enable_camera: [
    /turn\s*(on|the)\s*(camera|vision)/i,
    /(enable|activate|start)\s*(the\s*)?(camera|vision)/i,
    /(show|let\s*me\s*show)\s*you\s*something/i,
    /want\s*to\s*show\s*you/i,
    /see\s*my\s*(clothes|outfit|look)/i,
    /look\s*at\s*(my|this)/i,
    /record\s*something/i,
    /can\s*you\s*(see|watch|observe)\s*me/i,
    /i\s*want\s*you\s*to\s*see/i,
    /check\s*out\s*(my|this)/i,
  ],
  vision_request: [
    /what\s*(am\s*i|are\s*you\s*seeing|do\s*you\s*see|can\s*you\s*see)/i,
    /what('?m|\s*am)\s*i\s*wearing/i,
    /describe\s*(my|what\s*i('?m|\s*am)\s*wearing|my\s*outfit|my\s*clothes|what\s*you\s*see)/i,
    /do\s*i\s*look\s*(good|nice|okay|ok|alright|great|bad)/i,
    /how\s*do\s*i\s*look/i,
    /can\s*you\s*see\s*(me|what\s*i)/i,
    /look\s*at\s*me/i,
    /what\s*color\s*(is|are)\s*(my|the)/i,
    /what\s*do\s*you\s*think\?/i, // Generic "what do you think?" when camera is on
    /what('?s|\s*is)\s*your\s*opinion/i, // "what's your opinion?"
    /your\s*opinion/i, // "your opinion"
    /does\s*this\s*(look|suit|fit)/i,
    /see\s*what\s*i('?m|\s*am)\s*wearing/i,
    /tell\s*me\s*(about|what)\s*(my|you\s*see|you('?re|\s*are)\s*seeing)/i,
    /what\s*(are|do)\s*you\s*see/i,
  ],
  fashion_analysis: [
    /analyze\s*(my\s*)?(outfit|look|clothes|fashion|style)/i,
    /give\s*me\s*(some\s*)?(fashion|style)\s*advice/i,
    /what\s*do\s*you\s*think\s*(of|about)\s*(my|this|the)\s*(outfit|look|style|clothes|t[\s-]?shirt|shirt|wearing)/i,
    /how\s*do\s*these\s*clothes\s*look/i,
    /rate\s*my\s*(outfit|look|style)/i,
    /critique\s*my\s*(outfit|look|style|clothes)/i,
    /what\s*would\s*you\s*change\s*about\s*my\s*(outfit|look|style)/i,
    /do\s*you\s*like\s*my\s*(outfit|look|style|clothes)/i,
  ],
  take_picture: [
    /^shoot$/i, // Quick "shoot" command when camera is on
    /^shot$/i, // Alternative
    /^snap$/i, // Quick snap
    /take\s*(a\s*)?(picture|photo|pic|selfie|shot|image)/i,
    /snap\s*(a\s*)?(picture|photo|pic)/i,
    /capture\s*(a\s*)?(picture|photo|image|me)/i,
    /photograph\s*(me)?/i,
    /get\s*(a\s*)?(picture|photo|shot)/i,
  ],
  photo_session: [
    /take\s*(a\s*)?(series|bunch|set)\s*of\s*(pictures|photos|pics|shots)/i,
    /photo\s*(shoot|session)/i,
    /multiple\s*(pictures|photos|shots)/i,
    /several\s*(pictures|photos|shots)/i,
    /want\s*you\s*to\s*take\s*(some|multiple|several)\s*(pictures|photos)/i,
  ],
  end_photo_session: [
    /that('?s|\s*is)\s*(it|all|enough)/i,
    /i('?m|\s*am)\s*(done|finished)/i,
    /^done$/i,
    /^finished$/i,
    /no\s*more\s*(pictures|photos|shots)/i,
    /that('?s|\s*is)\s*all\s*(i\s*need|we\s*need)/i,
  ],
  explain_photo_session: [
    /tell\s*me\s*about\s*photo\s*session/i,
    /how\s*does\s*(photo\s*session|it)\s*work/i,
    /what('?s|\s*is)\s*photo\s*session/i,
    /explain\s*photo\s*session/i,
    /tell\s*me\s*(more\s*)?(about\s*)?(photo|session|mode)/i, // More specific "tell me" pattern
    /^yes$/i, // When AI asks "do you want to know about photo session mode?"
    /^yeah$/i,
    /^sure$/i,
    /^okay$/i,
    /^ok$/i,
  ],
  send_email_picture: [
    /email\s*(me\s*)?(the\s*)?(picture|photo|pic|image)/i,
    /send\s*(me\s*)?(the\s*)?(picture|photo|pic|image)\s*(to\s*my\s*)?email/i,
    /send\s*(the\s*)?(picture|photo|pic|image)\s*to/i,
    /email\s*(it|that|this)\s*to\s*me/i,
    /send\s*(it|that|this)\s*to\s*my\s*email/i,
    /mail\s*(me\s*)?(the\s*)?(picture|photo)/i,
  ],
  send_email_summary: [
    /email\s*(me\s*)?(a\s*)?(summary|recap|conversation)/i,
    /send\s*(me\s*)?(a\s*)?(summary|recap)\s*(of\s*)?(our\s*)?(conversation|chat)?/i,
    /send\s*(the\s*)?conversation\s*(summary)?\s*to\s*(my\s*)?email/i,
    /email\s*(me\s*)?what\s*we\s*(talked|spoke)\s*about/i,
    /send\s*(me\s*)?(an\s*)?email\s*(with\s*)?(the\s*)?(summary|recap)/i,
  ],
  show_boxes: [
    /show\s*(me\s*)?(the\s*)?(bounding\s*)?boxes/i,
    /display\s*(the\s*)?(bounding\s*)?boxes/i,
    /turn\s*on\s*(the\s*)?(bounding\s*)?boxes/i,
    /enable\s*(the\s*)?(bounding\s*)?boxes/i,
    /show\s*(me\s*)?what\s*you\s*see/i,
    /visualize\s*(the\s*)?(bounding\s*)?boxes/i,
  ],
  hide_boxes: [
    /hide\s*(the\s*)?(bounding\s*)?boxes/i,
    /remove\s*(the\s*)?(bounding\s*)?boxes/i,
    /turn\s*off\s*(the\s*)?(bounding\s*)?boxes/i,
    /disable\s*(the\s*)?(bounding\s*)?boxes/i,
    /don't\s*show\s*(me\s*)?(the\s*)?(bounding\s*)?boxes/i,
    /stop\s*showing\s*(the\s*)?(bounding\s*)?boxes/i,
  ],
};

// Additional context hints that strengthen detection
const CONTEXT_HINTS: Record<Exclude<CommandType, null>, string[]> = {
  enable_camera: ['camera', 'vision', 'show', 'see', 'look', 'watch', 'record', 'observe'],
  vision_request: [
    'outfit',
    'wearing',
    'clothes',
    'fashion',
    'style',
    'look',
    'see me',
    'appearance',
  ],
  take_picture: ['picture', 'photo', 'selfie', 'camera', 'capture', 'snap', 'shoot', 'shot'],
  photo_session: ['photo', 'picture', 'series', 'multiple', 'shoot', 'session'],
  end_photo_session: ['done', 'finished', 'enough', 'all', 'stop'],
  explain_photo_session: ['photo', 'session', 'mode', 'how', 'work', 'explain'],
  send_email_picture: ['email', 'send', 'picture', 'photo'],
  send_email_summary: ['email', 'summary', 'recap', 'conversation'],
  fashion_analysis: ['fashion', 'style', 'outfit', 'clothes', 'analyze', 'advice'],
  show_boxes: ['show', 'boxes', 'display', 'bounding', 'visualize', 'see'],
  hide_boxes: ['hide', 'boxes', 'remove', 'bounding', 'disable', 'stop'],
};

export interface DetectedCommand {
  type: CommandType;
  confidence: number; // 0-1
  originalText: string;
  extractedData?: {
    email?: string;
    name?: string;
  };
}

export function useCommandDetection() {
  // Track recent messages to avoid duplicate detections
  const recentDetectionsRef = useRef<Set<string>>(new Set());
  const lastDetectionTimeRef = useRef<number>(0);

  // Detect command from user message
  const detectCommand = useCallback((text: string): DetectedCommand | null => {
    if (!text || text.length < 3) return null;

    const lowerText = text.toLowerCase().trim();

    // Debounce - don't detect same message twice within 2 seconds
    const now = Date.now();
    if (recentDetectionsRef.current.has(lowerText) && now - lastDetectionTimeRef.current < 2000) {
      return null;
    }

    // Check each command type
    for (const [commandType, patterns] of Object.entries(COMMAND_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerText)) {
          // Calculate confidence based on pattern match and context hints
          let confidence = 0.7; // Base confidence for pattern match

          const hints = CONTEXT_HINTS[commandType as Exclude<CommandType, null>];
          const hintMatches = hints.filter((hint) => lowerText.includes(hint)).length;
          confidence += (hintMatches / hints.length) * 0.3;

          // Extract email if present
          const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);

          // Track this detection
          recentDetectionsRef.current.add(lowerText);
          lastDetectionTimeRef.current = now;

          // Clean up old detections after 5 seconds
          setTimeout(() => {
            recentDetectionsRef.current.delete(lowerText);
          }, 5000);

          console.log(
            `🎯 Command detected: ${commandType} (confidence: ${(confidence * 100).toFixed(0)}%)`
          );

          return {
            type: commandType as CommandType,
            confidence: Math.min(confidence, 1),
            originalText: text,
            extractedData: emailMatch ? { email: emailMatch[0] } : undefined,
          };
        }
      }
    }

    return null;
  }, []);

  // Clear detection history (useful when conversation resets)
  const clearHistory = useCallback(() => {
    recentDetectionsRef.current.clear();
  }, []);

  return {
    detectCommand,
    clearHistory,
  };
}

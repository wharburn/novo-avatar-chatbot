'use client';

import { useCallback, useRef } from 'react';

// Command types that can be detected
export type CommandType =
  | 'enable_camera' // "turn on camera", "show you something", "see my clothes"
  | 'vision_request' // "what am I wearing?", "do I look good?"
  | 'take_picture' // "take a picture", "take a photo"
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
    /give\s*me\s*(some\s*)?(fashion|style)\s*advice/i,
    /what\s*do\s*you\s*think\s*(of|about)\s*(my|this|the)\s*(outfit|look|style|clothes)/i,
    /does\s*this\s*(look|suit|fit)/i,
    /see\s*what\s*i('?m|\s*am)\s*wearing/i,
    /tell\s*me\s*(about|what)\s*(my|you\s*see|you('?re|\s*are)\s*seeing)/i,
    /analyze\s*(what\s*you\s*see|my\s*outfit|my\s*look)/i,
    /what\s*(are|do)\s*you\s*see/i,
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
  send_email_picture: ['email', 'send', 'picture', 'photo'],
  send_email_summary: ['email', 'summary', 'recap', 'conversation'],
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

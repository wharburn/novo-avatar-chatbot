'use client';

const TRANSCRIPT_COMMANDS = {
  HIDE: [
    'hide messages',
    'hide the messages',
    'close messages',
    'close the messages',
    'fold away messages',
    'minimize messages',
    'hide chat',
    'hide transcript',
    'close transcript',
    'hide the transcript',
    'close the transcript'
  ],
  SHOW: [
    'show messages',
    'show the messages',
    'open messages',
    'expand messages',
    'show chat',
    'show transcript',
    'bring back messages',
    'show the transcript',
    'open the transcript',
    'open transcript'
  ]
};

export type VoiceCommand = 'hide' | 'show' | null;

export function useVoiceCommands() {
  const detectCommand = (text: string): VoiceCommand => {
    const lowerText = text.toLowerCase().trim();
    
    if (TRANSCRIPT_COMMANDS.HIDE.some(cmd => lowerText.includes(cmd))) {
      return 'hide';
    }
    
    if (TRANSCRIPT_COMMANDS.SHOW.some(cmd => lowerText.includes(cmd))) {
      return 'show';
    }
    
    return null;
  };

  const isTranscriptCommand = (text: string): boolean => {
    return detectCommand(text) !== null;
  };

  return { 
    detectCommand,
    isTranscriptCommand
  };
}

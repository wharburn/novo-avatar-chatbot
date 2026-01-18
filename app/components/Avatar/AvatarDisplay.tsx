'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { 
  getRandomGreeting, 
  findPhraseVideo,
  TALKING_VIDEO,
  WAITING_VIDEO,
  LISTENING_VIDEO,
  PhraseVideo 
} from '@/app/types/phrases';

interface AvatarDisplayProps {
  isSpeaking: boolean;
  isListening: boolean;
  /** Callback when greeting video finishes */
  onGreetingComplete?: () => void;
  /** Current text being spoken (for phrase video matching) */
  spokenText?: string;
}

/**
 * Simplified Avatar Display
 * 
 * States:
 * 1. GREETING - Playing greeting video with audio (bot initiates)
 * 2. PHRASE - Playing matched phrase video with audio
 * 3. TALKING - Playing talking loop (muted), Hume provides audio
 * 4. LISTENING - Playing listening loop (muted), user is speaking
 * 5. WAITING - Playing waiting loop (muted), initial state & inactivity
 */
type DisplayMode = 'greeting' | 'phrase' | 'talking' | 'listening' | 'waiting';

export default function AvatarDisplay({
  isSpeaking,
  isListening,
  onGreetingComplete,
  spokenText = '',
}: AvatarDisplayProps) {
  // Current display mode
  const [mode, setMode] = useState<DisplayMode>('waiting');
  
  // Video sources
  const [greetingVideo, setGreetingVideo] = useState<PhraseVideo | null>(null);
  const [phraseVideo, setPhraseVideo] = useState<PhraseVideo | null>(null);
  // Waiting video is now a single file, no need for state
  
  // Refs
  const greetingVideoRef = useRef<HTMLVideoElement>(null);
  const phraseVideoRef = useRef<HTMLVideoElement>(null);
  const talkingVideoRef = useRef<HTMLVideoElement>(null);
  const waitingVideoRef = useRef<HTMLVideoElement>(null);
  
  // Track if initial greeting has been played
  const hasPlayedGreeting = useRef(false);
  const lastSpokenText = useRef('');

  // Color correction filter for videos
  const videoFilter = 'saturate(0.8) sepia(0.1) hue-rotate(-5deg)';
  
  // Talking video needs 25% more saturation to match other videos
  const talkingVideoFilter = 'saturate(1.0) sepia(0.1) hue-rotate(-5deg)';

  // Play initial greeting when component mounts
  useEffect(() => {
    if (!hasPlayedGreeting.current) {
      hasPlayedGreeting.current = true;
      const greeting = getRandomGreeting();
      console.log(`🎬 Playing greeting: ${greeting.id}`);
      setGreetingVideo(greeting);
      setMode('greeting');
    }
  }, []);

  // Handle greeting video end
  const handleGreetingEnded = () => {
    console.log(`🎬 Greeting ended`);
    setGreetingVideo(null);
    setMode('waiting');
    onGreetingComplete?.();
  };

  // Handle phrase video end
  const handlePhraseEnded = () => {
    console.log(`🎬 Phrase video ended`);
    setPhraseVideo(null);
    // Go back to talking if still speaking, otherwise waiting
    if (isSpeaking) {
      setMode('talking');
    } else {
      setMode('waiting');
    }
  };

  // Handle waiting video end - loop it
  const handleWaitingEnded = () => {
    // Video will loop automatically, but we can log for debugging
    console.log(`🎬 Waiting video ended, looping`);
  };

  // Check for phrase match when spoken text changes
  useEffect(() => {
    if (!spokenText || spokenText === lastSpokenText.current) return;
    if (mode === 'greeting') return; // Don't interrupt greeting
    
    lastSpokenText.current = spokenText;
    
    const matched = findPhraseVideo(spokenText);
    if (matched) {
      console.log(`🎬 Phrase match: ${matched.id}`);
      setPhraseVideo(matched);
      setMode('phrase');
    }
  }, [spokenText, mode]);

  // Switch between talking, listening, and waiting based on state
  useEffect(() => {
    if (mode === 'greeting' || mode === 'phrase') return; // Don't interrupt these
    
    if (isSpeaking) {
      console.log(`🎬 Speaking - showing talking video`);
      setMode('talking');
    } else if (isListening) {
      console.log(`🎬 Listening - showing listening video`);
      setMode('listening');
      lastSpokenText.current = ''; // Reset for next speech
    } else {
      console.log(`🎬 Idle - showing waiting video`);
      setMode('waiting');
      lastSpokenText.current = ''; // Reset for next speech
    }
  }, [isSpeaking, isListening, mode]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-blue-100 to-blue-50">
      <div className="relative w-full max-w-md aspect-square overflow-hidden">
        
        {/* GREETING VIDEO - with audio */}
        {mode === 'greeting' && greetingVideo && (
          <video
            ref={greetingVideoRef}
            key={greetingVideo.id}
            src={greetingVideo.videoPath}
            className="w-full h-full object-cover"
            style={{ filter: videoFilter }}
            autoPlay
            playsInline
            onEnded={handleGreetingEnded}
            onError={() => {
              console.error(`🎬 Greeting video error: ${greetingVideo.videoPath}`);
              handleGreetingEnded();
            }}
          />
        )}

        {/* PHRASE VIDEO - with audio */}
        {mode === 'phrase' && phraseVideo && (
          <video
            ref={phraseVideoRef}
            key={phraseVideo.id}
            src={phraseVideo.videoPath}
            className="w-full h-full object-cover"
            style={{ filter: videoFilter }}
            autoPlay
            playsInline
            onEnded={handlePhraseEnded}
            onError={() => {
              console.error(`🎬 Phrase video error: ${phraseVideo.videoPath}`);
              handlePhraseEnded();
            }}
          />
        )}

        {/* TALKING VIDEO - muted loop, Hume provides audio */}
        {mode === 'talking' && (
          <video
            ref={talkingVideoRef}
            src={TALKING_VIDEO}
            className="w-full h-full object-cover"
            style={{ filter: talkingVideoFilter }}
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        {/* LISTENING VIDEO - muted loop, user is speaking */}
        {mode === 'listening' && (
          <video
            src={LISTENING_VIDEO}
            className="w-full h-full object-cover"
            style={{ filter: videoFilter }}
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        {/* WAITING VIDEO - muted loop, initial state & inactivity */}
        {mode === 'waiting' && (
          <video
            ref={waitingVideoRef}
            src={WAITING_VIDEO}
            className="w-full h-full object-cover"
            style={{ filter: videoFilter }}
            autoPlay
            loop
            muted
            playsInline
          />
        )}

        {/* Status indicator */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          {isSpeaking && (
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse">
              Speaking
            </div>
          )}
          {isListening && !isSpeaking && (
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse">
              Listening
            </div>
          )}
        </div>

        {/* Debug mode indicator */}
        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
          {mode}
        </div>
      </div>
    </div>
  );
}

'use client';

import {
  findPhraseVideo,
  LISTENING_VIDEO,
  PhraseVideo,
  TALKING_VIDEO,
  WAITING_VIDEO,
} from '@/app/types/phrases';
import { useEffect, useRef, useState } from 'react';

interface AvatarDisplayProps {
  isSpeaking: boolean;
  isListening: boolean;
  /** Callback when greeting video finishes */
  onGreetingComplete?: () => void;
  /** Current text being spoken (for phrase video matching) */
  spokenText?: string;
  /** Microphone volume level (0-1) for volume indicator */
  micVolume?: number;
  /** Whether Hume is connected - greeting only plays when connected */
  isConnected?: boolean;
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
  micVolume = 0,
  isConnected = false,
}: AvatarDisplayProps) {
  // Current display mode
  const [mode, setMode] = useState<DisplayMode>('waiting');

  // Video sources
  const [greetingVideo, setGreetingVideo] = useState<PhraseVideo | null>(null);
  const [phraseVideo, setPhraseVideo] = useState<PhraseVideo | null>(null);

  // Track video ready states
  const [videosReady, setVideosReady] = useState({
    waiting: false,
    listening: false,
    talking: false,
  });

  // Refs
  const greetingVideoRef = useRef<HTMLVideoElement>(null);
  const phraseVideoRef = useRef<HTMLVideoElement>(null);
  const talkingVideoRef = useRef<HTMLVideoElement>(null);
  const waitingVideoRef = useRef<HTMLVideoElement>(null);
  const listeningVideoRef = useRef<HTMLVideoElement>(null);

  // Track if initial greeting has been played
  const hasPlayedGreeting = useRef(false);
  const lastSpokenText = useRef('');

  // Track current playing video to ensure proper playback
  const currentVideoRef = useRef<HTMLVideoElement | null>(null);
  const isPlayingGreeting = useRef(false);

  // Color correction filter for videos
  const videoFilter = 'saturate(0.8) sepia(0.1) hue-rotate(-5deg)';

  // Talking video needs 25% more saturation to match other videos
  const talkingVideoFilter = 'saturate(1.0) sepia(0.1) hue-rotate(-5deg)';

  // Play greeting only when Hume connects (green button pressed)
  // DISABLED: Greeting videos are disabled to avoid conflicting with Hume's greeting
  // Hume provides a more natural greeting after the user connects
  useEffect(() => {
    if (isConnected && !hasPlayedGreeting.current) {
      hasPlayedGreeting.current = true;
      // Skip playing greeting video - let Hume handle the greeting
      console.log(`🎬 Greeting video skipped - Hume will provide greeting`);
      onGreetingComplete?.();
    }
  }, [isConnected, onGreetingComplete]);

  // Handle greeting video end
  const handleGreetingEnded = () => {
    console.log(`🎬 Greeting ended`);
    isPlayingGreeting.current = false;
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
    // Don't interrupt greeting or phrase videos
    if (mode === 'greeting' || mode === 'phrase') {
      console.log(`🎬 Mode switch blocked - currently in ${mode} mode`);
      return;
    }
    // Also don't switch if greeting is currently playing
    if (isPlayingGreeting.current) {
      console.log(`🎬 Mode switch blocked - greeting is playing`);
      return;
    }

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

  // Handle video playback when mode changes - ensures videos play on mobile
  useEffect(() => {
    const getVideoRef = () => {
      switch (mode) {
        case 'talking':
          return talkingVideoRef.current;
        case 'listening':
          return listeningVideoRef.current;
        case 'waiting':
          return waitingVideoRef.current;
        case 'greeting':
          return greetingVideoRef.current;
        case 'phrase':
          return phraseVideoRef.current;
        default:
          return null;
      }
    };

    const videoElement = getVideoRef();
    if (!videoElement) return;

    // Ensure the video is playing
    const playVideo = async () => {
      try {
        // Reset playback position for looping videos
        if (mode === 'talking' || mode === 'listening' || mode === 'waiting') {
          videoElement.currentTime = 0;
        }

        // Attempt to play the video
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log(`🎬 Video playing: ${mode}`);
        }
      } catch (error) {
        console.warn(`🎬 Video play error for ${mode}:`, error);
        // Fallback: try again after a short delay
        setTimeout(() => {
          try {
            videoElement.play();
          } catch (e) {
            console.error(`🎬 Video play retry failed for ${mode}:`, e);
          }
        }, 100);
      }
    };

    playVideo();
  }, [mode]);

  // Common video styles
  const baseVideoStyle =
    'absolute inset-0 w-full h-full object-cover transition-opacity duration-300';

  return (
    <div className="relative w-full h-full flex flex-col items-center bg-gradient-to-b from-blue-100 to-blue-50">
      {/* VOLUME INDICATOR BAR - Shows user microphone input level */}
      <div className="w-full max-w-md h-[10px] bg-gray-300 relative">
        <div
          className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-75"
          style={{
            width: `${Math.max(micVolume * 100, 2)}%`,
          }}
        />
      </div>

      <div className="relative w-full max-w-md aspect-square overflow-hidden">
        {/* WAITING VIDEO - Always mounted as background fallback */}
        <video
          ref={waitingVideoRef}
          src={WAITING_VIDEO}
          className={baseVideoStyle}
          style={{
            filter: videoFilter,
            opacity: mode === 'waiting' ? 1 : 0,
            zIndex: mode === 'waiting' ? 10 : 1,
          }}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setVideosReady((prev) => ({ ...prev, waiting: true }))}
          onStalled={() => {
            console.warn('🎬 Waiting video stalled - attempting to resume');
            if (waitingVideoRef.current) {
              waitingVideoRef.current
                .play()
                .catch((e) => console.error('Failed to resume waiting video:', e));
            }
          }}
        />

        {/* LISTENING VIDEO - Always mounted */}
        <video
          ref={listeningVideoRef}
          src={LISTENING_VIDEO}
          className={baseVideoStyle}
          style={{
            filter: videoFilter,
            opacity: mode === 'listening' ? 1 : 0,
            zIndex: mode === 'listening' ? 10 : 2,
          }}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setVideosReady((prev) => ({ ...prev, listening: true }))}
          onStalled={() => {
            console.warn('🎬 Listening video stalled - attempting to resume');
            if (listeningVideoRef.current) {
              listeningVideoRef.current
                .play()
                .catch((e) => console.error('Failed to resume listening video:', e));
            }
          }}
        />

        {/* TALKING VIDEO - Always mounted */}
        <video
          ref={talkingVideoRef}
          src={TALKING_VIDEO}
          className={baseVideoStyle}
          style={{
            filter: talkingVideoFilter,
            opacity: mode === 'talking' ? 1 : 0,
            zIndex: mode === 'talking' ? 10 : 3,
          }}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setVideosReady((prev) => ({ ...prev, talking: true }))}
          onStalled={() => {
            console.warn('🎬 Talking video stalled - attempting to resume');
            if (talkingVideoRef.current) {
              talkingVideoRef.current
                .play()
                .catch((e) => console.error('Failed to resume talking video:', e));
            }
          }}
          onError={() => {
            console.error('🎬 Talking video error - will retry');
            if (talkingVideoRef.current) {
              setTimeout(() => {
                talkingVideoRef.current
                  ?.play()
                  .catch((e) => console.error('Talking video retry failed:', e));
              }, 500);
            }
          }}
        />

        {/* GREETING VIDEO - Mounted only when needed, highest z-index */}
        {greetingVideo && (
          <video
            ref={greetingVideoRef}
            key={greetingVideo.id}
            src={greetingVideo.videoPath}
            className={baseVideoStyle}
            style={{
              filter: videoFilter,
              opacity: mode === 'greeting' ? 1 : 0,
              zIndex: 20,
            }}
            autoPlay
            playsInline
            onEnded={handleGreetingEnded}
            onError={() => {
              console.error(`🎬 Greeting video error: ${greetingVideo.videoPath}`);
              handleGreetingEnded();
            }}
          />
        )}

        {/* PHRASE VIDEO - Mounted only when needed, highest z-index */}
        {phraseVideo && (
          <video
            ref={phraseVideoRef}
            key={phraseVideo.id}
            src={phraseVideo.videoPath}
            className={baseVideoStyle}
            style={{
              filter: videoFilter,
              opacity: mode === 'phrase' ? 1 : 0,
              zIndex: 20,
            }}
            autoPlay
            playsInline
            onEnded={handlePhraseEnded}
            onError={() => {
              console.error(`🎬 Phrase video error: ${phraseVideo.videoPath}`);
              handlePhraseEnded();
            }}
          />
        )}

        {/* Status indicator */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
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
        <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs z-30">
          {mode}
        </div>
      </div>
    </div>
  );
}

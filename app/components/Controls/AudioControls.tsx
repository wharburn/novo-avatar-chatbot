'use client';

import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface AudioControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  isListening: boolean;
  isSpeakerMuted?: boolean;
  onToggleSpeaker?: () => void;
}

export default function AudioControls({
  isMuted,
  onToggleMute,
  isListening,
  isSpeakerMuted = false,
  onToggleSpeaker
}: AudioControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 flex gap-2">
      {/* Microphone toggle */}
      <button
        onClick={onToggleMute}
        className={`p-3 rounded-full shadow-lg transition-all ${
          isMuted 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : isListening
              ? 'bg-green-500 hover:bg-green-600 text-white animate-pulse'
              : 'bg-white hover:bg-gray-100 text-gray-700'
        }`}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {isMuted ? (
          <MicOff className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>

      {/* Speaker toggle (optional) */}
      {onToggleSpeaker && (
        <button
          onClick={onToggleSpeaker}
          className={`p-3 rounded-full shadow-lg transition-all ${
            isSpeakerMuted 
              ? 'bg-gray-500 hover:bg-gray-600 text-white' 
              : 'bg-white hover:bg-gray-100 text-gray-700'
          }`}
          aria-label={isSpeakerMuted ? 'Unmute speaker' : 'Mute speaker'}
        >
          {isSpeakerMuted ? (
            <VolumeX className="w-6 h-6" />
          ) : (
            <Volume2 className="w-6 h-6" />
          )}
        </button>
      )}
    </div>
  );
}

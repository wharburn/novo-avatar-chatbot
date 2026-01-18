'use client';

import { useVoice, VoiceReadyState } from '@humeai/voice-react';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

interface ChatControlsProps {
  accessToken: string;
  configId?: string;
}

export default function ChatControls({ accessToken, configId }: ChatControlsProps) {
  const { 
    connect, 
    disconnect, 
    readyState, 
    isMuted, 
    mute, 
    unmute,
    error 
  } = useVoice();

  const isConnected = readyState === VoiceReadyState.OPEN;
  const isConnecting = readyState === VoiceReadyState.CONNECTING;

  const handleConnect = async () => {
    try {
      await connect({
        auth: { type: 'accessToken', value: accessToken },
        configId: configId,
      });
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  return (
    <div className="absolute bottom-4 left-4 flex gap-2 z-50">
      {/* Connect/Disconnect button */}
      {isConnected ? (
        <button
          onClick={handleDisconnect}
          className="p-3 rounded-full shadow-lg transition-all bg-red-500 hover:bg-red-600 text-white"
          aria-label="End call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`p-3 rounded-full shadow-lg transition-all ${
            isConnecting 
              ? 'bg-yellow-500 text-white animate-pulse cursor-wait' 
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
          aria-label={isConnecting ? 'Connecting...' : 'Start call'}
        >
          <Phone className="w-6 h-6" />
        </button>
      )}

      {/* Mute/Unmute button (only show when connected) */}
      {isConnected && (
        <button
          onClick={isMuted ? unmute : mute}
          className={`p-3 rounded-full shadow-lg transition-all ${
            isMuted 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
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
      )}

      {/* Error display */}
      {error && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-red-100 border border-red-300 rounded-lg text-red-700 text-xs max-w-xs">
          {error.message}
        </div>
      )}
    </div>
  );
}

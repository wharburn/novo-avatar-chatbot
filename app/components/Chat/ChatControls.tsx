'use client';

import { useVoice, VoiceReadyState } from '@humeai/voice-react';
import { Eye, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { useState } from 'react';
import AudioSettings from '../Settings/AudioSettings';
import SettingsButton from '../Settings/SettingsButton';

interface ChatControlsProps {
  accessToken: string;
  configId?: string;
  isVisionActive?: boolean;
  onVisionToggle?: () => void;
  userProfile?: {
    name?: string;
    email?: string;
    isReturningUser?: boolean;
    visitCount?: number;
  } | null;
}

export default function ChatControls({
  accessToken,
  configId,
  isVisionActive,
  onVisionToggle,
  userProfile,
}: ChatControlsProps) {
  const { connect, disconnect, readyState, isMuted, mute, unmute, error } = useVoice();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isConnected = readyState === VoiceReadyState.OPEN;
  const isConnecting = readyState === VoiceReadyState.CONNECTING;

  const handleConnect = async () => {
    try {
      console.log('Attempting to connect to Hume EVI...');
      console.log('Access token present:', !!accessToken, 'length:', accessToken?.length || 0);
      console.log('Config ID:', configId);

      if (!accessToken) {
        console.error(
          'No access token available - check HUME_API_KEY and HUME_SECRET_KEY env vars'
        );
        return;
      }

      if (!configId) {
        console.error('No config ID available - check NEXT_PUBLIC_HUME_CONFIG_ID env var');
        return;
      }

      console.log('Connecting to Hume with user profile:', userProfile?.name || 'unknown');

      // Connect to Hume - session settings will be sent after connection
      await connect({
        auth: { type: 'accessToken', value: accessToken },
        configId: configId,
      });
      console.log('Connection initiated successfully');
    } catch (err) {
      console.error('Failed to connect:', err);
      console.error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
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
    <>
      <div className="absolute bottom-0 left-4 flex gap-2 z-50 pb-2">
        {/* Settings button */}
        <SettingsButton onClick={() => setIsSettingsOpen(true)} />

        {/* Vision toggle button - user controls camera, glows red when active */}
        <button
          onClick={onVisionToggle}
          className={`p-3 rounded-full shadow-lg transition-all ${
            isVisionActive
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/50'
              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
          }`}
          aria-label={isVisionActive ? 'Turn off camera' : 'Turn on camera'}
          title={isVisionActive ? 'NoVo can see you - tap to turn off' : 'Tap to let NoVo see you'}
          style={{
            // Pulsing glow animation when active
            animation: isVisionActive ? 'pulse-glow 2s ease-in-out infinite' : 'none',
          }}
        >
          <Eye className={`w-6 h-6 ${isVisionActive ? 'text-white' : 'text-gray-500'}`} />
          {/* Add CSS for custom pulse animation */}
          <style jsx>{`
            @keyframes pulse-glow {
              0%,
              100% {
                box-shadow: 0 0 5px 2px rgba(239, 68, 68, 0.5);
              }
              50% {
                box-shadow: 0 0 20px 6px rgba(239, 68, 68, 0.8);
              }
            }
          `}</style>
        </button>

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
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
        )}

        {/* Error display */}
        {error && (
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-red-100 border border-red-300 rounded-lg text-red-700 text-xs max-w-xs">
            {error.message}
          </div>
        )}
      </div>

      {/* Audio Settings Modal */}
      <AudioSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}

'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AudioSettings({ isOpen, onClose }: AudioSettingsProps) {
  const [settings, setSettings] = useState({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('audioSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const handleToggle = (key: keyof typeof settings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    localStorage.setItem('audioSettings', JSON.stringify(updated));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Audio Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Echo Cancellation */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-800">Echo Cancellation</h3>
              <p className="text-sm text-gray-600">Reduces feedback from speakers</p>
            </div>
            <button
              onClick={() => handleToggle('echoCancellation')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.echoCancellation ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.echoCancellation ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Noise Suppression */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-800">Noise Suppression</h3>
              <p className="text-sm text-gray-600">Filters background noise</p>
            </div>
            <button
              onClick={() => handleToggle('noiseSuppression')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.noiseSuppression ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.noiseSuppression ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Auto Gain Control */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-800">Auto Gain Control</h3>
              <p className="text-sm text-gray-600">Automatically adjusts microphone level</p>
            </div>
            <button
              onClick={() => handleToggle('autoGainControl')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoGainControl ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.autoGainControl ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> If NoVo can't hear you well, try disabling Auto Gain Control. If there's too much background noise, enable Noise Suppression.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}


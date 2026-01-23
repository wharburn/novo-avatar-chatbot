'use client';

import { Settings } from 'lucide-react';

interface SettingsButtonProps {
  onClick: () => void;
}

export default function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-full shadow-lg transition-all bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
      aria-label="Open audio settings"
      title="Audio settings"
    >
      <Settings className="w-6 h-6" />
    </button>
  );
}

